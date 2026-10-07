<?php

namespace App\Controller;

use App\Entity\Country;
use App\Entity\Practitioner;
use App\Entity\Specialty;
use App\Repository\PractitionerSearch;
use App\Service\Presenter;
use App\Service\SlotService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Annuaire public : vue d'ensemble d'un pays, recherche de praticiens, fiche et créneaux.
 */
final class DirectoryController extends ApiController
{
    /** Page d'accueil pays : régions (avec nombre de praticiens) et spécialités disponibles. */
    #[Route('/api/countries/{code}/overview', methods: ['GET'])]
    public function overview(string $code, PractitionerSearch $search): JsonResponse
    {
        $country = $this->em->getRepository(Country::class)->findOneBy(['code' => strtoupper($code), 'active' => true]);
        if (null === $country) {
            return $this->error('Pays inconnu.', 404);
        }

        $byRegion = $search->countByRegion($country->getCode());
        $bySpecialty = $search->countBySpecialty($country->getCode());

        $regions = [];
        foreach ($country->getRegions() as $region) {
            $regions[] = [
                'id' => $region->getId(),
                'slug' => $region->getSlug(),
                'name' => $region->getName(),
                'capital' => $region->getCapital(),
                'formerName' => $region->getFormerName(),
                'provisional' => $region->isProvisional(),
                'practitionerCount' => (int) ($byRegion[$region->getSlug()] ?? 0),
            ];
        }

        $specialties = [];
        foreach ($this->em->getRepository(Specialty::class)->findBy([], ['name' => 'ASC']) as $specialty) {
            $specialties[] = [
                'slug' => $specialty->getSlug(),
                'name' => $specialty->getName(),
                'icon' => $specialty->getIcon(),
                'practitionerCount' => (int) ($bySpecialty[$specialty->getSlug()] ?? 0),
            ];
        }

        $response = $this->json([
            'country' => [
                'code' => $country->getCode(),
                'name' => $country->getName(),
                'capital' => $country->getCapital(),
                'timezone' => $country->getTimezone(),
                'phonePrefix' => $country->getPhonePrefix(),
                'languages' => $country->getLanguages(),
            ],
            'practitionerCount' => array_sum($byRegion),
            'regions' => $regions,
            'specialties' => $specialties,
        ]);

        return $response->setPublic()->setMaxAge(300);
    }

    /**
     * Recherche paginée. Chaque résultat inclut ses créneaux des prochains jours (grille façon agenda).
     * Paramètres : country, region, city, specialty, q, teleconsultation, language, insurance, page, perPage, days.
     */
    #[Route('/api/search', methods: ['GET'])]
    public function search(Request $request, PractitionerSearch $search, Presenter $presenter, SlotService $slots): JsonResponse
    {
        $query = $request->query;
        $page = max(1, $query->getInt('page', 1));
        $perPage = min(20, max(1, $query->getInt('perPage', 10)));
        $days = min(7, max(1, $query->getInt('days', 5)));
        $from = $this->parseDate($query->get('from'));

        $result = $search->search([
            'country' => $query->get('country'),
            'region' => $query->get('region'),
            'city' => $query->get('city'),
            'specialty' => $query->get('specialty'),
            'q' => trim((string) $query->get('q', '')),
            'teleconsultation' => $query->getBoolean('teleconsultation'),
            'language' => $query->get('language'),
            'insurance' => $query->get('insurance'),
        ], $page, $perPage);

        $items = [];
        foreach ($result['items'] as $practitioner) {
            $grid = $slots->getDays($practitioner, $from, $days);
            $items[] = $presenter->practitionerSummary($practitioner) + [
                'availability' => $grid,
                'nextAvailability' => $this->nextAvailability($practitioner, $grid, $slots),
            ];
        }

        return $this->json([
            'total' => $result['total'],
            'page' => $page,
            'perPage' => $perPage,
            'pages' => (int) ceil($result['total'] / $perPage),
            'items' => $items,
        ]);
    }

    #[Route('/api/practitioners/{slug}', methods: ['GET'], priority: 10)]
    public function show(string $slug, Presenter $presenter): JsonResponse
    {
        $practitioner = $this->findVerified($slug);
        if (null === $practitioner) {
            return $this->error('Praticien introuvable.', 404);
        }

        return $this->json($presenter->practitionerDetail($practitioner));
    }

    #[Route('/api/practitioners/{slug}/slots', methods: ['GET'], priority: 10)]
    public function slots(string $slug, Request $request, SlotService $slots): JsonResponse
    {
        $practitioner = $this->findVerified($slug);
        if (null === $practitioner) {
            return $this->error('Praticien introuvable.', 404);
        }
        $days = min(14, max(1, $request->query->getInt('days', 7)));

        return $this->json(['days' => $slots->getDays($practitioner, $this->parseDate($request->query->get('from')), $days)]);
    }

    private function findVerified(string $slug): ?Practitioner
    {
        $practitioner = $this->em->getRepository(Practitioner::class)->findOneBy(['slug' => $slug]);

        return $practitioner?->isPublished() ? $practitioner : null;
    }

    private function parseDate(mixed $value): \DateTimeImmutable
    {
        $today = new \DateTimeImmutable('today');
        if (\is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            $date = new \DateTimeImmutable($value);
            if ($date >= $today && $date <= $today->modify('+90 days')) {
                return $date;
            }
        }

        return $today;
    }

    /** Premier créneau libre, en cherchant au-delà de la grille affichée si elle est vide. */
    private function nextAvailability(Practitioner $practitioner, array $grid, SlotService $slots): ?array
    {
        foreach ($grid as $day) {
            if ([] !== $day['slots']) {
                return ['date' => $day['date'], 'time' => $day['slots'][0]['time'], 'start' => $day['slots'][0]['start']];
            }
        }
        $last = end($grid);
        $later = $slots->getDays($practitioner, (new \DateTimeImmutable($last['date']))->modify('+1 day'), SlotService::MAX_DAYS);
        foreach ($later as $day) {
            if ([] !== $day['slots']) {
                return ['date' => $day['date'], 'time' => $day['slots'][0]['time'], 'start' => $day['slots'][0]['start']];
            }
        }

        return null;
    }
}
