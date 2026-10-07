<?php

namespace App\OpenApi;

use ApiPlatform\OpenApi\Factory\OpenApiFactoryInterface;
use ApiPlatform\OpenApi\Model\Operation;
use ApiPlatform\OpenApi\Model\Parameter;
use ApiPlatform\OpenApi\Model\PathItem;
use ApiPlatform\OpenApi\Model\RequestBody;
use ApiPlatform\OpenApi\Model\Response;
use ApiPlatform\OpenApi\Model\SecurityScheme;
use ApiPlatform\OpenApi\Model\Server;
use ApiPlatform\OpenApi\Model\Tag;
use ApiPlatform\OpenApi\OpenApi;
use Symfony\Component\DependencyInjection\Attribute\AsDecorator;

/**
 * Complète la documentation générée par API Platform (référentiels) avec les endpoints métier
 * des contrôleurs Symfony : authentification OTP, recherche, créneaux, réservation, espaces pro et admin.
 * Swagger UI : /api/docs · JSON : /api/docs.jsonopenapi · export : bin/console api:openapi:export --yaml
 */
#[AsDecorator(decorates: 'api_platform.openapi.factory')]
final class OpenApiFactory implements OpenApiFactoryInterface
{
    public function __construct(private readonly OpenApiFactoryInterface $decorated)
    {
    }

    public function __invoke(array $context = []): OpenApi
    {
        $openApi = ($this->decorated)($context);

        $schemas = $openApi->getComponents()->getSchemas() ?? new \ArrayObject();
        foreach ($this->schemas() as $name => $schema) {
            $schemas[$name] = $schema;
        }
        $security = $openApi->getComponents()->getSecuritySchemes() ?? new \ArrayObject();
        $security['bearerAuth'] = new SecurityScheme(
            type: 'http',
            description: 'Jeton obtenu via POST /api/auth/otp/verify. En-tête : Authorization: Bearer <token>',
            scheme: 'bearer',
            bearerFormat: 'opaque',
        );
        $openApi = $openApi->withComponents(
            $openApi->getComponents()->withSchemas($schemas)->withSecuritySchemes($security)
        );

        $paths = $openApi->getPaths();
        foreach ($this->paths() as $path => $operations) {
            $existing = $paths->getPath($path) ?? new PathItem();
            foreach ($operations as $method => $operation) {
                $existing = $existing->{'with'.ucfirst($method)}($operation);
            }
            $paths->addPath($path, $existing);
        }

        return $openApi
            ->withServers([new Server('http://127.0.0.1:8000', 'Développement local')])
            ->withTags([
                new Tag('Authentification', 'Connexion sans mot de passe par code SMS (OTP).'),
                new Tag('Annuaire', 'Recherche publique de praticiens, fiches et créneaux.'),
                new Tag('Patient', 'Profil, proches, réservation, annulation et report. Jeton requis.'),
                new Tag('Praticien', 'Agenda, statut des rendez-vous, congés, statistiques. Rôle ROLE_PRACTITIONER.'),
                new Tag('Administration', 'Validation des praticiens et confirmation des paiements. Rôle ROLE_COUNTRY_ADMIN (limité à son pays) ou ROLE_SUPER_ADMIN.'),
                new Tag('Abonnement', 'Abonnement de publication des praticiens : 6 000 FCFA / semestre, 10 000 FCFA / an, renouvelable. Un praticien n\'est visible que s\'il est vérifié ET abonné.'),
                new Tag('SubscriptionPlan', 'Formules d\'abonnement (API Platform, public).'),
                new Tag('Country', 'Référentiel des pays (API Platform).'),
                new Tag('Region', 'Référentiel des régions (API Platform).'),
                new Tag('City', 'Référentiel des villes (API Platform).'),
                new Tag('Specialty', 'Référentiel des spécialités (API Platform).'),
                new Tag('Facility', 'Structures de santé (API Platform).'),
            ]);
    }

