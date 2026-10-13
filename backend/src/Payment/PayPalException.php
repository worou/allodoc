<?php

namespace App\Payment;

/** Échec d'un appel à PayPal ; $issue reprend le code d'erreur PayPal (ex. ORDER_ALREADY_CAPTURED). */
final class PayPalException extends \RuntimeException
{
    public function __construct(string $message, public readonly ?string $issue = null, ?\Throwable $previous = null)
    {
        parent::__construct($message, 0, $previous);
    }
}
