# CRUD de Estudiantes — Educar (Corte 3)

Aplicación web completa (PHP + HTML5 + CSS3 + JavaScript) sobre la tabla `estudiantes` del script `Educar.sql`.
El campo `Foto` queda **excluido** del CRUD, tal como pide la consigna.

## Requisitos

- PHP 7.4 o superior con extensión `pdo_mysql`.
- MySQL / MariaDB.
- Servidor web (Apache, Nginx o el servidor interno de PHP).

## Instalación

1. Crear la base de datos:

   ```sql
   CREATE DATABASE educar CHARACTER SET utf8 COLLATE utf8_general_ci;
   ```

2. Importar el script incluido:

   ```bash
   mysql -u root -p educar < sql/Educar.sql
   ```

   (También se puede importar desde phpMyAdmin.)

3. Ajustar los datos de conexión en `config.php` (host, puerto, base de datos, usuario y contraseña).
   También se pueden usar las variables de entorno `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASS`.

4. Copiar esta carpeta dentro del directorio publicado del servidor (por ejemplo `htdocs/crud-estudiantes/`).

5. Abrir `index.html` en el navegador. Opcionalmente, levantar el servidor interno:

   ```bash
   php -S localhost:8000
   ```

   y visitar `http://localhost:8000/index.html`.

> Las librerías Select2, Trumbowyg y jQuery están incluidas en `assets/vendor/`, por lo que la
> aplicación funciona sin conexión a Internet (no depende de CDNs).

## Estructura

```
index.html              Interfaz (GRID, formularios y detalle)
api.php                 Backend: list / detail / create / update / delete / catalogs
config.php              Configuración de la conexión PDO
assets/css/style.css    Estilos
assets/js/app.js        Lógica del cliente (paginación, orden, búsqueda, formularios)
assets/vendor/          jQuery, Select2 y Trumbowyg (copias locales)
sql/Educar.sql          Script original de la base de datos
```

## Cobertura de la consigna

| Punto | Porcentaje | Implementación |
|---|---|---|
| GRID con paginación y campos pedidos (nombre compuesto, altura, peso, IMC, edad en rojo si es menor) | 5% | `renderGrid()` + `api.php` action `list` (columnas ordenables y paginador). |
| Orden ascendente/descendente de esos campos | 10% | Cabeceras con `data-sort`; `SORT_EXPR` incluye IMC y Edad calculados. |
| Botón Adicionar con Select2 y Trumbowyg | 15% | `showForm('add')`; 7 campos foráneos con Select2 y Observación con Trumbowyg. |
| Botón Detalle por registro con descripciones foráneas | 5% | `showDetail()` + action `detail` con `LEFT JOIN` a las 6 tablas foráneas. |
| Detalle con Volver / Editar / Borrar (con confirmación) | 25% | Botones en la vista de detalle; `update` solo envía los campos cambiados. |
| Buscar por cualquier campo (patrones, operadores y lógica AND) + cancelar consulta | 40% | `showForm('search')` + filtros validados en `api.php`; banner con «Cancelar consulta». |

## Aplicación publicada (enlace de hospedaje)

**https://helynecheverry.github.io/corte3-crud-estudiantes/**

Ese enlace abre una versión funcional con los 1.331 registros reales extraídos de `Educar.sql`.
Incluye GRID paginado, orden ASC/DESC, adición, detalle, edición, borrado y búsqueda avanzada.
El archivo ZIP sigue conteniendo la versión PHP original (Apache + MySQL) solicitada en la guía.

## Despliegue rápido (Render, plan gratuito)

El repositorio de la aplicación es:
https://github.com/helynecheverry/corte3-crud-estudiantes

Despliegue en un clic (requiere iniciar sesión en Render con GitHub):
https://render.com/deploy?repo=https://github.com/helynecheverry/corte3-crud-estudiantes

El archivo `render.yaml` crea el servicio web y el `Dockerfile` levanta Apache + PHP + MariaDB
e importa automáticamente `sql/Educar.sql`. Después del despliegue, Render asigna una URL
pública (normalmente `https://corte3-crud-estudiantes.onrender.com`).

## Notas para la entrega

- Para el enlace de hospedaje se puede usar cualquier servicio gratuito con PHP y MySQL
  (por ejemplo InfinityFree, 000webhost o Render).
- Según la consigna, el trabajo escrito en Word debe incluir carátula, tabla de contenido,
  numeración de páginas, tamaño A3, los modelos de IA utilizados y las capturas de los prompts.
