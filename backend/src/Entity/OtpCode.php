<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * Code à usage unique envoyé par SMS (destination = numéro E.164) ou par email (destination = adresse en
 * minuscules). Seul le hash est stocké.
 */
#[ORM\Entity]
#[ORM\Index(columns: ['destination', 'created_at'])]
class OtpCode
{
    public const MAX_ATTEMPTS = 5;

    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 180)]
    private string $destination;

    #[ORM\Column(length: 64)]
    private string $codeHash;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $expiresAt;

    #[ORM\Column(type: 'smallint')]
    private int $attempts = 0;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $consumedAt = null;

    public function __construct(string $destination, string $codeHash, \DateTimeImmutable $expiresAt)
    {
        $this->destination = $destination;
        $this->codeHash = $codeHash;
        $this->createdAt = new \DateTimeImmutable();
        $this->expiresAt = $expiresAt;
    }

    public function getDestination(): string { return $this->destination; }
    public function getCodeHash(): string { return $this->codeHash; }
    public function getAttempts(): int { return $this->attempts; }
    public function incrementAttempts(): void { ++$this->attempts; }
    public function consume(): void { $this->consumedAt = new \DateTimeImmutable(); }

    public function isUsable(): bool
    {
        return null === $this->consumedAt
            && $this->attempts < self::MAX_ATTEMPTS
            && $this->expiresAt > new \DateTimeImmutable();
    }
}
