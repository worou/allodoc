#!/usr/bin/env bash
# Prépare le paquet de déploiement AlloDoc pour un hébergement mutualisé (o2switch / cPanel).
#
# Résultat dans deploy/out/ :
#   allodoc-api/       -> à placer dans /home/<compte>/allodoc-api   (HORS de la racine web)
#   www/               -> contenu de la racine web du sous-domaine (front React + .htaccess + api.php)
#   database.sql       -> base de production : référentiels + super-administrateur (install-db.php ou phpMyAdmin)
#   database-demo.sql  -> variante avec les praticiens fictifs de démonstration
#   allodoc-api.tar.gz, www.tar.gz -> mêmes dossiers compressés (Gestionnaire de fichiers cPanel : Extraire)
#
# Usage : PHP=/chemin/php COMPOSER_PHAR=/chemin/composer.phar ADMIN_EMAIL=vous@exemple.com bash deploy/build.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/deploy/out"
PHP="${PHP:-php}"
COMPOSER_PHAR="${COMPOSER_PHAR:-composer}"
MYSQL_BIN="${MYSQL_BIN:-mysql}"
MYSQLDUMP_BIN="${MYSQLDUMP_BIN:-mysqldump}"
ADMIN_EMAIL="${ADMIN_EMAIL:?Indiquez ADMIN_EMAIL (super-administrateur)}"
BUILD_DB="allodoc_build"

[ -f "$ROOT/deploy/prod.env" ] || { echo "deploy/prod.env manquant (copier deploy/prod.env.example)"; exit 1; }

echo "== Nettoyage"
rm -rf "$OUT" && mkdir -p "$OUT/allodoc-api" "$OUT/www"

echo "== API : fichiers versionnés uniquement (pas de .env.local, var/, vendor/ de développement)"
(cd "$ROOT" && git ls-files backend | sed 's#^backend/##' > "$OUT/api-files.txt")
(cd "$ROOT/backend" && tar -cf - -T "$OUT/api-files.txt") | (cd "$OUT/allodoc-api" && tar -xf -)
rm "$OUT/api-files.txt"
rm -rf "$OUT/allodoc-api/tests" "$OUT/allodoc-api/phpunit.dist.xml" "$OUT/allodoc-api/compose.yaml" "$OUT/allodoc-api/compose.override.yaml"
cp "$ROOT/deploy/prod.env" "$OUT/allodoc-api/.env.local"

echo "== API : dépendances de production"
(cd "$OUT/allodoc-api" && APP_ENV=prod $PHP $COMPOSER_PHAR install --no-dev --optimize-autoloader --classmap-authoritative --no-scripts --no-interaction --quiet)
(cd "$OUT/allodoc-api" && APP_ENV=prod APP_DEBUG=0 $PHP bin/console assets:install public --no-debug --quiet)
# Le cache contient des chemins absolus de ce poste : il sera reconstruit sur le serveur.
rm -rf "$OUT/allodoc-api/var" && mkdir -p "$OUT/allodoc-api/var/cache" "$OUT/allodoc-api/var/log"

echo "== Front : build de production (API sur le même domaine)"
(cd "$ROOT/frontend" && npm run build -- --mode hosting --outDir "$OUT/www" --emptyOutDir > /dev/null)
cp "$ROOT/deploy/server/.htaccess" "$ROOT/deploy/server/api.php" "$OUT/www/"
# Ressources de Swagger UI (/api/docs) servies depuis la racine web.
cp -r "$OUT/allodoc-api/public/bundles" "$OUT/www/bundles"

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

echo "== Archives (.tar.gz, décompressables par le Gestionnaire de fichiers cPanel)"
cd "$OUT"
tar -czf allodoc-api.tar.gz allodoc-api
(cd www && tar -czf ../www.tar.gz .)

echo "== Terminé"
ls -la "$OUT"
