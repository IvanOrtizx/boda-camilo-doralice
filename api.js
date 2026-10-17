/* Cliente del backend (Google Apps Script) con modo demo local. */
window.BodaAPI = (function () {
  const CFG = window.BODA_CONFIG || {};
  const URL = (CFG.apiUrl || '').trim();
  const DEMO = !URL;
  const KEY = 'boda-cd-demo-v1';

  async function call(payload) {
    if (DEMO) return demo(payload);
    const r = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    if (!r.ok) throw new Error('red_' + r.status);
    return r.json();
  }

  /* ---------- modo demo: misma lógica que Code.gs, en localStorage ---------- */
  function iso(daysAgo, h) { const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(h || 10, 12, 0, 0); return d.toISOString(); }
  function seed() {
    const base = { telefono: '', mesa: '', grupo: '', creado: iso(5), enviado: '', recordado: '', recordatorios: 0, abierta_primera: '', abierta_ultima: '', aperturas: 0, respuesta: '', asistentes: 0, mensaje: '', respondido: '', origen: 'ejemplo' };
    return [
      Object.assign({}, base, { id: 'ej1abc', nombre: 'Familia Ejemplo Pérez', telefono: '573001112233', cupos: 4, grupo: 'Familia novia', enviado: iso(4), abierta_primera: iso(4, 19), abierta_ultima: iso(3, 8), aperturas: 3, respuesta: 'si', asistentes: 4, mensaje: '¡Allá estaremos! Dios bendiga su hogar.', respondido: iso(3, 8) }),
      Object.assign({}, base, { id: 'ej2abc', nombre: 'Tía Ejemplo Rosa', telefono: '573004445566', cupos: 2, grupo: 'Familia novio', enviado: iso(4), abierta_primera: iso(2, 21), abierta_ultima: iso(2, 21), aperturas: 1 }),
      Object.assign({}, base, { id: 'ej3abc', nombre: 'Ejemplo Andrés y Laura', telefono: '573007778899', cupos: 2, grupo: 'Amigos', enviado: iso(3) }),
      Object.assign({}, base, { id: 'ej4abc', nombre: 'Familia Ejemplo Gómez', telefono: '573102223344', cupos: 3, grupo: 'Iglesia' }),
      Object.assign({}, base, { id: 'ej5abc', nombre: 'Ejemplo Don Hernando', telefono: '573115556677', cupos: 1, grupo: 'Familia novio', enviado: iso(4), abierta_primera: iso(1), abierta_ultima: iso(1), aperturas: 2, respuesta: 'no', mensaje: 'Estaré de viaje, los llevo en el corazón.', respondido: iso(1) })
    ];
  }
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(s)) return s; } catch (e) { } return seed(); }
  function store(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) { } }
  function pub(o) { return { id: o.id, nombre: o.nombre, cupos: o.cupos, mesa: o.mesa, respuesta: o.respuesta, asistentes: o.asistentes, mensaje: o.mensaje }; }
  function nid() { const b = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = 'd'; for (let i = 0; i < 5; i++) s += b[Math.floor(Math.random() * b.length)]; return s; }
  function digits(t) { return String(t || '').replace(/\D/g, ''); }
  const now = () => new Date().toISOString();

  async function demo(p) {
    await new Promise(r => setTimeout(r, 250));
    const all = load();
    const find = id => all.find(g => g.id === id);
    const needPin = () => { if (String(p.pin) !== '1812') throw new Error('pin_incorrecto'); };
    try {
      switch (p.action) {
        case 'open': {
          const g = find(p.id); if (!g) return { ok: false, error: 'no_encontrado' };
          if (!p.preview) { if (!g.abierta_primera) g.abierta_primera = now(); g.abierta_ultima = now(); g.aperturas++; store(all); }
          return { ok: true, guest: pub(g) };
        }
        case 'rsvp': {
          let g = p.id ? find(p.id) : null;
          if (!g) {
            if (!String(p.nombre || '').trim()) return { ok: false, error: 'falta_nombre' };
            g = { id: nid(), nombre: String(p.nombre).trim(), telefono: digits(p.telefono), cupos: 0, grupo: 'Enlace general', mesa: '', creado: now(), enviado: '', recordado: '', recordatorios: 0, abierta_primera: now(), abierta_ultima: now(), aperturas: 1, origen: 'enlace general' };
            all.push(g);
          }
          const si = p.respuesta !== 'no';
          let n = si ? Math.max(1, Number(p.asistentes) || 1) : 0;
          if (g.cupos > 0) n = Math.min(n, g.cupos);
          Object.assign(g, { respuesta: si ? 'si' : 'no', asistentes: n, mensaje: String(p.mensaje || '').slice(0, 600), respondido: now() });
          store(all); return { ok: true, guest: pub(g) };
        }
        case 'login': needPin(); return { ok: true };
        case 'list': needPin(); return { ok: true, guests: all };
        case 'save': {
          needPin(); const x = p.guest || {};
          const d = { nombre: String(x.nombre || '').trim(), telefono: digits(x.telefono), cupos: Math.max(1, Math.min(30, Number(x.cupos) || 1)), grupo: x.grupo || '', mesa: x.mesa || '' };
          if (!d.nombre) return { ok: false, error: 'falta_nombre' };
          let g = x.id ? find(x.id) : null;
          if (g) Object.assign(g, d);
          else { g = Object.assign({ id: nid(), creado: now(), enviado: '', recordado: '', recordatorios: 0, abierta_primera: '', abierta_ultima: '', aperturas: 0, respuesta: '', asistentes: 0, mensaje: '', respondido: '', origen: 'panel' }, d); all.push(g); }
          store(all); return { ok: true, guest: g };
        }
        case 'bulk': {
          needPin(); const out = [];
          (p.guests || []).forEach(x => {
            const d = { nombre: String(x.nombre || '').trim(), telefono: digits(x.telefono), cupos: Math.max(1, Math.min(30, Number(x.cupos) || 1)), grupo: x.grupo || '', mesa: '' };
            if (!d.nombre) return;
            const g = Object.assign({ id: nid(), creado: now(), enviado: '', recordado: '', recordatorios: 0, abierta_primera: '', abierta_ultima: '', aperturas: 0, respuesta: '', asistentes: 0, mensaje: '', respondido: '', origen: 'panel' }, d);
            all.push(g); out.push(g);
          });
          store(all); return { ok: true, guests: out };
        }
        case 'delete': { needPin(); const i = all.findIndex(g => g.id === p.id); if (i < 0) return { ok: false, error: 'no_encontrado' }; all.splice(i, 1); store(all); return { ok: true }; }
        case 'mark': {
          needPin(); const g = find(p.id); if (!g) return { ok: false, error: 'no_encontrado' };
          if (p.what === 'enviado') g.enviado = now();
          else if (p.what === 'recordado') { g.recordado = now(); g.recordatorios = (g.recordatorios || 0) + 1; }
          else if (p.what === 'reiniciar') { g.respuesta = ''; g.asistentes = 0; g.respondido = ''; }
          store(all); return { ok: true, guest: g };
        }
      }
      return { ok: false, error: 'accion_desconocida' };
    } catch (e) { return { ok: false, error: e.message }; }
  }

  return { call, demo: DEMO, resetDemo: () => { try { localStorage.removeItem(KEY); } catch (e) { } } };
})();
