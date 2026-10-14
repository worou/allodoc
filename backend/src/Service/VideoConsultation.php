<?php

namespace App\Service;

use App\Entity\Appointment;
use App\Entity\User;
use App\Enum\AppointmentStatus;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Téléconsultation par vidéo (Jitsi Meet) : une salle privée par rendez-vous, au nom aléatoire impossible à deviner,
 * ouverte au patient et au praticien de 15 minutes avant le début à 1 heure après la fin du créneau.
 *
 * Serveur Jitsi configurable (JITSI_DOMAIN) : par défaut un serveur public qui n'impose pas de compte pour ouvrir
 * une salle ; à remplacer par un serveur dédié pour un usage à grande échelle.
 */
final class VideoConsultation
{
    public const OPENS_BEFORE = '-15 minutes';
    public const CLOSES_AFTER = '+60 minutes';

    public function __construct(
        #[Autowire('%env(JITSI_DOMAIN)%')] private readonly string $domain,
        #[Autowire('%env(BRAND_NAME)%')] private readonly string $brand,
    ) {
    }

    /** Nom de salle aléatoire (128 bits) : seul quelqu'un qui le connaît peut entrer. */
    public function newRoom(): string
    {
        return strtolower(preg_replace('/[^A-Za-z]/', '', $this->brand)).'-'.bin2hex(random_bytes(16));
    }

    public function opensAt(Appointment $a): \DateTimeImmutable
    {
        return $a->getStartsAt()->modify(self::OPENS_BEFORE);
    }

    public function closesAt(Appointment $a): \DateTimeImmutable
    {
        return $a->getEndsAt()->modify(self::CLOSES_AFTER);
    }

    public function isOpen(Appointment $a, ?\DateTimeImmutable $now = null): bool
    {
        $now ??= new \DateTimeImmutable();

        return $a->isVideo() && AppointmentStatus::Confirmed === $a->getStatus() && $now >= $this->opensAt($a) && $now <= $this->closesAt($a);
    }

    /** Patient (titulaire du compte) ou praticien du rendez-vous. */
    public function isParticipant(Appointment $a, User $user): bool
    {
        return $a->getPatient() === $user || $a->getPractitioner()->getUser() === $user;
    }

    /**
     * Informations pour rejoindre l'appel. La salle n'est communiquée que pendant la fenêtre d'ouverture.
     *
     * @return array{open: bool, domain: string, room: ?string, displayName: string, subject: string, opensAt: string, closesAt: string, startsAt: string, role: string}
     */
    public function joinData(Appointment $a, User $viewer): array
    {
        $isPractitioner = $a->getPractitioner()->getUser() === $viewer;
        $patientName = trim(($a->getRelative()?->getFirstName() ?? $a->getPatient()->getFirstName()).' '.($a->getRelative()?->getLastName() ?? $a->getPatient()->getLastName()));
        $open = $this->isOpen($a);

        return [
            'open' => $open,
            'domain' => $this->domain,
            'room' => $open ? $a->getVideoRoom() : null,
            'displayName' => $isPractitioner ? $a->getPractitioner()->getFullName() : ($patientName ?: 'Patient'),
            'subject' => sprintf('%s : téléconsultation', $this->brand),
            'opensAt' => $this->opensAt($a)->format(\DATE_ATOM),
            'closesAt' => $this->closesAt($a)->format(\DATE_ATOM),
            'startsAt' => $a->getStartsAt()->format(\DATE_ATOM),
            'role' => $isPractitioner ? 'practitioner' : 'patient',
        ];
    }
}
