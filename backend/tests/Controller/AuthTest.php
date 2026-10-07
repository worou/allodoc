<?php

namespace App\Tests\Controller;

use App\Entity\User;
use App\Tests\Mock\OAuthMockResponses;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Connexion par code email et via Google / GitHub (fournisseurs simulés par OAuthMockResponses).
 */
final class AuthTest extends WebTestCase
{
    /** Nonce conservé par le front (sessionStorage) pendant la connexion Google / GitHub. */
    private const NONCE = 'nonce-du-navigateur-0123456789';

    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $em = $this->em();
        $schema = new SchemaTool($em);
        $metadata = $em->getMetadataFactory()->getAllMetadata();
        $schema->dropSchema($metadata);
        $schema->createSchema($metadata);
        static::getContainer()->get('cache.app')->clear();
        static::getContainer()->get('cache.rate_limiter')->clear();
        OAuthMockResponses::$profile = [];
        OAuthMockResponses::$githubEmails = [];
    }

    public function testEmailCodeCreatesAccountWithVerifiedEmail(): void
    {
        $code = $this->requestCode(['email' => 'Awa@Example.org']);
        $user = $this->verifyCode(['email' => 'awa@example.org', 'code' => $code]);

        self::assertNull($user['phone']);
        self::assertSame('awa@example.org', $user['email']);
        self::assertTrue($user['emailVerified']);

        // Un code ne sert qu'une fois.
        $this->postJson('/api/auth/otp/verify', ['email' => 'awa@example.org', 'code' => $code]);
        self::assertResponseStatusCodeSame(401);

        // Nouvelle connexion par email : même compte.
        $again = $this->verifyCode(['email' => 'awa@example.org', 'code' => $this->requestCode(['email' => 'awa@example.org'])]);
        self::assertSame($user['id'], $again['id']);
    }

    public function testGoogleCreatesThenReusesAccount(): void
    {
        OAuthMockResponses::$profile = ['sub' => 'g-123', 'email' => 'Moussa@Gmail.com', 'email_verified' => true, 'given_name' => 'Moussa', 'family_name' => 'Traoré'];

        $first = $this->oauthLogin('google', '/rdv/dr-x?start=2026');
        self::assertSame('/rdv/dr-x?start=2026', $first['next']);
        self::assertSame('moussa@gmail.com', $first['user']['email']);
        self::assertTrue($first['user']['emailVerified']);
        self::assertSame('Moussa', $first['user']['firstName']);
        self::assertSame(['google'], $first['user']['linkedAccounts']);

        $second = $this->oauthLogin('google');
        self::assertSame($first['user']['id'], $second['user']['id']);
    }

    public function testGoogleLinksToAccountWithSameVerifiedEmail(): void
    {
        $code = $this->requestCode(['email' => 'fatou@gmail.com']);
        $existing = $this->verifyCode(['email' => 'fatou@gmail.com', 'code' => $code]);

        OAuthMockResponses::$profile = ['sub' => 'g-456', 'email' => 'fatou@gmail.com', 'email_verified' => true];
        $login = $this->oauthLogin('google');

        self::assertSame($existing['id'], $login['user']['id']);
        self::assertSame(['google'], $login['user']['linkedAccounts']);
    }

    public function testNeverLinksThroughUnverifiedEmail(): void
    {
        // Un attaquant saisit l'adresse de la victime dans son profil (adresse non vérifiée).
        $attacker = (new User('+22370999999'))->setEmail('victime@gmail.com');
        $this->em()->persist($attacker);
        $this->em()->flush();

        OAuthMockResponses::$profile = ['sub' => 'g-victime', 'email' => 'victime@gmail.com', 'email_verified' => true];
        $login = $this->oauthLogin('google');

        self::assertNotSame($attacker->getId(), $login['user']['id']);
        self::assertNull($login['user']['phone']);
    }

    public function testGoogleUnverifiedEmailIsNotTrusted(): void
    {
        $code = $this->requestCode(['email' => 'ali@exemple.ml']);
        $existing = $this->verifyCode(['email' => 'ali@exemple.ml', 'code' => $code]);

        OAuthMockResponses::$profile = ['sub' => 'g-789', 'email' => 'ali@exemple.ml', 'email_verified' => false];
        $login = $this->oauthLogin('google');

        self::assertNotSame($existing['id'], $login['user']['id']);
        self::assertFalse($login['user']['emailVerified']);
    }

    public function testGithubUsesPrimaryVerifiedEmail(): void
    {
        OAuthMockResponses::$profile = ['id' => 4242, 'login' => 'hadiza', 'name' => 'Hadiza Garba Issa', 'email' => null];
        OAuthMockResponses::$githubEmails = [
            ['email' => 'old@example.org', 'primary' => false, 'verified' => true],
            ['email' => 'Hadiza@Example.org', 'primary' => true, 'verified' => true],
        ];

        $login = $this->oauthLogin('github');

        self::assertSame('hadiza@example.org', $login['user']['email']);
        self::assertSame('Hadiza', $login['user']['firstName']);
        self::assertSame('Garba Issa', $login['user']['lastName']);
        self::assertSame(['github'], $login['user']['linkedAccounts']);
    }

    public function testCallbackRejectsForgedState(): void
    {
        $this->client->request('GET', '/api/auth/oauth/google?next=/compte&nonce='.self::NONCE);
        $this->client->request('GET', '/api/auth/oauth/google/callback?code=abc&state=forged');

        $location = $this->client->getResponse()->headers->get('Location');
        self::assertStringContainsString('oauth_error=', $location);
        self::assertStringNotContainsString('code=', $location);
    }

    public function testProviderDenialAndOpenRedirect(): void
    {
        $this->client->request('GET', '/api/auth/oauth/github?next=//evil.example&nonce='.self::NONCE);
        $this->client->request('GET', '/api/auth/oauth/github/callback?error=access_denied');

        $location = $this->client->getResponse()->headers->get('Location');
        self::assertStringStartsWith('http://127.0.0.1:5173/connexion?', $location);
        self::assertStringContainsString('next=%2Fcompte', $location);
        self::assertStringContainsString('annul', urldecode($location));
    }

    public function testExchangeCodeIsSingleUse(): void
    {
        OAuthMockResponses::$profile = ['sub' => 'g-once', 'email' => 'once@gmail.com', 'email_verified' => true];
        $code = $this->oauthCallback('google');

        $this->postJson('/api/auth/oauth/exchange', ['code' => $code, 'nonce' => self::NONCE]);
        self::assertResponseIsSuccessful();
        $this->postJson('/api/auth/oauth/exchange', ['code' => $code, 'nonce' => self::NONCE]);
        self::assertResponseStatusCodeSame(401);
    }

    public function testExchangeRequiresTheNonceOfTheStartingBrowser(): void
    {
        OAuthMockResponses::$profile = ['sub' => 'g-attacker', 'email' => 'attaquant@gmail.com', 'email_verified' => true];
        $code = $this->oauthCallback('google');

        // Lien de retour transmis à une victime : son navigateur n'a pas le nonce de l'attaquant.
        $this->postJson('/api/auth/oauth/exchange', ['code' => $code, 'nonce' => 'nonce-de-la-victime-1234']);
        self::assertResponseStatusCodeSame(401);
        // Et le code est brûlé : même le bon nonce ne fonctionne plus.
        $this->postJson('/api/auth/oauth/exchange', ['code' => $code, 'nonce' => self::NONCE]);
        self::assertResponseStatusCodeSame(401);

        // Démarrage sans nonce : refusé.
        $this->client->request('GET', '/api/auth/oauth/google?next=/compte');
        self::assertStringContainsString('oauth_error=', $this->client->getResponse()->headers->get('Location'));
    }

    public function testSmsAccountCanVerifyEmailThenLoginWithGoogle(): void
    {
        $sms = $this->verifyCode(['phone' => '70112233', 'country' => 'ML', 'code' => $this->requestCode(['phone' => '70112233', 'country' => 'ML'])]);
        $token = $this->lastToken;

        $emailCode = $this->requestCode(['email' => 'Dr.Diarra@Gmail.com']);
        $this->postJson('/api/me/email', ['email' => 'dr.diarra@gmail.com', 'code' => $emailCode], $token);
        self::assertResponseIsSuccessful();
        self::assertTrue(json_decode($this->client->getResponse()->getContent(), true)['emailVerified']);

        OAuthMockResponses::$profile = ['sub' => 'g-diarra', 'email' => 'dr.diarra@gmail.com', 'email_verified' => true];
        $login = $this->oauthLogin('google');

        self::assertSame($sms['id'], $login['user']['id']);
        self::assertSame('+22370112233', $login['user']['phone']);
    }

    public function testEmailVerifiedElsewhereIsRefused(): void
    {
        $this->verifyCode(['email' => 'prise@example.org', 'code' => $this->requestCode(['email' => 'prise@example.org'])]);
        $this->verifyCode(['phone' => '70998877', 'country' => 'ML', 'code' => $this->requestCode(['phone' => '70998877', 'country' => 'ML'])]);

        $code = $this->requestCode(['email' => 'prise@example.org']);
        $this->postJson('/api/me/email', ['email' => 'prise@example.org', 'code' => $code], $this->lastToken);
        self::assertResponseStatusCodeSame(409);
    }

    public function testBookingRequiresPhoneThenPhoneCanBeAdded(): void
    {
        $code = $this->requestCode(['email' => 'sans.tel@example.org']);
        $this->verifyCode(['email' => 'sans.tel@example.org', 'code' => $code]);
        $token = $this->lastToken;

        $this->postJson('/api/me/phone', ['phone' => '76112233', 'country' => 'ML', 'code' => '000000'], $token);
        self::assertResponseStatusCodeSame(401);

        $smsCode = $this->requestCode(['phone' => '76112233', 'country' => 'ML']);
        $this->postJson('/api/me/phone', ['phone' => '76112233', 'country' => 'ML', 'code' => $smsCode], $token);
        self::assertResponseIsSuccessful();
        self::assertSame('+22376112233', json_decode($this->client->getResponse()->getContent(), true)['phone']);
    }

    public function testPhoneOfAnotherAccountIsRefused(): void
    {
        $this->em()->persist(new User('+22370000001'));
        $this->em()->flush();
        $this->verifyCode(['email' => 'autre@example.org', 'code' => $this->requestCode(['email' => 'autre@example.org'])]);

        $smsCode = $this->requestCode(['phone' => '70000001', 'country' => 'ML']);
        $this->postJson('/api/me/phone', ['phone' => '70000001', 'country' => 'ML', 'code' => $smsCode], $this->lastToken);

        self::assertResponseStatusCodeSame(409);
    }

    // ---------------------------------------------------------------- outils

    private ?string $lastToken = null;

    private function em(): EntityManagerInterface
    {
        return static::getContainer()->get(EntityManagerInterface::class);
    }

    private function postJson(string $uri, array $body, ?string $token = null): void
    {
        $server = ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'];
        if ($token) {
            $server['HTTP_AUTHORIZATION'] = 'Bearer '.$token;
        }
        $this->client->request('POST', $uri, [], [], $server, json_encode($body));
    }

    private function requestCode(array $body): string
    {
        $this->postJson('/api/auth/otp/request', $body);
        self::assertResponseIsSuccessful();

        return json_decode($this->client->getResponse()->getContent(), true)['devCode'];
    }

    private function verifyCode(array $body): array
    {
        $this->postJson('/api/auth/otp/verify', $body);
        self::assertResponseIsSuccessful();
        $data = json_decode($this->client->getResponse()->getContent(), true);
        $this->lastToken = $data['token'];

        return $data['user'];
    }

    /** Démarre la connexion, simule le retour du fournisseur et renvoie le code à usage unique. */
    private function oauthCallback(string $provider, string $next = '/compte', ?string &$returnedNext = null): string
    {
        $this->client->request('GET', '/api/auth/oauth/'.$provider.'?next='.urlencode($next).'&nonce='.self::NONCE);
        self::assertResponseRedirects();
        parse_str((string) parse_url($this->client->getResponse()->headers->get('Location'), \PHP_URL_QUERY), $authorize);
        self::assertNotEmpty($authorize['state']);

        $this->client->request('GET', '/api/auth/oauth/'.$provider.'/callback?code=provider-code&state='.$authorize['state']);
        $location = $this->client->getResponse()->headers->get('Location');
        self::assertStringStartsWith('http://127.0.0.1:5173/connexion/oauth?', $location, $location);
        parse_str((string) parse_url($location, \PHP_URL_QUERY), $front);
        $returnedNext = $front['next'];

        return $front['code'];
    }

    /** @return array{user: array, next: string} */
    private function oauthLogin(string $provider, string $next = '/compte'): array
    {
        $code = $this->oauthCallback($provider, $next, $returnedNext);
        $this->postJson('/api/auth/oauth/exchange', ['code' => $code, 'nonce' => self::NONCE]);
        self::assertResponseIsSuccessful();

        return ['user' => json_decode($this->client->getResponse()->getContent(), true)['user'], 'next' => $returnedNext];
    }
}
