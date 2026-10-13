<?php

namespace App\Enum;

/** Les cinq sous-régions africaines, dans l'ordre d'affichage. */
enum Subregion: string
{
    case North = 'north';
    case West = 'west';
    case Central = 'central';
    case East = 'east';
    case Southern = 'southern';

    public function label(): string
    {
        return match ($this) {
            self::North => 'Afrique du Nord',
            self::West => 'Afrique de l\'Ouest',
            self::Central => 'Afrique centrale',
            self::East => 'Afrique de l\'Est',
            self::Southern => 'Afrique australe',
        };
    }
}
