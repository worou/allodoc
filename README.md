# AlloDoc : prise de rendez-vous médicaux dans toute l'Afrique

MVP inspiré de l'ergonomie de Doctolib, ouvert aux **55 pays et territoires africains**, répartis en **5 sous-régions** (Afrique du Nord, de l'Ouest, centrale, de l'Est, australe), chacun décliné en régions. Identité visuelle panafricaine : vert forêt, rouge latérite, or, une couleur par sous-région, motifs kente et bogolan, et la carte de l'Afrique en fond d'écran.

### Sous-régions, pays et régions

| Sous-région | Pays |
|---|---|
| Afrique du Nord | Algérie, Égypte, Libye, Maroc, Soudan, Tunisie, Sahara occidental |
| Afrique de l'Ouest | Bénin, Burkina Faso, Cap-Vert, Côte d'Ivoire, Gambie, Ghana, Guinée, Guinée-Bissau, Liberia, Mali, Mauritanie, Niger, Nigeria, Sénégal, Sierra Leone, Togo |
| Afrique centrale | Angola, Cameroun, Centrafrique, Congo, RD Congo, Gabon, Guinée équatoriale, São Tomé-et-Príncipe, Tchad |
| Afrique de l'Est | Burundi, Comores, Djibouti, Érythrée, Éthiopie, Kenya, Madagascar, Malawi, Maurice, Mozambique, Ouganda, Rwanda, Seychelles, Somalie, Soudan du Sud, Tanzanie, Zambie, Zimbabwe |
| Afrique australe | Afrique du Sud, Botswana, Eswatini, Lesotho, Namibie |

- **Référentiel** : `backend/config/reference/africa.json`. Pour chaque pays : sous-région, capitale, fuseau horaire, indicatif et longueurs du numéro national, monnaie, langues, et premier niveau administratif (775 régions avec leur chef-lieu). Le fichier est validé au chargement : 55 codes uniques, fuseaux existants, identifiants de région distincts.
- **Onglet « Afrique »** (`/afrique/nord`, `/ouest`, `/centre`, `/est`, `/australe`) : onglets des sous-régions, carte interactive et pays, chacun menant à sa page (`/sn`, `/ke`...) avec ses régions et ses praticiens.
- **Carte** : générée depuis Natural Earth par `node frontend/scripts/build-africa-map.mjs`. Ce script produit `src/assets/africa-map.json`, `public/africa-map.svg` et `public/africa-mask.svg`.
- **Téléphones** : normalisation E.164 pour les 55 pays, avec retrait du 0 initial. Le Sahara occidental partage l'indicatif +212 avec le Maroc.
- **Tarifs** : affichés dans la monnaie du pays du praticien (FCFA, ₦, KSh, R...). Les abonnements praticiens restent en FCFA.

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

## Mise en ligne (o2switch : allodoc.teranga.re)

Production : **http://allodoc.teranga.re**. Hébergement mutualisé o2switch (cPanel), PHP 8.3 (LiteSpeed), MariaDB 11.4.

