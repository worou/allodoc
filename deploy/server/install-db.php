<?php

/*
 * Installation unique de la base AlloDoc sur un hébergement sans accès SSH.
 *
 * - Lit la connexion dans ../allodoc-api/.env.local (DATABASE_URL).
 * - Importe ../allodoc-api/var/install/database.sql, uniquement si la base est vide (jamais d'écrasement).
 * - Protégé par une clé aléatoire (__INSTALL_KEY__ remplacée au déploiement) ; supprime le dump et ce fichier ensuite.
 *
 * Appel : https://domaine/install-db.php?key=...
 */

header('Content-Type: text/plain; charset=UTF-8');

$key = '__INSTALL_KEY__';
if (!hash_equals($key, (string) ($_GET['key'] ?? ''))) {
    http_response_code(404);
    exit;
}

$api = dirname(__DIR__).'/allodoc-api';
$dump = $api.'/var/install/database.sql';

$env = @file_get_contents($api.'/.env.local');
if (false === $env || !preg_match('/^DATABASE_URL="?([^"\n]+)"?$/m', $env, $m)) {
    http_response_code(500);
    exit("Configuration introuvable.\n");
}
$url = parse_url($m[1]);
$db = ltrim($url['path'] ?? '', '/');

mysqli_report(MYSQLI_REPORT_OFF);
$mysqli = new mysqli($url['host'] ?? 'localhost', urldecode($url['user'] ?? ''), urldecode($url['pass'] ?? ''), $db, (int) ($url['port'] ?? 3306));
if ($mysqli->connect_errno) {
    http_response_code(500);
    exit('Connexion à la base impossible : '.$mysqli->connect_error."\n");
}
$mysqli->set_charset('utf8mb4');

$tables = $mysqli->query('SHOW TABLES')->num_rows;
if ($tables > 0) {
    @unlink($dump);
    @unlink(__FILE__);
    exit("La base contient déjà {$tables} table(s) : rien n'a été importé. Script supprimé.\n");
}
if (!is_file($dump)) {
    http_response_code(500);
    exit("Fichier SQL introuvable.\n");
}

if (!$mysqli->multi_query(file_get_contents($dump))) {
    http_response_code(500);
    exit('Erreur SQL : '.$mysqli->error."\n");
}
$count = 0;
do {
    if ($result = $mysqli->store_result()) {
        $result->free();
    }
    ++$count;
    if ($mysqli->errno) {
        http_response_code(500);
        exit("Erreur SQL à l'instruction {$count} : ".$mysqli->error."\n");
    }
} while ($mysqli->more_results() && $mysqli->next_result());
if ($mysqli->errno) {
    http_response_code(500);
    exit('Erreur SQL : '.$mysqli->error."\n");
}

$tables = $mysqli->query('SHOW TABLES')->num_rows;
$countries = $mysqli->query('SELECT COUNT(*) FROM country')->fetch_row()[0];
@unlink($dump);
@unlink(__FILE__);

echo "OK : {$tables} tables créées, {$countries} pays. Fichier SQL et script supprimés.\n";
