<?php

namespace App\Tests\Service;

use App\Entity\City;
use App\Entity\Country;
use App\Entity\Facility;
use App\Entity\Practitioner;
use App\Entity\Region;
use App\Entity\SubscriptionPlan;
use App\Enum\FacilityType;
use App\Repository\PractitionerSearch;
use App\Service\BookingException;
use App\Service\SubscriptionService;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Règles de l'abonnement de publication : période, renouvellement cumulatif, visibilité.
 */
final class SubscriptionTest extends KernelTestCase
{
    private EntityManagerInterface $em;
    private SubscriptionService $subscriptions;
    private Practitioner $practitioner;
    /** @var array<string, SubscriptionPlan> */
    private array $plans;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->em = static::getContainer()->get(EntityManagerInterface::class);
        $this->subscriptions = static::getContainer()->get(SubscriptionService::class);
        $schema = new SchemaTool($this->em);
        $metadata = $this->em->getMetadataFactory()->getAllMetadata();
        $schema->dropSchema($metadata);
        $schema->createSchema($metadata);

        $country = new Country('ML', 'Mali', 'Bamako', 'Africa/Bamako', '+223');
        $region = new Region($country, 'District de Bamako', 'district-de-bamako', 'Bamako');
        $city = new City($region, 'Bamako');
        $facility = new Facility('Clinique test', FacilityType::Clinic, $city, 'ACI 2000');
        $this->practitioner = (new Practitioner('dr-test', 'Awa', 'Test', 'F', 'ML-1'))->addFacility($facility)->verify();
        $this->plans = [
            'semester' => new SubscriptionPlan('semester', 'Semestriel', 6, 6000),
            'annual' => new SubscriptionPlan('annual', 'Annuel', 12, 10000, 1),
        ];
        foreach ([$country, $region, $city, $facility, $this->practitioner, ...array_values($this->plans)] as $entity) {
            $this->em->persist($entity);
        }
        $this->em->flush();
    }

    public function testPrices(): void
    {
        self::assertSame(6000, $this->plans['semester']->getPrice());
        self::assertSame(10000, $this->plans['annual']->getPrice());
        self::assertSame(833, $this->plans['annual']->getMonthlyPrice());
    }

    public function testVerifiedPractitionerIsHiddenUntilPaid(): void
    {
        self::assertFalse($this->practitioner->isPublished());
        self::assertSame(0, $this->searchTotal());

        $order = $this->subscriptions->order($this->practitioner, $this->plans['semester'], 'orange_money');
        self::assertSame(6000, $order->getAmount());
        self::assertMatchesRegularExpression('/^AD-[A-Z0-9]{6}$/', $order->getReference());
        self::assertFalse($this->practitioner->isPublished(), 'une commande non payée ne publie pas');

        $this->subscriptions->confirmPayment($order, 'MP123', null);
        self::assertTrue($this->practitioner->isPublished());
        self::assertSame(1, $this->searchTotal());
        $expectedEnd = (new \DateTimeImmutable('+6 months'))->format('Y-m-d');
        self::assertSame($expectedEnd, $this->practitioner->getPublishedUntil()->format('Y-m-d'));
    }

    public function testEarlyRenewalStacksOnCurrentPeriod(): void
    {
        $first = $this->subscriptions->order($this->practitioner, $this->plans['semester'], 'wave');
        $this->subscriptions->confirmPayment($first, null, null);
        $firstEnd = $first->getEndsAt();

        $renewal = $this->subscriptions->order($this->practitioner, $this->plans['annual'], 'wave');
        $this->subscriptions->confirmPayment($renewal, null, null);

        self::assertEquals($firstEnd, $renewal->getStartsAt(), 'le renouvellement démarre à la fin de la période en cours');
        self::assertEquals($firstEnd->modify('+12 months'), $this->practitioner->getPublishedUntil());
    }

    public function testRenewalAfterExpiryStartsNow(): void
    {
        $this->practitioner->setPublishedUntil(new \DateTimeImmutable('-10 days'));
        self::assertFalse($this->practitioner->isPublished());

        $order = $this->subscriptions->order($this->practitioner, $this->plans['annual'], 'cash');
        $this->subscriptions->confirmPayment($order, null, null);

        self::assertEqualsWithDelta(time(), $order->getStartsAt()->getTimestamp(), 5);
        self::assertTrue($this->practitioner->isPublished());
    }

    public function testExpiredSubscriptionHidesProfile(): void
    {
        $this->practitioner->setPublishedUntil(new \DateTimeImmutable('-1 minute'));
        $this->em->flush();

        self::assertSame(0, $this->searchTotal());
    }

    public function testPaymentCannotBeConfirmedTwice(): void
    {
        $order = $this->subscriptions->order($this->practitioner, $this->plans['semester'], 'orange_money');
        $this->subscriptions->confirmPayment($order, null, null);

        $this->expectException(BookingException::class);
        $this->subscriptions->confirmPayment($order, null, null);
    }

    public function testNewOrderReplacesPendingOne(): void
    {
        $old = $this->subscriptions->order($this->practitioner, $this->plans['semester'], 'orange_money');
        $new = $this->subscriptions->order($this->practitioner, $this->plans['annual'], 'moov_money');

        self::assertSame('cancelled', $old->getStatus()->value);
        self::assertSame([$new], $this->subscriptions->pending($this->practitioner));
    }

    public function testUnknownPaymentMethodIsRefused(): void
    {
        $this->expectException(BookingException::class);
        $this->subscriptions->order($this->practitioner, $this->plans['semester'], 'bitcoin');
    }

    private function searchTotal(): int
    {
        return static::getContainer()->get(PractitionerSearch::class)->search(['country' => 'ML'], 1, 10)['total'];
    }
}
