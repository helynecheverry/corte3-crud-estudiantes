<?php
/**
 * Configuración de la conexión a la base de datos `educar`.
 *
 * Si usas XAMPP/WAMP con MySQL/MariaDB en local, normalmente basta con dejar
 * los valores por defecto. También puedes sobreescribirlos con variables de
 * entorno (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS).
 */
return [
    'host'   => getenv('DB_HOST') ?: 'localhost',
    'port'   => getenv('DB_PORT') ?: '3306',
    'dbname' => getenv('DB_NAME') ?: 'educar',
    'user'   => getenv('DB_USER') ?: 'root',
    'pass'   => (getenv('DB_PASS') === false) ? '' : getenv('DB_PASS'),
];
