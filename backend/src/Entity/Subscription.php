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
    /**
     * Moyens de paiement (code => libellé). Les moyens proposés à un praticien dépendent de son pays
     * ("payments" dans config/reference/africa.json) ; PayPal est encaissé en dollars et confirmé automatiquement.
     */
    public const METHODS = [
        'mobile_money' => 'Mobile money',
        'paypal' => 'PayPal',
        'bank_transfer' => 'Virement bancaire',
        // Afrique de l'Ouest et centrale
        'orange_money' => 'Orange Money',
        'moov_money' => 'Moov Money',
        'mtn_momo' => 'MTN Mobile Money',
        'wave' => 'Wave',
        'airtel_money' => 'Airtel Money',
        'free_money' => 'Free Money',
        'celtiis_cash' => 'Celtiis Cash',
        'flooz' => 'Flooz',
        'tmoney' => 'T-Money',
        'telecel_cash' => 'Telecel Cash',
        'at_money' => 'AT Money',
        'afrimoney' => 'Afrimoney',
        'qmoney' => 'QMoney',
        'africell_money' => 'Africell Money',
        'zamani_cash' => 'Zamani Cash',
        'bankily' => 'Bankily',
        'masrvi' => 'Masrvi',
        'sedad' => 'Sedad',
        'opay' => 'OPay',
        'palmpay' => 'PalmPay',
        'telecel_money' => 'Telecel Money',
        'multicaixa_express' => 'Multicaixa Express',
        'unitel_money' => 'Unitel Money',
        // Afrique du Nord
        'baridimob' => 'BaridiMob',
        'vodafone_cash' => 'Vodafone Cash',
        'instapay' => 'InstaPay',
        'fawry' => 'Fawry',
        'cash_plus' => 'Cash Plus',
        'wafacash' => 'Wafacash',
        'bankak' => 'Bankak',
        'd17' => 'D17',
        'flouci' => 'Flouci',
        // Afrique de l'Est et australe
        'mpesa' => 'M-Pesa',
        'telebirr' => 'telebirr',
        'mvola' => 'MVola',
        'huri_money' => 'Huri Money',
        'd_money' => 'D-Money',
        'waafi' => 'Waafi',
        'lumicash' => 'Lumicash',
        'ecocash' => 'EcoCash',
        'onemoney' => 'OneMoney',
        'mpamba' => 'TNM Mpamba',
        'juice' => 'Juice by MCB',
        'myt_money' => 'my.t money',
        'emola' => 'e-Mola',
        'mkesh' => 'mKesh',
        'evc_plus' => 'EVC Plus',
        'zaad' => 'Zaad',
        'sahal' => 'Sahal',
        'mgurush' => 'm-Gurush',
        'mixx_by_yas' => 'Mixx by Yas',
        'halopesa' => 'HaloPesa',
        'zamtel_kwacha' => 'Zamtel Kwacha',
        'myzaka' => 'MyZaka',
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

    /** Paiement en ligne (PayPal) : identifiant de la commande chez le prestataire et montant facturé en cents de dollar. */
    #[ORM\Column(length: 40, nullable: true)]
    private ?string $providerOrderId = null;

    #[ORM\Column(nullable: true)]
    private ?int $amountUsdCents = null;

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
    public function getProviderOrderId(): ?string { return $this->providerOrderId; }
    public function getAmountUsdCents(): ?int { return $this->amountUsdCents; }

    /** Paiement reçu mais non validé automatiquement (montant ou référence inattendus) : trace pour l'administrateur. */
    public function recordUnverifiedPayment(string $transactionId): void
    {
        $this->transactionId = mb_substr($transactionId, 0, 80);
    }

    /** Commande créée chez le prestataire de paiement en ligne, pour un montant en dollars figé. */
    public function startOnlinePayment(string $providerOrderId, int $amountUsdCents): void
    {
        $this->providerOrderId = $providerOrderId;
        $this->amountUsdCents = $amountUsdCents;
    }

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
