/* =====================================================================
 * CRUD de estudiantes - Corte 3
 * Tabla: estudiantes (Educar.sql). El campo Foto queda excluido.
 * ===================================================================== */

const FIELDS = [
    { key: 'Nombre1',      label: 'Nombre 1',              type: 'text' },
    { key: 'Nombre2',      label: 'Nombre 2',              type: 'text' },
    { key: 'Apellido1',    label: 'Apellido 1',            type: 'text' },
    { key: 'Apellido2',    label: 'Apellido 2',            type: 'text' },
    { key: 'TipoSangre',   label: 'Tipo de sangre',        type: 'list', catalog: 'TipoSangre' },
    { key: 'Altura',       label: 'Altura (m)',            type: 'number', step: '0.01' },
    { key: 'Peso',         label: 'Peso (kg)',             type: 'number', step: '1' },
    { key: 'ColorOjos',    label: 'Color de ojos',         type: 'list', catalog: 'ColorOjos' },
    { key: 'FechaNace',    label: 'Fecha de nacimiento',   type: 'date' },
    { key: 'ColorPrefiere',label: 'Color preferido',       type: 'list', catalog: 'ColorPrefiere' },
    { key: 'Profesion',    label: 'Profesión',             type: 'list', catalog: 'Profesion' },
    { key: 'Nacionalidad', label: 'Nacionalidad',          type: 'list', catalog: 'Nacionalidad' },
    { key: 'Correo',       label: 'Correo electrónico',    type: 'text' },
    { key: 'URL',          label: 'Página WEB (URL)',      type: 'text' },
    { key: 'Celular',      label: 'Celular',               type: 'text' },
    { key: 'EstadoCivil',  label: 'Estado civil',          type: 'list', catalog: 'EstadoCivil' },
    { key: 'CiudadTrabaja',label: 'Ciudad donde trabaja',  type: 'list', catalog: 'CiudadTrabaja' },
    { key: 'Observacion',  label: 'Observación',           type: 'html' },
];

const SEARCH_FIELDS = [
    { key: 'Codigo', label: 'Código', type: 'number', step: '1' },
    ...FIELDS,
];

const OPERATORS = [
    { v: '>',  t: '&gt;' },
    { v: '<',  t: '&lt;' },
    { v: '>=', t: '&gt;=' },
    { v: '<=', t: '&lt;=' },
    { v: '=',  t: '=' },
    { v: '!=', t: '!=' },
];

const GRID_COLUMNS = [
    { key: 'Codigo', label: 'Código', cls: 'cell-center' },
    { key: 'Nombre', label: 'Nombre1 Nombre2 Apellido1 Apellido2', cls: 'cell-name' },
    { key: 'Altura', label: 'Altura', cls: 'cell-num' },
    { key: 'Peso',   label: 'Peso', cls: 'cell-num' },
    { key: 'IMC',    label: 'IMC', cls: 'cell-num' },
    { key: 'Edad',   label: 'Edad', cls: 'cell-center' },
];

let catalogs = {};
const state = {
    page: 1,
    pageSize: 10,
    sort: 'Codigo',
    dir: 'ASC',
    filters: [],
    formOrigin: 'grid',
    original: null,
    editId: null,
};

const app = document.getElementById('app');

/* ---------------------------- Utilidades ----------------------------- */

function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}

function isBlank(value) {
    return value === null || value === undefined || String(value).trim() === '';
}

function plainText(value) {
    return String(value === null || value === undefined ? '' : value)
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function toast(message, type = 'success') {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.className = 'toast show ' + type;
    window.setTimeout(() => { el.className = 'toast'; }, 4000);
}

async function api(action, payload = {}) {
    let response;
    try {
        response = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.assign({ action }, payload)),
        });
    } catch (e) {
        throw new Error('No se pudo conectar con el servidor.');
    }
    let data;
    try {
        data = await response.json();
    } catch (e) {
        throw new Error('El servidor devolvió una respuesta inválida (HTTP ' + response.status + ').');
    }
    if (!data.ok) throw new Error(data.error || 'Error desconocido en el servidor.');
    return data;
}