    /** @return array<string, array<string, Operation>> */
    private function paths(): array
    {
        $auth = [['bearerAuth' => []]];

        return [
            '/api/auth/otp/request' => ['post' => $this->op(
                'otpRequest', 'Authentification', 'Envoyer un code de connexion par SMS ou par email',
                'Corps `{"phone", "country"}` (SMS) ou `{"email"}` (email). Envoie un code à 6 chiffres valable 10 minutes. '
                .'Limites : 3 demandes / 10 min par numéro ou adresse, 20 / heure par IP. En environnement dev, le code est renvoyé dans `devCode`.',
                body: ['$ref' => '#/components/schemas/OtpRequest'],
                responses: [200 => ['OtpRequested', 'Code envoyé'], 422 => ['Error', 'Numéro invalide'], 429 => ['Error', 'Trop de demandes']],
            )],
            '/api/auth/otp/verify' => ['post' => $this->op(
                'otpVerify', 'Authentification', 'Vérifier le code et obtenir un jeton',
                'Crée le compte au premier passage. Par email, l\'adresse devient vérifiée et le compte n\'a pas encore de téléphone : il faut en ajouter un via POST /api/me/phone avant de réserver. Jeton valable 30 jours, 5 essais maximum par code.',
                body: ['$ref' => '#/components/schemas/OtpVerify'],
                responses: [200 => ['AuthToken', 'Connecté'], 401 => ['Error', 'Code incorrect ou expiré'], 429 => ['Error', 'Trop de tentatives']],
            )],
            '/api/auth/oauth/providers' => ['get' => $this->op(
                'oauthProviders', 'Authentification', 'Fournisseurs de connexion (Google, GitHub)',
                '`configured: false` tant que les identifiants OAuth ne sont pas renseignés sur le serveur.',
                responses: [200 => ['OAuthProviders', 'Fournisseurs']],
            )],
            '/api/auth/oauth/{provider}' => ['get' => $this->op(
                'oauthStart', 'Authentification', 'Démarrer la connexion Google ou GitHub (navigation, pas fetch)',
                'À ouvrir par une navigation complète du navigateur. Pose un cookie HttpOnly (state anti-CSRF, PKCE) puis redirige (302) vers le fournisseur. '
                .'Au retour, l\'API redirige vers `FRONTEND_URL/connexion/oauth?code=…&next=…` (succès) ou `FRONTEND_URL/connexion?oauth_error=…` (échec).',
                parameters: [
                    new Parameter('provider', 'path', 'Fournisseur', true, schema: ['type' => 'string', 'enum' => ['google', 'github']]),
                    $this->query('next', 'Chemin du front où revenir après connexion (doit commencer par /)', ['type' => 'string'], '/compte'),
                    new Parameter('nonce', 'query', 'Valeur aléatoire (16 à 128 caractères [A-Za-z0-9_-]) générée par le front et gardée en sessionStorage ; à renvoyer à /exchange', true, schema: ['type' => 'string']),
                ],
                responses: [302 => ['Ok', 'Redirection vers le fournisseur']],
            )],
            '/api/auth/oauth/{provider}/callback' => ['get' => $this->op(
                'oauthCallback', 'Authentification', 'Retour du fournisseur (adresse à déclarer chez Google / GitHub)',
                'Vérifie le state, récupère l\'identité, retrouve ou crée le compte. Rattachement à un compte existant uniquement via un identifiant fournisseur connu ou une adresse email vérifiée des deux côtés.',
                parameters: [
                    new Parameter('provider', 'path', 'Fournisseur', true, schema: ['type' => 'string', 'enum' => ['google', 'github']]),
                    $this->query('code', 'Code d\'autorisation du fournisseur', ['type' => 'string']),
                    $this->query('state', 'Valeur anti-CSRF', ['type' => 'string']),
                ],
                responses: [302 => ['Ok', 'Redirection vers le front']],
            )],
            '/api/auth/oauth/exchange' => ['post' => $this->op(
                'oauthExchange', 'Authentification', 'Échanger le code à usage unique contre un jeton',
                'Code valable 60 secondes et une seule fois, uniquement avec le nonce fourni au démarrage (protection contre un lien de retour transmis par un tiers).',
                body: ['$ref' => '#/components/schemas/OAuthExchange'],
                responses: [200 => ['AuthToken', 'Connecté'], 401 => ['Error', 'Code expiré ou déjà utilisé']],
            )],
            '/api/me/phone' => ['post' => $this->op(
                'setMyPhone', 'Patient', 'Ajouter ou changer mon numéro (vérifié par SMS)',
                'Demander d\'abord un code via POST /api/auth/otp/request avec ce numéro. 409 `phone_taken` si le numéro appartient à un autre compte.',
                body: ['$ref' => '#/components/schemas/PhoneInput'], security: $auth,
                responses: [200 => ['User', 'Numéro vérifié'], 401 => ['Error', 'Code incorrect'], 409 => ['Error', 'Numéro déjà utilisé']],
            )],
            '/api/me/email' => ['post' => $this->op(
                'verifyMyEmail', 'Patient', 'Vérifier une adresse email pour mon compte',
                'Demander d\'abord un code via POST /api/auth/otp/request {"email"}. Permet ensuite de se connecter à ce même compte par email, Google ou GitHub. 409 `email_taken` si l\'adresse est déjà vérifiée sur un autre compte.',
                body: ['$ref' => '#/components/schemas/EmailInput'], security: $auth,
                responses: [200 => ['User', 'Adresse vérifiée'], 401 => ['Error', 'Code incorrect'], 409 => ['Error', 'Adresse déjà utilisée']],
            )],
            '/api/pro/subscription' => ['get' => $this->op(
                'proSubscription', 'Abonnement', 'État de mon abonnement',
                'Publication, date de fin, jours restants, formules, moyens de paiement, compte marchand du pays, commande en attente et historique.',
                security: $auth, responses: [200 => ['SubscriptionStatus', 'État'], 404 => ['Error', 'Aucune fiche praticien liée']],
            )],
            '/api/pro/subscriptions' => ['post' => $this->op(
                'proOrderSubscription', 'Abonnement', 'Commander ou renouveler',
                'Crée une commande en attente avec une référence (AD-XXXXXX) à indiquer dans le transfert mobile money. Remplace une éventuelle commande en attente. '
                .'À la confirmation du paiement, la période démarre à la fin de l\'abonnement en cours (renouvellement anticipé sans perte) ou immédiatement.',
                body: ['$ref' => '#/components/schemas/SubscriptionOrder'], security: $auth,
                responses: [201 => ['Subscription', 'Commande créée'], 422 => ['Error', 'Formule ou moyen de paiement invalide']],
            )],
            '/api/pro/subscriptions/{id}/cancel' => ['post' => $this->op(
                'proCancelSubscription', 'Abonnement', 'Annuler une commande en attente', null,
                parameters: [$this->uuid()], security: $auth,
                responses: [200 => ['Subscription', 'Commande annulée'], 409 => ['Error', 'Commande déjà traitée']],
            )],
            '/api/pro/subscriptions/{id}/simulate-payment' => ['post' => $this->op(
                'proSimulatePayment', 'Abonnement', 'Simuler le paiement (environnement dev uniquement)', 'Renvoie 404 hors environnement de développement.',
                parameters: [$this->uuid()], security: $auth,
                responses: [200 => ['Subscription', 'Payé']],
            )],
            '/api/admin/subscriptions' => ['get' => $this->op(
                'adminSubscriptions', 'Administration', 'Commandes d\'abonnement', 'Limitées au pays de l\'administrateur. Les commandes impayées depuis plus de 14 jours sont annulées automatiquement.',
                parameters: [$this->query('status', 'Statut', ['type' => 'string', 'enum' => ['pending', 'paid', 'cancelled'], 'default' => 'pending'])],
                security: $auth, responses: [200 => ['AdminSubscriptions', 'Liste et total']],
            )],
            '/api/admin/subscriptions/{id}/confirm' => ['post' => $this->op(
                'adminConfirmPayment', 'Administration', 'Confirmer la réception du paiement', 'Publie le praticien et lui envoie un SMS. Tracé dans le journal d\'audit.',
                parameters: [$this->uuid()], body: ['$ref' => '#/components/schemas/PaymentConfirmation'], security: $auth,
                responses: [200 => ['Subscription', 'Payé'], 404 => ['Error', 'Introuvable ou hors de votre pays'], 409 => ['Error', 'Déjà traité']],
            )],
            '/api/admin/subscriptions/{id}/reject' => ['post' => $this->op(
                'adminRejectPayment', 'Administration', 'Refuser une commande', null,
                parameters: [$this->uuid()], security: $auth,
                responses: [200 => ['Subscription', 'Annulée'], 404 => ['Error', 'Introuvable ou déjà traitée']],
            )],
            '/api/countries/{code}/overview' => ['get' => $this->op(
                'countryOverview', 'Annuaire', "Page d'accueil d'un pays",
                'Régions (avec nombre de praticiens vérifiés et indicateur provisoire) et spécialités disponibles. Cache public 5 minutes.',
                parameters: [new Parameter('code', 'path', 'Code ISO du pays', true, schema: ['type' => 'string', 'enum' => ['ML', 'BF', 'NE']], example: 'ML')],
                responses: [200 => ['CountryOverview', 'Vue d\'ensemble'], 404 => ['Error', 'Pays inconnu']],
            )],
            '/api/search' => ['get' => $this->op(
                'searchPractitioners', 'Annuaire', 'Rechercher des praticiens',
                'Résultats paginés ; chaque praticien inclut sa grille de créneaux sur `days` jours et sa prochaine disponibilité.',
                parameters: [
                    $this->query('country', 'Code pays', ['type' => 'string', 'enum' => ['ML', 'BF', 'NE']], 'ML'),
                    $this->query('region', 'Slug de région', ['type' => 'string'], 'district-de-bamako'),
                    $this->query('city', 'Nom exact de la ville', ['type' => 'string'], 'Bamako'),
                    $this->query('specialty', 'Slug de spécialité', ['type' => 'string'], 'pediatrie'),
                    $this->query('q', 'Texte libre : nom du praticien ou de la structure', ['type' => 'string']),
                    $this->query('teleconsultation', 'Uniquement la téléconsultation', ['type' => 'boolean']),
                    $this->query('language', 'Langue parlée (fr, bm, mos, ha, dje, ff, en…)', ['type' => 'string'], 'bm'),
                    $this->query('insurance', 'Assurance acceptée', ['type' => 'string'], 'AMO'),
                    $this->query('from', 'Premier jour de la grille (YYYY-MM-DD, défaut : aujourd\'hui)', ['type' => 'string', 'format' => 'date']),
                    $this->query('days', 'Nombre de jours de la grille (1 à 7)', ['type' => 'integer', 'default' => 5]),
                    $this->query('page', 'Page', ['type' => 'integer', 'default' => 1]),
                    $this->query('perPage', 'Résultats par page (1 à 20)', ['type' => 'integer', 'default' => 10]),
                ],
                responses: [200 => ['SearchResult', 'Résultats']],
            )],
            '/api/practitioners/{slug}' => ['get' => $this->op(
                'getPractitioner', 'Annuaire', 'Fiche praticien',
                'Uniquement les praticiens vérifiés.',
                parameters: [$this->slug()],
                responses: [200 => ['PractitionerDetail', 'Fiche'], 404 => ['Error', 'Introuvable']],
            )],
            '/api/practitioners/{slug}/slots' => ['get' => $this->op(
                'getPractitionerSlots', 'Annuaire', 'Créneaux libres',
                'Calculés à partir des horaires récurrents, des congés et des rendez-vous pris, dans le fuseau du pays. `start` est en UTC.',
                parameters: [
                    $this->slug(),
                    $this->query('from', 'Premier jour (YYYY-MM-DD)', ['type' => 'string', 'format' => 'date']),
                    $this->query('days', 'Nombre de jours (1 à 14)', ['type' => 'integer', 'default' => 7]),
                ],
                responses: [200 => ['SlotDays', 'Créneaux par jour'], 404 => ['Error', 'Introuvable']],
            )],
            '/api/me' => [
                'get' => $this->op('getMe', 'Patient', 'Mon profil', null, security: $auth, responses: [200 => ['User', 'Profil'], 401 => ['Error', 'Non connecté']]),
                'patch' => $this->op(
                    'updateMe', 'Patient', 'Mettre à jour mon profil',
                    '`consent: true` enregistre le consentement au traitement des données (obligatoire avant de réserver).',
                    body: ['$ref' => '#/components/schemas/UserUpdate'], security: $auth,
                    responses: [200 => ['User', 'Profil mis à jour'], 422 => ['Error', 'Données invalides']],
                ),
            ],
            '/api/me/relatives' => ['post' => $this->op(
                'addRelative', 'Patient', 'Ajouter un proche', 'Pour réserver pour un enfant, un parent ou un conjoint (10 maximum).',
                body: ['$ref' => '#/components/schemas/RelativeInput'], security: $auth,
                responses: [201 => ['Relative', 'Proche ajouté'], 422 => ['Error', 'Données invalides']],
            )],
            '/api/me/appointments' => ['get' => $this->op(
                'myAppointments', 'Patient', 'Mes rendez-vous', 'Rendez-vous à venir (ordre chronologique) et passés ou annulés.',
                security: $auth, responses: [200 => ['MyAppointments', 'Rendez-vous']],
            )],
            '/api/appointments' => ['post' => $this->op(
                'bookAppointment', 'Patient', 'Réserver un créneau',
                'Verrouille l\'agenda du praticien le temps de la vérification ; une contrainte unique empêche toute double réservation. '
                .'Prérequis : prénom, nom et consentement renseignés (sinon 422 avec `code` = `profile_incomplete` ou `consent_required`). '
                .'Un SMS de confirmation est envoyé (sans le motif).',
                body: ['$ref' => '#/components/schemas/BookingInput'], security: $auth,
                responses: [201 => ['Appointment', 'Rendez-vous confirmé'], 409 => ['Error', 'Créneau indisponible ou quota atteint'], 422 => ['Error', 'Données ou profil incomplets']],
            )],
            '/api/appointments/{id}' => ['patch' => $this->op(
                'updateAppointment', 'Patient', 'Annuler ou reporter un rendez-vous',
                'Le report réserve le nouveau créneau et annule l\'ancien dans une même transaction ; la réponse est le nouveau rendez-vous.',
                parameters: [$this->uuid()], body: ['$ref' => '#/components/schemas/AppointmentAction'], security: $auth,
                responses: [200 => ['Appointment', 'Rendez-vous mis à jour'], 404 => ['Error', 'Introuvable'], 409 => ['Error', 'Action impossible']],
            )],
            '/api/pro/agenda' => ['get' => $this->op(
                'proAgenda', 'Praticien', 'Mon agenda de la semaine', 'Semaine de 7 jours à partir de `from` (lundi courant par défaut), avec les coordonnées des patients.',
                parameters: [$this->query('from', 'Premier jour (YYYY-MM-DD)', ['type' => 'string', 'format' => 'date'])], security: $auth,
                responses: [200 => ['ProAgenda', 'Agenda'], 403 => ['Error', 'Rôle praticien requis'], 404 => ['Error', 'Aucune fiche liée']],
            )],
            '/api/pro/appointments/{id}' => ['patch' => $this->op(
                'proUpdateAppointment', 'Praticien', 'Confirmer, refuser, marquer honoré ou absent',
                '`honored` et `no_show` ne sont possibles qu\'après l\'heure de début. Un rendez-vous annulé ne peut pas être rétabli.',
                parameters: [$this->uuid()], body: ['$ref' => '#/components/schemas/ProStatusInput'], security: $auth,
                responses: [200 => ['Appointment', 'Statut mis à jour'], 409 => ['Error', 'Transition impossible'], 422 => ['Error', 'Statut invalide']],
            )],
            '/api/pro/absences' => ['post' => $this->op(
                'proAddAbsence', 'Praticien', 'Déclarer un congé', 'Les créneaux de la période disparaissent de la réservation en ligne.',
                body: ['$ref' => '#/components/schemas/AbsenceInput'], security: $auth,
                responses: [201 => ['Ok', 'Congé enregistré'], 422 => ['Error', 'Période invalide']],
            )],
            '/api/pro/stats' => ['get' => $this->op(
                'proStats', 'Praticien', 'Tableau de bord', 'Fréquentation et taux d\'absence sur 30 jours.',
                security: $auth, responses: [200 => ['ProStats', 'Statistiques']],
            )],
            '/api/admin/practitioners' => ['get' => $this->op(
                'adminPractitioners', 'Administration', 'Praticiens à valider', 'Filtré sur le pays de l\'administrateur pays.',
                parameters: [$this->query('status', 'Statut de vérification', ['type' => 'string', 'enum' => ['pending', 'verified', 'rejected'], 'default' => 'pending'])],
                security: $auth, responses: [200 => ['AdminPractitioners', 'Liste'], 403 => ['Error', 'Rôle administrateur requis']],
            )],
            '/api/admin/practitioners/{id}/verification' => ['post' => $this->op(
                'adminDecide', 'Administration', 'Valider ou rejeter un praticien', 'Après contrôle du numéro d\'inscription à l\'ordre. Action tracée dans le journal d\'audit.',
                parameters: [new Parameter('id', 'path', 'Identifiant du praticien', true, schema: ['type' => 'integer'])],
                body: ['$ref' => '#/components/schemas/VerificationInput'], security: $auth,
                responses: [200 => ['VerificationResult', 'Décision enregistrée'], 404 => ['Error', 'Introuvable ou hors de votre pays']],
            )],
        ];
    }

