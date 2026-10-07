# AlloDoc : prise de rendez-vous médicaux (Mali, Burkina Faso, Niger)

MVP inspiré de l'ergonomie de Doctolib, avec une identité visuelle sahélienne : indigo, terre cuite, ocre, vert, motifs bogolan et kente.

| Dossier | Contenu |
|---|---|
| `backend/` | API Symfony 7.4 + API Platform 5, Doctrine ORM, MySQL/MariaDB |
| `frontend/` | Application React 19 (Vite, React Router, TypeScript), installable sur mobile (PWA) |
| `frontend/android/` | Projet Android natif (Capacitor) pour générer un APK |
| `openapi.yaml` / `openapi.json` | Spécification Swagger exportée (OpenAPI 3.2) |

## Démarrage en local (Windows)

Prérequis déjà présents sur ce poste :

- **PHP 8.4 portable** dans `C:\Users\PC\tools\php84`, avec Composer (`composer.phar`). Le PHP 8.0 de XAMPP est trop ancien pour Symfony 7.
- **MariaDB 10.4** de XAMPP (compatible MySQL).
- **Node.js** pour le front.

```bash
# 1. Base de données : démarrer MySQL depuis le panneau XAMPP (ou C:\xampp\mysql_start.bat)

# 2. API (http://127.0.0.1:8000)
cd backend
C:\Users\PC\tools\php84\php.exe C:\Users\PC\tools\php84\composer.phar install
C:\Users\PC\tools\php84\php.exe bin/console doctrine:database:create --if-not-exists
C:\Users\PC\tools\php84\php.exe bin/console doctrine:migrations:migrate -n
C:\Users\PC\tools\php84\php.exe bin/console doctrine:fixtures:load -n
C:\Users\PC\tools\php84\php.exe -S 127.0.0.1:8000 -t public

# 3. Front (http://127.0.0.1:5173)
cd frontend
npm install
npm run dev
```

La connexion à la base est définie dans `backend/.env.local` (`DATABASE_URL`, utilisateur `root` sans mot de passe sous XAMPP). L'URL de l'API côté front est dans `frontend/.env` (`VITE_API_URL`).

## Swagger / OpenAPI

- **Swagger UI** : http://127.0.0.1:8000/api/docs
- **JSON** : http://127.0.0.1:8000/api/docs.jsonopenapi
- **Fichiers exportés** : `openapi.yaml` et `openapi.json` à la racine. Pour les régénérer :
  `php bin/console api:openapi:export --yaml --output=../openapi.yaml`

Dans Swagger UI, cliquez sur **Authorize** et collez le `token` obtenu avec `POST /api/auth/otp/verify`.

Pour générer les types TypeScript du front React à partir de la spécification (testé avec openapi-typescript 7) :

```bash
npx openapi-typescript openapi.yaml -o frontend/src/lib/api-schema.d.ts
```

## Connexion et inscription

Aucun mot de passe. Quatre façons de se connecter, et le compte est créé automatiquement à la première connexion :

| Mode | Fonctionnement |
|---|---|
| Code par SMS | Code à 6 chiffres envoyé au numéro (Mali +223, Burkina Faso +226, Niger +227) |
| Code par email | Code à 6 chiffres envoyé par email. L'adresse devient vérifiée. |
| Google | Fonctionne avec tous les comptes Gmail / Google |
| GitHub | Utilise l'adresse principale vérifiée du compte GitHub |

**Le téléphone reste indispensable pour réserver**, car la confirmation et le rappel partent par SMS. Un compte créé par email, Google ou GitHub doit ajouter un numéro, vérifié par code SMS, au moment de sa première réservation ou depuis « Mon compte ».

**Sécurité des comptes**
- Une connexion Google ou GitHub n'est rattachée à un compte existant que si les deux adresses email sont vérifiées. Sinon, un nouveau compte est créé : personne ne peut capter les connexions d'autrui en saisissant son adresse dans un profil.
- Pas de fusion de comptes : si un numéro ou une adresse appartient déjà à un autre compte, l'utilisateur doit se connecter avec.
- Un compte créé par SMS (c'est le cas des praticiens et administrateurs) peut **vérifier son email** dans « Mon compte ». Il peut ensuite se connecter à ce même compte avec Google ou GitHub, à condition d'utiliser la même adresse.
- Le code de retour Google / GitHub n'est utilisable que dans le navigateur qui a lancé la connexion (nonce gardé dans l'onglet) : un lien de retour transmis par un tiers est refusé.

### Activer Google et GitHub

Tant que les identifiants ne sont pas renseignés, les boutons s'affichent avec le message « non activée ».

