<?php

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

/**
 * Région administrative. Les découpages ont changé récemment (Mali 2023, Burkina Faso 2025) :
 * chaque région reste "provisional" tant qu'elle n'est pas validée avec le ministère de la santé.
 */
#[ORM\Entity]
#[ORM\UniqueConstraint(columns: ['country_id', 'slug'])]
#[ApiResource(
    operations: [new GetCollection(paginationEnabled: false), new Get()],
    normalizationContext: ['groups' => ['region:read']],
    order: ['position' => 'ASC', 'name' => 'ASC'],
)]
#[ApiFilter(SearchFilter::class, properties: ['country.code' => 'exact'])]
class Region
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['region:read', 'city:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'regions')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['region:read'])]
    private Country $country;

    #[ORM\Column(length: 100)]
    #[Groups(['region:read', 'city:read'])]
    private string $name;

    #[ORM\Column(length: 100)]
    #[Groups(['region:read', 'city:read'])]
    private string $slug;

    /** Chef-lieu. */
    #[ORM\Column(length: 100)]
    #[Groups(['region:read'])]
    private string $capital;

    /** Ancien nom (ex. "Hauts-Bassins" pour Guiriko), utile à la recherche pendant la transition. */
    #[ORM\Column(length: 100, nullable: true)]
    #[Groups(['region:read'])]
    private ?string $formerName = null;

    #[ORM\Column]
    #[Groups(['region:read'])]
    private bool $provisional = true;

    #[ORM\Column(type: 'smallint')]
    private int $position = 0;

    public function __construct(Country $country, string $name, string $slug, string $capital)
    {
        $this->country = $country;
        $this->name = $name;
        $this->slug = $slug;
        $this->capital = $capital;
    }

    public function getId(): ?int { return $this->id; }
    public function getCountry(): Country { return $this->country; }
    public function getName(): string { return $this->name; }
    public function getSlug(): string { return $this->slug; }
    public function getCapital(): string { return $this->capital; }
    public function getFormerName(): ?string { return $this->formerName; }
    public function setFormerName(?string $formerName): static { $this->formerName = $formerName; return $this; }
    public function isProvisional(): bool { return $this->provisional; }
    public function setProvisional(bool $provisional): static { $this->provisional = $provisional; return $this; }
    public function getPosition(): int { return $this->position; }
    public function setPosition(int $position): static { $this->position = $position; return $this; }
}
