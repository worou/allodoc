<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity]
#[ApiResource(
    operations: [new GetCollection(paginationEnabled: false), new Get(uriTemplate: '/specialties/{slug}', uriVariables: ['slug'])],
    normalizationContext: ['groups' => ['specialty:read']],
    order: ['name' => 'ASC'],
)]
class Specialty
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[ApiProperty(identifier: false)]
    private ?int $id = null;

    #[ORM\Column(length: 80, unique: true)]
    #[Groups(['specialty:read'])]
    #[ApiProperty(identifier: true)]
    private string $slug;

    #[ORM\Column(length: 100)]
    #[Groups(['specialty:read'])]
    private string $name;

    /** Nom d'icône côté front (heart, child, tooth...). */
    #[ORM\Column(length: 40)]
    #[Groups(['specialty:read'])]
    private string $icon;

    /** Traductions du libellé : {"en": "...", "ar": "..."}. Le français est la langue de base. */
    #[ORM\Column(type: 'json')]
    #[Groups(['specialty:read'])]
    private array $translations;

    public function __construct(string $slug, string $name, string $icon = 'stethoscope', array $translations = [])
    {
        $this->slug = $slug;
        $this->name = $name;
        $this->icon = $icon;
        $this->translations = $translations;
    }

    public function getId(): ?int { return $this->id; }
    public function getSlug(): string { return $this->slug; }
    public function getName(): string { return $this->name; }
    public function getIcon(): string { return $this->icon; }
    public function getTranslations(): array { return $this->translations; }
}
