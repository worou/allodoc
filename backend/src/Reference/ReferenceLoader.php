<?php

namespace App\Reference;

use App\Entity\City;
use App\Entity\Country;
use App\Entity\Region;
use App\Entity\Specialty;
use App\Entity\Subscription;
use App\Entity\SubscriptionPlan;
use App\Enum\Subregion;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\String\Slugger\AsciiSlugger;

/**
 * Référentiels de base, utilisés en production (commandes app:install et app:sync-reference) comme en démonstration
 * (fixtures) : 55 pays et territoires africains répartis en 5 sous-régions, leurs régions (découpages connus en 2025,
 * marqués "provisional" en attendant la validation des ministères), chefs-lieux, spécialités et formules d'abonnement.
 *
 * La géographie est décrite dans config/reference/africa.json.
 */
final class ReferenceLoader
{
    private const DATA_FILE = __DIR__.'/../../config/reference/africa.json';

    /** [slug, nom, icône, traduction anglaise] */
    public const SPECIALTIES = [
        ['medecine-generale', 'Médecin généraliste', 'stethoscope', 'General practitioner'],
        ['pediatrie', 'Pédiatre', 'child', 'Pediatrician'],
        ['gynecologie', 'Gynécologue-obstétricien', 'female', 'Obstetrician-gynecologist'],
        ['sage-femme', 'Sage-femme', 'baby', 'Midwife'],
        ['cardiologie', 'Cardiologue', 'heart', 'Cardiologist'],
        ['dermatologie', 'Dermatologue', 'skin', 'Dermatologist'],
        ['ophtalmologie', 'Ophtalmologue', 'eye', 'Ophthalmologist'],
        ['dentiste', 'Chirurgien-dentiste', 'tooth', 'Dentist'],
        ['orl', 'ORL', 'ear', 'ENT specialist'],
        ['psychiatrie', 'Psychiatre', 'brain', 'Psychiatrist'],
        ['diabetologie', 'Diabétologue-endocrinologue', 'drop', 'Endocrinologist'],
        ['neurologie', 'Neurologue', 'brain', 'Neurologist'],
        ['traumatologie', 'Traumatologue-orthopédiste', 'bone', 'Orthopedic surgeon'],
        ['urologie', 'Urologue', 'kidney', 'Urologist'],
        ['pneumologie', 'Pneumologue', 'lungs', 'Pulmonologist'],
        ['gastro-enterologie', 'Gastro-entérologue', 'stomach', 'Gastroenterologist'],
        ['nephrologie', 'Néphrologue', 'kidney', 'Nephrologist'],
        ['kinesitherapie', 'Kinésithérapeute', 'bone', 'Physiotherapist'],
    ];

    /** code => [nom, durée en mois, prix FCFA] : 5 000 FCFA par mois, réglables pour 1, 3, 6 ou 12 mois. */
    public const PLANS = [
        'monthly' => ['Mensuel', 1, 5000],
        'quarterly' => ['Trimestriel', 3, 15000],
        'semester' => ['Semestriel', 6, 30000],
        'annual' => ['Annuel', 12, 60000],
    ];

    private static ?array $data = null;

    /**
     * Pays du référentiel, indexés par code ISO, régions normalisées en
     * [nom, slug, chef-lieu, ancien nom, villes supplémentaires].
     *
     * @return array<string, array{code: string, name: string, capital: string, timezone: string, phonePrefix: string, phoneLengths: int[], currency: string, languages: string[], payments: string[], subregion: Subregion, regions: list<array{0: string, 1: string, 2: string, 3: ?string, 4: string[]}>}>
     */
    public static function countries(): array
    {
        return self::data()['countries'];
    }

    /** Coordonnées connues, indexées par "CODE:Ville". @return array<string, array{float, float}> */
    public static function coordinates(): array
    {
        return self::data()['coordinates'];
    }

    /**
     * Crée les référentiels (base vide supposée).
     *
     * @return array{countries: array<string, Country>, cities: array<string, City>, specialties: array<string, Specialty>, plans: array<string, SubscriptionPlan>}
     */
    public static function load(ObjectManager $manager): array
    {
        $countries = $cities = $specialties = $plans = [];
        self::sync($manager, $countries, $cities);

        foreach (self::SPECIALTIES as [$slug, $name, $icon, $en]) {
            $specialties[$slug] = new Specialty($slug, $name, $icon, ['en' => $en]);
            $manager->persist($specialties[$slug]);
        }

        // Les formules peuvent déjà exister : les migrations les créent aussi (tarifs à 5 000 FCFA par mois).
        $i = 0;
        foreach (self::PLANS as $code => [$name, $months, $price]) {
            $plans[$code] = $manager->getRepository(SubscriptionPlan::class)->findOneBy(['code' => $code])
                ?? new SubscriptionPlan($code, $name, $months, $price, $i);
            $manager->persist($plans[$code]);
            ++$i;
        }

        return ['countries' => $countries, 'cities' => $cities, 'specialties' => $specialties, 'plans' => $plans];
    }

