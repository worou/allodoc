<?php

namespace App\Enum;

enum AppointmentStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Cancelled = 'cancelled';
    case Honored = 'honored';
    case NoShow = 'no_show';

    public function isActive(): bool
    {
        return \in_array($this, [self::Pending, self::Confirmed], true);
    }
}
