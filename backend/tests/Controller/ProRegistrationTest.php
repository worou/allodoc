<?php

namespace App\Tests\Controller;

use App\Entity\City;
use App\Entity\Country;
use App\Entity\Practitioner;
use App\Entity\Region;
use App\Entity\Specialty;
use App\Entity\SubscriptionPlan;
use App\Enum\Subregion;
use App\Enum\VerificationStatus;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Inscription d'un praticien depuis son compte, puis accès à l'abonnement et commande avec un moyen de son pays.
 */
final class ProRegistrationTest extends WebTestCase
{
    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $schema = new SchemaTool($em);
        $metadata = $em->getMetadataFactory()->getAllMetadata();
        $schema->dropSchema($metadata);
        $schema->createSchema($metadata);
        static::getContainer()->get('cache.app')->clear();
        static::getContainer()->get('cache.rate_limiter')->clear();

        $country = (new Country('SN', 'Sénégal', 'Dakar', 'Africa/Dakar', '+221'))->setSubregion(Subregion::West)->setPhoneLengths([9]);
        $region = new Region($country, 'Dakar', 'dakar', 'Dakar');
        foreach ([$country, $region, new City($region, 'Dakar'), new Specialty('pediatrie', 'Pédiatre', 'child'), new SubscriptionPlan('annual', 'Annuel', 12, 10000)] as $entity) {
            $em->persist($entity);
        }
        $em->flush();
    }

    public function testRegistrationGivesAccessToSubscriptionAndPayment(): void
    {
        $token = $this->login('fatou.diop@example.org');

        $this->json('POST', '/api/pro/registration', $this->form(), $token);
        self::assertResponseStatusCodeSame(201);
        $data = $this->response();
        self::assertContains('ROLE_PRACTITIONER', $data['user']['roles']);
        self::assertSame('fatou-diop', $data['practitioner']['slug']);

        $practitioner = static::getContainer()->get(EntityManagerInterface::class)->getRepository(Practitioner::class)->findOneBy(['slug' => 'fatou-diop']);
        self::assertSame(VerificationStatus::Pending, $practitioner->getVerificationStatus());
        self::assertSame('Dakar', $practitioner->getMainFacility()->getCity()->getName());
        self::assertCount(5, $practitioner->getAvailabilityRules());

        // Espace abonnement : moyens de paiement du Sénégal, avec le numéro de réception par défaut.
        $this->json('GET', '/api/pro/subscription', null, $token);
        self::assertResponseIsSuccessful();
        $status = $this->response();
        self::assertFalse($status['verified']);
        self::assertSame(['orange_money', 'wave', 'free_money', 'paypal'], array_column($status['methods'], 'code'));
        self::assertSame('+229 90 28 53 86', $status['paymentAccount']['wave']);

        $this->json('POST', '/api/pro/subscriptions', ['plan' => 'annual', 'method' => 'wave'], $token);
        self::assertResponseStatusCodeSame(201);
        self::assertSame('pending', $this->response()['status']);

        // Une seule fiche par compte.
        $this->json('POST', '/api/pro/registration', $this->form(), $token);
        self::assertResponseStatusCodeSame(409);
    }

    public function testMissingFieldsAreReported(): void
    {
        $token = $this->login('incomplet@example.org');
        $this->json('POST', '/api/pro/registration', ['firstName' => 'Awa'] + $this->form(['lastName' => '', 'fee' => 'abc']), $token);
        self::assertResponseStatusCodeSame(422);
        self::assertSame(['lastName', 'fee'], $this->response()['fields']);
    }

    public function testUnknownRegionIsRefused(): void
    {
        $token = $this->login('region@example.org');
        $this->json('POST', '/api/pro/registration', $this->form(['region' => 'nairobi']), $token);
        self::assertResponseStatusCodeSame(422);
    }

    public function testAnonymousCannotRegister(): void
    {
        $this->json('POST', '/api/pro/registration', $this->form());
        self::assertResponseStatusCodeSame(401);
    }

    private function form(array $override = []): array
    {
        return $override + [
            'title' => 'Dr', 'firstName' => 'Fatou', 'lastName' => 'Diop', 'gender' => 'F', 'orderNumber' => 'SN-ORD-1234',
            'specialty' => 'pediatrie', 'country' => 'SN', 'region' => 'dakar', 'city' => 'dakar',
            'facilityName' => 'Cabinet Diop', 'facilityType' => 'office', 'address' => 'Médina, rue 22', 'fee' => 15000,
        ];
    }

    private function login(string $email): string
    {
        $this->json('POST', '/api/auth/otp/request', ['email' => $email]);
        $code = $this->response()['devCode'];
        $this->json('POST', '/api/auth/otp/verify', ['email' => $email, 'code' => $code]);
        self::assertResponseIsSuccessful();

        return $this->response()['token'];
    }

    private function json(string $method, string $uri, ?array $body = null, ?string $token = null): void
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
