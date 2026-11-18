<?php
/**
 * Backend PHP del CRUD de estudiantes (tabla `estudiantes` de Educar.sql).
 * Todas las acciones se invocan por POST con un cuerpo JSON:
 *   { "action": "list", ... }
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

/** Constantes de campos (el campo Foto se excluye en todo el CRUD). */
const TEXT_FIELDS  = ['Nombre1', 'Nombre2', 'Apellido1', 'Apellido2', 'Correo', 'URL', 'Celular'];
const NUM_FIELDS   = ['Codigo', 'Altura', 'Peso'];
const DATE_FIELDS  = ['FechaNace'];
const LIST_FIELDS  = ['TipoSangre', 'ColorOjos', 'ColorPrefiere', 'Profesion', 'Nacionalidad', 'EstadoCivil', 'CiudadTrabaja'];
const HTML_FIELDS  = ['Observacion'];
const WRITE_FIELDS = [
    'Nombre1', 'Nombre2', 'Apellido1', 'Apellido2', 'TipoSangre', 'Altura', 'Peso',
    'ColorOjos', 'FechaNace', 'ColorPrefiere', 'Profesion', 'Nacionalidad', 'Correo',
    'URL', 'Celular', 'EstadoCivil', 'CiudadTrabaja', 'Observacion'
];
const OPERATORS = ['>' => '>', '<' => '<', '>=' => '>=', '<=' => '<=', '=' => '=', '!=' => '<>'];
const SORT_EXPR = [
    'Codigo' => 'e.`Codigo`',
    'Nombre' => "TRIM(CONCAT_WS(' ', e.`Nombre1`, e.`Nombre2`, e.`Apellido1`, e.`Apellido2`))",
    'Altura' => 'e.`Altura`',
    'Peso'   => 'e.`Peso`',
    'IMC'    => '(e.`Peso` / NULLIF(e.`Altura` * e.`Altura`, 0))',
    'Edad'   => '(TIMESTAMPDIFF(YEAR, e.`FechaNace`, CURDATE()))',
];
const CATALOGS = [
    'TipoSangre'    => 'tiposangre',
    'ColorOjos'     => 'colores',
    'ColorPrefiere' => 'colores',
    'Profesion'     => 'profesiones',
    'Nacionalidad'  => 'paises',
    'EstadoCivil'   => 'estadocivil',
    'CiudadTrabaja' => 'ciudades',
];

function respond(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $message, int $status = 400): void
{
    respond(['ok' => false, 'error' => $message], $status);
}

/** Limpieza mínima del HTML producido por Trumbowyg antes de guardarlo. */
function cleanHtml(?string $html): ?string
{
    if ($html === null) {
        return null;
    }
    $html = preg_replace('#<script\b[^>]*>.*?</script>#is', '', $html) ?? '';
    $html = preg_replace('#<style\b[^>]*>.*?</style>#is', '', $html) ?? '';
    $html = preg_replace('#\son\w+\s*=\s*(["\']).*?\1#is', '', $html) ?? '';
    $html = preg_replace('#javascript\s*:#is', '', $html) ?? '';
    return trim($html) === '' ? null : $html;
}

/**
 * Normaliza un valor según el tipo de campo.
 * Devuelve [valorNormalizado, mensajeDeError].
 */
