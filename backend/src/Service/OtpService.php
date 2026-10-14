<?php

namespace App\Service;

use App\Entity\ApiToken;
use App\Entity\OtpCode;
use App\Entity\User;
use App\Sms\SmsSenderInterface;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;

/**
 * Connexion sans mot de passe : code à 6 chiffres envoyé par SMS ou par email, puis échange contre un jeton.
 */
final class OtpService
{
    private const CODE_TTL = '+10 minutes';
    private const TOKEN_TTL = '+30 days';

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly SmsSenderInterface $sms,
        private readonly MailerInterface $mailer,
        private readonly AccountResolver $accounts,
        private readonly LoggerInterface $logger,
        #[Autowire('%kernel.secret%')] private readonly string $secret,
        #[Autowire('%env(MAILER_FROM)%')] private readonly string $mailFrom,
        #[Autowire('%env(BRAND_NAME)%')] private readonly string $brand,
    ) {
    }

    /** Retourne le code en clair, uniquement pour l'affichage en environnement de développement. */
    public function requestSms(string $phone): string
    {
        $code = $this->createCode($phone);
        $this->sms->send($phone, sprintf('%s : votre code de connexion est %s. Il expire dans 10 minutes. Ne le partagez avec personne.', $this->brand, $code));

        return $code;
    }

    public function requestEmail(string $email): string
    {
        $code = $this->createCode($email);
        $this->mailer->send((new Email())
            ->from($this->mailFrom)
            ->to($email)
            ->subject(sprintf('%s est votre code de connexion %s', $code, $this->brand))
            ->text(sprintf("Bonjour,\n\nVotre code de connexion %2\$s est : %1\$s\n\nIl expire dans 10 minutes. Ne le communiquez à personne : l'équipe %2\$s ne vous le demandera jamais.\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.", $code, $this->brand))
            ->html(sprintf(
                '<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1d1b19">'
                .'<div style="height:6px;background:repeating-linear-gradient(90deg,#e3a21a 0 22px,#1d7a4c 22px 44px,#c2502a 44px 66px,#1c1f57 66px 88px)"></div>'
                .'<h1 style="color:#1c1f57;font-size:22px">'.htmlspecialchars(preg_replace('/Doc$/', '', $this->brand)).'<span style="color:#e3a21a">Doc</span></h1>'
                .'<p>Votre code de connexion :</p>'
                .'<p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#c2502a">%s</p>'
                .'<p style="color:#7b746c;font-size:14px">Il expire dans 10 minutes. Ne le communiquez à personne. '
                .'Si vous n\'êtes pas à l\'origine de cette demande, ignorez ce message.</p></div>',
                $code,
            )));
        $this->logger->notice('[Email] code de connexion envoyé à {email}', ['email' => $email]);

        return $code;
    }

    /**
     * Vérifie et consomme le code envoyé à une destination (numéro ou email), sans rien créer.
     */
    public function checkCode(string $destination, string $code): bool
    {
        /** @var OtpCode|null $otp */
        $otp = $this->em->getRepository(OtpCode::class)->findOneBy(['destination' => $destination], ['createdAt' => 'DESC']);
        if (null === $otp || !$otp->isUsable()) {
            return false;
        }
        if (!hash_equals($otp->getCodeHash(), $this->hash($destination.$code))) {
            $otp->incrementAttempts();
            $this->em->flush();

            return false;
        }
        $otp->consume();
        $this->em->flush();

        return true;
    }

    /**
     * Connexion par SMS : crée le compte au premier passage.
     *
     * @return array{0: string, 1: User}|null
     */
    public function loginWithPhone(string $phone, string $code): ?array
    {
        if (!$this->checkCode($phone, $code)) {
            return null;
        }
        $user = $this->em->getRepository(User::class)->findOneBy(['phone' => $phone]);
        if (null === $user) {
            $user = new User($phone);
            $this->em->persist($user);
        }

        return [$this->issueToken($user), $user];
    }

    /**
     * Connexion par email : le code prouve la possession de l'adresse, qui devient vérifiée.
     *
     * @return array{0: string, 1: User}|null
     */
    public function loginWithEmail(string $email, string $code): ?array
    {
        if (!$this->checkCode($email, $code)) {
            return null;
        }
        $user = $this->accounts->findByVerifiedEmail($email);
        if (null === $user) {
            $user = (new User(null))->setVerifiedEmail($email);
            $this->em->persist($user);
        }

        return [$this->issueToken($user), $user];
    }

    public function issueToken(User $user): string
    {
        $token = bin2hex(random_bytes(32));
        $this->em->persist(new ApiToken($user, hash('sha256', $token), new \DateTimeImmutable(self::TOKEN_TTL)));
        $this->em->flush();

        return $token;
    }

    private function createCode(string $destination): string
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', \STR_PAD_LEFT);
        $this->em->persist(new OtpCode($destination, $this->hash($destination.$code), new \DateTimeImmutable(self::CODE_TTL)));
        $this->em->flush();

        return $code;
    }

    private function hash(string $value): string
    {
        return hash_hmac('sha256', $value, $this->secret);
    }
}
