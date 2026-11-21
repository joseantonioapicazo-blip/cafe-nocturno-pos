#!/usr/bin/env node
/* ============================================================
   Café Nocturno — servidor local (LAN) para meseros
   ------------------------------------------------------------
   Sin dependencias: solo Node.js (14 o superior).

   Uso:
     node server.js

   Sirve el punto de venta, la app móvil de meseros y una API
   sencilla que sincroniza las órdenes en la misma red Wi-Fi.
   ============================================================ */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(ROOT, '.data');
const STATE_FILE = path.join(DATA_DIR, 'meseros.json');
const STATUSES = ['nueva', 'en_caja', 'cobrada', 'cancelada'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

/* ---------------- estado en disco ---------------- */

function randomCode() {
  const alphabet = 'ACDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  let out = '';
  for (let i = 0; i < 6; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function uniqueCode(taken) {
  let code = randomCode();
  let guard = 0;
  while (taken.indexOf(code) >= 0 && guard++ < 50) code = randomCode();
  return code;
}

function seedState() {
  const names = ['Ana', 'Diego', 'Sofía'];
  const taken = [];
  const meseros = names.map(function (name, i) {
    const code = uniqueCode(taken);
    taken.push(code);
    return {
      id: 'w' + (i + 1),
      name: name,
      code: code,
      createdAt: new Date().toISOString()
    };
  });
  return { folio: 1, meseros: meseros, ordenes: [] };
}

let state = null;

function loadState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.meseros) || !Array.isArray(parsed.ordenes)) throw new Error('formato');
    parsed.folio = Number(parsed.folio) || parsed.ordenes.length + 1;
    return parsed;
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('  Aviso: estado ilegible, se reinicia. (' + err.message + ')');
    const fresh = seedState();
    try { persist(fresh); } catch (e) { /* sin permiso de escritura: se queda en memoria */ }
    return fresh;
  }
}

function persist(next) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = STATE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
  fs.renameSync(tmp, STATE_FILE);
}

function saveState() {
  try { persist(state); }
  catch (err) { console.error('  No se pudo guardar el estado:', err.message); }
}

/* ---------------- eventos en vivo (SSE) ---------------- */

const listeners = new Set();

function broadcast(event, payload) {
  const chunk = 'event: ' + event + '\ndata: ' + JSON.stringify(payload || {}) + '\n\n';
  listeners.forEach(function (res) {
    try { res.write(chunk); } catch (e) { listeners.delete(res); }
  });
}

/* ---------------- utilidades HTTP ---------------- */

function lanAddresses() {
  const out = [];
  const ifaces = os.networkInterfaces();
  Object.keys(ifaces).forEach(function (name) {
    (ifaces[name] || []).forEach(function (net) {
      if (net.family === 'IPv4' && !net.internal) out.push({ iface: name, address: net.address });
    });
  });
  return out;
}

function baseUrls() {
  const ips = lanAddresses().map(function (n) { return n.address; });
  if (!ips.length) ips.push('127.0.0.1');
  return ips.map(function (ip) { return 'http://' + ip + ':' + PORT; });
}

function json(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    let size = 0;
    const chunks = [];
    req.on('data', function (c) {
      size += c.length;
      if (size > 512 * 1024) { reject(new Error('cuerpo demasiado grande')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', function () {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (e) { reject(new Error('JSON inválido')); }
    });
    req.on('error', reject);
  });
}

function sendFile(res, filePath) {
  const resolved = path.resolve(filePath);
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) return notFound(res);
  const rel = path.relative(ROOT, resolved);
  if (rel.split(path.sep).some(function (part) { return part.startsWith('.'); })) return notFound(res);

  fs.stat(resolved, function (err, stat) {
    if (err || !stat.isFile()) return notFound(res);
    const ext = path.extname(resolved).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(resolved).pipe(res);
  });
}

