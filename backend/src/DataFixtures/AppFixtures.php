<?php

namespace App\DataFixtures;

use App\Entity\AvailabilityRule;
use App\Entity\City;
use App\Entity\Country;
use App\Entity\Facility;
use App\Entity\Practitioner;
use App\Entity\Region;
use App\Entity\Specialty;
use App\Entity\Subscription;
use App\Entity\SubscriptionPlan;
use App\Entity\User;
use Random\Engine\Mt19937;
use Random\Randomizer;
use App\Enum\FacilityType;
use App\Reference\ReferenceLoader;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\String\Slugger\AsciiSlugger;

/**
 * Données de démonstration. Les référentiels (pays, régions) reflètent les découpages connus en 2025 et restent
 * marqués "provisional" en attendant la validation des ministères. Les structures et praticiens sont FICTIFS.
 */
final class AppFixtures extends Fixture
{
    private const NAMES = [
        'ML' => [
            'last' => ['Traoré', 'Coulibaly', 'Diarra', 'Keïta', 'Touré', 'Sangaré', 'Maïga', 'Diallo', 'Konaté', 'Sidibé', 'Dembélé', 'Cissé', 'Kanté', 'Samaké', 'Doumbia', 'Haïdara'],
            'm' => ['Moussa', 'Seydou', 'Bakary', 'Mamadou', 'Oumar', 'Sékou', 'Boubacar', 'Abdoulaye', 'Modibo', 'Cheick'],
            'f' => ['Aminata', 'Fatoumata', 'Mariam', 'Kadiatou', 'Assétou', 'Oumou', 'Rokia', 'Awa', 'Djénéba', 'Hawa'],
            'languages' => ['bm', 'ff', 'son'],
            'insurances' => ['AMO', 'Mutuelle', 'Assurance privée'],
        ],
        'BF' => [
            'last' => ['Ouédraogo', 'Sawadogo', 'Compaoré', 'Kaboré', 'Zongo', 'Ouattara', 'Kiemtoré', 'Ilboudo', 'Sanou', 'Tapsoba', 'Nikiéma', 'Zoungrana', 'Bationo', 'Somé', 'Kambou', 'Yaméogo'],
            'm' => ['Issouf', 'Boukary', 'Salif', 'Adama', 'Inoussa', 'Lassané', 'Rasmané', 'Hamidou', 'Brice', 'Wendkouni'],
            'f' => ['Safiatou', 'Alizèta', 'Rasmata', 'Pascaline', 'Salimata', 'Mariétou', 'Clarisse', 'Awa', 'Bibata', 'Nafissatou'],
            'languages' => ['mos', 'dyu', 'ff'],
            'insurances' => ['AMU (CNAMU)', 'Mutuelle', 'Assurance privée'],
        ],
        'NE' => [
            'last' => ['Issoufou', 'Moussa', 'Abdou', 'Maïga', 'Hamani', 'Garba', 'Souley', 'Mahamadou', 'Idrissa', 'Oumarou', 'Boubacar', 'Hassane', 'Saïdou', 'Amadou', 'Ibrahim', 'Yacouba'],
            'm' => ['Abdoulaye', 'Ousmane', 'Hamidou', 'Issa', 'Moctar', 'Salissou', 'Aboubacar', 'Harouna', 'Lawali', 'Sani'],
            'f' => ['Zeinabou', 'Mariama', 'Rabi', 'Hadiza', 'Fati', 'Aïchatou', 'Ramatou', 'Halima', 'Balkissa', 'Safiya'],
            'languages' => ['ha', 'dje', 'ff'],
            'insurances' => ['Mutuelle', 'Assurance privée'],
        ],
    ];

