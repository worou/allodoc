<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * Jeton d'accès opaque remis après vérification de l'OTP. Seul le hash SHA-256 est stocké.
 */
#[ORM\Entity]
class ApiToken
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column(length: 64, unique: true)]
    private string $tokenHash;

    #[ORM\Column]
    private \DateTimeImmutable $expiresAt;

    public function __construct(User $user, string $tokenHash, \DateTimeImmutable $expiresAt)
    {
        $this->user = $user;
        $this->tokenHash = $tokenHash;
        $this->expiresAt = $expiresAt;
    }

    public function getUser(): User { return $this->user; }
    public function isValid(): bool { return $this->expiresAt > new \DateTimeImmutable(); }
}