function notFound(res) {
  const body = '<!doctype html><meta charset="utf-8"><title>No encontrado</title>' +
    '<div style="font:16px/1.6 system-ui;padding:48px;color:#f4ece1;background:#0b0908;min-height:100vh">' +
    '<h1 style="font-size:22px">No encontramos esa página</h1>' +
    '<p style="color:#96826f">Revisa la dirección o vuelve a <a style="color:#e8b06a" href="/">Café Nocturno</a>.</p></div>';
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

/* ---------------- API ---------------- */

function publicMesero(m, url) {
  const abiertas = state.ordenes.filter(function (o) {
    return o.meseroId === m.id && (o.status === 'nueva' || o.status === 'en_caja');
  }).length;
  return { id: m.id, name: m.name, code: m.code, url: url + '/m/' + m.code, abiertas: abiertas };
}

function sanitizeItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name || '').slice(0, 60).trim();
  if (!name) return null;
  const qty = Math.min(99, Math.max(1, Math.round(Number(raw.qty) || 1)));
  const price = Math.min(100000, Math.max(0, Math.round(Number(raw.price) || 0)));
  const size = ['S', 'M', 'L'].indexOf(raw.size) >= 0 ? raw.size : 'M';
  const milk = ['leche', 'lecheDesl', 'almendra', 'avena'].indexOf(raw.milk) >= 0 ? raw.milk : 'leche';
  const extras = Array.isArray(raw.extras)
    ? raw.extras.filter(function (x) { return typeof x === 'string' && x.length < 24; }).slice(0, 8)
    : [];
  return {
    pid: String(raw.pid || '').slice(0, 40),
    name: name,
    size: size,
    milk: milk,
    extras: extras,
    qty: qty,
    price: price,
    nota: String(raw.nota || '').slice(0, 120)
  };
}

async function handleApi(req, res, url) {
  const route = url.pathname.replace(/^\/api/, '');
  const urls = baseUrls();
  const base = urls[0];

  if (route === '/info' && req.method === 'GET') {
    return json(res, 200, {
      name: 'Café Nocturno',
      port: PORT,
      urls: urls,
      entregas: true
    });
  }

  if (route === '/eventos' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.write('retry: 3000\n\n');
    res.write('event: hola\ndata: {"ok":true}\n\n');
    listeners.add(res);
    const beat = setInterval(function () { try { res.write(': latido\n\n'); } catch (e) {} }, 25000);
    req.on('close', function () {
      clearInterval(beat);
      listeners.delete(res);
    });
    return;
  }

  if (route === '/meseros' && req.method === 'GET') {
    return json(res, 200, { meseros: state.meseros.map(function (m) { return publicMesero(m, base); }), urls: urls });
  }

  if (route === '/meseros' && req.method === 'POST') {
    const body = await readBody(req);
    const name = String(body.name || '').trim().slice(0, 40);
    if (name.length < 2) return json(res, 400, { error: 'Escribe el nombre del mesero.' });
    const exists = state.meseros.some(function (m) { return m.name.toLowerCase() === name.toLowerCase(); });
    if (exists) return json(res, 409, { error: 'Ya existe un mesero con ese nombre.' });
    const taken = state.meseros.map(function (m) { return m.code; });
    const mesero = {
      id: 'w' + Date.now().toString(36),
      name: name,
      code: uniqueCode(taken),
      createdAt: new Date().toISOString()
    };
    state.meseros.push(mesero);
    saveState();
    broadcast('meseros', { meseros: state.meseros.map(function (m) { return publicMesero(m, base); }) });
    return json(res, 201, { mesero: publicMesero(mesero, base) });
  }

  let match = route.match(/^\/meseros\/([\w-]+)$/);
  if (match && req.method === 'DELETE') {
    const idx = state.meseros.findIndex(function (m) { return m.id === match[1]; });
    if (idx < 0) return json(res, 404, { error: 'Ese mesero no existe.' });
    state.meseros.splice(idx, 1);
    saveState();
    broadcast('meseros', {});
    return json(res, 200, { ok: true });
  }

  match = route.match(/^\/meseros\/([\w-]+)\/codigo$/);
  if (match && req.method === 'POST') {
    const mesero = state.meseros.filter(function (m) { return m.id === match[1]; })[0];
    if (!mesero) return json(res, 404, { error: 'Ese mesero no existe.' });
    const taken = state.meseros.map(function (m) { return m.code; });
    mesero.code = uniqueCode(taken);
    saveState();
    broadcast('meseros', {});
    return json(res, 200, { mesero: publicMesero(mesero, base) });
  }

  if (route === '/mesero' && req.method === 'GET') {
    const code = String(url.searchParams.get('code') || '').trim().toUpperCase();
    const mesero = state.meseros.filter(function (m) { return m.code === code; })[0];
    if (!mesero) return json(res, 404, { error: 'Código no válido. Pide que te reimpriman tu código.' });
    return json(res, 200, { mesero: { id: mesero.id, name: mesero.name, code: mesero.code } });
  }

  if (route === '/ordenes' && req.method === 'GET') {
    const code = String(url.searchParams.get('code') || '').trim().toUpperCase();
    let list = state.ordenes;
    if (code) {
      const mesero = state.meseros.filter(function (m) { return m.code === code; })[0];
      if (!mesero) return json(res, 404, { error: 'Código no válido.' });
      list = list.filter(function (o) { return o.meseroId === mesero.id; });
    }
    return json(res, 200, { ordenes: list.slice().sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); }) });
  }

  if (route === '/ordenes' && req.method === 'POST') {
    const body = await readBody(req);
    const code = String(body.code || '').trim().toUpperCase();
    const mesero = state.meseros.filter(function (m) { return m.code === code; })[0];
    if (!mesero) return json(res, 403, { error: 'Tu código ya no es válido. Pide que te reimpriman el código.' });

    const items = (Array.isArray(body.items) ? body.items : []).map(sanitizeItem).filter(Boolean).slice(0, 80);
    if (!items.length) return json(res, 400, { error: 'La orden no tiene productos.' });

    const mesa = String(body.mesa == null ? '' : body.mesa).trim().slice(0, 16);
    if (!mesa) return json(res, 400, { error: 'Falta el número de mesa.' });

    const total = items.reduce(function (sum, it) { return sum + it.price * it.qty; }, 0);
    const order = {
      id: 'o' + Date.now().toString(36) + crypto.randomBytes(2).toString('hex'),
      folio: state.folio++,
      mesa: mesa,
      nota: String(body.nota || '').slice(0, 240),
      meseroId: mesero.id,
      mesero: mesero.name,
      items: items,
      total: total,
      status: 'nueva',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    state.ordenes.push(order);
    if (state.ordenes.length > 400) state.ordenes = state.ordenes.slice(-400);
    saveState();
    broadcast('orden', { orden: order });
    return json(res, 201, { orden: order });
  }

  match = route.match(/^\/ordenes\/([\w-]+)$/);
  if (match && (req.method === 'PATCH' || req.method === 'PUT')) {
    const body = await readBody(req);
    const order = state.ordenes.filter(function (o) { return o.id === match[1]; })[0];
    if (!order) return json(res, 404, { error: 'Esa orden no existe.' });
    const status = String(body.status || '');
    if (STATUSES.indexOf(status) < 0) return json(res, 400, { error: 'Estado no válido.' });
    order.status = status;
    order.updatedAt = new Date().toISOString();
    saveState();
    broadcast('orden', { orden: order });
    return json(res, 200, { orden: order });
  }

  return json(res, 404, { error: 'Ruta de API no encontrada.' });
}

