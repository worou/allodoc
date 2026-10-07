<?php

namespace App\Sms;

use Psr\Log\LoggerInterface;

/**
 * Fournisseur de développement : écrit le SMS dans les logs (var/log/dev.log) au lieu de l'envoyer.
 */
final class LogSmsSender implements SmsSenderInterface
{
    public function __construct(private readonly LoggerInterface $logger)
    {
    }

    public function send(string $phone, string $message): void
    {
        $this->logger->notice('[SMS simulé] à {phone} : {message}', ['phone' => $phone, 'message' => $message]);
    }
}
