<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * Journal d'audit des accès et actions sensibles (exigence de sécurité des données de santé).
 */
#[ORM\Entity]
#[ORM\Index(columns: ['created_at'])]
class AuditLog
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $actor;

    #[ORM\Column(length: 60)]
    private string $action;

    #[ORM\Column(length: 120)]
    private string $subject;

    #[ORM\Column(length: 45, nullable: true)]
    private ?string $ip;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct(?User $actor, string $action, string $subject, ?string $ip)
    {
        $this->actor = $actor;
        $this->action = $action;
        $this->subject = $subject;
        $this->ip = $ip;
        $this->createdAt = new \DateTimeImmutable();
    }
}
