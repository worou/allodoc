<?php

namespace App\Controller;

use App\Entity\AuditLog;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

/**
 * Base des contrôleurs métier : lecture du corps JSON, erreurs homogènes et journal d'audit.
 */
abstract class ApiController extends AbstractController
{
    public function __construct(protected readonly EntityManagerInterface $em)
    {
    }

    protected function body(Request $request): array
    {
        if ('' === $request->getContent()) {
            return [];
        }
        try {
            $data = json_decode($request->getContent(), true, 32, \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new BadRequestHttpException('Corps JSON invalide.');
        }

        return \is_array($data) ? $data : [];
    }

    protected function error(string $message, int $status = 422, array $extra = []): JsonResponse
    {
        return $this->json(['error' => $message] + $extra, $status);
    }

    protected function currentUser(): User
    {
        $user = $this->getUser();
        \assert($user instanceof User);

        return $user;
    }

    protected function audit(Request $request, string $action, string $subject): void
    {
        $user = $this->getUser();
        $this->em->persist(new AuditLog($user instanceof User ? $user : null, $action, $subject, $request->getClientIp()));
    }

    protected function parseInstant(mixed $value): ?\DateTimeImmutable
    {
        if (!\is_string($value) || '' === $value) {
            return null;
        }
        try {
            return (new \DateTimeImmutable($value))->setTimezone(new \DateTimeZone('UTC'));
        } catch (\Exception) {
            return null;
        }
    }
}
