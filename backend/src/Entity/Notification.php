<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * Journal des messages envoyés (SMS, WhatsApp, email). Le contenu ne doit contenir aucune donnée clinique.
 */
#[ORM\Entity]
class Notification
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 10)]
    private string $channel;

    #[ORM\Column(length: 180)]
    private string $recipient;

    #[ORM\Column(length: 30)]
    private string $template;

    #[ORM\Column(type: 'text')]
    private string $body;

    #[ORM\Column(length: 10)]
    private string $status;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct(string $channel, string $recipient, string $template, string $body, string $status = 'sent')
    {
        $this->channel = $channel;
        $this->recipient = $recipient;
        $this->template = $template;
        $this->body = $body;
        $this->status = $status;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getBody(): string { return $this->body; }
    public function getRecipient(): string { return $this->recipient; }
}
