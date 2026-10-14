<?php

namespace App\Service;

use App\Entity\Appointment;
use App\Entity\Practitioner;
use App\Entity\Relative;
use App\Entity\User;
use App\Enum\AppointmentStatus;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Réservation, annulation et report de rendez-vous.
 *
 * La réservation verrouille la ligne du praticien (SELECT ... FOR UPDATE) le temps de vérifier et d'écrire le
 * créneau ; la contrainte unique uniq_active_slot reste le dernier garde-fou contre la double réservation.
 */
final class BookingService
{
    /** Un patient ne peut avoir qu'un nombre limité de rendez-vous à venir chez le même praticien. */
    private const MAX_UPCOMING_PER_PRACTITIONER = 2;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly SlotService $slots,
        private readonly NotificationService $notifications,
        private readonly VideoConsultation $videos,
    ) {
    }

    public function book(User $patient, Practitioner $practitioner, \DateTimeImmutable $startsAt, ?string $reason, bool $firstVisit, ?Relative $relative, ?Appointment $replacing = null, bool $video = false): Appointment
    {
        if (!$practitioner->isPublished()) {
            throw new BookingException('Ce praticien ne prend pas de rendez-vous en ligne.', 404);
        }
        if ($video && !$practitioner->hasTeleconsultation()) {
            throw new BookingException('Ce praticien ne propose pas la téléconsultation.', 422);
        }
        if (null === $patient->getPhone()) {
            throw new BookingException('Ajoutez un numéro de téléphone : la confirmation et le rappel sont envoyés par SMS.', 422);
        }
        if (null !== $relative && $relative->getOwner() !== $patient) {
            throw new BookingException('Proche inconnu.', 403);
        }
        $startsAt = $startsAt->setTimezone(new \DateTimeZone('UTC'));

        $connection = $this->em->getConnection();
        $connection->beginTransaction();
        try {
            $this->em->lock($practitioner, LockMode::PESSIMISTIC_WRITE);
            if (null !== $replacing) {
                // Report : l'ancien créneau est libéré dans la même transaction (annulé en cas d'échec).
                $replacing->changeStatus(AppointmentStatus::Cancelled);
                $this->em->flush();
            }

            if (!$this->slots->isAvailable($practitioner, $startsAt)) {
                throw new BookingException('Ce créneau n\'est plus disponible. Choisissez-en un autre.', 409);
            }
            if ($this->countUpcoming($patient, $practitioner) >= self::MAX_UPCOMING_PER_PRACTITIONER) {
                throw new BookingException('Vous avez déjà des rendez-vous à venir avec ce praticien.', 409);
            }

            $slot = $this->slots->resolveSlot($practitioner, $startsAt);
            $appointment = new Appointment($patient, $practitioner, $slot['facility'], $startsAt, $slot['endsAt'], $reason, $firstVisit, $relative);
            if ($video) {
                $appointment->startVideo($this->videos->newRoom());
            }
            $this->em->persist($appointment);
            $this->notifications->appointmentConfirmed($appointment);
            $this->em->flush();
            $connection->commit();
        } catch (UniqueConstraintViolationException) {
            $this->rollback();
            throw new BookingException('Ce créneau vient d\'être réservé. Choisissez-en un autre.', 409);
        } catch (\Throwable $e) {
            $this->rollback();
            throw $e;
        }

        return $appointment;
    }

    public function cancel(Appointment $appointment): void
    {
        if (!$appointment->getStatus()->isActive()) {
            throw new BookingException('Ce rendez-vous ne peut plus être annulé.', 409);
        }
        if ($appointment->getStartsAt() < new \DateTimeImmutable()) {
            throw new BookingException('Ce rendez-vous est déjà passé.', 409);
        }
        $appointment->changeStatus(AppointmentStatus::Cancelled);
        $this->notifications->appointmentCancelled($appointment);
        $this->em->flush();
    }

    /** Report = nouvelle réservation sur le nouveau créneau et annulation de l'ancien, de façon atomique. */
    public function reschedule(Appointment $appointment, \DateTimeImmutable $newStart): Appointment
    {
        if (!$appointment->getStatus()->isActive() || $appointment->getStartsAt() < new \DateTimeImmutable()) {
            throw new BookingException('Ce rendez-vous ne peut plus être déplacé.', 409);
        }

        return $this->book($appointment->getPatient(), $appointment->getPractitioner(), $newStart, $appointment->getReason(), $appointment->isFirstVisit(), $appointment->getRelative(), $appointment, $appointment->isVideo());
    }

    private function countUpcoming(User $patient, Practitioner $practitioner): int
    {
        return (int) $this->em->createQueryBuilder()
            ->select('COUNT(a.id)')
            ->from(Appointment::class, 'a')
            ->where('a.patient = :u AND a.practitioner = :p AND a.startsAt > :now AND a.status IN (:active)')
            ->setParameter('u', $patient)
            ->setParameter('p', $practitioner)
            ->setParameter('now', new \DateTimeImmutable())
            ->setParameter('active', [AppointmentStatus::Pending->value, AppointmentStatus::Confirmed->value])
            ->getQuery()->getSingleScalarResult();
    }

    private function rollback(): void
    {
        $connection = $this->em->getConnection();
        if ($connection->isTransactionActive()) {
            $connection->rollBack();
        }
        $this->em->clear();
    }
}