| Emplacement sur le serveur | Contenu |
|---|---|
| `/home/rise9482/allodoc.teranga.re/` | Racine web : front React, `.htaccess`, `api.php` (pont vers l'API), `bundles/` (Swagger UI) |
| `/home/rise9482/allodoc-api/` | API Symfony **hors racine web**, avec `.env.local` de production |
| Base `rise9482_allodoc` | Référentiels + super-administrateur, sans données de démonstration |

**Mettre à jour le site**
1. `cp deploy/prod.env.example deploy/prod.env` et renseigner les valeurs de production. Ce fichier n'est pas versionné.
2. Lancer :
   ```bash
   PHP=/c/Users/PC/tools/php83/php.exe COMPOSER_PHAR=/c/Users/PC/tools/php84/composer.phar \
   MYSQL_BIN=/c/xampp/mysql/bin/mysql.exe MYSQLDUMP_BIN=/c/xampp/mysql/bin/mysqldump.exe \
   ADMIN_EMAIL=vous@exemple.com bash deploy/build.sh
   ```
3. Dans cPanel, **Gestionnaire de fichiers** :
   - envoyer `allodoc-api.tar.gz` dans `/home/rise9482` et `www.tar.gz` dans la racine web, puis **Extraire** chacun ;
   - **sans écraser** `allodoc-api/.env.local`.
4. Si une version modifie la base, appliquer la migration : SSH, ou bien script ponctuel sur le modèle de `deploy/server/install-db.php`.
   **Extension à toute l'Afrique** : appliquer la migration `Version20261011103305` (sous-région et longueurs de numéro), puis lancer `php bin/console app:install`. Sur une base déjà remplie, cette commande ajoute les 52 pays, leurs régions et leurs chefs-lieux manquants, sans rien supprimer, et peut être relancée sans risque.
5. Vider `allodoc-api/var/cache/prod` pour que le nouveau code soit pris en compte.

**Première installation de la base** : `deploy/server/install-db.php`. Le script importe `allodoc-api/var/install/database.sql`, uniquement dans une base vide. Il est protégé par une clé aléatoire et s'efface après usage.

**Tâches planifiées** (cPanel, **Tâches Cron**, déjà configurées) :
- `app:send-reminders` : toutes les 15 minutes ;
- `app:subscription-reminders` : tous les jours à 7 h.

**PHP 8.3.** Les dépendances sont verrouillées sur la plateforme PHP 8.3.35 (`config.platform` dans `composer.json`). Il ne faut pas passer le compte en PHP 8.4 via le `.htaccess` : cette variante d'o2switch n'a pas les extensions `intl`, `mbstring` ni `sodium`.

**Protection o2switch (PowerBoost).** Les navigateurs automatisés (« HeadlessChrome ») reçoivent des erreurs 429. Les vrais navigateurs ne sont pas concernés. Pour des tests automatisés, utilisez un user-agent de navigateur standard.

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
| Code par SMS | Code à 6 chiffres envoyé au numéro, dans les 55 pays africains (indicatif choisi dans la liste, groupée par sous-région) |
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

Les prix sont affichés avec leur **équivalent en dollars US** au taux du jour (par exemple 10 000 FCFA ≈ 17,09 $US). Les taux viennent de `open.er-api.com` (gratuit, sans clé), sont mis en cache 12 heures et exposés par `GET /api/exchange-rates`. Si ce service est injoignable, l'application utilise les taux de secours de `services.yaml` (`app.usd_fallback_rates`).

**Moyens de paiement par pays.** Chaque pays propose ses opérateurs, listés dans `backend/config/reference/africa.json` (clé `payments`) :

| Exemples | Moyens proposés |
|---|---|
| Mali | Orange Money, Moov Money, Wave, PayPal |
| Sénégal | Orange Money, Wave, Free Money, PayPal |
| Côte d'Ivoire | Orange Money, MTN Mobile Money, Moov Money, Wave, PayPal |
| Kenya | M-Pesa, Airtel Money, PayPal |
| Nigeria | OPay, PalmPay, virement bancaire, PayPal |
| Égypte | Vodafone Cash, InstaPay, Fawry, PayPal |
| Afrique du Sud | Virement bancaire, PayPal |

PayPal n'est pas proposé là où il est indisponible ou sous sanctions : Soudan, Soudan du Sud, Libye, Érythrée, Somalie, Centrafrique.

**Déroulement**
0. Le soignant se connecte (SMS, email, Google ou GitHub), ouvre `/pro` et remplit **« Créer ma fiche praticien »** : identité, spécialité, numéro d'ordre, pays, région et lieu de consultation. La fiche est créée en attente de vérification et l'espace praticien s'ouvre aussitôt (`POST /api/pro/registration`).
1. Dans son espace (onglet **Abonnement**), le praticien choisit une formule et l'un des moyens de paiement de son pays. Aucun paiement en espèces.
2. **Mobile money ou virement** : il reçoit une **référence de commande** (`AD-XXXXXX`) et le numéro de réception. Il envoie le montant en indiquant cette référence. L'administrateur de son pays vérifie le relevé, puis clique sur **Paiement reçu** (onglet **Paiements** de l'administration). Le profil est publié et le praticien reçoit un SMS.
3. **PayPal** : le praticien paie en dollars US (le prix en FCFA est converti au taux du jour), par compte PayPal ou carte bancaire. Le serveur crée la commande PayPal, capture le paiement, puis vérifie la référence, le montant et la devise. Le profil est alors publié **automatiquement**, sans intervention de l'administrateur.

**Renouvellement.** Il est possible à tout moment. La nouvelle période s'ajoute à la fin de la période en cours, sans perte de jours ; après expiration, elle démarre au paiement. Un SMS de rappel part 7 jours puis 1 jour avant l'échéance. Une fois l'abonnement expiré, le profil disparaît de la recherche, mais les rendez-vous déjà pris sont conservés.