    /** Structures fictives : [pays, ville, nom, type, adresse]. */
    private const FACILITIES = [
        ['ML', 'Bamako', 'Clinique Djoliba Santé', FacilityType::Clinic, 'ACI 2000, rue 380'],
        ['ML', 'Bamako', 'Centre médical Le Baobab', FacilityType::HealthCenter, 'Hamdallaye, avenue Cheick Zayed'],
        ['ML', 'Bamako', 'Cabinet médical Niaréla', FacilityType::Office, 'Niaréla, rue 410'],
        ['ML', 'Bamako', 'Polyclinique du Fleuve', FacilityType::Clinic, 'Badalabougou, près du pont des Martyrs'],
        ['ML', 'Kati', 'Cabinet Santé Plus Kati', FacilityType::Office, 'Kati Coura'],
        ['ML', 'Sikasso', 'Clinique Kénédougou', FacilityType::Clinic, 'Quartier Wayerma'],
        ['ML', 'Ségou', 'Centre médical Ségou Kôrô', FacilityType::HealthCenter, 'Route de Markala'],
        ['ML', 'Kayes', 'Cabinet du Sahel occidental', FacilityType::Office, 'Kayes Ndi'],
        ['ML', 'Mopti', 'Clinique de la Venise', FacilityType::Clinic, 'Sévaré, route nationale 16'],
        ['ML', 'Koutiala', 'Cabinet médical Minkoungo', FacilityType::Office, 'Centre-ville'],
        ['BF', 'Ouagadougou', 'Clinique Wend-Panga', FacilityType::Clinic, 'Ouaga 2000, avenue Pascal Zagré'],
        ['BF', 'Ouagadougou', 'Centre médical Naaba', FacilityType::HealthCenter, 'Gounghin, rue 17.32'],
        ['BF', 'Ouagadougou', 'Cabinet médical Zogona', FacilityType::Office, 'Zogona, près de l\'université'],
        ['BF', 'Ouagadougou', 'Polyclinique Laafi', FacilityType::Clinic, 'Patte d\'Oie'],
        ['BF', 'Bobo-Dioulasso', 'Clinique Sya Santé', FacilityType::Clinic, 'Secteur 22, avenue de la Révolution'],
        ['BF', 'Bobo-Dioulasso', 'Cabinet du Guiriko', FacilityType::Office, 'Koko, rue Malherbe'],
        ['BF', 'Koudougou', 'Centre médical du Nando', FacilityType::HealthCenter, 'Secteur 5'],
        ['BF', 'Ouahigouya', 'Cabinet médical Yaadga', FacilityType::Office, 'Secteur 9'],
        ['BF', 'Banfora', 'Clinique des Cascades', FacilityType::Clinic, 'Route de Bobo'],
        ['BF', 'Kaya', 'Cabinet Laafi Kaya', FacilityType::Office, 'Centre-ville'],
        ['NE', 'Niamey', 'Clinique Gamkalé Santé', FacilityType::Clinic, 'Plateau, boulevard de la République'],
        ['NE', 'Niamey', 'Centre médical Kouara Kano', FacilityType::HealthCenter, 'Kouara Kano'],
        ['NE', 'Niamey', 'Cabinet médical du Fleuve', FacilityType::Office, 'Rive droite, Harobanda'],
        ['NE', 'Niamey', 'Polyclinique Lafia', FacilityType::Clinic, 'Yantala'],
        ['NE', 'Maradi', 'Clinique Maradi Lafia', FacilityType::Clinic, 'Quartier Sabon Gari'],
        ['NE', 'Zinder', 'Cabinet du Damagaram', FacilityType::Office, 'Birni'],
        ['NE', 'Tahoua', 'Centre médical de l\'Ader', FacilityType::HealthCenter, 'Centre-ville'],
        ['NE', 'Dosso', 'Cabinet médical Djerma', FacilityType::Office, 'Route de Niamey'],
        ['NE', 'Agadez', 'Cabinet de l\'Aïr', FacilityType::Office, 'Près de la grande mosquée'],
    ];

