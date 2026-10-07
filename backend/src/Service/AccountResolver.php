<?php

namespace App\Service;

use App\Entity\User;
use App\OAuth\OAuthProfile;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Retrouve ou crée le compte correspondant à une identité prouvée (email vérifié, compte Google ou GitHub).
 *
 * Règle de sécurité : on ne rattache jamais une connexion à un compte via une adresse email que ce compte n'a
 * pas lui-même vérifiée. Sinon, n'importe qui pourrait saisir l'adresse d'une autre personne dans son profil
 * et récupérer ses connexions Google.
 */
final class AccountResolver
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    public static function normalizeEmail(string $email): ?string
    {
        $email = mb_strtolower(trim($email));

        return filter_var($email, \FILTER_VALIDATE_EMAIL) && mb_strlen($email) <= 180 ? $email : null;
    }

    public function findByVerifiedEmail(string $email): ?User
    {
        return $this->em->createQueryBuilder()
            ->select('u')->from(User::class, 'u')
            ->where('u.email = :email AND u.emailVerifiedAt IS NOT NULL')
            ->setParameter('email', $email)
            ->orderBy('u.id', 'ASC')
            ->setMaxResults(1)
            ->getQuery()->getOneOrNullResult();
    }

    public function resolveOAuth(OAuthProfile $profile): User
    {
        $idField = $profile->provider.'Id';
        $user = $this->em->getRepository(User::class)->findOneBy([$idField => $profile->id]);

        if (null === $user && null !== $profile->email && $profile->emailVerified) {
            $user = $this->findByVerifiedEmail($profile->email);
        }

        if (null === $user) {
            $user = new User(null);
            $this->em->persist($user);
        }

        'google' === $profile->provider ? $user->setGoogleId($profile->id) : $user->setGithubId($profile->id);
        if (null !== $profile->email && $profile->emailVerified && (null === $user->getEmail() || !$user->isEmailVerified())) {
            $user->setVerifiedEmail($profile->email);
        }
        if (null === $user->getFirstName() && null !== $profile->firstName) {
            $user->setFirstName(mb_substr($profile->firstName, 0, 80));
        }
        if (null === $user->getLastName() && null !== $profile->lastName) {
            $user->setLastName(mb_substr($profile->lastName, 0, 80));
        }
        $this->em->flush();

        return $user;
    }
}
