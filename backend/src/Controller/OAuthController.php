<?php

namespace App\Controller;

use App\OAuth\OAuthClient;
use App\OAuth\OAuthException;
use App\Service\AccountResolver;
use App\Service\OtpService;
use App\Service\Presenter;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Connexion / inscription via Google ou GitHub.
 *
 * 1. Le front navigue vers /api/auth/oauth/{provider}?next=/chemin&nonce=… (nonce gardé en sessionStorage) : on pose
 *    un cookie HttpOnly (state anti-CSRF, vérificateur PKCE, page de retour, empreinte du nonce) et on redirige
 *    vers le fournisseur.
 * 2. Le fournisseur renvoie sur /callback : on vérifie le state, on récupère l'identité, on retrouve ou crée le compte.
 * 3. On redirige vers le front avec un code à usage unique (60 s), que le front échange contre le jeton via
 *    POST /api/auth/oauth/exchange {code, nonce}. Le jeton n'apparaît jamais dans une URL, et le code ne sert que
 *    dans le navigateur qui a lancé la connexion.
 */
#[Route('/api/auth/oauth')]
final class OAuthController extends ApiController
{
    private const COOKIE = 'allodoc_oauth';
    private const LABELS = ['google' => 'Google', 'github' => 'GitHub'];

    #[Route('/providers', methods: ['GET'], priority: 10)]
    public function providers(OAuthClient $oauth): JsonResponse
    {
        $result = [];
        foreach (OAuthClient::PROVIDERS as $provider) {
            $result[] = ['id' => $provider, 'name' => self::LABELS[$provider], 'configured' => $oauth->isConfigured($provider)];
        }

        return $this->json($result);
    }

    #[Route('/exchange', methods: ['POST'], priority: 10)]
    public function exchange(
        Request $request,
        OtpService $otp,
        Presenter $presenter,
        #[Autowire(service: 'cache.app')] CacheItemPoolInterface $cache,
    ): JsonResponse {
        $data = $this->body($request);
        $code = (string) ($data['code'] ?? '');
        $nonce = (string) ($data['nonce'] ?? '');
        $item = '' === $code ? null : $cache->getItem('oauth_login_'.hash('sha256', $code));
        if (null === $item || !$item->isHit()) {
            return $this->error('Lien de connexion expiré. Recommencez la connexion.', 401);
        }
        $cache->deleteItem($item->getKey());

        // Le code n'est valable que dans le navigateur qui a lancé la connexion : sans cela, un lien de retour
        // envoyé par un tiers connecterait la victime au compte de ce tiers.
        $login = $item->get();
        if (!\is_array($login) || '' === $nonce || !hash_equals((string) $login['n'], hash('sha256', $nonce))) {
            return $this->error('Ce lien de connexion n\'a pas été ouvert depuis ce navigateur. Recommencez la connexion.', 401);
        }

        $user = $this->em->getRepository(\App\Entity\User::class)->find($login['u']);
        if (null === $user) {
            return $this->error('Compte introuvable.', 401);
        }
        $token = $otp->issueToken($user);
        $this->audit($request, 'auth.login.oauth', 'user:'.$user->getId());
        $this->em->flush();

        return $this->json(['token' => $token, 'user' => $presenter->user($user)]);
    }

