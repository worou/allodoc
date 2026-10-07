<?php

namespace App\Entity;

use App\Enum\AppointmentStatus;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Rendez-vous. Les dates sont stockées en UTC.
 *
 * Anti double réservation : la contrainte unique (practitioner_id, starts_at, slot_lock) n'accepte qu'un seul
 * rendez-vous actif par créneau. slot_lock vaut 1 quand le rendez-vous est actif et NULL sinon ; MariaDB/MySQL
 * autorisent plusieurs NULL dans un index unique, ce qui remplace un index partiel.
 */
#[ORM\Entity]
#[ORM\UniqueConstraint(name: 'uniq_active_slot', columns: ['practitioner_id', 'starts_at', 'slot_lock'])]
#[ORM\Index(columns: ['patient_id', 'starts_at'])]
class Appointment
{
    #[ORM\Id, ORM\Column(type: 'uuid')]
    private Uuid $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private User $patient;

    /** Proche concerné, si le rendez-vous n'est pas pour le titulaire du compte. */
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Relative $relative;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private Practitioner $practitioner;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private Facility $facility;

    #[ORM\Column]
    private \DateTimeImmutable $startsAt;

    #[ORM\Column]
    private \DateTimeImmutable $endsAt;

    #[ORM\Column(enumType: AppointmentStatus::class)]
    private AppointmentStatus $status = AppointmentStatus::Confirmed;

    #[ORM\Column(type: 'smallint', nullable: true)]
    private ?int $slotLock = 1;

    /** Motif saisi par le patient : donnée de santé, jamais envoyée par SMS ni notification. */
    #[ORM\Column(length: 255, nullable: true)]
    private ?string $reason;

    #[ORM\Column]
    private bool $firstVisit;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $cancelledAt = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $reminderSentAt = null;

    public function __construct(User $patient, Practitioner $practitioner, Facility $facility, \DateTimeImmutable $startsAt, \DateTimeImmutable $endsAt, ?string $reason, bool $firstVisit, ?Relative $relative = null)
    {
        $this->id = Uuid::v7();
        $this->patient = $patient;
        $this->practitioner = $practitioner;
        $this->facility = $facility;
        $this->startsAt = $startsAt;
        $this->endsAt = $endsAt;
        $this->reason = $reason;
        $this->firstVisit = $firstVisit;
        $this->relative = $relative;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getPatient(): User { return $this->patient; }
    public function getRelative(): ?Relative { return $this->relative; }
    public function getPractitioner(): Practitioner { return $this->practitioner; }
    public function getFacility(): Facility { return $this->facility; }
    public function getStartsAt(): \DateTimeImmutable { return $this->startsAt; }
    public function getEndsAt(): \DateTimeImmutable { return $this->endsAt; }
    public function getStatus(): AppointmentStatus { return $this->status; }
    public function getReason(): ?string { return $this->reason; }
    public function isFirstVisit(): bool { return $this->firstVisit; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getCancelledAt(): ?\DateTimeImmutable { return $this->cancelledAt; }
    public function getReminderSentAt(): ?\DateTimeImmutable { return $this->reminderSentAt; }
    public function markReminderSent(): void { $this->reminderSentAt = new \DateTimeImmutable(); }

    public function changeStatus(AppointmentStatus $status): void
    {
        $this->status = $status;
        $this->slotLock = $status->isActive() ? 1 : null;
        if ($status === AppointmentStatus::Cancelled) {
            $this->cancelledAt = new \DateTimeImmutable();
        }
    }
}
