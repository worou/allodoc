<?php

namespace App\Service;

/**
 * Normalise un numéro au format E.164 pour les pays de l'AES (8 chiffres nationaux).
 */
final class PhoneNumber
{
    private const PREFIXES = ['ML' => '223', 'BF' => '226', 'NE' => '227'];

    public static function normalize(string $raw, ?string $countryCode = null): ?string
    {
        $digits = preg_replace('/\D+/', '', $raw);
        if ('' === $digits) {
            return null;
        }
        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        }

        foreach (self::PREFIXES as $prefix) {
            if (str_starts_with($digits, $prefix) && 11 === \strlen($digits)) {
                return '+'.$digits;
            }
        }

        if (8 === \strlen($digits) && null !== $countryCode && isset(self::PREFIXES[$countryCode])) {
            return '+'.self::PREFIXES[$countryCode].$digits;
        }

        return null;
    }

    /** Masque le numéro pour l'affichage et les logs : +223 •• •• 45 67. */
    public static function mask(string $e164): string
    {
        return substr($e164, 0, 4).' •• •• '.substr($e164, -4, 2).' '.substr($e164, -2);
    }
}