function guard(fn) {
    return function (event) {
        if (event) event.preventDefault();
        Promise.resolve(fn(event)).catch(err => toast(err.message, 'error'));
    };
}

/* ------------------------------ Inicio ------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    guard(async () => {
        catalogs = (await api('catalogs')).catalogs;
        await renderGrid();
    })();
});

/* ------------------------------- GRID -------------------------------- */

async function renderGrid() {
    const data = await api('list', {
        page: state.page,
        pageSize: state.pageSize,
        sort: state.sort,
        dir: state.dir,
        filters: state.filters,
    });
    state.page = data.page;
    state.pages = data.pages;

    const hasFilters = state.filters.length > 0;
    const headers = GRID_COLUMNS.map(col => {
        const active = state.sort === col.key;
        const indicator = active ? (state.dir === 'ASC' ? '▲' : '▼') : '↕';
        return '<th class="' + col.cls + '"><a href="#" class="sort-link" data-sort="' + col.key + '">' +
            esc(col.label) + ' <span class="sort-indicator' + (active ? '' : ' off') + '">' + indicator + '</span></a></th>';
    }).join('');

    const rows = data.rows.map(r => {
        const nombre = [r.Nombre1, r.Nombre2, r.Apellido1, r.Apellido2].filter(v => v).join(' ');
        const altura = isBlank(r.Altura) ? '—' : Number(r.Altura).toFixed(2);
        const peso = isBlank(r.Peso) ? '—' : esc(r.Peso);
        const imc = isBlank(r.IMC) ? '—' : Number(r.IMC).toFixed(2);
        const menor = (r.Edad !== null && Number(r.Edad) < 18);
        const edadClase = menor ? 'age-minor' : 'age-adult';
        const edadTexto = isBlank(r.Edad) ? '—' : esc(r.Edad);
        return '<tr>' +
            '<td class="cell-center">' + esc(r.Codigo) + '</td>' +
            '<td class="cell-name">' + esc(nombre) + '</td>' +
            '<td class="cell-num">' + altura + '</td>' +
            '<td class="cell-num">' + peso + '</td>' +
            '<td class="cell-num imc-value">' + imc + '</td>' +
            '<td class="cell-center"><span class="' + edadClase + '">' + edadTexto + '</span></td>' +
            '<td class="cell-center"><button type="button" class="btn btn-secondary btn-sm" data-detail="' + esc(r.Codigo) + '">Detalle</button></td>' +
            '</tr>';
    }).join('');

    const banner = hasFilters
        ? '<div class="filter-banner"><span><strong>Consulta activa:</strong> ' + state.filters.length +
          ' criterio(s) aplicado(s) con lógica AND. Se muestran ' + data.total + ' resultado(s).</span>' +
          '<button type="button" class="btn btn-secondary btn-sm" id="btn-clear-filter">Cancelar consulta</button></div>'
        : '';

    app.innerHTML =
        '<div class="card">' +
            '<div class="toolbar">' +
                '<h2>Listado de estudiantes <span class="hint">(' + data.total + ' registros)</span></h2>' +
                '<button type="button" class="btn btn-primary" id="btn-add">+ Adicionar registro</button>' +
                '<button type="button" class="btn btn-secondary" id="btn-search">Buscar</button>' +
                '<button type="button" class="btn btn-secondary" id="btn-reload">Recargar</button>' +
            '</div>' +
            banner +
            '<div class="table-responsive">' +
                '<table class="grid"><thead><tr>' + headers +
                    '<th class="cell-center">Acciones</th></tr></thead>' +
                    '<tbody>' + (rows || '<tr><td colspan="7" class="empty">No hay registros para mostrar.</td></tr>') + '</tbody>' +
                '</table>' +
            '</div>' +
            paginationHtml(data) +
        '</div>';

    document.getElementById('btn-add').addEventListener('click', guard(() => showForm('add')));
    document.getElementById('btn-search').addEventListener('click', guard(() => showForm('search')));
    document.getElementById('btn-reload').addEventListener('click', guard(async () => {
        state.page = 1;
        await renderGrid();
    }));

    const clearBtn = document.getElementById('btn-clear-filter');
    if (clearBtn) {
        clearBtn.addEventListener('click', guard(async () => {
            state.filters = [];
            state.page = 1;
            await renderGrid();
            toast('Consulta cancelada. Se muestran todos los registros.');
        }));
    }

    app.querySelectorAll('.sort-link').forEach(link => {
        link.addEventListener('click', guard(async () => {
            const field = link.getAttribute('data-sort');
            if (state.sort === field) {
                state.dir = (state.dir === 'ASC') ? 'DESC' : 'ASC';
            } else {
                state.sort = field;
                state.dir = 'ASC';
            }
            state.page = 1;
            await renderGrid();
        }));
    });

    app.querySelectorAll('[data-detail]').forEach(btn => {
        btn.addEventListener('click', guard(() => showDetail(btn.getAttribute('data-detail'))));
    });

    app.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', guard(async () => {
            state.page = Number(btn.getAttribute('data-page'));
            await renderGrid();
        }));
    });

    app.querySelectorAll('[data-nav]').forEach(btn => {
        btn.addEventListener('click', guard(async () => {
            const nav = btn.getAttribute('data-nav');
            if (nav === 'first') state.page = 1;
            if (nav === 'prev') state.page = Math.max(1, state.page - 1);
            if (nav === 'next') state.page = Math.min(state.pages, state.page + 1);
            if (nav === 'last') state.page = state.pages;
            await renderGrid();
        }));
    });

    const pageSize = document.getElementById('page-size');
    pageSize.addEventListener('change', guard(async () => {
        state.pageSize = Number(pageSize.value);
        state.page = 1;
        await renderGrid();
    }));
}