    #[Route('/{provider}', methods: ['GET'], requirements: ['provider' => 'google|github'])]
    public function start(string $provider, Request $request, OAuthClient $oauth, #[Autowire('%env(FRONTEND_URL)%')] string $front): Response
    {
        $next = $this->safeNext($request->query->get('next'));
        if (!$oauth->isConfigured($provider)) {
            return $this->toFront($front, $next, error: sprintf('La connexion %s n\'est pas encore configurée sur ce serveur (voir le README).', self::LABELS[$provider]));
        }
        // Valeur aléatoire générée et conservée par le front (sessionStorage), redemandée à l'échange du code.
        $nonce = (string) $request->query->get('nonce', '');
        if (!preg_match('/^[A-Za-z0-9_-]{16,128}$/', $nonce)) {
            return $this->toFront($front, $next, error: 'Connexion impossible depuis ce lien. Recommencez depuis la page de connexion.');
        }

        $state = bin2hex(random_bytes(16));
        $verifier = rtrim(strtr(base64_encode(random_bytes(48)), '+/', '-_'), '=');
        $payload = base64_encode(json_encode(['p' => $provider, 's' => $state, 'v' => $verifier, 'n' => $next, 'c' => hash('sha256', $nonce)]));

        $response = new RedirectResponse($oauth->authorizationUrl($provider, $state, $verifier));
        $response->headers->setCookie(Cookie::create(self::COOKIE, $payload, new \DateTimeImmutable('+10 minutes'), '/api/auth/oauth', null, $request->isSecure(), true, false, Cookie::SAMESITE_LAX));

        return $response;
    }

    #[Route('/{provider}/callback', methods: ['GET'], requirements: ['provider' => 'google|github'])]
    public function callback(
        string $provider,
        Request $request,
        OAuthClient $oauth,
        AccountResolver $accounts,
        #[Autowire(service: 'cache.app')] CacheItemPoolInterface $cache,
        #[Autowire('%env(FRONTEND_URL)%')] string $front,
    ): Response {
        $saved = json_decode(base64_decode((string) $request->cookies->get(self::COOKIE, '')), true);
        $next = $this->safeNext(\is_array($saved) ? ($saved['n'] ?? null) : null);

        $fail = function (string $message) use ($front, $next): Response {
            $response = $this->toFront($front, $next, error: $message);
            $response->headers->clearCookie(self::COOKIE, '/api/auth/oauth');

            return $response;
        };

        if ($request->query->has('error')) {
            return $fail('access_denied' === $request->query->get('error')
                ? sprintf('Connexion %s annulée.', self::LABELS[$provider])
                : sprintf('%s a refusé la connexion. Réessayez.', self::LABELS[$provider]));
        }
        $state = (string) $request->query->get('state', '');
        $code = (string) $request->query->get('code', '');
        if (!\is_array($saved) || ($saved['p'] ?? null) !== $provider || '' === $state || !hash_equals((string) ($saved['s'] ?? ''), $state) || '' === $code) {
            return $fail('La session de connexion a expiré ou est invalide. Recommencez.');
        }

        try {
            $profile = $oauth->fetchProfile($provider, $code, (string) ($saved['v'] ?? ''));
        } catch (OAuthException $e) {
            return $fail($e->getMessage());
        }
        $user = $accounts->resolveOAuth($profile);

        $loginCode = bin2hex(random_bytes(24));
        $item = $cache->getItem('oauth_login_'.hash('sha256', $loginCode));
        $cache->save($item->set(['u' => $user->getId(), 'n' => (string) ($saved['c'] ?? '')])->expiresAfter(60));

        $response = $this->toFront($front, $next, code: $loginCode);
        $response->headers->clearCookie(self::COOKIE, '/api/auth/oauth');

        return $response;
    }

    /** Page de retour côté front : chemin interne uniquement (pas de redirection ouverte). */
    private function safeNext(mixed $next): string
    {
        return \is_string($next) && str_starts_with($next, '/') && !str_starts_with($next, '//') && !str_contains($next, '\\') && mb_strlen($next) <= 500 ? $next : '/compte';
    }

    private function toFront(string $front, string $next, ?string $error = null, ?string $code = null): RedirectResponse
    {
        $params = ['next' => $next] + ($error ? ['oauth_error' => $error] : []) + ($code ? ['code' => $code] : []);
        $path = $code ? '/connexion/oauth' : '/connexion';

        return new RedirectResponse(rtrim($front, '/').$path.'?'.http_build_query($params));
    }
}
