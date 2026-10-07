<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

/**
 * Formule d'abonnement praticien (publication sur la plateforme). Tarifs en base : modifiables sans déploiement.
 * Formules initiales : semestre 6 000 FCFA, année 10 000 FCFA.
 */
#[ORM\Entity]
#[ApiResource(
    shortName: 'SubscriptionPlan',
    operations: [
        new GetCollection(uriTemplate: '/subscription-plans', paginationEnabled: false),
        new Get(uriTemplate: '/subscription-plans/{code}', uriVariables: ['code']),
    ],
    normalizationContext: ['groups' => ['plan:read']],
    order: ['position' => 'ASC'],
)]
class SubscriptionPlan
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[ApiProperty(identifier: false)]
    private ?int $id = null;

    /** semester, annual */
    #[ORM\Column(length: 20, unique: true)]
    #[ApiProperty(identifier: true)]
    #[Groups(['plan:read'])]
    private string $code;

    #[ORM\Column(length: 60)]
    #[Groups(['plan:read'])]
    private string $name;

    #[ORM\Column(type: 'smallint')]
    #[Groups(['plan:read'])]
    private int $durationMonths;

    /** Prix en francs CFA (XOF). */
    #[ORM\Column]
    #[Groups(['plan:read'])]
    private int $price;

    #[ORM\Column(length: 3)]
    #[Groups(['plan:read'])]
    private string $currency = 'XOF';

    #[ORM\Column]
    #[Groups(['plan:read'])]
    private bool $active = true;

    #[ORM\Column(type: 'smallint')]
    private int $position = 0;

    public function __construct(string $code, string $name, int $durationMonths, int $price, int $position = 0)
    {
        $this->code = $code;
        $this->name = $name;
        $this->durationMonths = $durationMonths;
        $this->price = $price;
        $this->position = $position;
    }

    public function getId(): ?int { return $this->id; }
    public function getCode(): string { return $this->code; }
    public function getName(): string { return $this->name; }
    public function getDurationMonths(): int { return $this->durationMonths; }
    public function getPrice(): int { return $this->price; }
    public function getCurrency(): string { return $this->currency; }
    public function isActive(): bool { return $this->active; }

    /** Prix ramené au mois, pour comparer les formules (arrondi). */
    #[Groups(['plan:read'])]
    public function getMonthlyPrice(): int
    {
        return (int) round($this->price / $this->durationMonths);
    }
}
