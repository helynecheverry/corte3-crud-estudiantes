/* Backend simulado en el navegador para la versión estática de GitHub Pages.
 * Usa los datos reales extraídos de Educar.sql y reproduce las acciones de api.php. */
(function () {
    'use strict';

    const DATA = window.DEMO_DATA;
    const TEXT = ['Nombre1', 'Nombre2', 'Apellido1', 'Apellido2', 'Correo', 'URL', 'Celular', 'Observacion'];
    const NUM = ['Codigo', 'Altura', 'Peso'];
    const DATE = ['FechaNace'];
    const LIST = ['TipoSangre', 'ColorOjos', 'ColorPrefiere', 'Profesion', 'Nacionalidad', 'EstadoCivil', 'CiudadTrabaja'];
    const CATALOG_TABLE = {
        TipoSangre: 'tiposangre', ColorOjos: 'colores', ColorPrefiere: 'colores',
        Profesion: 'profesiones', Nacionalidad: 'paises', EstadoCivil: 'estadocivil',
        CiudadTrabaja: 'ciudades'
    };
    const DESC_FIELD = {
        TipoSangre: 'TipoSangreDesc', ColorOjos: 'ColorOjosDesc', ColorPrefiere: 'ColorPrefiereDesc',
        Profesion: 'ProfesionDesc', Nacionalidad: 'NacionalidadDesc',
        EstadoCivil: 'EstadoCivilDesc', CiudadTrabaja: 'CiudadTrabajaDesc'
    };

    function catalog(field) {
        const table = DATA[CATALOG_TABLE[field]] || [];
        return table.map(r => ({ value: r.codigo, label: r.nombre }))
                    .sort((a, b) => String(a.label).localeCompare(String(b.label), 'es'));
    }

    function desc(field, code) {
        if (code === null || code === undefined || code === '') return null;
        const item = (DATA[CATALOG_TABLE[field]] || []).find(r => Number(r.codigo) === Number(code));
        return item ? item.nombre : null;
    }

    function age(dateStr) {
        if (!dateStr) return null;
        const parts = String(dateStr).split('-').map(Number);
        if (parts.length !== 3) return null;
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        if (isNaN(d.getTime())) return null;
        const now = new Date();
        let a = now.getFullYear() - d.getFullYear();
        const m = now.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
        return a;
    }

    function imc(row) {
        if (!row.Altura || !row.Peso) return null;
        return Math.round((row.Peso / (row.Altura * row.Altura)) * 100) / 100;
    }

    function decorate(row) {
        const r = Object.assign({}, row);
        r.IMC = imc(r);
        r.Edad = age(r.FechaNace);
        return r;
    }

    function normalize(field, value) {
        if (value === null || value === undefined) return null;
        const s = String(value).trim();
        if (TEXT.includes(field)) return s === '' ? null : s;
        if (NUM.includes(field)) {
            if (s === '') return null;
            const n = Number(s);
            return isNaN(n) ? null : (field === 'Altura' ? n : Math.trunc(n));
        }
        if (DATE.includes(field)) return s === '' ? null : s;
        if (LIST.includes(field)) return (s === '' || s === '0') ? null : Math.trunc(Number(s));
        return s;
    }

    function patternToRegex(pattern) {
        let out = '^';
        for (const ch of String(pattern)) {
            if (ch === '%') out += '[\\s\\S]*';
            else if (ch === '_') out += '[\\s\\S]';
            else out += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
        return new RegExp(out + '$', 'i');
    }

    function handle(p) {
        const action = p.action;
        if (action === 'catalogs') {
            const out = {};
            Object.keys(CATALOG_TABLE).forEach(f => { out[f] = catalog(f); });
            return { ok: true, catalogs: out };
        }

        if (action === 'list') {
            let list = DATA.estudiantes.map(decorate);
            (p.filters || []).forEach(f => {
                if (!f || !f.value) return;
                const value = String(f.value);
                if (TEXT.includes(f.field)) {
                    const rx = patternToRegex(value);
                    list = list.filter(r => rx.test(r[f.field] == null ? '' : String(r[f.field])));
                } else if (NUM.includes(f.field) || DATE.includes(f.field)) {
                    list = list.filter(r => {
                        const x = r[f.field];
                        if (x === null || x === undefined) return false;
                        const y = NUM.includes(f.field) ? Number(value) : value;
                        switch (f.op) {
                            case '>': return x > y;
                            case '<': return x < y;
                            case '>=': return x >= y;
                            case '<=': return x <= y;
                            case '=': return x == y;
                            case '!=': return x != y;
                            default: return false;
                        }
                    });
                } else if (LIST.includes(f.field)) {
                    list = list.filter(r => Number(r[f.field]) === Number(value));
                }
            });
            const sort = p.sort || 'Codigo';
            const dir = p.dir === 'DESC' ? -1 : 1;
            const accessor = {
                Codigo: r => r.Codigo,
                Nombre: r => [r.Nombre1, r.Nombre2, r.Apellido1, r.Apellido2].filter(Boolean).join(' '),
                Altura: r => r.Altura,
                Peso: r => r.Peso,
                IMC: r => r.IMC,
                Edad: r => r.Edad
            }[sort] || (r => r.Codigo);
            list.sort((a, b) => {
                const x = accessor(a), y = accessor(b);
                if (x === null || x === undefined) return 1;
                if (y === null || y === undefined) return -1;
                if (typeof x === 'string') return x.localeCompare(y, 'es') * dir;
                return ((x > y) - (x < y)) * dir;
            });
            const total = list.length;
            const pageSize = [5, 10, 20, 50, 100].includes(Number(p.pageSize)) ? Number(p.pageSize) : 10;
            const pages = Math.max(1, Math.ceil(total / pageSize));
            const page = Math.min(Math.max(1, Number(p.page) || 1), pages);
            return {
                ok: true,
                rows: list.slice((page - 1) * pageSize, page * pageSize),
                total, pages, page, pageSize, sort, dir: dir === 1 ? 'ASC' : 'DESC'
            };
        }

        if (action === 'detail') {
            const row = DATA.estudiantes.find(r => Number(r.Codigo) === Number(p.id));
            if (!row) return { ok: false, error: 'No se encontró el registro solicitado.' };
            const out = decorate(row);
            Object.keys(DESC_FIELD).forEach(f => { out[DESC_FIELD[f]] = desc(f, row[f]); });
            return { ok: true, record: out };
        }

        if (action === 'create') {
            const row = {};
            Object.keys(p).forEach(k => {
                if (k !== 'action') row[k] = normalize(k, p[k]);
            });
            row.Codigo = Math.max.apply(null, DATA.estudiantes.map(r => Number(r.Codigo) || 0)) + 1;
            DATA.estudiantes.push(row);
            return { ok: true, id: row.Codigo, message: 'Registro adicionado correctamente.' };
        }

        if (action === 'update') {
            const row = DATA.estudiantes.find(r => Number(r.Codigo) === Number(p.Codigo));
            if (!row) return { ok: false, error: 'No se encontró el registro.' };
            let changed = 0;
            Object.keys(p.changes || {}).forEach(k => {
                row[k] = normalize(k, p.changes[k]);
                changed++;
            });
            return { ok: true, changed, message: 'Registro actualizado correctamente.' };
        }

        if (action === 'delete') {
            const idx = DATA.estudiantes.findIndex(r => Number(r.Codigo) === Number(p.id));
            if (idx < 0) return { ok: false, error: 'No se encontró el registro.' };
            DATA.estudiantes.splice(idx, 1);
            return { ok: true, message: 'Registro borrado correctamente.' };
        }

        return { ok: false, error: 'Acción no reconocida.' };
    }

    const nativeFetch = window.fetch.bind(window);
    window.fetch = function (url, options) {
        if (String(url).indexOf('api.php') === -1) return nativeFetch(url, options);
        let payload = {};
        try { payload = JSON.parse((options && options.body) || '{}'); } catch (e) { payload = {}; }
        let result;
        try { result = handle(payload); } catch (e) { result = { ok: false, error: e.message }; }
        return Promise.resolve({
            ok: result.ok !== false,
            status: result.ok === false ? 400 : 200,
            json: function () { return Promise.resolve(result); }
        });
    };
})();