function normalizeValue(string $field, $value): array
{
    if ($value === null) {
        return [null, null];
    }

    if (in_array($field, TEXT_FIELDS, true)) {
        $value = trim((string) $value);
        if ($value === '') {
            return [null, null];
        }
        if (function_exists('mb_substr')) {
            $value = mb_substr($value, 0, 255, 'UTF-8');
        } else {
            $value = substr($value, 0, 255);
        }
        return [$value, null];
    }

    if (in_array($field, HTML_FIELDS, true)) {
        return [cleanHtml((string) $value), null];
    }

    if (in_array($field, NUM_FIELDS, true)) {
        $value = trim((string) $value);
        if ($value === '') {
            return [null, null];
        }
        if (!is_numeric($value)) {
            return [null, "El campo $field debe ser numérico."];
        }
        if ($field === 'Altura') {
            $number = (float) $value;
            if ($number < 0) {
                return [null, 'La altura no puede ser negativa.'];
            }
            return [$number, null];
        }
        $number = (int) $value;
        if ($number < 0) {
            return [null, "El campo $field no puede ser negativo."];
        }
        return [$number, null];
    }

    if (in_array($field, DATE_FIELDS, true)) {
        $value = trim((string) $value);
        if ($value === '') {
            return [null, null];
        }
        if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $m) || !checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
            return [null, 'La fecha debe tener formato AAAA-MM-DD.'];
        }
        return [$value, null];
    }

    if (in_array($field, LIST_FIELDS, true)) {
        $value = trim((string) $value);
        if ($value === '' || $value === '0') {
            return [null, null];
        }
        if (!ctype_digit($value) || (int) $value <= 0) {
            return [null, "Valor inválido para $field."];
        }
        return [(int) $value, null];
    }

    return [null, "Campo desconocido: $field"];
}

