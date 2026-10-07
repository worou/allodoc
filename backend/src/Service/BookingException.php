<?php

namespace App\Service;

/**
 * Erreur métier de réservation, traduite en réponse HTTP par les contrôleurs.
 */
final class BookingException extends \RuntimeException
{
    public function __construct(string $message, public readonly int $status = 422)
    {
        parent::__construct($message);
    }
}
