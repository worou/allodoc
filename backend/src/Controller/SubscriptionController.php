<?php

namespace App\Controller;

use App\Entity\Practitioner;
use App\Entity\Subscription;
use App\Entity\SubscriptionPlan;
use App\Entity\User;
use App\Enum\SubscriptionStatus;
use App\Service\BookingException;
use App\Service\SubscriptionService;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Uid\Uuid;

/**
 * Abonnement de publication : espace praticien (/api/pro/…) et confirmation des paiements (/api/admin/…).
 */
final class SubscriptionController extends ApiController
{
    /** État de l'abonnement, formules disponibles, commande en attente avec instructions de paiement, historique. */
    #[Route('/api/pro/subscription', methods: ['GET'])]
    #[IsGranted('ROLE_PRACTITIONER')]
    public function status(SubscriptionService $subscriptions, #[Autowire('%kernel.environment%')] string $env): JsonResponse
    {
        $practitioner = $this->practitioner();
        if (null === $practitioner) {
            return $this->error('Aucune fiche praticien liée à ce compte.', 404);
        }
        $until = $practitioner->getPublishedUntil();
        $active = $practitioner->hasActiveSubscription();
        $pending = $subscriptions->pending($practitioner)[0] ?? null;
        $plans = $this->em->getRepository(SubscriptionPlan::class)->findBy(['active' => true], ['position' => 'ASC']);

        return $this->json([
            'verified' => $practitioner->isVerified(),
            'published' => $practitioner->isPublished(),
            'activeSubscription' => $active,
            'publishedUntil' => $until?->format(\DATE_ATOM),
            'daysLeft' => $active ? (int) ceil(($until->getTimestamp() - time()) / 86400) : 0,
            'plans' => array_map(fn (SubscriptionPlan $p) => [
                'code' => $p->getCode(),
                'name' => $p->getName(),
                'durationMonths' => $p->getDurationMonths(),
                'price' => $p->getPrice(),
                'monthlyPrice' => $p->getMonthlyPrice(),
                'currency' => $p->getCurrency(),
            ], $plans),
            'methods' => array_map(fn ($code, $label) => ['code' => $code, 'label' => $label], array_keys(Subscription::METHODS), Subscription::METHODS),
            'paymentAccount' => $subscriptions->paymentAccount($practitioner),
            'pending' => $pending ? $subscriptions->present($pending) : null,
            'history' => array_map(fn (Subscription $s) => $subscriptions->present($s), $subscriptions->history($practitioner)),
            'canSimulatePayment' => 'dev' === $env,
        ]);
    }

    /** Commande (ou renouvellement) : {"plan": "semester" | "annual", "method": "orange_money" | …}. */
    #[Route('/api/pro/subscriptions', methods: ['POST'])]
    #[IsGranted('ROLE_PRACTITIONER')]
    public function order(Request $request, SubscriptionService $subscriptions): JsonResponse
    {
        $practitioner = $this->practitioner();
        $data = $this->body($request);
        $plan = $this->em->getRepository(SubscriptionPlan::class)->findOneBy(['code' => (string) ($data['plan'] ?? '')]);
        if (null === $practitioner || null === $plan) {
            return $this->error('Formule inconnue.', 422);
        }
        try {
            $subscription = $subscriptions->order($practitioner, $plan, (string) ($data['method'] ?? ''));
        } catch (BookingException $e) {
            return $this->error($e->getMessage(), $e->status);
        }
        $this->audit($request, 'subscription.order', 'subscription:'.$subscription->getId());
        $this->em->flush();

        return $this->json($subscriptions->present($subscription), 201);
    }

    #[Route('/api/pro/subscriptions/{id}/cancel', methods: ['POST'])]
    #[IsGranted('ROLE_PRACTITIONER')]
    public function cancel(string $id, SubscriptionService $subscriptions): JsonResponse
    {
        $subscription = $this->find($id);
        if (null === $subscription || $subscription->getPractitioner() !== $this->practitioner()) {
            return $this->error('Commande introuvable.', 404);
        }
        if (SubscriptionStatus::Pending !== $subscription->getStatus()) {
            return $this->error('Seule une commande en attente peut être annulée.', 409);
        }
        $subscription->cancel();
        $this->em->flush();

        return $this->json($subscriptions->present($subscription));
    }

    /** Environnement de développement uniquement : simule la réception du paiement. */
    #[Route('/api/pro/subscriptions/{id}/simulate-payment', methods: ['POST'])]
    #[IsGranted('ROLE_PRACTITIONER')]
    public function simulate(string $id, Request $request, SubscriptionService $subscriptions, #[Autowire('%kernel.environment%')] string $env): JsonResponse
    {
        $subscription = $this->find($id);
        if ('dev' !== $env || null === $subscription || $subscription->getPractitioner() !== $this->practitioner()) {
            return $this->error('Commande introuvable.', 404);
        }
        try {
            $subscriptions->confirmPayment($subscription, 'SIMULATION', null);
        } catch (BookingException $e) {
            return $this->error($e->getMessage(), $e->status);
        }
        $this->audit($request, 'subscription.simulated_payment', 'subscription:'.$id);
        $this->em->flush();

        return $this->json($subscriptions->present($subscription));
    }

    /** Paiements à confirmer (ou historique) ; un administrateur pays ne voit que son pays. */
    #[Route('/api/admin/subscriptions', methods: ['GET'])]
    #[IsGranted('ROLE_COUNTRY_ADMIN')]
    public function adminList(Request $request, SubscriptionService $subscriptions): JsonResponse
    {
        $subscriptions->expireAbandonedOrders();
        $status = SubscriptionStatus::tryFrom((string) $request->query->get('status', 'pending')) ?? SubscriptionStatus::Pending;
        $qb = $this->em->createQueryBuilder()
            ->select('s', 'p')->from(Subscription::class, 's')
            ->innerJoin('s.practitioner', 'p')
            ->where('s.status = :status')->setParameter('status', $status->value)
            ->orderBy('s.createdAt', 'DESC')
            ->setMaxResults(200);
        $country = $this->scopeCountry();
        if (null !== $country) {
            $qb->innerJoin('p.facilities', 'f')->innerJoin('f.city', 'c')->innerJoin('c.region', 'r')->innerJoin('r.country', 'co')
                ->andWhere('co.code = :country')->setParameter('country', $country);
        }

        $items = $qb->getQuery()->getResult();
        $total = array_sum(array_map(fn (Subscription $s) => $s->getAmount(), $items));

        return $this->json([
            'status' => $status->value,
            'total' => $total,
            'items' => array_map(fn (Subscription $s) => $subscriptions->present($s, withPractitioner: true), $items),
        ]);
    }

    /** Confirme la réception du paiement : {"transactionId": "MP2410…"} (identifiant de l'opérateur, facultatif). */
    #[Route('/api/admin/subscriptions/{id}/confirm', methods: ['POST'])]
    #[IsGranted('ROLE_COUNTRY_ADMIN')]
    public function confirm(string $id, Request $request, SubscriptionService $subscriptions): JsonResponse
    {
        $subscription = $this->findInScope($id);
        if (null === $subscription) {
            return $this->error('Commande introuvable.', 404);
        }
        $transaction = trim((string) ($this->body($request)['transactionId'] ?? ''));
        try {
            $subscriptions->confirmPayment($subscription, '' === $transaction ? null : mb_substr($transaction, 0, 80), $this->currentUser());
        } catch (BookingException $e) {
            return $this->error($e->getMessage(), $e->status);
        }
        $this->audit($request, 'admin.subscription.confirm', 'subscription:'.$id);
        $this->em->flush();

        return $this->json($subscriptions->present($subscription, withPractitioner: true));
    }

    #[Route('/api/admin/subscriptions/{id}/reject', methods: ['POST'])]
    #[IsGranted('ROLE_COUNTRY_ADMIN')]
    public function reject(string $id, Request $request, SubscriptionService $subscriptions): JsonResponse
    {
        $subscription = $this->findInScope($id);
        if (null === $subscription || SubscriptionStatus::Pending !== $subscription->getStatus()) {
            return $this->error('Commande introuvable ou déjà traitée.', 404);
        }
        $subscription->cancel();
        $this->audit($request, 'admin.subscription.reject', 'subscription:'.$id);
        $this->em->flush();

        return $this->json($subscriptions->present($subscription, withPractitioner: true));
    }

    private function practitioner(): ?Practitioner
    {
        return $this->em->getRepository(Practitioner::class)->findOneBy(['user' => $this->currentUser()]);
    }

    private function find(string $id): ?Subscription
    {
        return Uuid::isValid($id) ? $this->em->getRepository(Subscription::class)->find(Uuid::fromString($id)) : null;
    }

    private function findInScope(string $id): ?Subscription
    {
        $subscription = $this->find($id);
        $country = $this->scopeCountry();
        $code = $subscription?->getPractitioner()->getMainFacility()?->getCity()->getRegion()->getCountry()->getCode();

        return null !== $subscription && (null === $country || $code === $country) ? $subscription : null;
    }

    /** null pour un super-administrateur (tous pays). */
    private function scopeCountry(): ?string
    {
        $user = $this->currentUser();

        return $user->hasRole(User::ROLE_SUPER_ADMIN) ? null : ($user->getAdminCountry()?->getCode() ?? '--');
    }
}
