#!/usr/bin/env bash
# Prépare le paquet de déploiement pour un hébergement mutualisé (o2switch / cPanel).
#
# Plusieurs sites peuvent partager le même compte : SITE=allodoc (défaut, allodoc.teranga.re) ou SITE=afrodoc
# (afrodoc.teranga.re). Chaque site a son dossier d'API hors racine web (<site>-api), sa configuration
# (deploy/prod.env pour allodoc, deploy/<site>.env sinon, non versionnées) et son dossier de sortie.
#
# Résultat dans deploy/out/ (allodoc) ou deploy/out-<site>/ :
#   <site>-api/        -> à placer dans /home/<compte>/<site>-api   (HORS de la racine web)
#   www/               -> contenu de la racine web du sous-domaine (front React + .htaccess + api.php)
#   database.sql       -> base de production : référentiels + super-administrateur (install-db.php ou phpMyAdmin)
#   database-demo.sql  -> variante avec les praticiens fictifs de démonstration
#   <site>-api.tar.gz, www.tar.gz -> mêmes dossiers compressés (Gestionnaire de fichiers cPanel : Extraire)
#
# INSTALL_DB=1 (première mise en ligne) : ajoute www/install-db.php, protégé par une clé aléatoire, et le dump
# à importer dans <site>-api/var/install/ (database.sql, ou database-demo.sql avec DEMO=1).
#
# Usage : SITE=afrodoc INSTALL_DB=1 PHP=/chemin/php COMPOSER_PHAR=/chemin/composer.phar ADMIN_EMAIL=vous@exemple.com bash deploy/build.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="${SITE:-allodoc}"
API_DIR="$SITE-api"
if [ "$SITE" = "allodoc" ]; then
  OUT="$ROOT/deploy/out"
  ENV_FILE="$ROOT/deploy/prod.env"
else
  OUT="$ROOT/deploy/out-$SITE"
  ENV_FILE="$ROOT/deploy/$SITE.env"
fi
PHP="${PHP:-php}"
COMPOSER_PHAR="${COMPOSER_PHAR:-composer}"
MYSQL_BIN="${MYSQL_BIN:-mysql}"
MYSQLDUMP_BIN="${MYSQLDUMP_BIN:-mysqldump}"
ADMIN_EMAIL="${ADMIN_EMAIL:?Indiquez ADMIN_EMAIL (super-administrateur)}"
INSTALL_DB="${INSTALL_DB:-0}"
# Nom affiché du site (logo, titre, application installée) : AfroDoc pour afrodoc, AlloDoc sinon.
BRAND="${BRAND:-$([ "$SITE" = "afrodoc" ] && echo AfroDoc || echo AlloDoc)}"
DEMO="${DEMO:-0}"
BUILD_DB="${SITE}_build"

[ -f "$ENV_FILE" ] || { echo "$ENV_FILE manquant (copier deploy/prod.env.example)"; exit 1; }

echo "== Nettoyage ($SITE)"
rm -rf "$OUT" && mkdir -p "$OUT/$API_DIR" "$OUT/www"

echo "== API : fichiers du dépôt (versionnés ou nouveaux), sans les fichiers ignorés (.env.local, var/, vendor/)"
(cd "$ROOT" && git ls-files --cached --others --exclude-standard backend | sed 's#^backend/##' > "$OUT/api-files.txt")
(cd "$ROOT/backend" && tar -cf - -T "$OUT/api-files.txt") | (cd "$OUT/$API_DIR" && tar -xf -)
rm "$OUT/api-files.txt"
rm -rf "$OUT/$API_DIR/tests" "$OUT/$API_DIR/phpunit.dist.xml" "$OUT/$API_DIR/compose.yaml" "$OUT/$API_DIR/compose.override.yaml"
cp "$ENV_FILE" "$OUT/$API_DIR/.env.local"

echo "== API : dépendances de production"
(cd "$OUT/$API_DIR" && APP_ENV=prod $PHP $COMPOSER_PHAR install --no-dev --optimize-autoloader --classmap-authoritative --no-scripts --no-interaction --quiet)
(cd "$OUT/$API_DIR" && APP_ENV=prod APP_DEBUG=0 $PHP bin/console assets:install public --no-debug --quiet)
# Le cache contient des chemins absolus de ce poste : il sera reconstruit sur le serveur.
rm -rf "$OUT/$API_DIR/var" && mkdir -p "$OUT/$API_DIR/var/cache" "$OUT/$API_DIR/var/log"

echo "== Front : build de production (API sur le même domaine)"
(cd "$ROOT/frontend" && VITE_BRAND_NAME="$BRAND" npm run build -- --mode hosting --outDir "$OUT/www" --emptyOutDir > /dev/null)
# Manifeste de l'application installable (fichier statique) : nom de la marque du site.
sed -i "s/AlloDoc/$BRAND/g" "$OUT/www/manifest.webmanifest"
cp "$ROOT/deploy/server/.htaccess" "$OUT/www/"
sed "s#allodoc-api#$API_DIR#g" "$ROOT/deploy/server/api.php" > "$OUT/www/api.php"
# Ressources de Swagger UI (/api/docs) servies depuis la racine web.
cp -r "$OUT/$API_DIR/public/bundles" "$OUT/www/bundles"

echo "== Base : schéma + référentiels + super-administrateur ($ADMIN_EMAIL)"
cd "$ROOT/backend"
DBURL="mysql://root:@127.0.0.1:3306/$BUILD_DB?serverVersion=10.4.32-MariaDB&charset=utf8mb4"
run() { DATABASE_URL="$DBURL" APP_ENV=dev $PHP bin/console "$@" --no-interaction -q; }
run doctrine:database:drop --force --if-exists
run doctrine:database:create
run doctrine:migrations:migrate
run app:install --admin-email="$ADMIN_EMAIL"
DUMP_OPTS=(--skip-comments --single-transaction --default-character-set=utf8mb4 --no-tablespaces)
"$MYSQLDUMP_BIN" -uroot "${DUMP_OPTS[@]}" "$BUILD_DB" > "$OUT/database.sql"
run doctrine:fixtures:load
# Les comptes de démo utilisent des numéros fictifs qui peuvent appartenir à de vraies personnes : retirés.
run dbal:run-sql "DELETE FROM \`user\` WHERE phone IN ('+22370000001','+22370000002','+22370000003','+22790000000')"
run app:install --admin-email="$ADMIN_EMAIL"
"$MYSQLDUMP_BIN" -uroot "${DUMP_OPTS[@]}" "$BUILD_DB" > "$OUT/database-demo.sql"
run doctrine:database:drop --force

if [ "$INSTALL_DB" = "1" ]; then
  echo "== Installation de la base : install-db.php + dump ($([ "$DEMO" = "1" ] && echo démonstration || echo production))"
  mkdir -p "$OUT/$API_DIR/var/install"
  cp "$OUT/$([ "$DEMO" = "1" ] && echo database-demo.sql || echo database.sql)" "$OUT/$API_DIR/var/install/database.sql"
  KEY="$($PHP -r 'echo bin2hex(random_bytes(16));')"
  sed "s#__INSTALL_KEY__#$KEY#; s#allodoc-api#$API_DIR#g" "$ROOT/deploy/server/install-db.php" > "$OUT/www/install-db.php"
  echo "$KEY" > "$OUT/install-key.txt"
fi

echo "== Archives (.tar.gz, décompressables par le Gestionnaire de fichiers cPanel)"
cd "$OUT"
tar -czf "$API_DIR.tar.gz" "$API_DIR"
(cd www && tar -czf ../www.tar.gz .)

echo "== Terminé"
ls -la "$OUT"
