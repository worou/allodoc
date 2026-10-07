<?php

namespace App\Controller;

use App\Entity\Practitioner;
use App\Entity\User;
use App\Enum\VerificationStatus;
use App\Service\Presenter;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Back-office : validation des praticiens. Un administrateur pays ne voit que les praticiens de son pays.
 */
#[IsGranted('ROLE_COUNTRY_ADMIN')]
#[Route('/api/admin')]
final class AdminController extends ApiController
{
    #[Route('/practitioners', methods: ['GET'])]
    public function practitioners(Request $request, Presenter $presenter): JsonResponse
    {
        $status = VerificationStatus::tryFrom((string) $request->query->get('status', 'pending')) ?? VerificationStatus::Pending;
        $qb = $this->em->createQueryBuilder()
            ->select('DISTINCT p')->from(Practitioner::class, 'p')
            ->innerJoin('p.facilities', 'f')->innerJoin('f.city', 'c')->innerJoin('c.region', 'r')->innerJoin('r.country', 'co')
            ->where('p.verificationStatus = :status')->setParameter('status', $status->value)
            ->orderBy('p.createdAt', 'ASC')
            ->setMaxResults(100);
        $country = $this->scopeCountry();
        if (null !== $country) {
            $qb->andWhere('co.code = :country')->setParameter('country', $country);
        }

        $items = array_map(fn (Practitioner $p) => $presenter->practitionerDetail($p) + [
            'verificationStatus' => $p->getVerificationStatus()->value,
            'publishedUntil' => $p->getPublishedUntil()?->format(\DATE_ATOM),
            'activeSubscription' => $p->hasActiveSubscription(),
            'createdAt' => $p->getCreatedAt()->format(\DATE_ATOM),
        ], $qb->getQuery()->getResult());

        return $this->json(['status' => $status->value, 'items' => $items]);
    }

    /** Corps : {"decision": "verify" | "reject"}. */
    #[Route('/practitioners/{id}/verification', methods: ['POST'])]
    public function decide(int $id, Request $request): JsonResponse
    {
        $practitioner = $this->em->getRepository(Practitioner::class)->find($id);
        $country = $this->scopeCountry();
        $practitionerCountry = $practitioner?->getMainFacility()?->getCity()->getRegion()->getCountry()->getCode();
        if (null === $practitioner || (null !== $country && $practitionerCountry !== $country)) {
            return $this->error('Praticien introuvable.', 404);
        }

        match ($this->body($request)['decision'] ?? null) {
            'verify' => $practitioner->verify(),
            'reject' => $practitioner->reject(),
            default => null,
        };
        if (VerificationStatus::Pending === $practitioner->getVerificationStatus()) {
            return $this->error('Décision invalide (verify ou reject).');
        }
        $this->audit($request, 'admin.practitioner.'.$practitioner->getVerificationStatus()->value, 'practitioner:'.$id);
        $this->em->flush();

        return $this->json(['id' => $id, 'verificationStatus' => $practitioner->getVerificationStatus()->value]);
    }

    /** null pour un super-administrateur (tous pays). */
    private function scopeCountry(): ?string
    {
        $user = $this->currentUser();

        return $user->hasRole(User::ROLE_SUPER_ADMIN) ? null : ($user->getAdminCountry()?->getCode() ?? '--');
    }
}
