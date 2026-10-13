<?php

namespace App\Payment;

use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Taux de change face au dollar US : affichage de l'équivalent en dollars et montant facturé par PayPal.
 *
 * Taux du jour lus sur un service public (open.er-api.com, sans clé), mis en cache 12 heures. En cas d'échec,
 * taux de secours de services.yaml (le franc CFA étant arrimé à l'euro, il varie peu).
 */
final class ExchangeRates
{
    private const CACHE_KEY = 'exchange_rates_usd';

    public function __construct(
        private readonly HttpClientInterface $http,
        private readonly CacheInterface $cache,
        private readonly LoggerInterface $logger,
        #[Autowire('%env(EXCHANGE_RATES_URL)%')] private readonly string $url,
        #[Autowire('%app.usd_fallback_rates%')] private readonly array $fallback,
    ) {
    }

    /**
     * Unités de chaque monnaie pour 1 dollar US.
     *
     * @return array{rates: array<string, float>, updatedAt: ?string, source: string}
     */
    public function table(): array
    {
        $live = '' === $this->url ? null : $this->cache->get(self::CACHE_KEY, function (ItemInterface $item): ?array {
            $item->expiresAfter(12 * 3600);
            try {
                $data = $this->http->request('GET', $this->url, ['timeout' => 5])->toArray();
                if ('success' !== ($data['result'] ?? null) || !\is_array($data['rates'] ?? null)) {
                    throw new \UnexpectedValueException('Réponse inattendue du service de taux de change.');
                }

                return [
                    'rates' => array_map('floatval', $data['rates']),
                    'updatedAt' => isset($data['time_last_update_unix']) ? date(\DATE_ATOM, (int) $data['time_last_update_unix']) : null,
                    'source' => parse_url($this->url, \PHP_URL_HOST) ?: 'live',
                ];
            } catch (\Throwable $e) {
                // Nouvel essai dans 30 minutes ; en attendant, taux de secours.
                $item->expiresAfter(1800);
                $this->logger->warning('Taux de change indisponibles : {error}', ['error' => $e->getMessage()]);

                return null;
            }
        });

        $rates = array_map('floatval', $this->fallback);
        if (null !== $live) {
            $rates = $live['rates'] + $rates;
        }

        return ['rates' => $rates, 'updatedAt' => $live['updatedAt'] ?? null, 'source' => $live['source'] ?? 'fallback'];
    }

    /** Unités de $currency pour 1 dollar, null si inconnu. */
    public function rate(string $currency): ?float
    {
        if ('USD' === $currency) {
            return 1.0;
        }
        $rate = $this->table()['rates'][$currency] ?? null;

        return null !== $rate && $rate > 0 ? $rate : null;
    }

    /** Équivalent en cents de dollar, arrondi au cent supérieur (montant facturable par PayPal). */
    public function toUsdCents(int $amount, string $currency): int
    {
        $rate = $this->rate($currency) ?? throw new \RuntimeException(sprintf('Taux de change %s/USD inconnu.', $currency));

        return (int) ceil(round($amount / $rate * 100, 6));
    }
}