/* ---------------- servidor ---------------- */

const server = http.createServer(function (req, res) {
  let url;
  try { url = new URL(req.url, 'http://localhost'); }
  catch (e) { return json(res, 400, { error: 'Solicitud inválida.' }); }

  if (url.pathname.startsWith('/api/')) {
    Promise.resolve(handleApi(req, res, url)).catch(function (err) {
      console.error('  Error en', url.pathname, '-', err.message);
      if (!res.headersSent) json(res, 500, { error: err.message || 'Error interno' });
    });
    return;
  }

  if (url.pathname === '/') return sendFile(res, path.join(ROOT, 'index.html'));

  if (/^\/m\/[A-Za-z0-9]+$/.test(url.pathname)) return sendFile(res, path.join(ROOT, 'mesero.html'));

  let decoded;
  try { decoded = decodeURIComponent(url.pathname); }
  catch (e) { return notFound(res); }

  return sendFile(res, path.join(ROOT, decoded));
});

state = loadState();

server.on('error', function (err) {
  if (err.code === 'EADDRINUSE') {
    console.error('\n  El puerto ' + PORT + ' ya está ocupado. Cierra la otra app o usa otro puerto:');
    console.error('    PORT=3001 node server.js\n');
  } else {
    console.error('\n  No se pudo iniciar el servidor:', err.message, '\n');
  }
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', function () {
  const urls = baseUrls();
  console.log('\n  Café Nocturno · modo meseros');
  console.log('  ------------------------------------------------');
  console.log('  Punto de venta (esta computadora):');
  console.log('    http://localhost:' + PORT);
  console.log('\n  En los teléfonos o tablets, con la misma red Wi-Fi:');
  urls.forEach(function (u) { console.log('    ' + u); });
  console.log('\n  Pestaña "Meseros" en la caja → cada mesero tiene su QR.');
  console.log('  Los datos se guardan en .data/meseros.json');
  console.log('  Para detener: Ctrl + C\n');
});
