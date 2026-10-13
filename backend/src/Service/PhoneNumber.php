<?php

namespace App\Service;

use App\Reference\ReferenceLoader;

/**
 * Normalise un numéro au format E.164 pour les pays africains du référentiel
 * (indicatif et longueurs du numéro national lus dans config/reference/africa.json).
 */
final class PhoneNumber
{
    /** @var array<string, array{prefix: string, lengths: int[]}>|null */
    private static ?array $rules = null;

    public static function normalize(string $raw, ?string $countryCode = null): ?string
    {
        $digits = preg_replace('/\D+/', '', $raw);
        if ('' === $digits) {
            return null;
        }
        $international = str_starts_with(ltrim($raw), '+') || str_starts_with($digits, '00');
        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        }
        $rules = self::rules();

        // Numéro national saisi avec le pays choisi : "70 12 34 56", "0803 123 4567"...
        $country = null !== $countryCode ? ($rules[strtoupper($countryCode)] ?? null) : null;
        if (!$international && null !== $country) {
            $national = self::national($digits, $country['lengths']);
            if (null !== $national) {
                return '+'.$country['prefix'].$national;
            }
        }

        // Numéro international : indicatif suivi du numéro national (les indicatifs ne se chevauchent pas).
        foreach ($rules as $rule) {
            if (str_starts_with($digits, $rule['prefix'])) {
                $national = self::national(substr($digits, \strlen($rule['prefix'])), $rule['lengths']);
                if (null !== $national) {
                    return '+'.$rule['prefix'].$national;
                }
            }
        }

        return null;
    }

    /** Masque le numéro pour l'affichage et les logs : +223 •• •• 45 67. */
    public static function mask(string $e164): string
    {
        $digits = substr($e164, 1);
        foreach (self::rules() as $rule) {
            if (str_starts_with($digits, $rule['prefix'])) {
                return '+'.$rule['prefix'].' •• •• '.substr($e164, -4, 2).' '.substr($e164, -2);
            }
        }

        return substr($e164, 0, 4).' •• •• '.substr($e164, -4, 2).' '.substr($e164, -2);
    }

    /** Numéro national valide, après retrait éventuel du 0 initial (préfixe interurbain). */
    private static function national(string $digits, array $lengths): ?string
    {
        if (\in_array(\strlen($digits), $lengths, true)) {
            return $digits;
        }
        if (str_starts_with($digits, '0') && \in_array(\strlen($digits) - 1, $lengths, true)) {
            return substr($digits, 1);
        }

        return null;
    }

    /** @return array<string, array{prefix: string, lengths: int[]}> */
    private static function rules(): array
    {
        if (null === self::$rules) {
            self::$rules = [];
            foreach (ReferenceLoader::countries() as $code => $c) {
                self::$rules[$code] = ['prefix' => ltrim($c['phonePrefix'], '+'), 'lengths' => $c['phoneLengths']];
            }
        }

        return self::$rules;
    }
}
