<?php

namespace App\Controller;

use App\Service\AccountResolver;
use App\Service\OtpService;
use App\Service\PhoneNumber;
use App\Service\Presenter;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Connexion sans mot de passe par code à 6 chiffres, envoyé par SMS ({"phone", "country"}) ou par email ({"email"}).
 */
#[Route('/api/auth/otp')]
final class AuthController extends ApiController
{
    #[Route('/request', methods: ['POST'])]
    public function request(
        Request $request,
        OtpService $otp,
        #[Autowire(service: 'limiter.otp_request_phone')] RateLimiterFactory $destinationLimiter,
        #[Autowire(service: 'limiter.otp_request_ip')] RateLimiterFactory $ipLimiter,
        #[Autowire('%kernel.environment%')] string $env,
    ): JsonResponse {
        $data = $this->body($request);
        [$channel, $destination] = $this->destination($data);
        if (null === $destination) {
            return $this->error('email' === $channel ? 'Adresse email invalide.' : 'Numéro de téléphone invalide. Exemple : 70 12 34 56.');
        }

        if (!$ipLimiter->create((string) $request->getClientIp())->consume()->isAccepted()
            || !$destinationLimiter->create($destination)->consume()->isAccepted()) {
            return $this->error('Trop de demandes. Patientez quelques minutes avant de redemander un code.', 429);
        }

        if ('email' === $channel) {
            $code = $otp->requestEmail($destination);
            $response = ['channel' => 'email', 'email' => $destination, 'maskedDestination' => self::maskEmail($destination)];
        } else {
            $code = $otp->requestSms($destination);
            $response = ['channel' => 'sms', 'phone' => $destination, 'maskedPhone' => PhoneNumber::mask($destination), 'maskedDestination' => PhoneNumber::mask($destination)];
        }
        $response['expiresIn'] = 600;
        if (in_array($env, ['dev', 'test'], true)) {
            // Facilite les tests locaux sans passerelle SMS ni serveur mail ; jamais renvoyé en production.
            $response['devCode'] = $code;
        }

        return $this->json($response);
    }

    #[Route('/verify', methods: ['POST'])]
    public function verify(
        Request $request,
        OtpService $otp,
        Presenter $presenter,
        #[Autowire(service: 'limiter.otp_verify')] RateLimiterFactory $verifyLimiter,
    ): JsonResponse {
        $data = $this->body($request);
        [$channel, $destination] = $this->destination($data);
        $code = preg_replace('/\D/', '', (string) ($data['code'] ?? ''));
        if (null === $destination || 6 !== \strlen($code)) {
            return $this->error('Code invalide.');
        }
        if (!$verifyLimiter->create($destination)->consume()->isAccepted()) {
            return $this->error('Trop de tentatives. Demandez un nouveau code dans quelques minutes.', 429);
        }

        $result = 'email' === $channel ? $otp->loginWithEmail($destination, $code) : $otp->loginWithPhone($destination, $code);
        if (null === $result) {
            return $this->error('Code incorrect ou expiré.', 401);
        }
        [$token, $user] = $result;
        $this->audit($request, 'auth.login.'.$channel, 'user:'.$user->getId());
        $this->em->flush();

        return $this->json(['token' => $token, 'user' => $presenter->user($user)]);
    }

    /** @return array{0: 'sms'|'email', 1: ?string} canal et destination normalisée (null si invalide) */
    private function destination(array $data): array
    {
        if (isset($data['email'])) {
            return ['email', AccountResolver::normalizeEmail((string) $data['email'])];
        }

        return ['sms', PhoneNumber::normalize((string) ($data['phone'] ?? ''), $data['country'] ?? null)];
    }

    public static function maskEmail(string $email): string
    {
        [$local, $domain] = explode('@', $email, 2);

        return mb_substr($local, 0, 2).str_repeat('•', max(1, mb_strlen($local) - 2)).'@'.$domain;
    }
}
