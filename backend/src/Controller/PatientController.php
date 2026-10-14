<?php

namespace App\Controller;

use App\Entity\Appointment;
use App\Entity\Practitioner;
use App\Entity\Relative;
use App\Entity\User;
use App\Service\AccountResolver;
use App\Service\BookingException;
use App\Service\BookingService;
use App\Service\OtpService;
use App\Service\PhoneNumber;
use App\Service\Presenter;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Espace patient : profil, proches, réservation, annulation et report.
 */
#[IsGranted('ROLE_PATIENT')]
final class PatientController extends ApiController
{
    #[Route('/api/me', methods: ['GET'])]
    public function me(Presenter $presenter): JsonResponse
    {
        return $this->json($presenter->user($this->currentUser()));
    }

    #[Route('/api/me', methods: ['PATCH'])]
    public function updateMe(Request $request, Presenter $presenter): JsonResponse
    {
        $data = $this->body($request);
        $user = $this->currentUser();
        foreach (['firstName' => 'setFirstName', 'lastName' => 'setLastName'] as $field => $setter) {
            if (\array_key_exists($field, $data)) {
                $value = trim((string) $data[$field]);
                if ('' === $value || mb_strlen($value) > 80) {
                    return $this->error('Le prénom et le nom sont obligatoires (80 caractères maximum).');
                }
                $user->$setter($value);
            }
        }
        if (\array_key_exists('email', $data)) {
            $email = trim((string) $data['email']);
            if ('' !== $email && !filter_var($email, \FILTER_VALIDATE_EMAIL)) {
                return $this->error('Adresse email invalide.');
            }
            $user->setEmail('' === $email ? null : $email);
        }
        if (\in_array($data['locale'] ?? null, ['fr', 'en', 'ar'], true)) {
            $user->setLocale($data['locale']);
        }
        if (true === ($data['consent'] ?? null)) {
            $user->giveConsent();
        }
        $this->em->flush();

        return $this->json($presenter->user($user));
    }

    /**
     * Ajoute (ou remplace) le numéro du compte, après vérification du code SMS demandé via /api/auth/otp/request.
     * Corps : {"phone": "70 12 34 56", "country": "ML", "code": "123456"}.
     */
    #[Route('/api/me/phone', methods: ['POST'])]
    public function setPhone(
        Request $request,
        OtpService $otp,
        Presenter $presenter,
        #[Autowire(service: 'limiter.otp_verify')] RateLimiterFactory $verifyLimiter,
    ): JsonResponse {
        $data = $this->body($request);
        $phone = PhoneNumber::normalize((string) ($data['phone'] ?? ''), $data['country'] ?? null);
        $code = preg_replace('/\D/', '', (string) ($data['code'] ?? ''));
        if (null === $phone || 6 !== \strlen($code)) {
            return $this->error('Numéro ou code invalide.');
        }
        if (!$verifyLimiter->create($phone)->consume()->isAccepted()) {
            return $this->error('Trop de tentatives. Demandez un nouveau code dans quelques minutes.', 429);
        }
        $user = $this->currentUser();
        $owner = $this->em->getRepository(User::class)->findOneBy(['phone' => $phone]);
        if (null !== $owner && $owner !== $user) {
            return $this->error('Ce numéro est déjà associé à un autre compte. Connectez-vous avec ce numéro par SMS.', 409, ['code' => 'phone_taken']);
        }
        if (!$otp->checkCode($phone, $code)) {
            return $this->error('Code incorrect ou expiré.', 401);
        }
        $user->setVerifiedPhone($phone);
        $this->audit($request, 'user.phone.verified', 'user:'.$user->getId());
        $this->em->flush();

        return $this->json($presenter->user($user));
    }

    /**
     * Vérifie une adresse email pour ce compte (code demandé via /api/auth/otp/request {"email"}).
     * Permet ensuite de se connecter à ce même compte par email, Google ou GitHub.
     * Corps : {"email": "awa@gmail.com", "code": "123456"}.
     */
    #[Route('/api/me/email', methods: ['POST'])]
    public function verifyEmail(
        Request $request,
        OtpService $otp,
        AccountResolver $accounts,
        Presenter $presenter,
        #[Autowire(service: 'limiter.otp_verify')] RateLimiterFactory $verifyLimiter,
    ): JsonResponse {
        $data = $this->body($request);
        $email = AccountResolver::normalizeEmail((string) ($data['email'] ?? ''));
        $code = preg_replace('/\D/', '', (string) ($data['code'] ?? ''));
        if (null === $email || 6 !== \strlen($code)) {
            return $this->error('Adresse ou code invalide.');
        }
        if (!$verifyLimiter->create($email)->consume()->isAccepted()) {
            return $this->error('Trop de tentatives. Demandez un nouveau code dans quelques minutes.', 429);
        }
        $user = $this->currentUser();
        $owner = $accounts->findByVerifiedEmail($email);
        if (null !== $owner && $owner !== $user) {
            return $this->error('Cette adresse est déjà vérifiée sur un autre compte. Connectez-vous avec cette adresse.', 409, ['code' => 'email_taken']);
        }
        if (!$otp->checkCode($email, $code)) {
            return $this->error('Code incorrect ou expiré.', 401);
        }
        $user->setVerifiedEmail($email);
        $this->audit($request, 'user.email.verified', 'user:'.$user->getId());
        $this->em->flush();

        return $this->json($presenter->user($user));
    }

