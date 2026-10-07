<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * Congé ou indisponibilité ponctuelle d'un praticien (bornes en UTC).
 */
#[ORM\Entity]
#[ORM\Index(columns: ['practitioner_id', 'starts_at'])]
class Absence
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Practitioner $practitioner;

    #[ORM\Column]
    private \DateTimeImmutable $startsAt;

    #[ORM\Column]
    private \DateTimeImmutable $endsAt;

    #[ORM\Column(length: 150, nullable: true)]
    private ?string $reason;

    public function __construct(Practitioner $practitioner, \DateTimeImmutable $startsAt, \DateTimeImmutable $endsAt, ?string $reason = null)
    {
        $this->practitioner = $practitioner;
        $this->startsAt = $startsAt;
        $this->endsAt = $endsAt;
        $this->reason = $reason;
    }

    public function getId(): ?int { return $this->id; }
    public function getPractitioner(): Practitioner { return $this->practitioner; }
    public function getStartsAt(): \DateTimeImmutable { return $this->startsAt; }
    public function getEndsAt(): \DateTimeImmutable { return $this->endsAt; }
    public function getReason(): ?string { return $this->reason; }
}
