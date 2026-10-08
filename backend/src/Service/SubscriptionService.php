<?php

namespace App\Service;

use App\Entity\Practitioner;
use App\Entity\Subscription;
use App\Entity\SubscriptionPlan;
use App\Entity\User;
use App\Enum\SubscriptionStatus;
use App\Sms\SmsSenderInterface;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Abonnement de publication des praticiens : commande, confirmation du paiement, renouvellement.
 *
 * Paiement (MVP) : le praticien paie par mobile money ou en espèces en indiquant la référence de commande ;
 * l'administrateur de son pays confirme la réception. Une passerelle (CinetPay, PayDunya…) pourra appeler
 * confirmPayment() automatiquement en phase 2.
 */
final class SubscriptionService
{
    /** Délai au-delà duquel une commande non payée est considérée comme abandonnée. */
    private const PENDING_TTL = '-14 days';

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly SmsSenderInterface $sms,
        #[Autowire('%app.payment_accounts%')] private readonly array $paymentAccounts,
    ) {
    }

    public function order(Practitioner $practitioner, SubscriptionPlan $plan, string $method): Subscription
    {
        if (!$plan->isActive()) {
            throw new BookingException('Cette formule n\'est plus proposée.', 422);
        }
        // Paiement 100 % mobile money : seul un moyen doté d'un numéro de réception pour ce pays est accepté.
        if (!isset(Subscription::METHODS[$method]) || empty($this->paymentAccount($practitioner)[$method])) {
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

    /** Coordonnées de paiement du pays du praticien (numéros marchands configurés dans services.yaml). */
    public function paymentAccount(Practitioner $practitioner): array
    {
        $country = $practitioner->getMainFacility()?->getCity()->getRegion()->getCountry()->getCode() ?? 'ML';

        return $this->paymentAccounts[$country] ?? [];
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