function paginationHtml(data) {
    const pages = data.pages;
    const current = data.page;
    let numbers = [];
    if (pages <= 9) {
        for (let i = 1; i <= pages; i++) numbers.push(i);
    } else {
        let start = Math.max(1, current - 3);
        let end = Math.min(pages, current + 3);
        if (start === 1) end = Math.min(pages, 7);
        if (end === pages) start = Math.max(1, pages - 6);
        for (let i = start; i <= end; i++) numbers.push(i);
    }

    const buttons = numbers.map(i =>
        '<button type="button" class="page-btn' + (i === current ? ' active' : '') +
        '" data-page="' + i + '">' + i + '</button>'
    ).join('');

    const from = data.total === 0 ? 0 : (current - 1) * data.pageSize + 1;
    const to = Math.min(current * data.pageSize, data.total);

    return '<div class="pagination">' +
        '<span class="page-info">Mostrando ' + from + '–' + to + ' de ' + data.total +
        ' &nbsp;|&nbsp; Página ' + current + ' de ' + pages + '</span>' +
        '<label class="page-size-label">Filas por página' +
            '<select id="page-size">' +
                [5, 10, 20, 50, 100].map(n => '<option value="' + n + '"' + (n === data.pageSize ? ' selected' : '') + '>' + n + '</option>').join('') +
            '</select>' +
        '</label>' +
        '<button type="button" class="page-btn" data-nav="first"' + (current === 1 ? ' disabled' : '') + '>«</button>' +
        '<button type="button" class="page-btn" data-nav="prev"' + (current === 1 ? ' disabled' : '') + '>‹</button>' +
        buttons +
        '<button type="button" class="page-btn" data-nav="next"' + (current === pages ? ' disabled' : '') + '>›</button>' +
        '<button type="button" class="page-btn" data-nav="last"' + (current === pages ? ' disabled' : '') + '>»</button>' +
        '</div>';
}

