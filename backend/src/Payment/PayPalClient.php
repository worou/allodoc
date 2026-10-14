<?php

namespace App\Payment;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * API REST PayPal Checkout (Orders v2) : création d'une commande en dollars puis capture du paiement après
 * accord du payeur dans la fenêtre PayPal. Le montant est toujours fixé côté serveur.
 *
 * Références : https://developer.paypal.com/docs/api/orders/v2/
 *              https://developer.paypal.com/api/rest/authentication/
 */
final class PayPalClient
{
    public function __construct(
        private readonly HttpClientInterface $http,
        private readonly CacheInterface $cache,
        #[Autowire('%env(PAYPAL_CLIENT_ID)%')] private readonly string $clientId,
        #[Autowire('%env(PAYPAL_CLIENT_SECRET)%')] private readonly string $secret,
        #[Autowire('%env(PAYPAL_ENV)%')] private readonly string $env,
        #[Autowire('%env(BRAND_NAME)%')] private readonly string $brand,
    ) {
    }

    public function isConfigured(): bool
    {
        return '' !== $this->clientId && '' !== $this->secret;
    }

    /** Identifiant public, nécessaire au bouton PayPal côté navigateur. */
    public function clientId(): string
    {
        return $this->clientId;
    }

    /** Crée la commande PayPal et renvoie son identifiant. */
    public function createOrder(string $reference, string $description, int $amountUsdCents): string
    {
        $data = $this->call('POST', '/v2/checkout/orders', [
            'intent' => 'CAPTURE',
            'purchase_units' => [[
                'reference_id' => $reference,
                'custom_id' => $reference,
                'description' => mb_substr($description, 0, 127),
                'amount' => ['currency_code' => 'USD', 'value' => self::formatCents($amountUsdCents)],
            ]],
            'payment_source' => ['paypal' => ['experience_context' => [
                'brand_name' => $this->brand,
                'shipping_preference' => 'NO_SHIPPING',
                'user_action' => 'PAY_NOW',
            ]]],
        ], $reference.'-'.$amountUsdCents);

        return (string) ($data['id'] ?? throw new PayPalException('Commande PayPal non créée.'));
    }

    /**
     * Capture le paiement d'une commande approuvée (ou relit la commande si elle a déjà été capturée).
     *
     * @return array{status: string, captureId: ?string, currency: ?string, amountCents: ?int, customId: ?string}
     */
    public function capture(string $orderId): array
    {
        try {
            $data = $this->call('POST', '/v2/checkout/orders/'.rawurlencode($orderId).'/capture', null, 'capture-'.$orderId);
        } catch (PayPalException $e) {
            if ('ORDER_ALREADY_CAPTURED' !== $e->issue) {
                throw $e;
            }
            $data = $this->call('GET', '/v2/checkout/orders/'.rawurlencode($orderId));
        }

        $unit = $data['purchase_units'][0] ?? [];
        $capture = $unit['payments']['captures'][0] ?? null;

        return [
            'status' => (string) ($capture['status'] ?? $data['status'] ?? ''),
            'captureId' => $capture['id'] ?? null,
            'currency' => $capture['amount']['currency_code'] ?? null,
            'amountCents' => isset($capture['amount']['value']) ? (int) round((float) $capture['amount']['value'] * 100) : null,
            'customId' => $capture['custom_id'] ?? $unit['custom_id'] ?? null,
        ];
    }

    public static function formatCents(int $cents): string
    {
        return sprintf('%d.%02d', intdiv($cents, 100), $cents % 100);
    }

    private function baseUrl(): string
    {
        return 'live' === $this->env ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    }

    /** Jeton OAuth 2.0 "client credentials", mis en cache jusqu'à peu avant son expiration. */
    private function token(): string
    {
        return $this->cache->get('paypal_token_'.hash('xxh3', $this->env.$this->clientId), function (ItemInterface $item): string {
            try {
                $data = $this->http->request('POST', $this->baseUrl().'/v1/oauth2/token', [
                    'auth_basic' => [$this->clientId, $this->secret],
                    'body' => ['grant_type' => 'client_credentials'],
                    'timeout' => 15,
                ])->toArray();
            } catch (ExceptionInterface $e) {
                throw new PayPalException('Connexion à PayPal impossible.', previous: $e);
            }
            $item->expiresAfter(max(60, (int) ($data['expires_in'] ?? 3600) - 120));

            return (string) ($data['access_token'] ?? throw new PayPalException('Jeton PayPal absent.'));
        });
    }

    private function call(string $method, string $path, ?array $json = null, ?string $requestId = null): array
    {
        if (!$this->isConfigured()) {
            throw new PayPalException('PayPal n\'est pas configuré.');
        }
        $headers = ['Authorization' => 'Bearer '.$this->token(), 'Content-Type' => 'application/json', 'Prefer' => 'return=representation'];
        if (null !== $requestId) {
            // Rejouer la même requête (réseau instable) ne crée ni deuxième commande ni deuxième débit.
            $headers['PayPal-Request-Id'] = $requestId;
        }
        try {
            $response = $this->http->request($method, $this->baseUrl().$path, [
                'headers' => $headers,
                'body' => 'POST' === $method ? json_encode($json ?? new \stdClass(), \JSON_THROW_ON_ERROR) : null,
                'timeout' => 20,
            ]);
            $data = $response->toArray(false);
            if ($response->getStatusCode() >= 400) {
                throw new PayPalException((string) ($data['message'] ?? 'Erreur PayPal.'), $data['details'][0]['issue'] ?? $data['name'] ?? null);
            }

            return $data;
        } catch (ExceptionInterface $e) {
            throw new PayPalException('Connexion à PayPal impossible.', previous: $e);
        }
    }
}