    public function load(ObjectManager $manager): void
    {
        mt_srand(2026);
        $slugger = new AsciiSlugger('fr');

        ['countries' => $countries, 'cities' => $cities, 'specialties' => $specialties, 'plans' => $plans] = ReferenceLoader::load($manager);
        $facilities = [];
        foreach (self::FACILITIES as [$code, $cityName, $name, $type, $address]) {
            $facility = new Facility($name, $type, $cities[$cityName], $address.', '.$cityName);
            [$lat, $lng] = ReferenceLoader::COORDINATES[$cityName];
            $facility->setCoordinates($lat + mt_rand(-200, 200) / 10000, $lng + mt_rand(-200, 200) / 10000)
                ->setPhone(ReferenceLoader::COUNTRIES[$code][3].' '.implode(' ', str_split((string) mt_rand(20000000, 99999999), 2)));
            $manager->persist($facility);
            $facilities[$code][] = $facility;
        }

        // Générateur séparé : ne décale pas les noms des praticiens générés par mt_rand.
        $rng = new Randomizer(new Mt19937(42));

        $practitionerAccount = null;
        $mlPendingOrder = false;
        $usedSlugs = [];
        $specialtyPool = array_keys($specialties);
        foreach (self::NAMES as $code => $pool) {
            foreach ($facilities[$code] as $index => $facility) {
                // Les capitales concentrent l'offre : 3 praticiens par structure de la capitale, 2 ailleurs.
                $count = $facility->getCity()->getName() === ReferenceLoader::COUNTRIES[$code][1] ? 3 : 2;
                for ($n = 0; $n < $count; ++$n) {
                    $gender = mt_rand(0, 1) ? 'f' : 'm';
                    $first = $pool[$gender][mt_rand(0, \count($pool[$gender]) - 1)];
                    $last = $pool['last'][mt_rand(0, \count($pool['last']) - 1)];
                    $slug = strtolower($slugger->slug($first.' '.$last));
                    $base = $slug;
                    for ($i = 2; isset($usedSlugs[$slug]); ++$i) {
                        $slug = $base.'-'.$i;
                    }
                    $usedSlugs[$slug] = true;

                    // Une offre de soins primaires dense : beaucoup de généralistes, pédiatres et gynécologues.
                    $mainSpecialty = 0 === $n && 0 === $index % 2
                        ? ['medecine-generale', 'pediatrie', 'gynecologie'][mt_rand(0, 2)]
                        : $specialtyPool[mt_rand(0, \count($specialtyPool) - 1)];

                    $p = new Practitioner($slug, $first, $last, 'f' === $gender ? 'F' : 'M', sprintf('%s-%s-%05d', $code, 'ORD', mt_rand(1000, 99999)));
                    if (\in_array($mainSpecialty, ['sage-femme', 'kinesitherapie'], true)) {
                        $p->setTitle('');
                    }
                    $p->addSpecialty($specialties[$mainSpecialty]);
                    $p->addFacility($facility);
                    $p->setFee(match (true) {
                        'medecine-generale' === $mainSpecialty => [5000, 7500, 10000][mt_rand(0, 2)],
                        \in_array($mainSpecialty, ['sage-femme', 'kinesitherapie'], true) => [5000, 7500][mt_rand(0, 1)],
                        default => [10000, 15000, 20000, 25000][mt_rand(0, 3)],
                    });
                    $p->setLanguages(array_values(array_unique(['fr', $pool['languages'][mt_rand(0, 2)], ...(mt_rand(0, 3) ? [] : ['en'])])));
                    $p->setInsurances(\array_slice($pool['insurances'], 0, mt_rand(1, \count($pool['insurances']))));
                    $p->setTeleconsultation(0 === mt_rand(0, 2));
                    $p->setDegrees([
                        sprintf('Doctorat en médecine, %s', ['Université de Bamako', 'Université Joseph Ki-Zerbo', 'Université Abdou Moumouni', 'Université Cheikh Anta Diop'][mt_rand(0, 3)]),
                        sprintf('Diplôme d\'études spécialisées, %s', $specialties[$mainSpecialty]->getName()),
                    ]);
                    $p->setBio(sprintf(
                        '%s exerce à %s, %s. Consultations en %s.',
                        $p->getFullName(),
                        $facility->getName(),
                        $facility->getCity()->getName(),
                        implode(', ', array_map(fn ($l) => mb_strtolower(\App\Service\Presenter::LANGUAGES[$l]), $p->getLanguages())),
                    ));
                    $this->schedule($p, $facility);

                    // Quelques fiches restent en attente de vérification pour le back-office.
                    if (0 === mt_rand(0, 9)) {
                        // reste "pending"
                    } else {
                        $p->verify();
                    }
                    $manager->persist($p);

                    if (null === $practitionerAccount && 'ML' === $code && $p->isVerified()) {
                        $practitionerAccount = $p;
                        // Compte praticien de démo : abonnement semestriel qui expire dans 5 jours (bandeau de renouvellement).
                        $this->paidSubscription($manager, $p, $plans['semester'], new \DateTimeImmutable('-6 months +5 days'));
                    } elseif (!$mlPendingOrder && 'ML' === $code && $p->isVerified()) {
                        // Garantit une commande à confirmer dans le back-office de l'administrateur Mali.
                        $manager->persist(new Subscription($p, $plans['annual'], 'mobile_money'));
                        $mlPendingOrder = true;
                    } elseif ($p->isVerified()) {
                        $this->demoSubscription($manager, $p, $plans, $rng);
                    }
                }
            }
        }

        // Comptes de démonstration (connexion par OTP, code affiché en environnement dev).
        $patient = (new User('+22370000001'))->setFirstName('Awa')->setLastName('Traoré')->giveConsent();
        $pro = (new User('+22370000002'))->setFirstName($practitionerAccount->getFirstName())->setLastName($practitionerAccount->getLastName())
            ->setRoles([User::ROLE_PRACTITIONER])->giveConsent();
        $practitionerAccount->setUser($pro);
        $admin = (new User('+22370000003'))->setFirstName('Admin')->setLastName('Mali')
            ->setRoles([User::ROLE_COUNTRY_ADMIN])->setAdminCountry($countries['ML'])->giveConsent();
        $super = (new User('+22790000000'))->setFirstName('Super')->setLastName('Admin')
            ->setRoles([User::ROLE_SUPER_ADMIN])->giveConsent();
        foreach ([$patient, $pro, $admin, $super] as $user) {
            $manager->persist($user);
        }

        $manager->flush();
    }