/* -------------------------- Formularios ------------------------------ */

function optionsHtml(field, selected) {
    const list = catalogs[field.catalog] || [];
    const current = (selected === null || selected === undefined) ? '' : String(selected);
    let html = '<option value="">Seleccione…</option>';
    list.forEach(item => {
        const value = String(item.value);
        html += '<option value="' + esc(value) + '"' + (value === current ? ' selected' : '') + '>' + esc(item.label) + '</option>';
    });
    return html;
}

function operatorHtml(key) {
    return '<select id="op_' + key + '" class="op-select">' +
        OPERATORS.map(o => '<option value="' + esc(o.v) + '">' + o.t + '</option>').join('') +
        '</select>';
}

function fieldHtml(field, mode, record) {
    const isSearch = (mode === 'search');
    const key = field.key;
    const value = record ? record[key] : null;
    let control;

    if (field.type === 'list') {
        control = '<select id="f_' + key + '" class="select2-field" data-key="' + key + '">' + optionsHtml(field, value) + '</select>';
    } else if (field.type === 'html' && !isSearch) {
        control = '<textarea id="f_' + key + '" data-key="' + key + '">' + esc(value) + '</textarea>';
    } else if (isSearch && (field.type === 'number' || field.type === 'date')) {
        const placeholder = field.type === 'date' ? 'AAAA-MM-DD' : 'Valor, ej. 72';
        control = '<div class="field-with-op">' + operatorHtml(key) +
            '<input type="' + (field.type === 'date' ? 'date' : 'number') + '" id="f_' + key +
            '" data-key="' + key + '" placeholder="' + placeholder + '"' +
            (field.step ? ' step="' + field.step + '"' : '') + '></div>';
    } else {
        const type = (field.type === 'number') ? 'number' : (field.type === 'date' ? 'date' : 'text');
        const placeholder = isSearch ? 'Patrón, ej. le%  o  %em%' : '';
        const step = field.step ? ' step="' + field.step + '"' : '';
        control = '<input type="' + type + '" id="f_' + key + '" data-key="' + key +
            '" value="' + esc(value === null ? '' : value) + '" placeholder="' + placeholder + '"' + step + '>';
    }

    const hint = isSearch
        ? (field.type === 'text' || field.type === 'html'
            ? ' patrón LIKE (ej. <em>le%</em>)'
            : ' se combina con AND')
        : (field.type === 'html' ? ' editor enriquecido' : '');

    return '<div class="form-group' + (field.type === 'html' && !isSearch ? ' full' : '') + '">' +
        '<label for="f_' + key + '">' + esc(field.label) + '<span class="hint"> ' + hint + '</span></label>' +
        control +
        '</div>';
}

