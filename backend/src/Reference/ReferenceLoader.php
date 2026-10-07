<?php

namespace App\Reference;

use App\Entity\City;
use App\Entity\Country;
use App\Entity\Region;
use App\Entity\Specialty;
use App\Entity\SubscriptionPlan;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\String\Slugger\AsciiSlugger;

/**
 * Référentiels de base, utilisés en production (commande app:install) comme en démonstration (fixtures) :
 * pays, régions (découpages connus en 2025, marqués "provisional" en attendant la validation des ministères),
 * chefs-lieux, spécialités et formules d'abonnement.
 */
final class ReferenceLoader
{
    /** code => [nom, capitale, fuseau, indicatif, langues] */
    public const COUNTRIES = [
        'ML' => ['Mali', 'Bamako', 'Africa/Bamako', '+223', ['fr', 'bm', 'ff', 'son', 'tmh', 'ar']],
        'BF' => ['Burkina Faso', 'Ouagadougou', 'Africa/Ouagadougou', '+226', ['fr', 'mos', 'dyu', 'ff']],
        'NE' => ['Niger', 'Niamey', 'Africa/Niamey', '+227', ['fr', 'ha', 'dje', 'ff', 'tmh', 'ar']],
    ];

    /** [nom, chef-lieu, ancien nom] */
    public const REGIONS = [
        'ML' => [
            ['District de Bamako', 'Bamako', null], ['Kayes', 'Kayes', null], ['Koulikoro', 'Koulikoro', null],
            ['Sikasso', 'Sikasso', null], ['Ségou', 'Ségou', null], ['Mopti', 'Mopti', null],
            ['Tombouctou', 'Tombouctou', null], ['Gao', 'Gao', null], ['Kidal', 'Kidal', null],
            ['Taoudénit', 'Taoudéni', null], ['Ménaka', 'Ménaka', null], ['Nioro', 'Nioro du Sahel', null],
            ['Kita', 'Kita', null], ['Dioïla', 'Dioïla', null], ['Nara', 'Nara', null],
            ['Bougouni', 'Bougouni', null], ['Koutiala', 'Koutiala', null], ['San', 'San', null],
            ['Douentza', 'Douentza', null], ['Bandiagara', 'Bandiagara', null],
        ],
        'BF' => [
            ['Kadiogo', 'Ouagadougou', 'Centre'], ['Guiriko', 'Bobo-Dioulasso', 'Hauts-Bassins'],
            ['Bankui', 'Dédougou', 'Boucle du Mouhoun'], ['Djôrô', 'Gaoua', 'Sud-Ouest'],
            ['Goulmou', "Fada N'Gourma", 'Est'], ['Kuilsé', 'Kaya', 'Centre-Nord'], ['Liptako', 'Dori', 'Sahel'],
            ['Nando', 'Koudougou', 'Centre-Ouest'], ['Nakambé', 'Tenkodogo', 'Centre-Est'],
            ['Nazinon', 'Manga', 'Centre-Sud'], ['Oubri', 'Ziniaré', 'Plateau-Central'],
            ['Sirba', 'Bogandé', null], ['Soum', 'Djibo', null], ['Tannounyan', 'Banfora', 'Cascades'],
            ['Tapoa', 'Diapaga', null], ['Sourou', 'Tougan', null], ['Yaadga', 'Ouahigouya', 'Nord'],
        ],
        'NE' => [
            ['Niamey', 'Niamey', null], ['Agadez', 'Agadez', null], ['Diffa', 'Diffa', null], ['Dosso', 'Dosso', null],
            ['Maradi', 'Maradi', null], ['Tahoua', 'Tahoua', null], ['Tillabéri', 'Tillabéri', null], ['Zinder', 'Zinder', null],
        ],
    ];

    public const COORDINATES = [
        'Bamako' => [12.6392, -8.0029], 'Kayes' => [14.4469, -11.4445], 'Sikasso' => [11.3176, -5.6665],
        'Ségou' => [13.4317, -6.2157], 'Mopti' => [14.4843, -4.1830], 'Koulikoro' => [12.8627, -7.5598],
        'Koutiala' => [12.3917, -5.4642], 'Kati' => [12.7441, -8.0726], 'Gao' => [16.2717, -0.0447],
        'Ouagadougou' => [12.3714, -1.5197], 'Bobo-Dioulasso' => [11.1771, -4.2979], 'Koudougou' => [12.2526, -2.3627],
        'Ouahigouya' => [13.5828, -2.4216], 'Banfora' => [10.6333, -4.7667], 'Kaya' => [13.0917, -1.0844],
        "Fada N'Gourma" => [12.0617, 0.3583], 'Tenkodogo' => [11.7800, -0.3697],
        'Niamey' => [13.5116, 2.1254], 'Maradi' => [13.5000, 7.1017], 'Zinder' => [13.8053, 8.9881],
        'Tahoua' => [14.8888, 5.2692], 'Dosso' => [13.0490, 3.1937], 'Agadez' => [16.9742, 7.9865],
    ];

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

    /** code => [nom, durée en mois, prix FCFA] */
    public const PLANS = [
        'semester' => ['Semestriel', 6, 6000],
        'annual' => ['Annuel', 12, 10000],
    ];

    /**
     * Crée les référentiels (base vide supposée).
     *
     * @return array{countries: array<string, Country>, cities: array<string, City>, specialties: array<string, Specialty>, plans: array<string, SubscriptionPlan>}
     */
    public static function load(ObjectManager $manager): array
    {
        $slugger = new AsciiSlugger('fr');
        $countries = $cities = $specialties = $plans = [];

        $position = 0;
        foreach (self::COUNTRIES as $code => [$name, $capital, $tz, $prefix, $languages]) {
            $country = (new Country($code, $name, $capital, $tz, $prefix))->setLanguages($languages)->setPosition($position++);
            $manager->persist($country);
            $countries[$code] = $country;

            foreach (self::REGIONS[$code] as $i => [$regionName, $chefLieu, $former]) {
                $region = (new Region($country, $regionName, strtolower($slugger->slug($regionName)), $chefLieu))
                    ->setFormerName($former)
                    ->setPosition($i);
                $manager->persist($region);
                [$lat, $lng] = self::COORDINATES[$chefLieu] ?? [null, null];
                $cities[$chefLieu] = new City($region, $chefLieu, $lat, $lng);
                $manager->persist($cities[$chefLieu]);
                if ('Koulikoro' === $regionName) {
                    $cities['Kati'] = new City($region, 'Kati', ...self::COORDINATES['Kati']);
                    $manager->persist($cities['Kati']);
                }
            }
        }

        foreach (self::SPECIALTIES as [$slug, $name, $icon, $en]) {
            $specialties[$slug] = new Specialty($slug, $name, $icon, ['en' => $en]);
            $manager->persist($specialties[$slug]);
        }

        $i = 0;
        foreach (self::PLANS as $code => [$name, $months, $price]) {
            $plans[$code] = new SubscriptionPlan($code, $name, $months, $price, $i++);
            $manager->persist($plans[$code]);
        }

        return ['countries' => $countries, 'cities' => $cities, 'specialties' => $specialties, 'plans' => $plans];
    }
}