    /**
     * @param array<int, array{0: string, 1: string}> $responses code => [schéma, description]
     */
    private function op(string $id, string $tag, string $summary, ?string $description, array $parameters = [], ?array $body = null, ?array $security = null, array $responses = []): Operation
    {
        $built = [];
        foreach ($responses as $code => [$schema, $text]) {
            $built[$code] = new Response($text, new \ArrayObject(['application/json' => ['schema' => ['$ref' => '#/components/schemas/'.$schema]]]));
        }

        return new Operation(
            operationId: $id,
            tags: [$tag],
            responses: $built,
            summary: $summary,
            description: $description ?? '',
            parameters: $parameters,
            requestBody: $body ? new RequestBody(content: new \ArrayObject(['application/json' => ['schema' => $body]]), required: true) : null,
            security: $security,
        );
    }

    private function query(string $name, string $description, array $schema, mixed $example = null): Parameter
    {
        return new Parameter($name, 'query', $description, false, schema: $schema, example: $example);
    }

    private function slug(): Parameter
    {
        return new Parameter('slug', 'path', 'Identifiant lisible du praticien', true, schema: ['type' => 'string'], example: 'boubacar-coulibaly');
    }

    private function uuid(): Parameter
    {
        return new Parameter('id', 'path', 'Identifiant du rendez-vous (UUID)', true, schema: ['type' => 'string', 'format' => 'uuid']);
    }