**À configurer avant la mise en ligne**
- **Numéros de réception** dans `backend/config/services.yaml` (`app.payment_accounts`). Par défaut, **+229 90 28 53 86** vaut pour tous les opérateurs mobile money de tous les pays. Pour un numéro propre à un pays ou à un opérateur, ajoutez par exemple `SN: { wave: '+221 …' }`, ou `SN: { mobile_money: '+221 …' }` pour tous les opérateurs du Sénégal. Sans numéro, par exemple pour le virement bancaire, le praticien est informé que l'équipe AlloDoc lui enverra les coordonnées par SMS.
- **PayPal** : créer une application REST sur https://developer.paypal.com (compte PayPal Business), puis renseigner `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` et `PAYPAL_ENV` (`sandbox` pour les tests, `live` en production) dans `.env.local` / `deploy/prod.env`. Tant que ces valeurs sont vides, PayPal n'est pas proposé. Base de données : migration `Version20261011191233`.
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
| POST | `/api/pro/subscriptions/{id}/paypal`, `…/{id}/paypal/capture` | Paiement PayPal (création de la commande, puis encaissement) |
| GET | `/api/exchange-rates` | Taux de change face au dollar US (public) |
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

- **Fuseaux horaires.** Tout est stocké en UTC. Les créneaux sont calculés dans le fuseau du pays (de UTC-1 au Cap-Vert à UTC+4 à Maurice et aux Seychelles), défini dans le référentiel.
- **Double réservation impossible.** L'agenda du praticien est verrouillé pendant la réservation (`SELECT … FOR UPDATE`), et la contrainte unique `uniq_active_slot (practitioner_id, starts_at, slot_lock)` sert de dernier garde-fou. MariaDB n'a pas d'index partiel : on s'appuie donc sur le fait qu'un index unique accepte plusieurs NULL.
- **Secret médical.** Les SMS ne contiennent ni le motif ni la spécialité. Le motif n'est visible que par le patient et le praticien.
- **Sécurité.** Les codes OTP et les jetons sont stockés sous forme de hash. Les demandes sont limitées : 3 codes par numéro toutes les 10 minutes, 20 par IP et par heure, 10 vérifications par tranche de 15 minutes. Les rôles sont hiérarchisés (patient, praticien, administrateur pays, super-administrateur). Un journal d'audit (`audit_log`) trace les connexions, les consultations d'agenda et les validations. Le consentement explicite est obligatoire avant la première réservation.
- **Référentiels en base.** Les pays et les régions ne sont pas codés en dur. Ils sont décrits dans `config/reference/africa.json` et chargés par `app:install`, qui ajoute les éléments manquants. Les régions portent `provisional = true` (découpages récents : Mali 2023, Burkina Faso 2025 avec l'ancien nom affiché, Angola 2024, Burundi 2025) en attendant la validation par les ministères.
- **Réseau faible.** Environ 145 Ko gzip de JavaScript et CSS au premier chargement, dont environ 45 Ko pour les 5 dictionnaires de langue, plus environ 32 Ko pour la carte de fond et la silhouette du continent. La carte interactive (environ 53 Ko) est chargée à part, sur l'accueil et l'onglet Afrique. Les drapeaux sont de petits fichiers SVG chargés à l'affichage. Les pages sont chargées à la demande. Les régions se replient et chargent leurs praticiens par 6. Les spécialités et les régions sont mises en cache localement. Un service worker permet la consultation hors ligne. Aucune donnée personnelle n'est mise en cache.
- **SMS.** L'interface `App\Sms\SmsSenderInterface` est implémentée en développement par `LogSmsSender`, qui écrit dans `var/log/dev.log`. Pour la production, brancher Twilio, Infobip ou Africa's Talking.
- **Rappels.** À planifier avec cron ou le Planificateur de tâches Windows :
  - `php bin/console app:send-reminders` toutes les 15 minutes (rappel de rendez-vous la veille) ;
  - `php bin/console app:subscription-reminders` une fois par jour (rappels de renouvellement, annulation des commandes impayées depuis 14 jours).
- **Tests automatisés.** Lancez `php bin/phpunit`. Les 19 tests couvrent la connexion par email, Google et GitHub (fournisseurs simulés), les protections OAuth (state falsifié, redirection ouverte, code à usage unique, rattachement par email vérifié uniquement), l'ajout de téléphone et les règles d'abonnement (prix, publication, renouvellement cumulatif, expiration, double confirmation). Ils utilisent la base `allodoc_test`.

## Prévu au MVP du cahier des charges mais pas encore développé

- **Modification du profil praticien** (diplômes, tarifs, photo, horaires). L'inscription existe (`/pro`, puis « Créer ma fiche praticien ») avec des horaires par défaut : du lundi au vendredi, 8 h - 12 h, créneaux de 30 minutes. Mais le praticien ne peut pas encore les modifier lui-même.
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
