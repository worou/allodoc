<?php

namespace App\Security;

use App\Entity\ApiToken;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Security\Core\Exception\BadCredentialsException;
use Symfony\Component\Security\Http\AccessToken\AccessTokenHandlerInterface;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;

/**
 * Authentifie les requêtes "Authorization: Bearer <jeton>" à partir des jetons émis par OtpService.
 */
final class ApiTokenHandler implements AccessTokenHandlerInterface
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    public function getUserBadgeFrom(string $accessToken): UserBadge
    {
        $token = $this->em->getRepository(ApiToken::class)->findOneBy(['tokenHash' => hash('sha256', $accessToken)]);
        if (null === $token || !$token->isValid()) {
            throw new BadCredentialsException('Jeton invalide ou expiré.');
        }

        $user = $token->getUser();

        return new UserBadge($user->getUserIdentifier(), static fn () => $user);
    }
}