    /** @return array<string, array> */
    private function schemas(): array
    {
        $str = ['type' => 'string'];
        $strNull = ['type' => ['string', 'null']];
        $int = ['type' => 'integer'];
        $bool = ['type' => 'boolean'];
        $ref = fn (string $name) => ['$ref' => '#/components/schemas/'.$name];
        $arr = fn (array $items) => ['type' => 'array', 'items' => $items];
        $obj = fn (array $props, array $required = []) => ['type' => 'object', 'properties' => $props] + ($required ? ['required' => $required] : []);
        $countryCode = ['type' => 'string', 'enum' => ['ML', 'BF', 'NE'], 'example' => 'ML'];
        $status = ['type' => 'string', 'enum' => ['pending', 'confirmed', 'cancelled', 'honored', 'no_show']];

        return [
            'Error' => $obj(['error' => $str + ['example' => 'Ce créneau n\'est plus disponible.'], 'code' => $str + ['example' => 'consent_required']], ['error']),
            'Ok' => $obj(['ok' => $bool]),
            'OtpRequest' => $obj([
                'phone' => $str + ['example' => '70 00 00 01', 'description' => 'SMS : 8 chiffres (avec country) ou format international +223…'],
                'country' => $countryCode + ['description' => 'Pays pour compléter l\'indicatif'],
                'email' => $str + ['format' => 'email', 'example' => 'awa.traore@gmail.com', 'description' => 'Email : à la place de phone'],
            ]),
            'OtpRequested' => $obj([
                'channel' => ['type' => 'string', 'enum' => ['sms', 'email']],
                'maskedDestination' => $str + ['example' => 'aw••••••••@gmail.com'],
                'email' => $str,
                'phone' => $str + ['example' => '+22370000001'],
                'maskedPhone' => $str + ['example' => '+223 •• •• 00 01'],
                'expiresIn' => $int + ['example' => 600],
                'devCode' => $str + ['example' => '482913', 'description' => 'Environnement dev uniquement'],
            ]),
            'OtpVerify' => $obj(['phone' => $str + ['example' => '+22370000001'], 'country' => $countryCode, 'email' => $str + ['format' => 'email'], 'code' => $str + ['example' => '482913']], ['code']),
            'OAuthProviders' => $arr($obj(['id' => ['type' => 'string', 'enum' => ['google', 'github']], 'name' => $str, 'configured' => $bool])),
            'OAuthExchange' => $obj(['code' => $str, 'nonce' => $str + ['description' => 'Nonce passé à /api/auth/oauth/{provider}']], ['code', 'nonce']),
            'EmailInput' => $obj(['email' => $str + ['format' => 'email', 'example' => 'awa.traore@gmail.com'], 'code' => $str + ['example' => '482913']], ['email', 'code']),
            'PhoneInput' => $obj(['phone' => $str + ['example' => '76 11 22 33'], 'country' => $countryCode, 'code' => $str + ['example' => '482913']], ['phone', 'code']),
            'SubscriptionOrder' => $obj([
                'plan' => ['type' => 'string', 'enum' => ['semester', 'annual'], 'description' => 'semester = 6 000 FCFA / 6 mois, annual = 10 000 FCFA / 12 mois'],
                'method' => ['type' => 'string', 'enum' => ['orange_money', 'moov_money', 'wave', 'airtel_money', 'cash']],
            ], ['plan', 'method']),
            'PaymentConfirmation' => $obj(['transactionId' => $str + ['description' => 'Identifiant de transaction de l\'opérateur (facultatif)', 'example' => 'MP241007.1532.A12345']]),
            'Subscription' => $obj([
                'id' => $str + ['format' => 'uuid'], 'reference' => $str + ['example' => 'AD-7K3F9Q'],
                'plan' => $obj(['code' => $str, 'name' => $str, 'durationMonths' => $int]),
                'amount' => $int + ['example' => 10000], 'currency' => $str + ['example' => 'XOF'],
                'status' => ['type' => 'string', 'enum' => ['pending', 'paid', 'cancelled']],
                'paymentMethod' => $str, 'paymentMethodLabel' => $str, 'transactionId' => $strNull,
                'startsAt' => $strNull + ['format' => 'date-time'], 'endsAt' => $strNull + ['format' => 'date-time'],
                'createdAt' => $str + ['format' => 'date-time'], 'paidAt' => $strNull + ['format' => 'date-time'],
                'practitioner' => $obj(['id' => $int, 'slug' => $str, 'fullName' => $str, 'phone' => $strNull, 'city' => $strNull, 'country' => $strNull, 'publishedUntil' => $strNull]) + ['description' => 'Administration uniquement'],
            ]),
            'SubscriptionStatus' => $obj([
                'verified' => $bool, 'published' => $bool, 'activeSubscription' => $bool,
                'publishedUntil' => $strNull + ['format' => 'date-time'], 'daysLeft' => $int,
                'plans' => $arr($obj(['code' => $str, 'name' => $str, 'durationMonths' => $int, 'price' => $int, 'monthlyPrice' => $int, 'currency' => $str])),
                'methods' => $arr($obj(['code' => $str, 'label' => $str])),
                'paymentAccount' => ['type' => 'object', 'additionalProperties' => $str, 'description' => 'Titulaire et numéros marchands du pays'],
                'pending' => ['oneOf' => [['type' => 'null'], $ref('Subscription')]],
                'history' => $arr($ref('Subscription')),
                'canSimulatePayment' => $bool,
            ]),
            'AdminSubscriptions' => $obj(['status' => $str, 'total' => $int + ['description' => 'Somme des montants (FCFA)'], 'items' => $arr($ref('Subscription'))]),
            'AuthToken' => $obj(['token' => $str, 'user' => $ref('User')]),
            'Relative' => $obj(['id' => $int, 'firstName' => $str, 'lastName' => $str, 'relation' => ['type' => 'string', 'enum' => ['enfant', 'parent', 'conjoint', 'autre']], 'birthDate' => $strNull + ['format' => 'date']]),
            'RelativeInput' => $obj(['firstName' => $str, 'lastName' => $str, 'relation' => ['type' => 'string', 'enum' => ['enfant', 'parent', 'conjoint', 'autre']], 'birthDate' => $str + ['format' => 'date']], ['firstName', 'lastName', 'relation']),
            'User' => $obj([
                'id' => $int, 'phone' => $strNull + ['description' => 'null tant qu\'aucun numéro n\'est vérifié (compte email, Google ou GitHub)'], 'email' => $strNull,
                'emailVerified' => $bool, 'linkedAccounts' => $arr(['type' => 'string', 'enum' => ['google', 'github']]), 'firstName' => $strNull, 'lastName' => $strNull, 'locale' => $str,
                'roles' => $arr(['type' => 'string', 'enum' => ['ROLE_PATIENT', 'ROLE_PRACTITIONER', 'ROLE_COUNTRY_ADMIN', 'ROLE_SUPER_ADMIN']]),
                'consent' => $bool, 'adminCountry' => $strNull, 'relatives' => $arr($ref('Relative')),
            ]),
            'UserUpdate' => $obj(['firstName' => $str, 'lastName' => $str, 'email' => $str, 'locale' => ['type' => 'string', 'enum' => ['fr', 'en', 'ar']], 'consent' => $bool]),
            'Facility' => $obj([
                'id' => $int, 'name' => $str, 'type' => ['type' => 'string', 'enum' => ['hospital', 'clinic', 'office', 'health_center']], 'typeLabel' => $str,
                'address' => $str, 'phone' => $strNull, 'latitude' => ['type' => ['number', 'null']], 'longitude' => ['type' => ['number', 'null']],
                'city' => $str, 'region' => $obj(['slug' => $str, 'name' => $str]), 'country' => $obj(['code' => $countryCode, 'name' => $str]),
                'timezone' => $str + ['example' => 'Africa/Bamako'],
            ]),
            'PractitionerSummary' => $obj([
                'id' => $int, 'slug' => $str, 'title' => $str, 'firstName' => $str, 'lastName' => $str, 'fullName' => $str,
                'gender' => ['type' => 'string', 'enum' => ['M', 'F']], 'photoUrl' => $strNull, 'fee' => $int + ['description' => 'Tarif en FCFA'],
                'teleconsultation' => $bool, 'acceptsNewPatients' => $bool,
                'languages' => $arr($obj(['code' => $str, 'name' => $str])), 'insurances' => $arr($str),
                'specialties' => $arr($obj(['slug' => $str, 'name' => $str])), 'facility' => $ref('Facility'),
            ]),
            'PractitionerDetail' => ['allOf' => [$ref('PractitionerSummary'), $obj([
                'bio' => $strNull, 'degrees' => $arr($str), 'orderNumber' => $str, 'verified' => $bool,
                'facilities' => $arr($ref('Facility')),
                'openingHours' => $arr($obj(['dayOfWeek' => $int + ['description' => '1 = lundi … 7 = dimanche'], 'start' => $str, 'end' => $str, 'facilityId' => $int])),
            ])]],
            'Slot' => $obj(['start' => $str + ['format' => 'date-time', 'description' => 'Instant UTC à renvoyer tel quel à la réservation'], 'time' => $str + ['example' => '08:30', 'description' => 'Heure locale'], 'facilityId' => $int]),
            'SlotDay' => $obj(['date' => $str + ['format' => 'date', 'description' => 'Date locale du pays'], 'slots' => $arr($ref('Slot'))]),
            'SlotDays' => $obj(['days' => $arr($ref('SlotDay'))]),
            'SearchItem' => ['allOf' => [$ref('PractitionerSummary'), $obj([
                'availability' => $arr($ref('SlotDay')),
                'nextAvailability' => ['oneOf' => [['type' => 'null'], $obj(['date' => $str, 'time' => $str, 'start' => $str])]],
            ])]],
            'SearchResult' => $obj(['total' => $int, 'page' => $int, 'perPage' => $int, 'pages' => $int, 'items' => $arr($ref('SearchItem'))]),
            'CountryOverview' => $obj([
                'country' => $obj(['code' => $countryCode, 'name' => $str, 'capital' => $str, 'timezone' => $str, 'phonePrefix' => $str, 'languages' => $arr($str)]),
                'practitionerCount' => $int,
                'regions' => $arr($obj(['id' => $int, 'slug' => $str, 'name' => $str, 'capital' => $str, 'formerName' => $strNull, 'provisional' => $bool, 'practitionerCount' => $int])),
                'specialties' => $arr($obj(['slug' => $str, 'name' => $str, 'icon' => $str, 'practitionerCount' => $int])),
            ]),
            'BookingInput' => $obj([
                'practitioner' => $str + ['description' => 'Slug du praticien', 'example' => 'boubacar-coulibaly'],
                'startsAt' => $str + ['format' => 'date-time', 'description' => 'Valeur `start` d\'un créneau'],
                'reason' => $str + ['maxLength' => 255, 'description' => 'Motif (jamais transmis par SMS)'],
                'firstVisit' => $bool + ['default' => true],
                'relativeId' => $int + ['description' => 'Proche concerné (optionnel)'],
            ], ['practitioner', 'startsAt']),
            'AppointmentAction' => $obj([
                'action' => ['type' => 'string', 'enum' => ['cancel', 'reschedule']],
                'startsAt' => $str + ['format' => 'date-time', 'description' => 'Obligatoire pour reschedule'],
            ], ['action']),
            'Appointment' => $obj([
                'id' => $str + ['format' => 'uuid'], 'startsAt' => $str + ['format' => 'date-time'], 'endsAt' => $str + ['format' => 'date-time'],
                'localDate' => $str + ['format' => 'date'], 'localTime' => $str, 'status' => $status, 'firstVisit' => $bool, 'reason' => $strNull,
                'practitioner' => $ref('PractitionerSummary'), 'facility' => $ref('Facility'), 'relative' => ['oneOf' => [['type' => 'null'], $ref('Relative')]],
                'createdAt' => $str + ['format' => 'date-time'],
                'patient' => $obj(['firstName' => $strNull, 'lastName' => $strNull, 'phone' => $str]) + ['description' => 'Espace praticien uniquement'],
            ]),
            'MyAppointments' => $obj(['upcoming' => $arr($ref('Appointment')), 'past' => $arr($ref('Appointment'))]),
            'ProAgenda' => $obj(['practitioner' => $ref('PractitionerSummary'), 'from' => $str + ['format' => 'date'], 'to' => $str + ['format' => 'date'], 'appointments' => $arr($ref('Appointment'))]),
            'ProStatusInput' => $obj(['status' => ['type' => 'string', 'enum' => ['confirmed', 'cancelled', 'honored', 'no_show']]], ['status']),
            'AbsenceInput' => $obj(['startsAt' => $str + ['format' => 'date-time'], 'endsAt' => $str + ['format' => 'date-time'], 'reason' => $str], ['startsAt', 'endsAt']),
            'ProStats' => $obj(['period' => $str, 'counts' => $obj(['pending' => $int, 'confirmed' => $int, 'cancelled' => $int, 'honored' => $int, 'no_show' => $int]), 'total' => $int, 'noShowRate' => ['type' => 'number', 'description' => 'En %']]),
            'AdminPractitioners' => $obj(['status' => $str, 'items' => $arr(['allOf' => [$ref('PractitionerDetail'), $obj(['verificationStatus' => $str, 'createdAt' => $str + ['format' => 'date-time']])]])]),
            'VerificationInput' => $obj(['decision' => ['type' => 'string', 'enum' => ['verify', 'reject']]], ['decision']),
            'VerificationResult' => $obj(['id' => $int, 'verificationStatus' => ['type' => 'string', 'enum' => ['pending', 'verified', 'rejected']]]),
        ];
    }
}
