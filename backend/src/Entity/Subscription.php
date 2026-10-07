<?php

namespace App\Entity;

use App\Enum\SubscriptionStatus;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Période d'abonnement achetée par un praticien. Un renouvellement crée une nouvelle période qui commence
 * à la fin de la précédente (rien n'est perdu en renouvelant en avance). Les dates sont en UTC.
 */
#[ORM\Entity]
#[ORM\Index(columns: ['status', 'created_at'])]
class Subscription
{
    public const METHODS = [
        'orange_money' => 'Orange Money',
        'moov_money' => 'Moov Money',
        'wave' => 'Wave',
        'airtel_money' => 'Airtel Money',
        'cash' => 'Espèces (agence ou équipe terrain)',
    ];

    #[ORM\Id, ORM\Column(type: 'uuid')]
    private Uuid $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Practitioner $practitioner;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private SubscriptionPlan $plan;

    /** Montant figé au moment de la commande (le tarif de la formule peut évoluer ensuite). */
    #[ORM\Column]
    private int $amount;

    #[ORM\Column(length: 3)]
    private string $currency;

    #[ORM\Column(enumType: SubscriptionStatus::class)]
    private SubscriptionStatus $status = SubscriptionStatus::Pending;

    /** Référence à indiquer lors du paiement mobile money, ex. AD-7K3F9Q. */
    #[ORM\Column(length: 12, unique: true)]
    private string $reference;

    #[ORM\Column(length: 20)]
    private string $paymentMethod;

    /** Identifiant de transaction de l'opérateur, saisi à la confirmation. */
    #[ORM\Column(length: 80, nullable: true)]
    private ?string $transactionId = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $startsAt = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $endsAt = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $paidAt = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $confirmedBy = null;

    public function __construct(Practitioner $practitioner, SubscriptionPlan $plan, string $paymentMethod)
    {
        $this->id = Uuid::v7();
        $this->practitioner = $practitioner;
        $this->plan = $plan;
        $this->amount = $plan->getPrice();
        $this->currency = $plan->getCurrency();
        $this->paymentMethod = $paymentMethod;
        $this->reference = 'AD-'.strtoupper(substr(str_replace(['+', '/', '='], '', base64_encode(random_bytes(8))), 0, 6));
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getPractitioner(): Practitioner { return $this->practitioner; }
    public function getPlan(): SubscriptionPlan { return $this->plan; }
    public function getAmount(): int { return $this->amount; }
    public function getCurrency(): string { return $this->currency; }
    public function getStatus(): SubscriptionStatus { return $this->status; }
    public function getReference(): string { return $this->reference; }
    public function getPaymentMethod(): string { return $this->paymentMethod; }
    public function getTransactionId(): ?string { return $this->transactionId; }
    public function getStartsAt(): ?\DateTimeImmutable { return $this->startsAt; }
    public function getEndsAt(): ?\DateTimeImmutable { return $this->endsAt; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getPaidAt(): ?\DateTimeImmutable { return $this->paidAt; }
    public function getConfirmedBy(): ?User { return $this->confirmedBy; }

    /** Enregistre le paiement et fixe la période, qui commence à $startsAt (fin de la période en cours ou maintenant). */
    public function markPaid(\DateTimeImmutable $startsAt, ?string $transactionId, ?User $confirmedBy): void
    {
        $this->status = SubscriptionStatus::Paid;
        $this->paidAt = new \DateTimeImmutable();
        $this->startsAt = $startsAt;
        $this->endsAt = $startsAt->modify(sprintf('+%d months', $this->plan->getDurationMonths()));
        $this->transactionId = $transactionId;
        $this->confirmedBy = $confirmedBy;
    }

    public function cancel(): void
    {
        $this->status = SubscriptionStatus::Cancelled;
    }
}
