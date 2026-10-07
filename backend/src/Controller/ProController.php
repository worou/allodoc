<?php

namespace App\Controller;

use App\Entity\Absence;
use App\Entity\Appointment;
use App\Entity\Practitioner;
use App\Enum\AppointmentStatus;
use App\Service\NotificationService;
use App\Service\Presenter;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Uid\Uuid;

/**
 * Espace praticien : agenda, gestion des rendez-vous, congés et tableau de bord.
 */
#[IsGranted('ROLE_PRACTITIONER')]
#[Route('/api/pro')]
final class ProController extends ApiController
{
    /** Agenda d'une semaine à partir de ?from=YYYY-MM-DD (lundi courant par défaut). */
    #[Route('/agenda', methods: ['GET'])]
    public function agenda(Request $request, Presenter $presenter): JsonResponse
    {
        $practitioner = $this->practitioner();
        if (null === $practitioner) {
            return $this->error('Aucune fiche praticien liée à ce compte.', 404);
        }
        $tz = $practitioner->getMainFacility()?->getTimezone() ?? new \DateTimeZone('UTC');
        $fromParam = (string) $request->query->get('from', '');
        $from = preg_match('/^\d{4}-\d{2}-\d{2}$/', $fromParam)
            ? new \DateTimeImmutable($fromParam, $tz)
            : new \DateTimeImmutable('monday this week', $tz);
        $to = $from->modify('+7 days');

        $appointments = $this->em->createQueryBuilder()
            ->select('a')->from(Appointment::class, 'a')
            ->where('a.practitioner = :p AND a.startsAt >= :from AND a.startsAt < :to')
            ->setParameter('p', $practitioner)
            ->setParameter('from', $from->setTimezone(new \DateTimeZone('UTC')))
            ->setParameter('to', $to->setTimezone(new \DateTimeZone('UTC')))
            ->orderBy('a.startsAt', 'ASC')
            ->getQuery()->getResult();

        $this->audit($request, 'pro.agenda.view', 'practitioner:'.$practitioner->getId());
        $this->em->flush();

        return $this->json([
            'practitioner' => $presenter->practitionerSummary($practitioner),
            'from' => $from->format('Y-m-d'),
            'to' => $to->modify('-1 day')->format('Y-m-d'),
            'appointments' => array_map(fn (Appointment $a) => $presenter->appointment($a, withPatient: true), $appointments),
        ]);
    }

    /** Corps : {"status": "confirmed" | "cancelled" | "honored" | "no_show"}. */
    #[Route('/appointments/{id}', methods: ['PATCH'])]
    public function updateAppointment(string $id, Request $request, Presenter $presenter, NotificationService $notifications): JsonResponse
    {
        $practitioner = $this->practitioner();
        $appointment = Uuid::isValid($id) ? $this->em->getRepository(Appointment::class)->find(Uuid::fromString($id)) : null;
        if (null === $practitioner || null === $appointment || $appointment->getPractitioner() !== $practitioner) {
            return $this->error('Rendez-vous introuvable.', 404);
        }
        $status = AppointmentStatus::tryFrom((string) ($this->body($request)['status'] ?? ''));
        if (null === $status || AppointmentStatus::Pending === $status) {
            return $this->error('Statut invalide.');
        }
        $isPast = $appointment->getStartsAt() <= new \DateTimeImmutable();
        if (\in_array($status, [AppointmentStatus::Honored, AppointmentStatus::NoShow], true) && !$isPast) {
            return $this->error('Un rendez-vous ne peut être marqué honoré ou absent qu\'après son heure de début.');
        }
        if (!$appointment->getStatus()->isActive() && AppointmentStatus::Cancelled !== $appointment->getStatus() && $status->isActive()) {
            return $this->error('Ce rendez-vous est déjà clôturé.', 409);
        }
        if (AppointmentStatus::Cancelled === $appointment->getStatus() && $status !== AppointmentStatus::Cancelled) {
            return $this->error('Un rendez-vous annulé ne peut pas être rétabli : le créneau a pu être repris.', 409);
        }

        $wasActive = $appointment->getStatus()->isActive();
        $appointment->changeStatus($status);
        if ($wasActive && AppointmentStatus::Cancelled === $status) {
            $notifications->appointmentCancelled($appointment);
        }
        $this->audit($request, 'pro.appointment.'.$status->value, 'appointment:'.$id);
        $this->em->flush();

        return $this->json($presenter->appointment($appointment, withPatient: true));
    }

    /** Déclare un congé : {"startsAt": "...", "endsAt": "...", "reason": "Congés"}. */
    #[Route('/absences', methods: ['POST'])]
    public function addAbsence(Request $request): JsonResponse
    {
        $practitioner = $this->practitioner();
        $data = $this->body($request);
        $start = $this->parseInstant($data['startsAt'] ?? null);
        $end = $this->parseInstant($data['endsAt'] ?? null);
        if (null === $practitioner || null === $start || null === $end || $end <= $start) {
            return $this->error('Période invalide.');
        }
        $this->em->persist(new Absence($practitioner, $start, $end, isset($data['reason']) ? mb_substr((string) $data['reason'], 0, 150) : null));
        $this->em->flush();

        return $this->json(['ok' => true], 201);
    }

    /** Fréquentation et taux d'absence sur les 30 derniers jours. */
    #[Route('/stats', methods: ['GET'])]
    public function stats(): JsonResponse
    {
        $practitioner = $this->practitioner();
        if (null === $practitioner) {
            return $this->error('Aucune fiche praticien liée à ce compte.', 404);
        }
        $rows = $this->em->createQueryBuilder()
            ->select('a.status AS status', 'COUNT(a.id) AS total')
            ->from(Appointment::class, 'a')
            ->where('a.practitioner = :p AND a.startsAt >= :since')
            ->setParameter('p', $practitioner)
            ->setParameter('since', new \DateTimeImmutable('-30 days'))
            ->groupBy('a.status')
            ->getQuery()->getArrayResult();

        $counts = array_fill_keys(array_map(fn ($s) => $s->value, AppointmentStatus::cases()), 0);
        foreach ($rows as $row) {
            $key = $row['status'] instanceof AppointmentStatus ? $row['status']->value : $row['status'];
            $counts[$key] = (int) $row['total'];
        }
        $closed = $counts['honored'] + $counts['no_show'];

        return $this->json([
            'period' => '30 derniers jours',
            'counts' => $counts,
            'total' => array_sum($counts),
            'noShowRate' => $closed > 0 ? round($counts['no_show'] / $closed * 100, 1) : 0,
        ]);
    }

    private function practitioner(): ?Practitioner
    {
        return $this->em->getRepository(Practitioner::class)->findOneBy(['user' => $this->currentUser()]);
    }
}
