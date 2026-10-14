<?php

namespace App\Tests\Controller;

use App\Entity\ApiToken;
use App\Entity\Appointment;
use App\Entity\AvailabilityRule;
use App\Entity\City;
use App\Entity\Country;
use App\Entity\Facility;
use App\Entity\Practitioner;
use App\Entity\Region;
use App\Entity\User;
use App\Enum\FacilityType;
use App\Service\VideoConsultation;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Uid\Uuid;

/**
 * Téléconsultation : réservation en vidéo, salle privée réservée au patient et au praticien, fenêtre d'ouverture.
 */
final class VideoTest extends WebTestCase
{
    private KernelBrowser $client;
    private EntityManagerInterface $em;
    private Practitioner $practitioner;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->em = static::getContainer()->get(EntityManagerInterface::class);
        $schema = new SchemaTool($this->em);
        $metadata = $this->em->getMetadataFactory()->getAllMetadata();
        $schema->dropSchema($metadata);
        $schema->createSchema($metadata);
        static::getContainer()->get('cache.rate_limiter')->clear();

        $country = new Country('ML', 'Mali', 'Bamako', 'Africa/Bamako', '+223');
        $region = new Region($country, 'District de Bamako', 'district-de-bamako', 'Bamako');
        $city = new City($region, 'Bamako');
        $facility = new Facility('Clinique test', FacilityType::Clinic, $city, 'ACI 2000');
        $this->practitioner = (new Practitioner('dr-video', 'Awa', 'Video', 'F', 'ML-9'))->addFacility($facility)->verify()
            ->setPublishedUntil(new \DateTimeImmutable('+1 month'))->setTeleconsultation(true);
        for ($day = 1; $day <= 7; ++$day) {
            $this->practitioner->addAvailabilityRule(new AvailabilityRule($this->practitioner, $facility, $day, '08:00', '18:00', 30));
        }
        foreach ([$country, $region, $city, $facility, $this->practitioner] as $entity) {
            $this->em->persist($entity);
        }
        $this->em->flush();
    }

    public function testVideoBookingIsReservedToItsParticipants(): void
    {
        $patient = $this->token($this->user('+22370000011', 'Awa', 'Patient'));
        $practitionerToken = $this->token($this->practitioner->setUser($this->user('+22370000012', 'Awa', 'Video'))->getUser());
        $stranger = $this->token($this->user('+22370000013', 'Moussa', 'Autre'));

        $this->request('POST', '/api/appointments', ['practitioner' => 'dr-video', 'startsAt' => $this->firstSlot(), 'video' => true], $patient);
        self::assertResponseStatusCodeSame(201);
        $appointment = $this->response();
        self::assertTrue($appointment['video']);
        self::assertNotNull($appointment['videoOpensAt']);
        self::assertArrayNotHasKey('videoRoom', $appointment);

        // Avant la fenêtre d'ouverture : informations sans la salle.
        $this->request('GET', '/api/appointments/'.$appointment['id'].'/video', null, $patient);
        self::assertResponseIsSuccessful();
        $video = $this->response();
        self::assertFalse($video['open']);
        self::assertNull($video['room']);
        self::assertSame('patient', $video['role']);

        $this->request('GET', '/api/appointments/'.$appointment['id'].'/video', null, $practitionerToken);
        self::assertResponseIsSuccessful();
        self::assertSame('practitioner', $this->response()['role']);

        $this->request('GET', '/api/appointments/'.$appointment['id'].'/video', null, $stranger);
        self::assertResponseStatusCodeSame(404);
    }

    public function testVideoRequiresAPractitionerOfferingIt(): void
    {
        $this->practitioner->setTeleconsultation(false);
        $this->em->flush();
        $patient = $this->token($this->user('+22370000021', 'Awa', 'Patient'));

        $this->request('POST', '/api/appointments', ['practitioner' => 'dr-video', 'startsAt' => $this->firstSlot(), 'video' => true], $patient);
        self::assertResponseStatusCodeSame(422);
    }

    public function testRoomOpensFifteenMinutesBeforeAndClosesAnHourAfter(): void
    {
        $videos = static::getContainer()->get(VideoConsultation::class);
        $start = new \DateTimeImmutable('2030-01-10 10:00:00');
        $a = (new Appointment($this->user('+22370000031', 'Awa', 'P'), $this->practitioner, $this->practitioner->getMainFacility(), $start, $start->modify('+30 minutes'), null, true))
            ->startVideo($videos->newRoom());

        self::assertMatchesRegularExpression('/^[a-z]+-[0-9a-f]{32}$/', $a->getVideoRoom());
        self::assertFalse($videos->isOpen($a, new \DateTimeImmutable('2030-01-10 09:44:00')));
        self::assertTrue($videos->isOpen($a, new \DateTimeImmutable('2030-01-10 09:45:00')));
        self::assertTrue($videos->isOpen($a, new \DateTimeImmutable('2030-01-10 11:30:00')));
        self::assertFalse($videos->isOpen($a, new \DateTimeImmutable('2030-01-10 11:31:00')));
    }

    private function firstSlot(): string
    {
        $this->request('GET', '/api/practitioners/dr-video/slots?days=3');
        foreach ($this->response()['days'] as $day) {
            if ([] !== $day['slots']) {
                return $day['slots'][0]['start'];
            }
        }
        self::fail('Aucun créneau.');
    }

    private function user(string $phone, string $first, string $last): User
    {
        $user = (new User($phone))->setFirstName($first)->setLastName($last)->giveConsent();
        $this->em->persist($user);
        $this->em->flush();

        return $user;
    }

    private function token(User $user): string
    {
        $token = bin2hex(random_bytes(16));
        $this->em->persist(new ApiToken($user, hash('sha256', $token), new \DateTimeImmutable('+1 day')));
        $this->em->flush();

        return $token;
    }

    private function request(string $method, string $uri, ?array $body = null, ?string $token = null): void
    {
        $server = ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'];
        if (null !== $token) {
            $server['HTTP_AUTHORIZATION'] = 'Bearer '.$token;
        }
        $this->client->request($method, $uri, [], [], $server, null === $body ? null : json_encode($body));
    }

    private function response(): array
    {
        return json_decode((string) $this->client->getResponse()->getContent(), true);
    }
}
