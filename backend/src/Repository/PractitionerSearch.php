<?php

namespace App\Repository;

use App\Entity\Practitioner;
use App\Enum\VerificationStatus;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;
use Doctrine\ORM\Tools\Pagination\Paginator;

/**
 * Recherche des praticiens vérifiés par pays, région, ville, spécialité et critères annexes.
 */
final class PractitionerSearch
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    /**
     * @param array{country?: ?string, region?: ?string, city?: ?string, specialty?: ?string, q?: ?string, teleconsultation?: bool, language?: ?string, insurance?: ?string} $criteria
     *
     * @return array{total: int, items: list<Practitioner>}
     */
    public function search(array $criteria, int $page, int $perPage): array
    {
        $qb = $this->baseQuery($criteria)
            ->select('p', 'f', 'c', 'r', 'co')
            ->orderBy('p.lastName', 'ASC')
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage);

        $paginator = new Paginator($qb, true);

        return ['total' => \count($paginator), 'items' => iterator_to_array($paginator)];
    }

    /**
     * Nombre de praticiens vérifiés par région d'un pays.
     *
     * @return array<string, int> slug de région => nombre
     */
    public function countByRegion(string $countryCode, ?string $specialty = null): array
    {
        $rows = $this->baseQuery(['country' => $countryCode, 'specialty' => $specialty])
            ->select('r.slug AS slug', 'COUNT(DISTINCT p.id) AS total')
            ->groupBy('r.slug')
            ->getQuery()->getArrayResult();

        return array_column($rows, 'total', 'slug');
    }

    /** @return array<string, int> code pays => nombre de praticiens publiés */
    public function countByCountry(): array
    {
        $rows = $this->baseQuery([])
            ->select('co.code AS code', 'COUNT(DISTINCT p.id) AS total')
            ->groupBy('co.code')
            ->getQuery()->getArrayResult();

        return array_column($rows, 'total', 'code');
    }

    /** @return array<string, int> slug de spécialité => nombre */
    public function countBySpecialty(string $countryCode): array
    {
        $rows = $this->baseQuery(['country' => $countryCode])
            ->innerJoin('p.specialties', 'sp')
            ->select('sp.slug AS slug', 'COUNT(DISTINCT p.id) AS total')
            ->groupBy('sp.slug')
            ->getQuery()->getArrayResult();

        return array_column($rows, 'total', 'slug');
    }

    private function baseQuery(array $criteria): QueryBuilder
    {
        $qb = $this->em->createQueryBuilder()
            ->from(Practitioner::class, 'p')
            ->innerJoin('p.facilities', 'f')
            ->innerJoin('f.city', 'c')
            ->innerJoin('c.region', 'r')
            ->innerJoin('r.country', 'co')
            // Publié = vérifié par l'administrateur ET abonnement en cours.
            ->where('p.verificationStatus = :verified AND p.publishedUntil > :now')
            ->setParameter('verified', VerificationStatus::Verified->value)
            ->setParameter('now', new \DateTimeImmutable());

        if (!empty($criteria['country'])) {
            $qb->andWhere('co.code = :country')->setParameter('country', strtoupper($criteria['country']));
        }
        if (!empty($criteria['region'])) {
            $qb->andWhere('r.slug = :region')->setParameter('region', $criteria['region']);
        }
        if (!empty($criteria['city'])) {
            $qb->andWhere('c.name = :city')->setParameter('city', $criteria['city']);
        }
        if (!empty($criteria['specialty'])) {
            $qb->andWhere(':specialty MEMBER OF p.specialties')
                ->setParameter('specialty', $this->em->getRepository(\App\Entity\Specialty::class)->findOneBy(['slug' => $criteria['specialty']])?->getId() ?? 0);
        }
        if (!empty($criteria['q'])) {
            $qb->andWhere('p.lastName LIKE :q OR p.firstName LIKE :q OR f.name LIKE :q')
                ->setParameter('q', '%'.addcslashes($criteria['q'], '%_').'%');
        }
        if (!empty($criteria['teleconsultation'])) {
            $qb->andWhere('p.teleconsultation = true');
        }
        if (!empty($criteria['language'])) {
            $qb->andWhere('p.languages LIKE :lang')->setParameter('lang', '%'.json_encode($criteria['language']).'%');
        }
        if (!empty($criteria['insurance'])) {
            $qb->andWhere('p.insurances LIKE :ins')->setParameter('ins', '%'.json_encode($criteria['insurance']).'%');
        }

        return $qb;
    }
}
