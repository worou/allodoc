<?php

namespace App\Service;

use App\Entity\Practitioner;
use App\Entity\Subscription;
use App\Entity\SubscriptionPlan;
use App\Entity\User;
use App\Enum\SubscriptionStatus;
use App\Payment\ExchangeRates;
use App\Payment\PayPalClient;
use App\Payment\PayPalException;
use App\Reference\ReferenceLoader;
use App\Sms\SmsSenderInterface;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Abonnement de publication des praticiens : commande, confirmation du paiement, renouvellement.
 *
 * Paiement : moyens propres au pays du praticien (config/reference/africa.json). Mobile money et virement :
 * le praticien paie en indiquant la référence de commande, l'administrateur de son pays confirme la réception.
 * PayPal : paiement en dollars US (équivalent du prix en FCFA au taux du jour), capturé côté serveur puis
 * confirmé automatiquement après vérification du montant et de la référence.
 */
final class SubscriptionService
{
    /** Délai au-delà duquel une commande non payée est considérée comme abandonnée. */
    private const PENDING_TTL = '-14 days';

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly SmsSenderInterface $sms,
        private readonly PayPalClient $paypal,
        private readonly LoggerInterface $logger,
        private readonly ExchangeRates $rates,
        #[Autowire('%app.payment_accounts%')] private readonly array $paymentAccounts,
    ) {
    }

    /** Moyens de paiement proposés dans le pays du praticien (PayPal seulement s'il est configuré). */
    public function paymentMethods(Practitioner $practitioner): array
    {
        $country = $this->countryCode($practitioner);
        $methods = ReferenceLoader::countries()[$country]['payments'] ?? ['mobile_money', 'paypal'];

        return array_values(array_filter($methods, fn (string $m) => 'paypal' !== $m || $this->paypal->isConfigured()));
    }

    public function order(Practitioner $practitioner, SubscriptionPlan $plan, string $method): Subscription
    {
        if (!$plan->isActive()) {
            throw new BookingException('Cette formule n\'est plus proposée.', 422);
        }
        // Seuls les moyens proposés dans le pays du praticien sont acceptés.
        if (!isset(Subscription::METHODS[$method]) || !\in_array($method, $this->paymentMethods($practitioner), true)) {
            throw new BookingException('Moyen de paiement non disponible.', 422);
        }
        // Une seule commande en attente à la fois : la nouvelle remplace l'ancienne.
        foreach ($this->pending($practitioner) as $old) {
            $old->cancel();
        }
        $subscription = new Subscription($practitioner, $plan, $method);
        $this->em->persist($subscription);
        $this->em->flush();

        return $subscription;
    }

    /** Valide le paiement : la période démarre à la fin de l'abonnement en cours (renouvellement) ou maintenant. */
    public function confirmPayment(Subscription $subscription, ?string $transactionId, ?User $confirmedBy): void
    {
        if (SubscriptionStatus::Pending !== $subscription->getStatus()) {
            throw new BookingException('Cette commande n\'est plus en attente de paiement.', 409);
        }
        $practitioner = $subscription->getPractitioner();
        $now = new \DateTimeImmutable();
        $current = $practitioner->getPublishedUntil();
        $start = null !== $current && $current > $now ? $current : $now;

        $subscription->markPaid($start, $transactionId, $confirmedBy);
        $practitioner->setPublishedUntil($subscription->getEndsAt());
        $this->em->flush();

        $phone = $practitioner->getUser()?->getPhone();
        if (null !== $phone) {
            $this->sms->send($phone, sprintf(
                'AlloDoc : paiement %s reçu (%s FCFA). Votre profil est publié jusqu\'au %s. Merci !',
                $subscription->getReference(),
                number_format($subscription->getAmount(), 0, ',', ' '),
                $subscription->getEndsAt()->format('d/m/Y'),
            ));
        }
    }

    /** @return list<Subscription> */
    public function pending(Practitioner $practitioner): array
    {
        return $this->em->getRepository(Subscription::class)->findBy(['practitioner' => $practitioner, 'status' => SubscriptionStatus::Pending], ['createdAt' => 'DESC']);
    }

    /** @return list<Subscription> */
    public function history(Practitioner $practitioner): array
    {
        return $this->em->getRepository(Subscription::class)->findBy(['practitioner' => $practitioner], ['createdAt' => 'DESC'], 20);
    }

    /**
     * Coordonnées de réception pour chaque moyen du pays (services.yaml) : numéro du pays pour ce moyen, sinon numéro
     * mobile money du pays, sinon numéro par défaut. null : coordonnées communiquées par l'équipe AlloDoc.
     *
     * @return array<string, ?string> moyen => numéro, plus "holder" (titulaire)
     */
    public function paymentAccount(Practitioner $practitioner): array
    {
        $country = $this->paymentAccounts[$this->countryCode($practitioner)] ?? [];
        $default = $this->paymentAccounts['default'] ?? [];
        $account = ['holder' => $country['holder'] ?? $default['holder'] ?? 'AlloDoc'];
        foreach ($this->paymentMethods($practitioner) as $method) {
            if ('paypal' === $method) {
                $account[$method] = null;
                continue;
            }
            // Le numéro "mobile_money" vaut pour tous les opérateurs mobile money, pas pour le virement bancaire.
            $keys = 'bank_transfer' === $method ? [$method] : [$method, 'mobile_money'];
            $account[$method] = null;
            foreach ([$country, $default] as $accounts) {
                foreach ($keys as $key) {
                    $account[$method] ??= $accounts[$key] ?? null;
                }
            }
        }

        return $account;
    }

    /** Montant d'une commande en cents de dollar US (taux du jour). */
    public function usdCents(Subscription $subscription): int
    {
        return $this->rates->toUsdCents($subscription->getAmount(), $subscription->getCurrency());
    }

    /** PayPal, étape 1 : crée la commande PayPal (montant en dollars figé) et renvoie son identifiant. */
    public function startPayPal(Subscription $subscription): string
    {
        if (SubscriptionStatus::Pending !== $subscription->getStatus() || 'paypal' !== $subscription->getPaymentMethod()) {
            throw new BookingException('Cette commande ne se règle pas par PayPal.', 409);
        }
        if (!$this->paypal->isConfigured()) {
            throw new BookingException('PayPal n\'est pas disponible pour le moment.', 503);
        }
        $cents = $this->usdCents($subscription);
        try {
            $orderId = $this->paypal->createOrder(
                $subscription->getReference(),
                sprintf('AlloDoc - abonnement %s (%s FCFA)', $subscription->getPlan()->getName(), number_format($subscription->getAmount(), 0, ',', ' ')),
                $cents,
            );
        } catch (PayPalException $e) {
            throw new BookingException('PayPal : '.$e->getMessage(), 502);
        }
        $subscription->startOnlinePayment($orderId, $cents);
        $this->em->flush();

        return $orderId;
    }

    /**
     * PayPal, étape 2 : capture le paiement approuvé par le praticien et, s'il est complet (bonne commande, bonne
     * référence, montant et devise attendus), publie le profil comme une confirmation manuelle.
     */
    public function completePayPal(Subscription $subscription, string $orderId): void
    {
        if ('' === $orderId || $orderId !== $subscription->getProviderOrderId()) {
            throw new BookingException('Commande PayPal inconnue.', 404);
        }
        if (SubscriptionStatus::Pending !== $subscription->getStatus()) {
            throw new BookingException('Cette commande n\'est plus en attente de paiement.', 409);
        }
        try {
            $result = $this->paypal->capture($orderId);
        } catch (PayPalException $e) {
            throw new BookingException('PayPal : '.$e->getMessage(), 502);
        }
        $conform = 'USD' === $result['currency'] && $result['amountCents'] === $subscription->getAmountUsdCents() && $result['customId'] === $subscription->getReference();
        if ('COMPLETED' === $result['status'] && $conform) {
            $this->confirmPayment($subscription, 'PAYPAL-'.$result['captureId'], null);

            return;
        }
        if (null === $result['captureId']) {
            throw new BookingException('Paiement PayPal non abouti ('.($result['status'] ?: 'statut inconnu').').', 402);
        }
        // De l'argent a pu être encaissé (capture en attente chez PayPal, ou montant / référence inattendus) :
        // la commande reste en attente avec la trace du paiement, à rapprocher par l'administrateur.
        $trace = sprintf('PAYPAL-%s %s %s %s', $result['captureId'], $result['status'], null !== $result['amountCents'] ? PayPalClient::formatCents($result['amountCents']) : '?', $result['currency'] ?? '?');
        $subscription->recordUnverifiedPayment($trace);
        $this->em->flush();
        $this->logger->error('Paiement PayPal à vérifier pour la commande {reference} : {trace}', ['reference' => $subscription->getReference(), 'trace' => $trace]);

        throw new BookingException('Paiement PayPal reçu, en cours de vérification par l\'équipe AlloDoc.', 409);
    }

    private function countryCode(Practitioner $practitioner): string
    {
        return $practitioner->getMainFacility()?->getCity()->getRegion()->getCountry()->getCode() ?? 'ML';
    }

    /** Annule les commandes restées impayées trop longtemps. */
    public function expireAbandonedOrders(): int
    {
        return $this->em->createQueryBuilder()
            ->update(Subscription::class, 's')
            ->set('s.status', ':cancelled')
            ->where('s.status = :pending AND s.createdAt < :limit')
            ->setParameter('cancelled', SubscriptionStatus::Cancelled->value)
            ->setParameter('pending', SubscriptionStatus::Pending->value)
            ->setParameter('limit', new \DateTimeImmutable(self::PENDING_TTL))
            ->getQuery()->execute();
    }

    public function present(Subscription $s, bool $withPractitioner = false): array
    {
        $data = [
            'id' => (string) $s->getId(),
            'reference' => $s->getReference(),
            'plan' => ['code' => $s->getPlan()->getCode(), 'name' => $s->getPlan()->getName(), 'durationMonths' => $s->getPlan()->getDurationMonths()],
            'amount' => $s->getAmount(),
            'currency' => $s->getCurrency(),
            'status' => $s->getStatus()->value,
            'paymentMethod' => $s->getPaymentMethod(),
            'paymentMethodLabel' => Subscription::METHODS[$s->getPaymentMethod()] ?? $s->getPaymentMethod(),
            'amountUsd' => null !== $s->getAmountUsdCents() ? $s->getAmountUsdCents() / 100 : null,
            'transactionId' => $s->getTransactionId(),
            'startsAt' => $s->getStartsAt()?->format(\DATE_ATOM),
            'endsAt' => $s->getEndsAt()?->format(\DATE_ATOM),
            'createdAt' => $s->getCreatedAt()->format(\DATE_ATOM),
            'paidAt' => $s->getPaidAt()?->format(\DATE_ATOM),
        ];
        if ($withPractitioner) {
            $p = $s->getPractitioner();
            $facility = $p->getMainFacility();
            $data['practitioner'] = [
                'id' => $p->getId(),
                'slug' => $p->getSlug(),
                'fullName' => $p->getFullName(),
                'phone' => $p->getUser()?->getPhone(),
                'city' => $facility?->getCity()->getName(),
                'country' => $facility?->getCity()->getRegion()->getCountry()->getCode(),
                'publishedUntil' => $p->getPublishedUntil()?->format(\DATE_ATOM),
            ];
        }

        return $data;
    }
}
