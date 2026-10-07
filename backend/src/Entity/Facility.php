<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Enum\FacilityType;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

/**
 * Structure de santé : hôpital, clinique, cabinet ou centre de santé.
 */
#[ORM\Entity]
#[ApiResource(
    operations: [new GetCollection(), new Get()],
    normalizationContext: ['groups' => ['facility:read']],
)]
class Facility
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['facility:read', 'practitioner:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 150)]
    #[Groups(['facility:read', 'practitioner:read'])]
    private string $name;

    #[ORM\Column(enumType: FacilityType::class)]
    #[Groups(['facility:read', 'practitioner:read'])]
    private FacilityType $type;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['facility:read'])]
    private City $city;

    #[ORM\Column(length: 255)]
    #[Groups(['facility:read', 'practitioner:read'])]
    private string $address;

    #[ORM\Column(length: 20, nullable: true)]
    #[Groups(['facility:read', 'practitioner:read'])]
    private ?string $phone = null;

    #[ORM\Column(type: 'float', nullable: true)]
    #[Groups(['facility:read', 'practitioner:read'])]
    private ?float $latitude = null;

    #[ORM\Column(type: 'float', nullable: true)]
    #[Groups(['facility:read', 'practitioner:read'])]
    private ?float $longitude = null;

    public function __construct(string $name, FacilityType $type, City $city, string $address)
    {
        $this->name = $name;
        $this->type = $type;
        $this->city = $city;
        $this->address = $address;
    }

    public function getId(): ?int { return $this->id; }
    public function getName(): string { return $this->name; }
    public function getType(): FacilityType { return $this->type; }
    public function getCity(): City { return $this->city; }
    public function getAddress(): string { return $this->address; }
    public function getPhone(): ?string { return $this->phone; }
    public function setPhone(?string $phone): static { $this->phone = $phone; return $this; }
    public function getLatitude(): ?float { return $this->latitude; }
    public function getLongitude(): ?float { return $this->longitude; }

    public function setCoordinates(?float $latitude, ?float $longitude): static
    {
        $this->latitude = $latitude;
        $this->longitude = $longitude;

        return $this;
    }

    /** Le fuseau horaire d'une structure est celui de son pays. */
    public function getTimezone(): \DateTimeZone
    {
        return new \DateTimeZone($this->city->getRegion()->getCountry()->getTimezone());
    }
}