**Google** ([console Google Cloud](https://console.cloud.google.com/apis/credentials)) :
1. Créez un projet, puis l'**écran de consentement OAuth** (type « Externe »). En mode « Test », seuls les utilisateurs de test que vous listez peuvent se connecter ; publiez l'application pour l'ouvrir à tous.
2. **Créer des identifiants**, puis **ID client OAuth**, de type **Application Web**.
3. **URI de redirection autorisé** : `http://127.0.0.1:8000/api/auth/oauth/google/callback`. En production, utilisez l'URL HTTPS de l'API.

**GitHub** ([Developer settings](https://github.com/settings/developers)) :
1. **OAuth Apps**, puis **New OAuth App**.
2. **Homepage URL** : `http://127.0.0.1:5173`.
3. **Authorization callback URL** : `http://127.0.0.1:8000/api/auth/oauth/github/callback`.
4. Générez un **client secret**.

Collez ensuite les valeurs dans `backend/.env.local` :

```ini
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

Le front, l'API et les adresses de retour doivent utiliser le même hôte (`127.0.0.1`, ou bien `localhost` partout). En production, renseignez aussi `API_PUBLIC_URL` et `FRONTEND_URL`.

**Emails.** En développement, `MAILER_DSN=null://null` : aucun email ne part, et le code s'affiche à l'écran. En production, configurez par exemple `MAILER_DSN=smtp://utilisateur:motdepasse@smtp.exemple.com:587` et `MAILER_FROM`.

## Application mobile (patients et praticiens)

Le bouton **« Télécharger l'app »** du menu principal (lien direct : `/application`) présente l'application aux patients et aux praticiens. C'est **une seule application** : elle s'adapte au profil connecté.

| Profil | Ouverture de l'application | Onglets du bas |
|---|---|---|
| Patient | Page d'accueil | Accueil, Rechercher, Mes RDV, Profil |
| Praticien | Agenda | Agenda, Abonnement, Rechercher, Compte |

L'icône de l'application propose aussi des raccourcis : « Trouver un médecin », « Mes rendez-vous », « Mon agenda ».

### 1. Installation depuis le navigateur (disponible tout de suite)

AlloDoc est une application web installable (PWA) : moins de 1 Mo, pas de Play Store ni d'App Store, mises à jour automatiques, consultation hors ligne des pages déjà vues.

- **Android (Chrome)** : un bouton **« Installer l'application »** apparaît sur la page `/application`.
- **iPhone (Safari)** : la page affiche la marche à suivre (Partager, puis « Sur l'écran d'accueil »).
- **Ordinateur** : un **QR code** ouvre la page sur le téléphone.

L'installation exige que le site soit servi en **HTTPS** en production (ou depuis `localhost` / `127.0.0.1` en développement). Elle n'est proposée qu'avec la version compilée (`npm run build`), pas avec `npm run dev`.

### 2. Fichier APK Android (projet prêt, outils à installer)

Le projet Android natif est généré dans `frontend/android/` avec Capacitor. Il reprend la même application React, avec l'icône et l'écran de démarrage AlloDoc, sous l'identifiant `africa.allodoc.app`.

**Générer l'APK**
1. Installez **Android Studio** (il fournit Java et le SDK Android, et vous fait accepter la licence du SDK).
2. Renseignez l'URL **HTTPS publique** de l'API dans `frontend/.env.android` (`VITE_API_URL`). Une adresse `127.0.0.1` ne fonctionne pas depuis un téléphone.
3. Côté API, ajoutez `https://localhost` à `CORS_ALLOW_ORIGIN` : c'est l'origine de l'application Android.
4. Lancez `npm run build:android`, puis ouvrez `frontend/android` dans Android Studio : **Build**, puis **Generate Signed App Bundle / APK**.
5. Publiez le fichier (sur le site ou sur le Play Store). Pour qu'un bouton **« Télécharger l'APK Android »** apparaisse sur `/application`, renseignez `VITE_ANDROID_APK_URL`, par exemple `/downloads/allodoc.apk` avec le fichier placé dans `frontend/public/downloads/`.

**Connexion dans l'APK.** Google interdit sa connexion dans les applications qui embarquent un site web. Dans l'APK, seules les connexions **par SMS et par email** sont donc proposées ; Google et GitHub restent disponibles dans le navigateur et dans l'application installée depuis le navigateur.

## Abonnement des praticiens

Un praticien n'est **visible et réservable que s'il est vérifié par l'administrateur de son pays ET abonné**.

| Formule | Prix | Durée |
|---|---|---|
| Semestriel | 6 000 FCFA | 6 mois |
| Annuel | 10 000 FCFA (soit 833 FCFA / mois, 2 000 FCFA d'économie) | 12 mois |

**Déroulement**
1. Dans son espace (onglet **Abonnement**), le praticien choisit une formule et un moyen de paiement : Orange Money, Moov Money, Wave, Airtel Money ou espèces.
2. Il reçoit une **référence de commande** (`AD-XXXXXX`) et le numéro marchand de son pays. Il envoie le montant en indiquant cette référence.
3. L'administrateur de son pays vérifie le relevé du compte marchand, puis clique sur **Paiement reçu** (onglet **Paiements** de l'administration). Le profil est publié et le praticien reçoit un SMS.

**Renouvellement.** Il est possible à tout moment. La nouvelle période s'ajoute à la fin de la période en cours, sans perte de jours ; après expiration, elle démarre au paiement. Un SMS de rappel part 7 jours puis 1 jour avant l'échéance. Une fois l'abonnement expiré, le profil disparaît de la recherche, mais les rendez-vous déjà pris sont conservés.

**À configurer avant la mise en ligne**
- Les **numéros marchands** sont fictifs : remplacez-les dans `backend/config/services.yaml` (`app.payment_accounts`).
- Les **tarifs** sont en base (table `subscription_plan`) et peuvent changer sans redéploiement. Une commande garde le prix du jour où elle a été passée.

**Démo et suite**
- En développement, un bouton **« Simuler le paiement »** valide une commande sans argent réel.
- Le paiement automatique par un agrégateur (CinetPay, PayDunya…) reste en phase 2 : il suffira d'appeler `SubscriptionService::confirmPayment()` depuis la notification de paiement de l'agrégateur.

## Comptes de démonstration

En environnement `dev`, aucun SMS ni email n'est envoyé : le code est renvoyé dans la réponse (`devCode`) et affiché à l'écran.

| Rôle | Téléphone | Pays |
|---|---|---|
| Patient | 70 00 00 01 | Mali |
| Praticien (lié à Dr Boubacar Coulibaly) | 70 00 00 02 | Mali |
| Administrateur pays (Mali) | 70 00 00 03 | Mali |
| Super-administrateur | 90 00 00 00 | Niger |

Les données de démonstration comprennent 3 pays, 45 régions, 18 spécialités, 29 structures et 70 praticiens. Les structures et les praticiens sont **fictifs**.

Situations d'abonnement prévues dans la démo :
- le praticien de démonstration a un abonnement qui expire dans 5 jours (bandeau de renouvellement) ;
- au moins une commande malienne attend la confirmation de l'administrateur Mali ;
- quelques praticiens ont un abonnement expiré et sont donc invisibles.

## Endpoints

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/api/auth/otp/request`, `/api/auth/otp/verify` | Connexion par code SMS ou email, jeton Bearer valable 30 jours |
| GET / POST | `/api/auth/oauth/providers`, `/api/auth/oauth/{google\|github}`, `…/callback`, `/api/auth/oauth/exchange` | Connexion Google / GitHub |
| POST | `/api/me/phone`, `/api/me/email` | Ajouter un numéro ou une adresse email vérifiés (par code) |
| GET | `/api/subscription-plans` | Formules d'abonnement (public) |
| GET / POST | `/api/pro/subscription`, `/api/pro/subscriptions`, `…/{id}/cancel`, `…/{id}/simulate-payment` | Abonnement du praticien |
| GET / POST | `/api/admin/subscriptions`, `…/{id}/confirm`, `…/{id}/reject` | Confirmation des paiements |
| GET | `/api/countries`, `/api/regions`, `/api/cities`, `/api/specialties`, `/api/facilities` | Référentiels (API Platform) |
| GET | `/api/countries/{code}/overview` | Page pays : régions et spécialités avec nombre de praticiens |
| GET | `/api/search` | Recherche paginée avec grille de créneaux |
| GET | `/api/practitioners/{slug}`, `/api/practitioners/{slug}/slots` | Fiche praticien et créneaux libres |
| GET / PATCH | `/api/me`, POST `/api/me/relatives`, GET `/api/me/appointments` | Espace patient |
| POST | `/api/appointments`, PATCH `/api/appointments/{id}` | Réserver, annuler, reporter |
| GET / PATCH / POST | `/api/pro/agenda`, `/api/pro/appointments/{id}`, `/api/pro/absences`, `/api/pro/stats` | Espace praticien |
| GET / POST | `/api/admin/practitioners`, `/api/admin/practitioners/{id}/verification` | Validation des praticiens |

## Choix techniques importants

- **Fuseaux horaires.** Tout est stocké en UTC. Les créneaux sont calculés dans le fuseau du pays : Bamako et Ouagadougou en UTC+0, Niamey en UTC+1.
- **Double réservation impossible.** L'agenda du praticien est verrouillé pendant la réservation (`SELECT … FOR UPDATE`), et la contrainte unique `uniq_active_slot (practitioner_id, starts_at, slot_lock)` sert de dernier garde-fou. MariaDB n'a pas d'index partiel : on s'appuie donc sur le fait qu'un index unique accepte plusieurs NULL.
- **Secret médical.** Les SMS ne contiennent ni le motif ni la spécialité. Le motif n'est visible que par le patient et le praticien.
- **Sécurité.** Les codes OTP et les jetons sont stockés sous forme de hash. Les demandes sont limitées : 3 codes par numéro toutes les 10 minutes, 20 par IP et par heure, 10 vérifications par tranche de 15 minutes. Les rôles sont hiérarchisés (patient, praticien, administrateur pays, super-administrateur). Un journal d'audit (`audit_log`) trace les connexions, les consultations d'agenda et les validations. Le consentement explicite est obligatoire avant la première réservation.
- **Référentiels en base.** Les pays et les régions ne sont pas codés en dur. Ajouter un pays revient à ajouter des lignes. Les régions portent `provisional = true` (découpages Mali 2023 et Burkina Faso 2025, avec l'ancien nom affiché) en attendant la validation par les ministères.
- **Réseau faible.** Environ 100 Ko gzip au premier chargement. Les pages sont chargées à la demande. Les régions se replient et chargent leurs praticiens par 6. Les spécialités et les régions sont mises en cache localement. Un service worker permet la consultation hors ligne. Aucune donnée personnelle n'est mise en cache.
- **SMS.** L'interface `App\Sms\SmsSenderInterface` est implémentée en développement par `LogSmsSender`, qui écrit dans `var/log/dev.log`. Pour la production, brancher Twilio, Infobip ou Africa's Talking.
- **Rappels.** À planifier avec cron ou le Planificateur de tâches Windows :
  - `php bin/console app:send-reminders` toutes les 15 minutes (rappel de rendez-vous la veille) ;
  - `php bin/console app:subscription-reminders` une fois par jour (rappels de renouvellement, annulation des commandes impayées depuis 14 jours).
- **Tests automatisés.** Lancez `php bin/phpunit`. Les 19 tests couvrent la connexion par email, Google et GitHub (fournisseurs simulés), les protections OAuth (state falsifié, redirection ouverte, code à usage unique, rattachement par email vérifié uniquement), l'ajout de téléphone et les règles d'abonnement (prix, publication, renouvellement cumulatif, expiration, double confirmation). Ils utilisent la base `allodoc_test`.

## Prévu au MVP du cahier des charges mais pas encore développé

- **Inscription en ligne d'un praticien** (création de la fiche, puis vérification, puis abonnement) et modification de son profil (diplômes, tarifs, photo). Pour l'instant, seules les fiches de démonstration existent, et seul le compte praticien de démo y est rattaché : un vrai praticien ne peut donc pas encore s'abonner.
- Écran de gestion des horaires récurrents et des congés. Seule l'API `POST /api/pro/absences` existe.
- Confirmation ou refus d'une demande par le praticien : les réservations sont confirmées immédiatement.
- Favoris, carte géographique interactive (seul un lien OpenStreetMap est proposé), avis patients et modération.
- Notifications WhatsApp, email et push pour les rendez-vous. Seul le SMS existe, et il est simulé. L'email ne sert pour l'instant qu'aux codes de connexion.
- Factures ou reçus d'abonnement téléchargeables.
- Si l'abonnement d'un praticien expire, ses patients ne peuvent plus **déplacer** un rendez-vous déjà pris (la fiche n'est plus accessible). L'annulation reste possible.
- Rôle « structure de santé » (gestion de plusieurs praticiens) et accès statistique pour l'autorité de santé.
- Back-office des référentiels (pays, régions, villes, spécialités), signalements, exports statistiques.
- Traductions : la base i18n existe (champ `translations` des spécialités, `locale` des utilisateurs), mais l'interface est en français uniquement.
- Tests automatisés du front, et tests backend de la recherche et de la réservation. Seules l'authentification et l'abonnement sont couverts.

## Hors MVP (phase 2)

Téléconsultation vidéo, paiement mobile money automatique (agrégateur) et acomptes, dossier médical partagé, USSD, avis patients modérés, langues locales, application mobile, et validation juridique de l'hébergement des données (lois du Mali, du Burkina Faso et du Niger).
