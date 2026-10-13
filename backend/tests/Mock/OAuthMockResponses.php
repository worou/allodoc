<?php

namespace App\Tests\Mock;

use Symfony\Component\HttpClient\Response\MockResponse;

/**
 * Remplace les appels HTTP vers Google, GitHub et PayPal (sandbox) dans l'environnement de test
 * (framework.http_client.mock_response_factory). Les tests choisissent le profil renvoyé via self::$profile
 * et peuvent modifier la capture PayPal via self::$paypalCapture.
 */
final class OAuthMockResponses
{
    /** Réponse de /userinfo (Google) ou /user (GitHub). */
    public static array $profile = [];

    /** Réponse de /user/emails (GitHub). */
    public static array $githubEmails = [];

    /** Corps de la dernière commande PayPal créée. */
    public static ?array $paypalOrder = null;

    /** Remplace la capture PayPal par défaut (paiement complet du montant commandé). */
    public static ?array $paypalCapture = null;

    public static function reset(): void
    {
        self::$paypalOrder = self::$paypalCapture = null;
    }

    public function __invoke(string $method, string $url, array $options = []): MockResponse
    {
        $json = static fn (array $data, int $status = 200) => new MockResponse(json_encode($data), ['http_code' => $status, 'response_headers' => ['content-type' => 'application/json']]);
        $paypal = 'https://api-m.sandbox.paypal.com';

        return match (true) {
            str_starts_with($url, 'https://oauth2.googleapis.com/token') => $json(['access_token' => 'google-access-token', 'token_type' => 'Bearer']),
            str_starts_with($url, 'https://openidconnect.googleapis.com/v1/userinfo') => $json(self::$profile),
            str_starts_with($url, 'https://github.com/login/oauth/access_token') => $json(['access_token' => 'github-access-token', 'token_type' => 'bearer']),
            str_starts_with($url, 'https://api.github.com/user/emails') => $json(self::$githubEmails),
            str_starts_with($url, 'https://api.github.com/user') => $json(self::$profile),
            $url === $paypal.'/v1/oauth2/token' => $json(['access_token' => 'paypal-token', 'token_type' => 'Bearer', 'expires_in' => 32400]),
            'POST' === $method && $url === $paypal.'/v2/checkout/orders' => $json(['id' => 'PAYPAL-ORDER-1', 'status' => 'PAYER_ACTION_REQUIRED'] + (self::$paypalOrder = json_decode((string) $options['body'], true)), 201),
            str_starts_with($url, $paypal.'/v2/checkout/orders/PAYPAL-ORDER-1/capture') => $json(self::$paypalCapture ?? self::completedCapture(), 201),
            default => $json(['error' => 'unexpected '.$method.' '.$url], 500),
        };
    }

    /** Capture réussie du montant et de la référence de la dernière commande créée. */
    public static function completedCapture(?string $value = null): array
    {
        $unit = self::$paypalOrder['purchase_units'][0] ?? [];

        return [
            'id' => 'PAYPAL-ORDER-1',
            'status' => 'COMPLETED',
            'purchase_units' => [[
                'reference_id' => $unit['reference_id'] ?? null,
                'payments' => ['captures' => [[
                    'id' => 'CAPTURE-42',
                    'status' => 'COMPLETED',
                    'amount' => ['currency_code' => 'USD', 'value' => $value ?? $unit['amount']['value'] ?? '0.00'],
                    'custom_id' => $unit['custom_id'] ?? null,
                ]]],
            ]],
        ];
    }
}
