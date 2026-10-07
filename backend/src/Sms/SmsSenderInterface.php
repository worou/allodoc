<?php

namespace App\Sms;

/**
 * Passerelle SMS. Implémentations prévues : LogSmsSender (développement), puis Twilio, Infobip ou Africa's Talking.
 * Règle : aucun message ne doit contenir de donnée clinique (motif, spécialité, diagnostic).
 */
interface SmsSenderInterface
{
    public function send(string $phone, string $message): void;
}
