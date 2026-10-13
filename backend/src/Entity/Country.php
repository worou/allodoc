<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Enum\Subregion;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

/**
 * Pays couvert par la plateforme. Ajouter un pays = ajouter une ligne en base, aucun code en dur.
 */
#[ORM\Entity]
#[ApiResource(
    operations: [
        new GetCollection(paginationEnabled: false),
        new Get(uriTemplate: '/countries/{code}', uriVariables: ['code']),
    ],
    normalizationContext: ['groups' => ['country:read']],
    order: ['position' => 'ASC'],
)]
class Country
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[ApiProperty(identifier: false)]
    private ?int $id = null;

    /** Code ISO 3166-1 alpha-2 (ML, SN, KE...), sert d'identifiant dans l'API. */
    #[ORM\Column(length: 2, unique: true)]
    #[Groups(['country:read', 'region:read'])]
    #[ApiProperty(identifier: true)]
    private string $code;

    #[ORM\Column(length: 80)]
    #[Groups(['country:read', 'region:read'])]
    private string $name;

    #[ORM\Column(length: 80)]
    #[Groups(['country:read'])]
    private string $capital;

    /** Sous-région africaine (nord, ouest, centre, est, australe). */
    #[ORM\Column(length: 10, enumType: Subregion::class, options: ['default' => 'west'])]
    #[Groups(['country:read'])]
    private Subregion $subregion = Subregion::West;

    /** Fuseau IANA : Africa/Bamako, Africa/Nairobi... */
    #[ORM\Column(length: 40)]
    #[Groups(['country:read'])]
    private string $timezone;

    #[ORM\Column(length: 6)]
    #[Groups(['country:read'])]
    private string $phonePrefix;

    /** Longueurs possibles du numéro national, sans l'indicatif ni le 0 initial. */
    #[ORM\Column(type: 'json')]
    #[Groups(['country:read'])]
    private array $phoneLengths = [8];

    #[ORM\Column(length: 3)]
    #[Groups(['country:read'])]
    private string $currency = 'XOF';

    /** Langues courantes (codes ISO 639) : fr, bm, mos, ha, dje, ff... */
    #[ORM\Column(type: 'json')]
    #[Groups(['country:read'])]
    private array $languages = [];

    #[ORM\Column]
    #[Groups(['country:read'])]
    private bool $active = true;

    #[ORM\Column(type: 'smallint')]
    private int $position = 0;

    /** @var Collection<int, Region> */
    #[ORM\OneToMany(targetEntity: Region::class, mappedBy: 'country')]
    #[ORM\OrderBy(['position' => 'ASC', 'name' => 'ASC'])]
    private Collection $regions;

    public function __construct(string $code, string $name, string $capital, string $timezone, string $phonePrefix)
    {
        $this->code = $code;
        $this->name = $name;
        $this->capital = $capital;
        $this->timezone = $timezone;
        $this->phonePrefix = $phonePrefix;
        $this->regions = new ArrayCollection();
    }

    public function getId(): ?int { return $this->id; }
    public function getCode(): string { return $this->code; }
    public function getName(): string { return $this->name; }
    public function getCapital(): string { return $this->capital; }
    public function getTimezone(): string { return $this->timezone; }
    public function getPhonePrefix(): string { return $this->phonePrefix; }
    public function getCurrency(): string { return $this->currency; }
    public function setCurrency(string $currency): static { $this->currency = $currency; return $this; }
    public function getSubregion(): Subregion { return $this->subregion; }
    public function setSubregion(Subregion $subregion): static { $this->subregion = $subregion; return $this; }
    /** @return int[] */
    public function getPhoneLengths(): array { return $this->phoneLengths; }
    public function setPhoneLengths(array $lengths): static { $this->phoneLengths = $lengths; return $this; }
    /** Mise à jour depuis le référentiel. */
    public function updateReference(string $name, string $capital, string $timezone, string $phonePrefix): static
    {
        [$this->name, $this->capital, $this->timezone, $this->phonePrefix] = [$name, $capital, $timezone, $phonePrefix];

        return $this;
    }
    public function getLanguages(): array { return $this->languages; }
    public function setLanguages(array $languages): static { $this->languages = $languages; return $this; }
    public function isActive(): bool { return $this->active; }
    public function getPosition(): int { return $this->position; }
    public function setPosition(int $position): static { $this->position = $position; return $this; }

    /** @return Collection<int, Region> */
    public function getRegions(): Collection { return $this->regions; }
}