function showForm(mode, record) {
    const isSearch = (mode === 'search');
    const fields = isSearch ? SEARCH_FIELDS : FIELDS;
    const title = isSearch ? 'Buscar registros'
        : (mode === 'add' ? 'Adicionar registro' : 'Editar registro #' + record.Codigo);

    state.formOrigin = (mode === 'edit' && app.querySelector('.detail-view')) ? 'detail' : 'grid';
    state.original = (mode === 'edit') ? record : null;
    state.editId = (mode === 'edit') ? record.Codigo : null;

    app.innerHTML =
        '<div class="card">' +
            '<div class="toolbar"><h2>' + esc(title) + '</h2>' +
                '<button type="button" class="btn btn-secondary" id="btn-form-cancel">' +
                    (isSearch ? 'Cancelar consulta' : 'Cancelar') + '</button>' +
            '</div>' +
            (isSearch
                ? '<p class="hint" style="margin-top:-8px">Complete solo los campos deseados. ' +
                  'Los campos de texto admiten patrones SQL (<em>%</em> = cualquier texto, <em>_</em> = un carácter). ' +
                  'Fechas y números usan el operador previo. Los campos de lista buscan el valor exacto. ' +
                  'Todos los criterios se combinan con AND.</p>'
                : '') +
            '<form id="form"><div class="form-grid">' +
                fields.map(f => fieldHtml(f, mode, record)).join('') +
            '</div><div class="form-actions">' +
                '<button type="submit" class="btn btn-primary">' + (isSearch ? 'Buscar' : 'Guardar') + '</button>' +
                '<button type="button" class="btn btn-secondary" id="btn-form-cancel2">Cancelar</button>' +
            '</div></form>' +
        '</div>';

    // Select2 en todos los campos que traen datos de otras tablas.
    $('.select2-field').select2({
        width: '100%',
        placeholder: 'Seleccione…',
        allowClear: true,
    });

    // Trumbowyg en el campo observación (no un textarea HTML5).
    if (!isSearch) {
        $('#f_Observacion').trumbowyg({
            btns: [
                ['viewHTML'], ['formatting'], ['strong', 'em', 'del'],
                ['unorderedList', 'orderedList'], ['link'], ['removeformat']
            ],
            autogrow: true,
        });
        if (record && !isBlank(record.Observacion)) {
            $('#f_Observacion').trumbowyg('html', record.Observacion);
        }
    }

    document.getElementById('btn-form-cancel').addEventListener('click', guard(cancelForm));
    document.getElementById('btn-form-cancel2').addEventListener('click', guard(cancelForm));
    document.getElementById('form').addEventListener('submit', guard(async () => {
        if (isSearch) {
            await submitSearch();
        } else if (mode === 'add') {
            await submitCreate();
        } else {
            await submitUpdate();
        }
    }));
}

function cancelForm() {
    if (state.formOrigin === 'detail' && state.editId) {
        return showDetail(state.editId);
    }
    return renderGrid();
}

function collectValues(fields, mode) {
    const values = {};
    fields.forEach(field => {
        const key = field.key;
        if (field.type === 'html' && mode !== 'search') {
            values[key] = $('#f_' + key).trumbowyg('html');
            return;
        }
        const $el = $('#f_' + key);
        let value = $el.val();
        value = (value === null || value === undefined) ? '' : String(value);
        values[key] = value;
    });
    return values;
}

function submitCreate() {
    return guard(async () => {
        const values = collectValues(FIELDS, 'add');
        await api('create', values);
        state.page = 1;
        state.filters = [];
        await renderGrid();
        toast('Registro adicionado correctamente.');
    })();
}

function equalValue(newValue, oldValue, type) {
    if (isBlank(newValue) && isBlank(oldValue)) return true;
    if (type === 'number' || type === 'list') return Number(newValue) === Number(oldValue);
    if (type === 'html') return plainText(newValue) === plainText(oldValue);
    return String(newValue === null || newValue === undefined ? '' : newValue) ===
           String(oldValue === null || oldValue === undefined ? '' : oldValue);
}

function submitUpdate() {
    return guard(async () => {
        const values = collectValues(FIELDS, 'edit');
        const changes = {};
        FIELDS.forEach(field => {
            if (!equalValue(values[field.key], state.original[field.key], field.type)) {
                changes[field.key] = values[field.key];
            }
        });
        const result = await api('update', { Codigo: state.editId, changes });
        await showDetail(state.editId);
        toast(result.message + (result.changed === 0 ? ' (no hubo cambios).' : ''));
    })();
}

function submitSearch() {
    return guard(async () => {
        const values = collectValues(SEARCH_FIELDS, 'search');
        const filters = [];
        SEARCH_FIELDS.forEach(field => {
            const value = values[field.key];
            if (isBlank(value)) return;
            const op = (field.type === 'number' || field.type === 'date')
                ? $('#op_' + field.key).val()
                : 'LIKE';
            filters.push({ field: field.key, op, value });
        });
        state.filters = filters;
        state.page = 1;
        await renderGrid();
        toast(filters.length
            ? 'Búsqueda aplicada: ' + filters.length + ' criterio(s).'
            : 'Sin criterios: se muestran todos los registros.');
    })();
}

