<?php

namespace App\OAuth;

/**
 * Identité renvoyée par un fournisseur OAuth après connexion.
 */
final class OAuthProfile
{
    public function __construct(
        public readonly string $provider,
        public readonly string $id,
        public readonly ?string $email,
        public readonly bool $emailVerified,
        public readonly ?string $firstName,
        public readonly ?string $lastName,
    ) {
    }
}