    /**
     * Ajoute ou met à jour les pays, régions et chefs-lieux du référentiel sans rien supprimer :
     * utilisable sur une base de production déjà remplie. Les villes sont indexées par "CODE:Ville".
     *
     * @param array<string, Country> $countries
     * @param array<string, City>    $cities
     *
     * @return array{countries: int, regions: int, cities: int} nombre d'éléments créés
     */
    public static function sync(ObjectManager $manager, array &$countries = [], array &$cities = []): array
    {
        $created = ['countries' => 0, 'regions' => 0, 'cities' => 0];
        $countryRepo = $manager->getRepository(Country::class);
        $regionRepo = $manager->getRepository(Region::class);
        $cityRepo = $manager->getRepository(City::class);
        $coordinates = self::coordinates();

        $position = 0;
        foreach (self::countries() as $code => $c) {
            $country = $countryRepo->findOneBy(['code' => $code]);
            if (null === $country) {
                $country = new Country($code, $c['name'], $c['capital'], $c['timezone'], $c['phonePrefix']);
                $manager->persist($country);
                ++$created['countries'];
            } else {
                $country->updateReference($c['name'], $c['capital'], $c['timezone'], $c['phonePrefix']);
            }
            $country->setLanguages($c['languages'])->setCurrency($c['currency'])->setSubregion($c['subregion'])
                ->setPhoneLengths($c['phoneLengths'])->setPosition($position++);
            $countries[$code] = $country;

            foreach ($c['regions'] as $i => [$name, $slug, $chefLieu, $former, $extras]) {
                $region = null !== $country->getId() ? $regionRepo->findOneBy(['country' => $country, 'slug' => $slug]) : null;
                if (null === $region) {
                    $region = new Region($country, $name, $slug, $chefLieu);
                    $manager->persist($region);
                    ++$created['regions'];
                }
                $region->setFormerName($former)->setPosition($i);

                foreach ([$chefLieu, ...$extras] as $cityName) {
                    $key = $code.':'.$cityName;
                    if (isset($cities[$key])) {
                        continue;
                    }
                    $city = null !== $region->getId() ? $cityRepo->findOneBy(['region' => $region, 'name' => $cityName]) : null;
                    if (null === $city) {
                        $city = new City($region, $cityName, ...($coordinates[$key] ?? [null, null]));
                        $manager->persist($city);
                        ++$created['cities'];
                    }
                    $cities[$key] = $city;
                }
            }
        }

        return $created;
    }

    private static function data(): array
    {
        return self::$data ??= self::parse(self::DATA_FILE);
    }

    /** Lit et valide le fichier : une erreur de saisie doit échouer ici, pas au moment d'une réservation. */
    private static function parse(string $file): array
    {
        $raw = json_decode((string) file_get_contents($file), true, 512, \JSON_THROW_ON_ERROR);
        $slugger = new AsciiSlugger('fr');
        $countries = [];

        foreach ($raw['countries'] as $c) {
            $code = $c['code'];
            $where = sprintf('Référentiel %s', $code);
            if (!preg_match('/^[A-Z]{2}$/', $code) || isset($countries[$code])) {
                throw new \UnexpectedValueException($where.' : code absent, invalide ou en double.');
            }
            $subregion = Subregion::tryFrom($c['subregion'] ?? '') ?? throw new \UnexpectedValueException($where.' : sous-région inconnue.');
            new \DateTimeZone($c['timezone']);
            if (!preg_match('/^\+\d{1,3}$/', $c['phonePrefix']) || [] === $c['phoneLengths'] || !preg_match('/^[A-Z]{3}$/', $c['currency'])) {
                throw new \UnexpectedValueException($where.' : indicatif, longueurs de numéro ou monnaie invalides.');
            }

            $unknown = array_diff($c['payments'] ?? [], array_keys(Subscription::METHODS));
            if ([] === ($c['payments'] ?? []) || [] !== $unknown) {
                throw new \UnexpectedValueException($where.' : moyens de paiement absents ou inconnus ('.implode(', ', $unknown).').');
            }

            $regions = $slugs = [];
            foreach ($c['regions'] as $r) {
                [$name, $chefLieu, $former, $extras] = \is_string($r) ? [$r, $r, null, []] : $r + [1 => $r[0], 2 => null, 3 => []];
                $slug = strtolower((string) $slugger->slug($name));
                if (isset($slugs[$slug])) {
                    throw new \UnexpectedValueException(sprintf('%s : deux régions ont le même identifiant "%s".', $where, $slug));
                }
                $slugs[$slug] = true;
                $regions[] = [$name, $slug, $chefLieu, $former, $extras];
            }
            if ([] === $regions) {
                throw new \UnexpectedValueException($where.' : aucune région.');
            }

            $countries[$code] = ['subregion' => $subregion, 'regions' => $regions, 'phoneLengths' => array_map('intval', $c['phoneLengths'])] + $c;
        }

        if (55 !== \count($countries)) {
            throw new \UnexpectedValueException(sprintf('Référentiel : 55 pays attendus, %d trouvés.', \count($countries)));
        }

        return ['countries' => $countries, 'coordinates' => $raw['coordinates'] ?? []];
    }
}