/* ------------------------------ Detalle ------------------------------ */

function detailItem(label, value, options = {}) {
    const cls = options.red ? ' red' : '';
    const content = options.html ? value : esc(value === null || value === undefined || value === '' ? '—' : value);
    return '<div class="detail-item' + (options.full ? ' full' : '') + '">' +
        '<span class="label">' + esc(label) + ':</span>' +
        '<span class="value' + cls + '">' + content + '</span></div>';
}

async function showDetail(id) {
    const data = await api('detail', { id });
    const r = data.record;
    const nombre = [r.Nombre1, r.Nombre2, r.Apellido1, r.Apellido2].filter(v => v).join(' ');
    const edad = isBlank(r.Edad) ? '—' : r.Edad + ' año(s)';
    const menor = (r.Edad !== null && Number(r.Edad) < 18);
    const imc = isBlank(r.IMC) ? '—' : Number(r.IMC).toFixed(2);

    app.innerHTML =
        '<div class="card detail-view">' +
            '<div class="toolbar">' +
                '<h2>Detalle del estudiante #' + esc(r.Codigo) + '</h2>' +
                '<span class="spacer"></span>' +
                '<button type="button" class="btn btn-secondary" id="btn-back">Volver al GRID</button>' +
                '<button type="button" class="btn btn-primary" id="btn-edit">Editar registro</button>' +
                '<button type="button" class="btn btn-danger" id="btn-delete">Borrar registro</button>' +
            '</div>' +

            '<div class="section-title">Datos personales</div>' +
            '<div class="detail-grid">' +
                detailItem('Código', r.Codigo) +
                detailItem('Nombre completo', nombre) +
                detailItem('Nombre1', r.Nombre1) +
                detailItem('Nombre2', r.Nombre2) +
                detailItem('Apellido1', r.Apellido1) +
                detailItem('Apellido2', r.Apellido2) +
                detailItem('Fecha de nacimiento', r.FechaNace) +
                detailItem('Edad', edad, { red: menor }) +
                detailItem('Tipo de sangre', r.TipoSangreDesc) +
                detailItem('Estado civil', r.EstadoCivilDesc) +
                detailItem('Nacionalidad', r.NacionalidadDesc) +
                detailItem('Profesión', r.ProfesionDesc) +
            '</div>' +

            '<div class="section-title">Datos físicos y contacto</div>' +
            '<div class="detail-grid">' +
                detailItem('Altura', isBlank(r.Altura) ? '—' : Number(r.Altura).toFixed(2) + ' m') +
                detailItem('Peso', isBlank(r.Peso) ? '—' : r.Peso + ' kg') +
                detailItem('Índice de Masa Corporal (IMC)', imc) +
                detailItem('Color de ojos', r.ColorOjosDesc) +
                detailItem('Color preferido', r.ColorPrefiereDesc) +
                detailItem('Ciudad donde trabaja', r.CiudadTrabajaDesc) +
                detailItem('Correo electrónico', r.Correo) +
                detailItem('Página WEB (URL)', r.URL) +
                detailItem('Celular', r.Celular) +
            '</div>' +

            '<div class="section-title">Observación</div>' +
            '<div class="detail-grid">' +
                detailItem('Observación', isBlank(r.Observacion) ? '—' : r.Observacion, { full: true, html: true }) +
            '</div>' +
        '</div>';

    document.getElementById('btn-back').addEventListener('click', guard(() => renderGrid()));
    document.getElementById('btn-edit').addEventListener('click', guard(() => showForm('edit', r)));
    document.getElementById('btn-delete').addEventListener('click', guard(async () => {
        if (!window.confirm('¿Está seguro de borrar el registro #' + r.Codigo + '?\nEsta acción no se puede deshacer.')) {
            return;
        }
        await api('delete', { id: r.Codigo });
        await renderGrid();
        toast('Registro borrado correctamente.');
    }));
}
