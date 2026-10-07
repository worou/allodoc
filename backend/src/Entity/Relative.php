<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * Proche pour lequel un patient peut réserver (enfant, parent, conjoint...).
 */
#[ORM\Entity]
class Relative
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'relatives')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $owner;

    #[ORM\Column(length: 80)]
    private string $firstName;

    #[ORM\Column(length: 80)]
    private string $lastName;

    #[ORM\Column(type: 'date_immutable', nullable: true)]
    private ?\DateTimeImmutable $birthDate;

    /** enfant, parent, conjoint, autre */
    #[ORM\Column(length: 20)]
    private string $relation;

    public function __construct(User $owner, string $firstName, string $lastName, string $relation, ?\DateTimeImmutable $birthDate = null)
    {
        $this->owner = $owner;
        $this->firstName = $firstName;
        $this->lastName = $lastName;
        $this->relation = $relation;
        $this->birthDate = $birthDate;
    }

    public function getId(): ?int { return $this->id; }
    public function getOwner(): User { return $this->owner; }
    public function getFirstName(): string { return $this->firstName; }
    public function getLastName(): string { return $this->lastName; }
    public function getBirthDate(): ?\DateTimeImmutable { return $this->birthDate; }
    public function getRelation(): string { return $this->relation; }
}
