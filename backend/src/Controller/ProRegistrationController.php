<?php

namespace App\Controller;

use App\Entity\AvailabilityRule;
use App\Entity\City;
use App\Entity\Country;
use App\Entity\Facility;
use App\Entity\Practitioner;
use App\Entity\Region;
use App\Entity\Specialty;
use App\Entity\User;
use App\Enum\FacilityType;
use App\Service\Presenter;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\String\Slugger\AsciiSlugger;

/**
 * Inscription d'un praticien depuis son compte (connexion par SMS, email, Google ou GitHub) : la fiche est créée
 * "en attente de vérification" par l'administrateur de son pays, et le compte accède aussitôt à l'espace
 * praticien (agenda, abonnement et paiement). Le profil n'est publié qu'une fois vérifié ET abonné.
 */
final class ProRegistrationController extends ApiController
{
    /** Horaires proposés par défaut (modifiables ensuite) : du lundi au vendredi, 8 h - 12 h, créneaux de 30 min. */
    private const DEFAULT_DAYS = [1, 2, 3, 4, 5];

    /**
     * Corps : {"title": "Dr" | "", "firstName", "lastName", "gender": "M" | "F", "orderNumber", "specialty",
     * "country", "region", "city", "facilityName", "facilityType", "address", "fee", "phone"}.
     */
    #[Route('/api/pro/registration', methods: ['POST'])]
    #[IsGranted('ROLE_PATIENT')]
    public function register(Request $request, Presenter $presenter): JsonResponse
    {
        $user = $this->currentUser();
        if (null !== $this->em->getRepository(Practitioner::class)->findOneBy(['user' => $user])) {
            return $this->error('Ce compte a déjà une fiche praticien.', 409);
        }

        $data = $this->body($request);
        $text = static fn (string $key, int $max) => mb_substr(trim((string) ($data[$key] ?? '')), 0, $max);
        $firstName = $text('firstName', 80);
        $lastName = $text('lastName', 80);
        $orderNumber = $text('orderNumber', 40);
        $facilityName = $text('facilityName', 150);
        $address = $text('address', 255);
        $cityName = $text('city', 100);
        $gender = \in_array($data['gender'] ?? null, ['M', 'F'], true) ? $data['gender'] : null;
        $fee = filter_var($data['fee'] ?? null, \FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => 100000000]]);
        $type = FacilityType::tryFrom((string) ($data['facilityType'] ?? '')) ?? FacilityType::Office;

        $missing = array_keys(array_filter([
            'firstName' => '' === $firstName, 'lastName' => '' === $lastName, 'gender' => null === $gender,
            'orderNumber' => '' === $orderNumber, 'facilityName' => '' === $facilityName, 'address' => '' === $address,
            'fee' => false === $fee,
        ]));
        if ([] !== $missing) {
            return $this->error('Champs manquants ou invalides : '.implode(', ', $missing).'.', 422, ['fields' => $missing]);
        }

        $specialty = $this->em->getRepository(Specialty::class)->findOneBy(['slug' => (string) ($data['specialty'] ?? '')]);
        $country = $this->em->getRepository(Country::class)->findOneBy(['code' => strtoupper((string) ($data['country'] ?? '')), 'active' => true]);
        $region = null === $country ? null : $this->em->getRepository(Region::class)->findOneBy(['country' => $country, 'slug' => (string) ($data['region'] ?? '')]);
        if (null === $specialty || null === $region) {
            return $this->error('Spécialité, pays ou région inconnus.', 422, ['fields' => array_keys(array_filter(['specialty' => null === $specialty, 'region' => null === $region]))]);
        }

        // Ville : celle du référentiel si elle existe dans la région (sans tenir compte des accents), sinon créée.
        $cityName = '' !== $cityName ? $cityName : $region->getCapital();
        $city = null;
        foreach ($this->em->getRepository(City::class)->findBy(['region' => $region]) as $candidate) {
            if (self::fold($candidate->getName()) === self::fold($cityName)) {
                $city = $candidate;
                break;
            }
        }
        if (null === $city) {
            $city = new City($region, $cityName);
            $this->em->persist($city);
        }

        $facility = new Facility($facilityName, $type, $city, $address);
        $phone = $text('phone', 30);
        if ('' !== $phone) {
            $facility->setPhone($phone);
        }
        $this->em->persist($facility);

        $practitioner = (new Practitioner($this->uniqueSlug($firstName, $lastName), $firstName, $lastName, $gender, $orderNumber))
            ->setTitle('' === ($data['title'] ?? 'Dr') ? '' : 'Dr')
            ->setFee($fee)
            ->setLanguages(\array_slice(array_values(array_unique(['fr', ...$country->getLanguages()])), 0, 4))
            ->addSpecialty($specialty)
            ->addFacility($facility)
            ->setUser($user);
        foreach (self::DEFAULT_DAYS as $day) {
            $practitioner->addAvailabilityRule(new AvailabilityRule($practitioner, $facility, $day, '08:00', '12:00', 30));
        }
        $this->em->persist($practitioner);

        $user->setRoles(array_values(array_unique([...$user->getRoles(), User::ROLE_PRACTITIONER])));
        $user->setFirstName($user->getFirstName() ?? $firstName)->setLastName($user->getLastName() ?? $lastName);

        $this->em->flush();
        $this->audit($request, 'pro.registered', 'practitioner:'.$practitioner->getId());
        $this->em->flush();

        return $this->json(['user' => $presenter->user($user), 'practitioner' => $presenter->practitionerSummary($practitioner)], 201);
    }

    private function uniqueSlug(string $firstName, string $lastName): string
    {
        $base = strtolower((string) (new AsciiSlugger('fr'))->slug($firstName.' '.$lastName)) ?: 'praticien';
        $repository = $this->em->getRepository(Practitioner::class);
        $slug = $base;
        for ($i = 2; null !== $repository->findOneBy(['slug' => $slug]); ++$i) {
            $slug = $base.'-'.$i;
        }

        return $slug;
    }

    private static function fold(string $value): string
    {
        return strtolower((string) (new AsciiSlugger())->slug($value));
    }
}
