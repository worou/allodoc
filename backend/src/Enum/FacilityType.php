<?php

namespace App\Enum;

enum FacilityType: string
{
    case Hospital = 'hospital';
    case Clinic = 'clinic';
    case Office = 'office';
    case HealthCenter = 'health_center';

    public function label(): string
    {
        return match ($this) {
            self::Hospital => 'Hôpital',
            self::Clinic => 'Clinique',
            self::Office => 'Cabinet',
            self::HealthCenter => 'Centre de santé',
        };
    }
}
