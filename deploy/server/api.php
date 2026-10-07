<?php

/*
 * Point d'entrée de l'API dans la racine web du sous-domaine.
 * Le code Symfony est installé HORS de la racine web, dans ../allodoc-api (non accessible depuis internet).
 * Même contenu que allodoc-api/public/index.php, avec le chemin vers ce dossier.
 */

use App\Kernel;

require_once dirname(__DIR__).'/allodoc-api/vendor/autoload_runtime.php';

return static function (array $context) {
    return new Kernel($context['APP_ENV'], (bool) $context['APP_DEBUG']);
};
