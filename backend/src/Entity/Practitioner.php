<?php

namespace App\Entity;

use App\Enum\VerificationStatus;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

/**
 * Professionnel de santé. Exposé via App\Controller\PractitionerController (recherche, fiche, créneaux) :
 * seuls les praticiens vérifiés par l'administrateur pays sont visibles publiquement.
 */
#[ORM\Entity]
#[ORM\Index(columns: ['verification_status'])]
class Practitioner
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    /** Compte de connexion du praticien (null tant qu'il n'a pas réclamé sa fiche). */
    #[ORM\OneToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $user = null;

    #[ORM\Column(length: 120, unique: true)]
    private string $slug;

    #[ORM\Column(length: 10)]
    private string $title = 'Dr';

    #[ORM\Column(length: 80)]
    private string $firstName;

    #[ORM\Column(length: 80)]
    private string $lastName;

    #[ORM\Column(length: 1)]
    private string $gender;

    /** Numéro d'inscription à l'ordre professionnel, contrôlé lors de la vérification. */
    #[ORM\Column(length: 40)]
    private string $orderNumber;

    #[ORM\Column(enumType: VerificationStatus::class)]
    private VerificationStatus $verificationStatus = VerificationStatus::Pending;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $verifiedAt = null;

    /**
     * Fin de la dernière période d'abonnement payée (UTC). Le profil n'est publié (recherche, fiche, réservation)
     * que s'il est vérifié ET que cette date est future. Mis à jour par SubscriptionService.
     */
    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $publishedUntil = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $bio = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $photoUrl = null;

    /** Tarif de consultation en francs CFA. */
    #[ORM\Column]
    private int $fee = 0;

    /** @var string[] codes langues parlées (fr, bm, mos, ha, dje, ff, ar, en) */
    #[ORM\Column(type: 'json')]
    private array $languages = ['fr'];

    /** @var string[] assurances acceptées (AMO, INAM, mutuelles...) */
    #[ORM\Column(type: 'json')]
    private array $insurances = [];

    /** @var string[] diplômes affichés sur la fiche */
    #[ORM\Column(type: 'json')]
    private array $degrees = [];

    #[ORM\Column]
    private bool $teleconsultation = false;

    #[ORM\Column]
    private bool $acceptsNewPatients = true;

    /** @var Collection<int, Specialty> */
    #[ORM\ManyToMany(targetEntity: Specialty::class)]
    #[ORM\JoinTable(name: 'practitioner_specialty')]
    private Collection $specialties;

    /** @var Collection<int, Facility> */
    #[ORM\ManyToMany(targetEntity: Facility::class)]
    #[ORM\JoinTable(name: 'practitioner_facility')]
    private Collection $facilities;

    /** @var Collection<int, AvailabilityRule> */
    #[ORM\OneToMany(targetEntity: AvailabilityRule::class, mappedBy: 'practitioner', cascade: ['persist'], orphanRemoval: true)]
    private Collection $availabilityRules;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct(string $slug, string $firstName, string $lastName, string $gender, string $orderNumber)
    {
        $this->slug = $slug;
        $this->firstName = $firstName;
        $this->lastName = $lastName;
        $this->gender = $gender;
        $this->orderNumber = $orderNumber;
        $this->specialties = new ArrayCollection();
        $this->facilities = new ArrayCollection();
        $this->availabilityRules = new ArrayCollection();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getUser(): ?User { return $this->user; }
    public function setUser(?User $user): static { $this->user = $user; return $this; }
    public function getSlug(): string { return $this->slug; }
    public function getTitle(): string { return $this->title; }
    public function setTitle(string $title): static { $this->title = $title; return $this; }
    public function getFirstName(): string { return $this->firstName; }
    public function getLastName(): string { return $this->lastName; }
    public function getFullName(): string { return trim($this->title.' '.$this->firstName.' '.$this->lastName); }
    public function getGender(): string { return $this->gender; }
    public function getOrderNumber(): string { return $this->orderNumber; }
    public function getVerificationStatus(): VerificationStatus { return $this->verificationStatus; }
    public function isVerified(): bool { return $this->verificationStatus === VerificationStatus::Verified; }
    public function getVerifiedAt(): ?\DateTimeImmutable { return $this->verifiedAt; }
    public function getPublishedUntil(): ?\DateTimeImmutable { return $this->publishedUntil; }
    public function setPublishedUntil(?\DateTimeImmutable $until): static { $this->publishedUntil = $until; return $this; }

    public function hasActiveSubscription(): bool
    {
        return null !== $this->publishedUntil && $this->publishedUntil > new \DateTimeImmutable();
    }

    /** Visible et réservable par les patients. */
    public function isPublished(): bool
    {
        return $this->isVerified() && $this->hasActiveSubscription();
    }

    public function verify(): static
    {
        $this->verificationStatus = VerificationStatus::Verified;
        $this->verifiedAt = new \DateTimeImmutable();

        return $this;
    }

    public function reject(): static
    {
        $this->verificationStatus = VerificationStatus::Rejected;
        $this->verifiedAt = null;

        return $this;
    }

    public function getBio(): ?string { return $this->bio; }
    public function setBio(?string $bio): static { $this->bio = $bio; return $this; }
    public function getPhotoUrl(): ?string { return $this->photoUrl; }
    public function setPhotoUrl(?string $photoUrl): static { $this->photoUrl = $photoUrl; return $this; }
    public function getFee(): int { return $this->fee; }
    public function setFee(int $fee): static { $this->fee = $fee; return $this; }
    public function getLanguages(): array { return $this->languages; }
    public function setLanguages(array $languages): static { $this->languages = $languages; return $this; }
    public function getInsurances(): array { return $this->insurances; }
    public function setInsurances(array $insurances): static { $this->insurances = $insurances; return $this; }
    public function getDegrees(): array { return $this->degrees; }
    public function setDegrees(array $degrees): static { $this->degrees = $degrees; return $this; }
    public function hasTeleconsultation(): bool { return $this->teleconsultation; }
    public function setTeleconsultation(bool $teleconsultation): static { $this->teleconsultation = $teleconsultation; return $this; }
    public function acceptsNewPatients(): bool { return $this->acceptsNewPatients; }
    public function setAcceptsNewPatients(bool $accepts): static { $this->acceptsNewPatients = $accepts; return $this; }

    /** @return Collection<int, Specialty> */
    public function getSpecialties(): Collection { return $this->specialties; }

    public function addSpecialty(Specialty $specialty): static
    {
        if (!$this->specialties->contains($specialty)) {
            $this->specialties->add($specialty);
        }

        return $this;
    }

    /** @return Collection<int, Facility> */
    public function getFacilities(): Collection { return $this->facilities; }

    public function addFacility(Facility $facility): static
    {
        if (!$this->facilities->contains($facility)) {
            $this->facilities->add($facility);
        }

        return $this;
    }

    public function getMainFacility(): ?Facility
    {
        return $this->facilities->first() ?: null;
    }

    /** @return Collection<int, AvailabilityRule> */
    public function getAvailabilityRules(): Collection { return $this->availabilityRules; }

    public function addAvailabilityRule(AvailabilityRule $rule): static
    {
        if (!$this->availabilityRules->contains($rule)) {
            $this->availabilityRules->add($rule);
        }

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
