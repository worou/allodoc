<?php

namespace App;

use Symfony\Bundle\FrameworkBundle\Kernel\MicroKernelTrait;
use Symfony\Component\HttpKernel\Kernel as BaseKernel;

class Kernel extends BaseKernel
{
    use MicroKernelTrait;

    public function boot(): void
    {
        // Toutes les dates sont stockees en UTC ; la conversion en heure locale se fait par pays.
        date_default_timezone_set('UTC');
        parent::boot();
    }
}
