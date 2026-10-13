<?php

namespace App\Tests\Service;

use App\Entity\City;
use App\Entity\Country;
use App\Entity\Facility;
use App\Entity\Practitioner;
use App\Entity\Region;
use App\Entity\SubscriptionPlan;
use App\Enum\FacilityType;
use App\Enum\SubscriptionStatus;
use App\Payment\ExchangeRates;
use App\Service\BookingException;
use App\Service\SubscriptionService;
use App\Tests\Mock\OAuthMockResponses;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Moyens de paiement par pays, équivalent en dollars et paiement PayPal (API simulée par OAuthMockResponses).
 */
final class PaymentTest extends KernelTestCase
{
    private const NUMBER = '+229 90 28 53 86';

    private EntityManagerInterface $em;
    private SubscriptionService $subscriptions;
    private SubscriptionPlan $annual;
    /** @var array<string, Practitioner> */
    private array $practitioners = [];

    protected function setUp(): void
    {
        self::bootKernel();
        OAuthMockResponses::reset();
        $this->em = static::getContainer()->get(EntityManagerInterface::class);
        $this->subscriptions = static::getContainer()->get(SubscriptionService::class);
        $schema = new SchemaTool($this->em);
        $metadata = $this->em->getMetadataFactory()->getAllMetadata();
        $schema->dropSchema($metadata);
        $schema->createSchema($metadata);

        $this->annual = new SubscriptionPlan('annual', 'Annuel', 12, 10000);
        $this->em->persist($this->annual);
        foreach ([['ML', 'Mali', 'Bamako', 'Africa/Bamako', '+223'], ['KE', 'Kenya', 'Nairobi', 'Africa/Nairobi', '+254']] as [$code, $name, $capital, $tz, $prefix]) {
            $country = new Country($code, $name, $capital, $tz, $prefix);
            $region = new Region($country, $capital, strtolower($capital), $capital);
            $city = new City($region, $capital);
            $facility = new Facility('Clinique '.$capital, FacilityType::Clinic, $city, 'Centre-ville');
            $this->practitioners[$code] = (new Practitioner('dr-'.strtolower($code), 'Awa', 'Test', 'F', $code.'-1'))->addFacility($facility)->verify();
            foreach ([$country, $region, $city, $facility, $this->practitioners[$code]] as $entity) {
                $this->em->persist($entity);
            }
        }
        $this->em->flush();
    }

    public function testMethodsDependOnTheCountry(): void
    {
        self::assertSame(['orange_money', 'moov_money', 'wave', 'paypal'], $this->subscriptions->paymentMethods($this->practitioners['ML']));
        self::assertSame(['mpesa', 'airtel_money', 'paypal'], $this->subscriptions->paymentMethods($this->practitioners['KE']));
    }

    public function testDefaultNumberForEveryMobileMoneyOperator(): void
    {
        $account = $this->subscriptions->paymentAccount($this->practitioners['KE']);
        self::assertSame(['holder' => 'AlloDoc', 'mpesa' => self::NUMBER, 'airtel_money' => self::NUMBER, 'paypal' => null], $account);
    }

    public function testOperatorOfAnotherCountryIsRefused(): void
    {
        $this->expectException(BookingException::class);
        $this->subscriptions->order($this->practitioners['ML'], $this->annual, 'mpesa');
    }

    public function testUsdEquivalentRoundsUpToTheCent(): void
    {
        // Taux de secours en test : 585 FCFA pour 1 $ ; 10 000 FCFA = 17,094 $ -> 17,10 $.
        $rates = static::getContainer()->get(ExchangeRates::class);
        self::assertSame(1710, $rates->toUsdCents(10000, 'XOF'));
        self::assertSame(1000, $rates->toUsdCents(10, 'USD'));
    }

    public function testPayPalPaymentPublishesTheProfile(): void
    {
        $practitioner = $this->practitioners['KE'];
        $subscription = $this->subscriptions->order($practitioner, $this->annual, 'paypal');

        $orderId = $this->subscriptions->startPayPal($subscription);
        self::assertSame('PAYPAL-ORDER-1', $orderId);
        self::assertSame(1710, $subscription->getAmountUsdCents());
        $unit = OAuthMockResponses::$paypalOrder['purchase_units'][0];
        self::assertSame(['currency_code' => 'USD', 'value' => '17.10'], $unit['amount']);
        self::assertSame($subscription->getReference(), $unit['custom_id']);

        $this->subscriptions->completePayPal($subscription, $orderId);
        self::assertSame(SubscriptionStatus::Paid, $subscription->getStatus());
        self::assertSame('PAYPAL-CAPTURE-42', $subscription->getTransactionId());
        self::assertTrue($practitioner->isPublished());
    }

    public function testPayPalCaptureWithAWrongAmountIsNotAccepted(): void
    {
        $subscription = $this->subscriptions->order($this->practitioners['ML'], $this->annual, 'paypal');
        $orderId = $this->subscriptions->startPayPal($subscription);
        OAuthMockResponses::$paypalCapture = OAuthMockResponses::completedCapture('1.00');

        try {
            $this->subscriptions->completePayPal($subscription, $orderId);
            self::fail('Un montant inférieur ne doit pas publier le profil.');
        } catch (BookingException $e) {
            self::assertSame(409, $e->status);
        }
        self::assertSame(SubscriptionStatus::Pending, $subscription->getStatus());
        self::assertFalse($this->practitioners['ML']->isPublished());
        // Trace du paiement encaissé, pour le rapprochement par l'administrateur.
        self::assertSame('PAYPAL-CAPTURE-42 COMPLETED 1.00 USD', $subscription->getTransactionId());
    }

    public function testPayPalCaptureNeedsTheOrderCreatedForThisSubscription(): void
    {
        $subscription = $this->subscriptions->order($this->practitioners['ML'], $this->annual, 'paypal');
        $this->subscriptions->startPayPal($subscription);

        $this->expectException(BookingException::class);
        $this->subscriptions->completePayPal($subscription, 'ANOTHER-ORDER');
    }

    public function testPayPalIsRefusedForAMobileMoneyOrder(): void
    {
        $subscription = $this->subscriptions->order($this->practitioners['ML'], $this->annual, 'wave');

        $this->expectException(BookingException::class);
        $this->subscriptions->startPayPal($subscription);
    }
}