try {
    $cfg = require __DIR__ . '/config.php';
    $pdo = new PDO(
        "mysql:host={$cfg['host']};port={$cfg['port']};dbname={$cfg['dbname']};charset=utf8",
        $cfg['user'],
        $cfg['pass'],
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );

    $raw  = file_get_contents('php://input');
    $in   = json_decode($raw !== false && $raw !== '' ? $raw : '[]', true);
    if (!is_array($in)) {
        $in = [];
    }
    if (!isset($in['action']) && isset($_POST['action'])) {
        $in['action'] = $_POST['action'];
    }
    $action = (string) ($in['action'] ?? '');

    switch ($action) {

        /* --------------------------------------------------------------------
         * Catálogos para los Select2 (tablas foráneas)
         * ------------------------------------------------------------------ */
        case 'catalogs':
            $out = [];
            foreach (CATALOGS as $field => $table) {
                $stmt = $pdo->query("SELECT `codigo` AS `value`, `nombre` AS `label` FROM `$table` ORDER BY `nombre` ASC");
                $out[$field] = $stmt->fetchAll();
            }
            respond(['ok' => true, 'catalogs' => $out]);
            break;

        /* --------------------------------------------------------------------
         * GRID con paginación, ordenamiento y búsqueda (AND entre criterios)
         * ------------------------------------------------------------------ */
        case 'list':
            $page     = max(1, (int) ($in['page'] ?? 1));
            $pageSize = (int) ($in['pageSize'] ?? 10);
            if (!in_array($pageSize, [5, 10, 20, 50, 100], true)) {
                $pageSize = 10;
            }
            $sort = (string) ($in['sort'] ?? 'Codigo');
            if (!isset(SORT_EXPR[$sort])) {
                $sort = 'Codigo';
            }
            $dir = strtoupper((string) ($in['dir'] ?? 'ASC'));
            if (!in_array($dir, ['ASC', 'DESC'], true)) {
                $dir = 'ASC';
            }

            $where  = [];
            $params = [];
            $filters = $in['filters'] ?? [];
            if (!is_array($filters)) {
                $filters = [];
            }
            foreach ($filters as $i => $filter) {
                if (!is_array($filter)) {
                    continue;
                }
                $field = (string) ($filter['field'] ?? '');
                $op    = (string) ($filter['op'] ?? '');
                $value = trim((string) ($filter['value'] ?? ''));
                if ($value === '') {
                    continue;
                }
                $key = ':f' . $i;

                if (in_array($field, TEXT_FIELDS, true) || in_array($field, HTML_FIELDS, true)) {
                    // Búsqueda por patrón, ignorando mayúsculas/minúsculas.
                    $where[] = "LOWER(e.`$field`) LIKE LOWER($key)";
                    $params[$key] = $value;
                } elseif (in_array($field, NUM_FIELDS, true)) {
                    if (!isset(OPERATORS[$op])) {
                        fail("Operador inválido para $field.");
                    }
                    $where[] = "e.`$field` " . OPERATORS[$op] . " $key";
                    $params[$key] = ($field === 'Altura') ? (float) $value : (int) $value;
                } elseif (in_array($field, DATE_FIELDS, true)) {
                    if (!isset(OPERATORS[$op]) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
                        fail("Criterio inválido para $field.");
                    }
                    $where[] = "e.`$field` " . OPERATORS[$op] . " $key";
                    $params[$key] = $value;
                } elseif (in_array($field, LIST_FIELDS, true)) {
                    $where[] = "e.`$field` = $key";
                    $params[$key] = (int) $value;
                }
            }

            $sqlWhere = $where ? ' WHERE ' . implode(' AND ', $where) : '';

            $countStmt = $pdo->prepare("SELECT COUNT(*) FROM `estudiantes` e$sqlWhere");
            foreach ($params as $key => $value) {
                $countStmt->bindValue($key, $value);
            }
            $countStmt->execute();
            $total = (int) $countStmt->fetchColumn();
            $pages = max(1, (int) ceil($total / $pageSize));
            if ($page > $pages) {
                $page = $pages;
            }
            $offset = ($page - 1) * $pageSize;

            $sql = "SELECT e.`Codigo`, e.`Nombre1`, e.`Nombre2`, e.`Apellido1`, e.`Apellido2`,
                           e.`TipoSangre`, e.`Altura`, e.`Peso`, e.`ColorOjos`, e.`FechaNace`,
                           e.`ColorPrefiere`, e.`Profesion`, e.`Nacionalidad`, e.`Correo`,
                           e.`URL`, e.`Celular`, e.`EstadoCivil`, e.`CiudadTrabaja`, e.`Observacion`,
                           ROUND(e.`Peso` / NULLIF(e.`Altura` * e.`Altura`, 0), 2) AS `IMC`,
                           TIMESTAMPDIFF(YEAR, e.`FechaNace`, CURDATE()) AS `Edad`
                    FROM `estudiantes` e$sqlWhere
                    ORDER BY " . SORT_EXPR[$sort] . " $dir, e.`Codigo` ASC
                    LIMIT :offset, :limit";
            $stmt = $pdo->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
            $stmt->execute();

            respond([
                'ok'       => true,
                'rows'     => $stmt->fetchAll(),
                'total'    => $total,
                'pages'    => $pages,
                'page'     => $page,
                'pageSize' => $pageSize,
                'sort'     => $sort,
                'dir'      => $dir,
            ]);
            break;

        /* --------------------------------------------------------------------
         * Detalle: todos los campos con las descripciones de las foráneas
         * ------------------------------------------------------------------ */
        case 'detail':
            $id = (int) ($in['id'] ?? 0);
            if ($id <= 0) {
                fail('Código de registro inválido.');
            }
            $sql = "SELECT e.*,
                           ROUND(e.`Peso` / NULLIF(e.`Altura` * e.`Altura`, 0), 2) AS `IMC`,
                           TIMESTAMPDIFF(YEAR, e.`FechaNace`, CURDATE()) AS `Edad`,
                           ts.`nombre` AS `TipoSangreDesc`,
                           co.`nombre` AS `ColorOjosDesc`,
                           cp.`nombre` AS `ColorPrefiereDesc`,
                           pr.`nombre` AS `ProfesionDesc`,
                           pa.`nombre` AS `NacionalidadDesc`,
                           ec.`nombre` AS `EstadoCivilDesc`,
                           ci.`nombre` AS `CiudadTrabajaDesc`
                    FROM `estudiantes` e
                    LEFT JOIN `tiposangre` ts ON ts.`codigo` = e.`TipoSangre`
                    LEFT JOIN `colores` co ON co.`codigo` = e.`ColorOjos`
                    LEFT JOIN `colores` cp ON cp.`codigo` = e.`ColorPrefiere`
                    LEFT JOIN `profesiones` pr ON pr.`codigo` = e.`Profesion`
                    LEFT JOIN `paises` pa ON pa.`codigo` = e.`Nacionalidad`
                    LEFT JOIN `estadocivil` ec ON ec.`codigo` = e.`EstadoCivil`
                    LEFT JOIN `ciudades` ci ON ci.`codigo` = e.`CiudadTrabaja`
                    WHERE e.`Codigo` = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            $row = $stmt->fetch();
            if (!$row) {
                fail('No se encontró el registro solicitado.', 404);
            }
            unset($row['Foto']); // El campo foto queda fuera del CRUD.
            respond(['ok' => true, 'record' => $row]);
            break;

        /* --------------------------------------------------------------------
         * Adicionar registro
         * ------------------------------------------------------------------ */
        case 'create':
            $cols   = [];
            $values = [];
            $params = [];
            foreach (WRITE_FIELDS as $field) {
                if (!array_key_exists($field, $in)) {
                    continue;
                }
                [$value, $error] = normalizeValue($field, $in[$field]);
                if ($error !== null) {
                    fail($error);
                }
                $cols[]   = "`$field`";
                $values[] = ":$field";
                $params[":$field"] = $value;
            }
            if (!$cols) {
                fail('No se recibieron datos para el nuevo registro.');
            }
            $sql = 'INSERT INTO `estudiantes` (' . implode(', ', $cols) . ') VALUES (' . implode(', ', $values) . ')';
            $stmt = $pdo->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->execute();
            respond(['ok' => true, 'id' => (int) $pdo->lastInsertId(), 'message' => 'Registro adicionado correctamente.']);
            break;

        /* --------------------------------------------------------------------
         * Editar: solo se actualizan los campos que el usuario cambió
         * ------------------------------------------------------------------ */
        case 'update':
            $id = (int) ($in['Codigo'] ?? 0);
            if ($id <= 0) {
                fail('Código de registro inválido.');
            }
            $changes = $in['changes'] ?? [];
            if (!is_array($changes)) {
                fail('Datos de edición inválidos.');
            }
            $sets   = [];
            $params = [':id' => $id];
            foreach (WRITE_FIELDS as $field) {
                if (!array_key_exists($field, $changes)) {
                    continue;
                }
                [$value, $error] = normalizeValue($field, $changes[$field]);
                if ($error !== null) {
                    fail($error);
                }
                $sets[] = "`$field` = :$field";
                $params[":$field"] = $value;
            }
            if ($sets) {
                $stmt = $pdo->prepare('UPDATE `estudiantes` SET ' . implode(', ', $sets) . ' WHERE `Codigo` = :id');
                foreach ($params as $key => $value) {
                    $stmt->bindValue($key, $value);
                }
                $stmt->execute();
            }
            respond(['ok' => true, 'changed' => count($sets), 'message' => 'Registro actualizado correctamente.']);
            break;

        /* --------------------------------------------------------------------
         * Borrar registro
         * ------------------------------------------------------------------ */
        case 'delete':
            $id = (int) ($in['id'] ?? 0);
            if ($id <= 0) {
                fail('Código de registro inválido.');
            }
            $stmt = $pdo->prepare('DELETE FROM `estudiantes` WHERE `Codigo` = :id');
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            if ($stmt->rowCount() === 0) {
                fail('No se encontró el registro para borrar.', 404);
            }
            respond(['ok' => true, 'message' => 'Registro borrado correctamente.']);
            break;

        default:
            fail('Acción no reconocida.');
    }
} catch (PDOException $e) {
    fail('Error de base de datos: ' . $e->getMessage(), 500);
} catch (Throwable $e) {
    fail('Error del servidor: ' . $e->getMessage(), 500);
}
