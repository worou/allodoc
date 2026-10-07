<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * Horaire récurrent d'un praticien dans une structure, exprimé en heure locale du pays.
 * Exemple : lundi (1), 08:00 à 12:00, créneaux de 20 minutes.
 */
#[ORM\Entity]
class AvailabilityRule
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'availabilityRules')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Practitioner $practitioner;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private Facility $facility;

    /** Jour ISO-8601 : 1 = lundi ... 7 = dimanche. */
    #[ORM\Column(type: 'smallint')]
    private int $dayOfWeek;

    /** Heure locale "HH:MM". */
    #[ORM\Column(length: 5)]
    private string $startTime;

    #[ORM\Column(length: 5)]
    private string $endTime;

    #[ORM\Column(type: 'smallint')]
    private int $slotMinutes;

    public function __construct(Practitioner $practitioner, Facility $facility, int $dayOfWeek, string $startTime, string $endTime, int $slotMinutes = 20)
    {
        if ($dayOfWeek < 1 || $dayOfWeek > 7) {
            throw new \InvalidArgumentException('dayOfWeek doit être compris entre 1 et 7.');
        }
        $this->practitioner = $practitioner;
        $this->facility = $facility;
        $this->dayOfWeek = $dayOfWeek;
        $this->startTime = $startTime;
        $this->endTime = $endTime;
        $this->slotMinutes = $slotMinutes;
    }

    public function getId(): ?int { return $this->id; }
    public function getPractitioner(): Practitioner { return $this->practitioner; }
    public function getFacility(): Facility { return $this->facility; }
    public function getDayOfWeek(): int { return $this->dayOfWeek; }
    public function getStartTime(): string { return $this->startTime; }
    public function getEndTime(): string { return $this->endTime; }
    public function getSlotMinutes(): int { return $this->slotMinutes; }
}