    /**
     * Situation d'abonnement variée pour la démo : la plupart des praticiens vérifiés sont abonnés,
     * quelques-uns ont laissé expirer leur abonnement (invisibles) et d'autres ont une commande à confirmer.
     *
     * @param array<string, SubscriptionPlan> $plans
     */
    private function demoSubscription(ObjectManager $manager, Practitioner $p, array $plans, Randomizer $rng): void
    {
        $roll = $rng->getInt(1, 10);
        if (1 === $roll) {
            // Abonnement expiré il y a quelques semaines : profil masqué.
            $this->paidSubscription($manager, $p, $plans['semester'], new \DateTimeImmutable(sprintf('-%d days', 190 + $rng->getInt(0, 60))));

            return;
        }
        if (2 === $roll) {
            // Nouveau praticien vérifié qui vient de commander : paiement à confirmer par l'administrateur.
            $manager->persist(new Subscription($p, $plans[$rng->getInt(0, 1) ? 'annual' : 'semester'], 'mobile_money'));

            return;
        }
        $plan = $rng->getInt(0, 2) ? $plans['annual'] : $plans['semester'];
        $daysAgo = $rng->getInt(5, $plan->getDurationMonths() * 30 - 20);
        $this->paidSubscription($manager, $p, $plan, new \DateTimeImmutable(sprintf('-%d days', $daysAgo)));
    }

    private function paidSubscription(ObjectManager $manager, Practitioner $p, SubscriptionPlan $plan, \DateTimeImmutable $start): void
    {
        $subscription = new Subscription($p, $plan, 'mobile_money');
        $subscription->markPaid($start, 'DEMO-'.strtoupper(bin2hex(random_bytes(3))), null);
        $p->setPublishedUntil($subscription->getEndsAt());
        $manager->persist($subscription);
    }

    /** Horaires types : matinées du lundi au samedi, quelques après-midis. */
    private function schedule(Practitioner $p, Facility $facility): void
    {
        $slot = [15, 20, 30][mt_rand(0, 2)];
        $morningEnd = ['12:00', '12:30', '13:00'][mt_rand(0, 2)];
        for ($day = 1; $day <= 6; ++$day) {
            if (0 === mt_rand(0, 5)) {
                continue;
            }
            $p->addAvailabilityRule(new AvailabilityRule($p, $facility, $day, ['07:30', '08:00', '08:30'][mt_rand(0, 2)], 6 === $day ? '12:00' : $morningEnd, $slot));
            // Vendredi après-midi libéré pour la prière ; quelques après-midis ailleurs.
            if ($day < 5 && 0 === mt_rand(0, 1)) {
                $p->addAvailabilityRule(new AvailabilityRule($p, $facility, $day, '15:00', '18:00', $slot));
            }
        }
    }
}
