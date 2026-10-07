<?php

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity]
#[ApiResource(
    operations: [new GetCollection(paginationEnabled: false), new Get()],
    normalizationContext: ['groups' => ['city:read']],
    order: ['name' => 'ASC'],
)]
#[ApiFilter(SearchFilter::class, properties: ['region.country.code' => 'exact', 'region.slug' => 'exact'])]
class City
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['city:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['city:read'])]
    private Region $region;

    #[ORM\Column(length: 100)]
    #[Groups(['city:read'])]
    private string $name;

    #[ORM\Column(type: 'float', nullable: true)]
    #[Groups(['city:read'])]
    private ?float $latitude;

    #[ORM\Column(type: 'float', nullable: true)]
    #[Groups(['city:read'])]
    private ?float $longitude;

    public function __construct(Region $region, string $name, ?float $latitude = null, ?float $longitude = null)
    {
        $this->region = $region;
        $this->name = $name;
        $this->latitude = $latitude;
        $this->longitude = $longitude;
    }

    public function getId(): ?int { return $this->id; }
    public function getRegion(): Region { return $this->region; }
    public function getName(): string { return $this->name; }
    public function getLatitude(): ?float { return $this->latitude; }
    public function getLongitude(): ?float { return $this->longitude; }
}
