<?php

namespace App\OAuth;

use App\Service\AccountResolver;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Flux "authorization code" OAuth 2.0 pour Google (OpenID Connect, avec PKCE) et GitHub (OAuth App).
 *
 * Références : https://developers.google.com/identity/protocols/oauth2/web-server
 *              https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
 */
final class OAuthClient
{
    public const PROVIDERS = ['google', 'github'];

    private const USER_AGENT = 'AlloDoc-OAuth';

    public function __construct(
        private readonly HttpClientInterface $http,
        #[Autowire('%env(API_PUBLIC_URL)%')] private readonly string $apiUrl,
        #[Autowire('%env(GOOGLE_CLIENT_ID)%')] private readonly string $googleId,
        #[Autowire('%env(GOOGLE_CLIENT_SECRET)%')] private readonly string $googleSecret,
        #[Autowire('%env(GITHUB_CLIENT_ID)%')] private readonly string $githubId,
        #[Autowire('%env(GITHUB_CLIENT_SECRET)%')] private readonly string $githubSecret,
    ) {
    }

    public function isConfigured(string $provider): bool
    {
        return match ($provider) {
            'google' => '' !== $this->googleId && '' !== $this->googleSecret,
            'github' => '' !== $this->githubId && '' !== $this->githubSecret,
            default => false,
        };
    }

    /** Adresse de retour à déclarer chez le fournisseur. */
    public function redirectUri(string $provider): string
    {
        return rtrim($this->apiUrl, '/').'/api/auth/oauth/'.$provider.'/callback';
    }

    public function authorizationUrl(string $provider, string $state, string $codeVerifier): string
    {
        if ('google' === $provider) {
            return 'https://accounts.google.com/o/oauth2/v2/auth?'.http_build_query([
                'client_id' => $this->googleId,
                'redirect_uri' => $this->redirectUri('google'),
                'response_type' => 'code',
                'scope' => 'openid email profile',
                'state' => $state,
                'code_challenge' => rtrim(strtr(base64_encode(hash('sha256', $codeVerifier, true)), '+/', '-_'), '='),
                'code_challenge_method' => 'S256',
                'prompt' => 'select_account',
            ]);
        }

        return 'https://github.com/login/oauth/authorize?'.http_build_query([
            'client_id' => $this->githubId,
            'redirect_uri' => $this->redirectUri('github'),
            'scope' => 'read:user user:email',
            'state' => $state,
            'allow_signup' => 'true',
        ]);
    }

    public function fetchProfile(string $provider, string $code, string $codeVerifier): OAuthProfile
    {
        try {
            return 'google' === $provider ? $this->google($code, $codeVerifier) : $this->github($code);
        } catch (ExceptionInterface $e) {
            throw new OAuthException('Le service de connexion ne répond pas. Réessayez dans un instant.', 0, $e);
        }
    }

    private function google(string $code, string $codeVerifier): OAuthProfile
    {
        $token = $this->http->request('POST', 'https://oauth2.googleapis.com/token', [
            'body' => [
                'code' => $code,
                'client_id' => $this->googleId,
                'client_secret' => $this->googleSecret,
                'redirect_uri' => $this->redirectUri('google'),
                'grant_type' => 'authorization_code',
                'code_verifier' => $codeVerifier,
            ],
        ])->toArray(false);
        if (empty($token['access_token'])) {
            throw new OAuthException('Google a refusé la connexion. Réessayez.');
        }

        $info = $this->http->request('GET', 'https://openidconnect.googleapis.com/v1/userinfo', [
            'auth_bearer' => $token['access_token'],
        ])->toArray();
        if (empty($info['sub'])) {
            throw new OAuthException('Profil Google incomplet.');
        }
        $email = isset($info['email']) ? AccountResolver::normalizeEmail((string) $info['email']) : null;

        return new OAuthProfile(
            'google',
            (string) $info['sub'],
            $email,
            null !== $email && true === ($info['email_verified'] ?? false),
            $info['given_name'] ?? null,
            $info['family_name'] ?? null,
        );
    }

    private function github(string $code): OAuthProfile
    {
        $token = $this->http->request('POST', 'https://github.com/login/oauth/access_token', [
            'headers' => ['Accept' => 'application/json', 'User-Agent' => self::USER_AGENT],
            'body' => [
                'client_id' => $this->githubId,
                'client_secret' => $this->githubSecret,
                'code' => $code,
                'redirect_uri' => $this->redirectUri('github'),
            ],
        ])->toArray(false);
        if (empty($token['access_token'])) {
            throw new OAuthException('GitHub a refusé la connexion. Réessayez.');
        }

        $headers = ['Accept' => 'application/vnd.github+json', 'User-Agent' => self::USER_AGENT, 'X-GitHub-Api-Version' => '2022-11-28'];
        $user = $this->http->request('GET', 'https://api.github.com/user', ['headers' => $headers, 'auth_bearer' => $token['access_token']])->toArray();
        if (empty($user['id'])) {
            throw new OAuthException('Profil GitHub incomplet.');
        }

        // L'adresse publique du profil peut être absente ou non vérifiée : on prend l'adresse principale vérifiée.
        $email = null;
        $emails = $this->http->request('GET', 'https://api.github.com/user/emails', ['headers' => $headers, 'auth_bearer' => $token['access_token']])->toArray(false);
        foreach (\is_array($emails) ? $emails : [] as $entry) {
            if (($entry['primary'] ?? false) && ($entry['verified'] ?? false) && isset($entry['email'])) {
                $email = AccountResolver::normalizeEmail((string) $entry['email']);
            }
        }

        // GitHub ne fournit qu'un nom complet facultatif : prénom = premier mot, nom = le reste.
        $name = trim((string) ($user['name'] ?? ''));
        $parts = '' === $name ? [] : preg_split('/\s+/', $name, 2);

        return new OAuthProfile('github', (string) $user['id'], $email, null !== $email, $parts[0] ?? null, $parts[1] ?? null);
    }
}
