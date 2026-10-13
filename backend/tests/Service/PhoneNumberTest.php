<?php

namespace App\Tests\Service;

use App\Service\PhoneNumber;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class PhoneNumberTest extends TestCase
{
    public static function numbers(): iterable
    {
        yield 'Mali, numéro national' => ['70 12 34 56', 'ML', '+22370123456'];
        yield 'Mali, format international' => ['+223 70 12 34 56', null, '+22370123456'];
        yield 'Niger, indicatif sans +' => ['22770123456', 'NE', '+22770123456'];
        yield 'Nigeria, 0 initial retiré' => ['0803 123 4567', 'NG', '+2348031234567'];
        yield 'Égypte, indicatif à 2 chiffres' => ['+20 10 1234 5678', null, '+201012345678'];
        yield 'Afrique du Sud' => ['082 123 4567', 'ZA', '+27821234567'];
        yield 'Sahara occidental, indicatif partagé' => ['0612345678', 'EH', '+212612345678'];
        yield 'Bénin, 10 chiffres' => ['01 97 12 34 56', 'BJ', '+2290197123456'];
        yield 'trop court' => ['123', 'ML', null];
        yield 'longueur invalide pour le pays' => ['70 12 34', 'KE', null];
    }

    #[DataProvider('numbers')]
    public function testNormalize(string $raw, ?string $country, ?string $expected): void
    {
        self::assertSame($expected, PhoneNumber::normalize($raw, $country));
    }

    public function testMaskKeepsTheWholePrefix(): void
    {
        self::assertSame('+223 •• •• 34 56', PhoneNumber::mask('+22370123456'));
        self::assertSame('+27 •• •• 45 67', PhoneNumber::mask('+27821234567'));
    }
}
