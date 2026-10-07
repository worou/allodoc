<?php

namespace App\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * Compte utilisateur, sans mot de passe. Connexion par code reçu par SMS ou par email, ou via Google / GitHub.
 * Un compte créé par email, Google ou GitHub n'a pas encore de téléphone : il doit en ajouter un (vérifié par
 * code SMS) avant de réserver, car confirmations et rappels passent par SMS.
 */
#[ORM\Entity]
#[ORM\Table(name: '`user`')]
#[ORM\Index(columns: ['email'])]
class User implements UserInterface
{
    public const ROLE_PATIENT = 'ROLE_PATIENT';
    public const ROLE_PRACTITIONER = 'ROLE_PRACTITIONER';
    public const ROLE_COUNTRY_ADMIN = 'ROLE_COUNTRY_ADMIN';
    public const ROLE_SUPER_ADMIN = 'ROLE_SUPER_ADMIN';

    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    /** Numéro vérifié par SMS (E.164) ; null tant qu'un compte créé par email, Google ou GitHub n'en a pas ajouté. */
    #[ORM\Column(length: 20, unique: true, nullable: true)]
    private ?string $phone;

    #[ORM\Column(length: 180, nullable: true)]
    private ?string $email = null;

    /**
     * Renseigné seulement quand la possession de l'adresse est prouvée (code email, Google, GitHub).
     * Seule une adresse vérifiée permet de retrouver ou rattacher automatiquement un compte.
     */
    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $emailVerifiedAt = null;

    /** Identifiant Google ("sub" OpenID Connect). */
    #[ORM\Column(length: 64, unique: true, nullable: true)]
    private ?string $googleId = null;

    /** Identifiant numérique GitHub. */
    #[ORM\Column(length: 64, unique: true, nullable: true)]
    private ?string $githubId = null;

    #[ORM\Column(length: 80, nullable: true)]
    private ?string $firstName = null;

    #[ORM\Column(length: 80, nullable: true)]
    private ?string $lastName = null;

    #[ORM\Column(type: 'json')]
    private array $roles = [];

    /** Pays administré, pour ROLE_COUNTRY_ADMIN. */
    #[ORM\ManyToOne]
    private ?Country $adminCountry = null;

    #[ORM\Column(length: 5)]
    private string $locale = 'fr';

    /** Consentement explicite au traitement des données (exigence des lois de protection des données). */
    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $consentAt = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    /** @var Collection<int, Relative> */
    #[ORM\OneToMany(targetEntity: Relative::class, mappedBy: 'owner', cascade: ['persist'], orphanRemoval: true)]
    private Collection $relatives;

    public function __construct(?string $phone)
    {
        $this->phone = $phone;
        $this->createdAt = new \DateTimeImmutable();
        $this->relatives = new ArrayCollection();
    }

    public function getId(): ?int { return $this->id; }
    public function getPhone(): ?string { return $this->phone; }
    /** Uniquement avec un numéro dont la possession a été prouvée par code SMS. */
    public function setVerifiedPhone(string $phone): static { $this->phone = $phone; return $this; }
    public function getEmail(): ?string { return $this->email; }

    /** Adresse saisie librement : elle perd son statut vérifié si elle change. */
    public function setEmail(?string $email): static
    {
        if ($email !== $this->email) {
            $this->emailVerifiedAt = null;
        }
        $this->email = $email;

        return $this;
    }

    /** Uniquement avec une adresse prouvée (code email, Google, GitHub). */
    public function setVerifiedEmail(string $email): static
    {
        $this->email = $email;
        $this->emailVerifiedAt ??= new \DateTimeImmutable();

        return $this;
    }

    public function isEmailVerified(): bool { return null !== $this->emailVerifiedAt; }
    public function getGoogleId(): ?string { return $this->googleId; }
    public function setGoogleId(?string $googleId): static { $this->googleId = $googleId; return $this; }
    public function getGithubId(): ?string { return $this->githubId; }
    public function setGithubId(?string $githubId): static { $this->githubId = $githubId; return $this; }
    public function getFirstName(): ?string { return $this->firstName; }
    public function setFirstName(?string $firstName): static { $this->firstName = $firstName; return $this; }
    public function getLastName(): ?string { return $this->lastName; }
    public function setLastName(?string $lastName): static { $this->lastName = $lastName; return $this; }
    public function getLocale(): string { return $this->locale; }
    public function setLocale(string $locale): static { $this->locale = $locale; return $this; }
    public function getConsentAt(): ?\DateTimeImmutable { return $this->consentAt; }
    public function giveConsent(): static { $this->consentAt ??= new \DateTimeImmutable(); return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getAdminCountry(): ?Country { return $this->adminCountry; }
    public function setAdminCountry(?Country $country): static { $this->adminCountry = $country; return $this; }

    public function getUserIdentifier(): string
    {
        return $this->phone ?? 'user:'.$this->id;
    }

    public function getRoles(): array
    {
        return array_values(array_unique([...$this->roles, self::ROLE_PATIENT]));
    }

    public function setRoles(array $roles): static
    {
        $this->roles = $roles;

        return $this;
    }

    public function hasRole(string $role): bool
    {
        return \in_array($role, $this->getRoles(), true);
    }

    public function eraseCredentials(): void
    {
    }

    /** @return Collection<int, Relative> */
    public function getRelatives(): Collection { return $this->relatives; }

    public function addRelative(Relative $relative): static
    {
        if (!$this->relatives->contains($relative)) {
            $this->relatives->add($relative);
        }

        return $this;
    }
}