    #[Route('/api/me/relatives', methods: ['POST'])]
    public function addRelative(Request $request, Presenter $presenter): JsonResponse
    {
        $data = $this->body($request);
        $firstName = trim((string) ($data['firstName'] ?? ''));
        $lastName = trim((string) ($data['lastName'] ?? ''));
        $relation = (string) ($data['relation'] ?? 'autre');
        if ('' === $firstName || '' === $lastName || !\in_array($relation, ['enfant', 'parent', 'conjoint', 'autre'], true)) {
            return $this->error('Prénom, nom et lien de parenté sont obligatoires.');
        }
        $birthDate = null;
        if (!empty($data['birthDate'])) {
            $birthDate = \DateTimeImmutable::createFromFormat('!Y-m-d', (string) $data['birthDate']) ?: null;
        }
        $user = $this->currentUser();
        if ($user->getRelatives()->count() >= 10) {
            return $this->error('Nombre maximal de proches atteint.');
        }
        $relative = new Relative($user, $firstName, $lastName, $relation, $birthDate);
        $user->addRelative($relative);
        $this->em->flush();

        return $this->json($presenter->relative($relative), 201);
    }

    #[Route('/api/me/appointments', methods: ['GET'])]
    public function myAppointments(Presenter $presenter): JsonResponse
    {
        $appointments = $this->em->getRepository(Appointment::class)->findBy(['patient' => $this->currentUser()], ['startsAt' => 'DESC'], 100);
        $now = new \DateTimeImmutable();
        $upcoming = $past = [];
        foreach ($appointments as $appointment) {
            $item = $presenter->appointment($appointment);
            if ($appointment->getStartsAt() >= $now && $appointment->getStatus()->isActive()) {
                $upcoming[] = $item;
            } else {
                $past[] = $item;
            }
        }

        return $this->json(['upcoming' => array_reverse($upcoming), 'past' => $past]);
    }

    #[Route('/api/appointments', methods: ['POST'])]
    public function book(Request $request, BookingService $booking, Presenter $presenter): JsonResponse
    {
        $data = $this->body($request);
        $user = $this->currentUser();
        if (null === $user->getFirstName() || null === $user->getLastName()) {
            return $this->error('Complétez votre prénom et votre nom avant de réserver.', 422, ['code' => 'profile_incomplete']);
        }
        if (null === $user->getPhone()) {
            return $this->error('Ajoutez un numéro de téléphone : la confirmation et le rappel sont envoyés par SMS.', 422, ['code' => 'phone_required']);
        }
        if (null === $user->getConsentAt()) {
            return $this->error('Vous devez accepter les conditions de traitement des données.', 422, ['code' => 'consent_required']);
        }

        $practitioner = $this->em->getRepository(Practitioner::class)->findOneBy(['slug' => (string) ($data['practitioner'] ?? '')]);
        $startsAt = $this->parseInstant($data['startsAt'] ?? null);
        if (null === $practitioner || null === $startsAt) {
            return $this->error('Praticien et créneau sont obligatoires.');
        }
        $relative = null;
        if (!empty($data['relativeId'])) {
            $relative = $this->em->getRepository(Relative::class)->find((int) $data['relativeId']);
            if (null === $relative) {
                return $this->error('Proche inconnu.', 404);
            }
        }
        $reason = isset($data['reason']) ? mb_substr(trim((string) $data['reason']), 0, 255) : null;

        try {
            $appointment = $booking->book($user, $practitioner, $startsAt, $reason ?: null, (bool) ($data['firstVisit'] ?? true), $relative, null, (bool) ($data['video'] ?? false));
        } catch (BookingException $e) {
            return $this->error($e->getMessage(), $e->status);
        }

        return $this->json($presenter->appointment($appointment), 201);
    }

    /** Corps : {"action": "cancel"} ou {"action": "reschedule", "startsAt": "..."}. */
    #[Route('/api/appointments/{id}', methods: ['PATCH'])]
    public function update(string $id, Request $request, BookingService $booking, Presenter $presenter): JsonResponse
    {
        $appointment = $this->findOwned($id);
        if (null === $appointment) {
            return $this->error('Rendez-vous introuvable.', 404);
        }
        $data = $this->body($request);

        try {
            switch ($data['action'] ?? null) {
                case 'cancel':
                    $booking->cancel($appointment);
                    $this->audit($request, 'appointment.cancel', 'appointment:'.$id);
                    $this->em->flush();

                    return $this->json($presenter->appointment($appointment));
                case 'reschedule':
                    $startsAt = $this->parseInstant($data['startsAt'] ?? null);
                    if (null === $startsAt) {
                        return $this->error('Nouveau créneau obligatoire.');
                    }
                    $new = $booking->reschedule($appointment, $startsAt);

                    return $this->json($presenter->appointment($new));
                default:
                    return $this->error('Action inconnue (cancel ou reschedule).');
            }
        } catch (BookingException $e) {
            return $this->error($e->getMessage(), $e->status);
        }
    }

    private function findOwned(string $id): ?Appointment
    {
        if (!\Symfony\Component\Uid\Uuid::isValid($id)) {
            return null;
        }
        $appointment = $this->em->getRepository(Appointment::class)->find(\Symfony\Component\Uid\Uuid::fromString($id));

        return $appointment?->getPatient() === $this->currentUser() ? $appointment : null;
    }
}
