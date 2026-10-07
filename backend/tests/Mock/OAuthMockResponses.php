<?php

namespace App\Tests\Mock;

use Symfony\Component\HttpClient\Response\MockResponse;

/**
 * Remplace les appels HTTP vers Google et GitHub dans l'environnement de test
 * (framework.http_client.mock_response_factory). Les tests choisissent le profil renvoyé via self::$profile.
 */
final class OAuthMockResponses
{
    /** Réponse de /userinfo (Google) ou /user (GitHub). */
    public static array $profile = [];

    /** Réponse de /user/emails (GitHub). */
    public static array $githubEmails = [];

    public function __invoke(string $method, string $url, array $options = []): MockResponse
    {
        $json = static fn (array $data, int $status = 200) => new MockResponse(json_encode($data), ['http_code' => $status, 'response_headers' => ['content-type' => 'application/json']]);

        return match (true) {
            str_starts_with($url, 'https://oauth2.googleapis.com/token') => $json(['access_token' => 'google-access-token', 'token_type' => 'Bearer']),
            str_starts_with($url, 'https://openidconnect.googleapis.com/v1/userinfo') => $json(self::$profile),
            str_starts_with($url, 'https://github.com/login/oauth/access_token') => $json(['access_token' => 'github-access-token', 'token_type' => 'bearer']),
            str_starts_with($url, 'https://api.github.com/user/emails') => $json(self::$githubEmails),
            str_starts_with($url, 'https://api.github.com/user') => $json(self::$profile),
            default => $json(['error' => 'unexpected '.$method.' '.$url], 500),
        };
    }
}
