/* ============================================================
   Café Nocturno — conectividad con meseros (LAN)
   ------------------------------------------------------------
   Añade la pestaña "Meseros" a la caja: códigos QR personales,
   alta de meseros y órdenes que llegan desde los teléfonos.
   Requiere server.js (node server.js). Sin servidor, la app
   funciona igual que siempre y esta pestaña avisa del modo demo.
   ============================================================ */
(function () {
  'use strict';

  var D = window.POS_DATA;
  var BRIDGE = window.POSBridge || null;

  var state = {
    available: false,
    info: null,
    meseros: [],
    ordenes: [],
    loading: true,
    error: '',
    sse: null
  };

  var $ = function (id) { return document.getElementById(id); };
  var nf = new Intl.NumberFormat('es-MX');

  function money(n) { return '$' + nf.format(Math.round(Number(n) || 0)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function hhmm(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }
  function hace(iso) {
    var mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (isNaN(mins)) return '';
    if (mins < 1) return 'ahora';
    if (mins < 60) return 'hace ' + mins + ' min';
    return 'hace ' + Math.round(mins / 60) + ' h';
  }

  /* ---------------- API ---------------- */

  function api(path, options) {
    options = options || {};
    var init = { method: options.method || 'GET', headers: { 'Content-Type': 'application/json' } };
    if (options.body) init.body = JSON.stringify(options.body);
    return fetch(path, init).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.error || ('Error ' + res.status));
        return data;
      });
    });
  }

  /* ---------------- montaje ---------------- */

  function mount() {
    var tabs = $('tabs');
    var main = document.querySelector('.main');
    if (!tabs || !main) return;

    if (!$('tab-meseros')) {
      var tab = document.createElement('button');
      tab.className = 'tab';
      tab.id = 'tab-meseros';
      tab.setAttribute('data-view', 'meseros');
      tab.innerHTML = 'Meseros <span class="tab-badge" id="meseros-badge" hidden>0</span>';
      tabs.appendChild(tab);
    }

    if (!$('view-meseros')) {
      var section = document.createElement('section');
      section.className = 'view';
      section.id = 'view-meseros';
      main.appendChild(section);
    }

    document.addEventListener('click', function (e) {
      if (e.target.closest('#tab-meseros')) refresh();
    });
  }

  /* ---------------- carga ---------------- */

  function refresh() {
    return Promise.all([
      api('/api/info'),
      api('/api/meseros'),
      api('/api/ordenes')
    ]).then(function (res) {
      state.available = true;
      state.error = '';
      state.info = res[0];
      state.meseros = res[1].meseros || [];
      state.ordenes = res[2].ordenes || [];
      state.loading = false;
      paint();
      syncFromUsers();
    }).catch(function (err) {
      state.available = false;
      state.loading = false;
      state.error = err && err.message ? err.message : 'Sin conexión';
      paint();
    });
  }

  function connectEvents() {
    if (typeof EventSource === 'undefined') return;
    if (state.sse) { try { state.sse.close(); } catch (e) {} }
    try {
      var es = new EventSource('/api/eventos');
      es.addEventListener('orden', function () {
        refresh().then(function () {
          if (isVisible()) toast('Llegó una orden de mesero');
        });
      });
      es.addEventListener('meseros', function () { refresh(); });
      es.onerror = function () { /* EventSource reintenta solo */ };
      state.sse = es;
    } catch (e) { /* sin SSE: queda el sondeo */ }
  }

  /* Los usuarios de la caja con rol "Mesero" reciben su código QR
     automáticamente al abrir esta pestaña. */
  var syncing = false;

  function syncFromUsers() {
    if (syncing || !BRIDGE || !BRIDGE.meseroUsers) return;
    var wanted = [];
    try { wanted = BRIDGE.meseroUsers() || []; } catch (e) { wanted = []; }
    if (!wanted.length) return;

    var existentes = state.meseros.map(function (m) { return String(m.name).trim().toLowerCase(); });
    var faltan = wanted.filter(function (u) {
      return u && u.name && existentes.indexOf(String(u.name).trim().toLowerCase()) < 0;
    });
    if (!faltan.length) return;

    syncing = true;
    var chain = Promise.resolve();
    faltan.forEach(function (u) {
      chain = chain.then(function () {
        return api('/api/meseros', { method: 'POST', body: { name: u.name } }).catch(function () {});
      });
    });
    chain.then(function () { syncing = false; return refresh(); })
      .catch(function () { syncing = false; });
  }

  function isVisible() {
    var v = $('view-meseros');
    return !!(v && v.classList.contains('is-active'));
  }

  function toast(msg) {
    if (BRIDGE && BRIDGE.toast) BRIDGE.toast(msg);
    else if (typeof window.__waiterToast === 'function') window.__waiterToast(msg);
  }

  /* ---------------- pintado ---------------- */

  function paint() {
    var section = $('view-meseros');
    if (!section) return;

    var nuevas = state.ordenes.filter(function (o) { return o.status === 'nueva'; }).length;
    var badge = $('meseros-badge');
    if (badge) {
      badge.textContent = nuevas;
      badge.hidden = nuevas === 0;
    }

    if (!section.dataset.mounted) {
      section.innerHTML = shell();
      section.dataset.mounted = '1';
    }

    $('meseros-status').innerHTML = statusLine();

    if (!state.available) {
      $('meseros-body').innerHTML = offlinePanel();
      return;
    }

    $('meseros-body').innerHTML =
      '<div class="ms-grid">' +
        '<div class="ms-col">' + teamPanel() + '</div>' +
        '<div class="ms-col wide">' + ordersPanel() + '</div>' +
      '</div>';

    renderQrs();
  }

  function shell() {
    return '<div class="ms-wrap">' +
      '<header class="ms-head">' +
        '<div>' +
          '<span class="eyebrow">Conectividad por red local</span>' +
          '<h2>Meseros</h2>' +
          '<p class="ms-sub">Cada mesero escanea su código desde el teléfono o tablet y manda las órdenes a esta caja.</p>' +
        '</div>' +
        '<div class="ms-head-actions">' +
          '<span class="ms-address" id="meseros-address">—</span>' +
          '<button class="btn btn-ghost btn-sm" data-ms="print">Imprimir códigos</button>' +
          '<button class="btn btn-ghost btn-sm" data-ms="refresh">Actualizar</button>' +
        '</div>' +
      '</header>' +
      '<div class="ms-status" id="meseros-status"></div>' +
      '<div id="meseros-body"></div>' +
    '</div>';
  }

  function statusLine() {
    if (state.loading) return '<span class="ms-dot is-wait"></span> Conectando con el servidor local…';
    if (!state.available) return '<span class="ms-dot is-off"></span> Sin servidor local — modo demo';
    var url = state.info && state.info.urls && state.info.urls[0];
    var addr = $('meseros-address');
    if (addr) addr.textContent = url || '—';
    var abiertas = state.ordenes.filter(function (o) { return o.status === 'nueva'; }).length;
    return '<span class="ms-dot"></span> Conectado · ' + state.meseros.length + ' mesero' +
      (state.meseros.length === 1 ? '' : 's') + ' · ' + abiertas +
      (abiertas === 1 ? ' orden por revisar' : ' órdenes por revisar');
  }

  function offlinePanel() {
    return '<div class="ms-empty">' +
      '<h3>Activa la conectividad de meseros</h3>' +
      '<p>Esta pestaña necesita el servidor local que sincroniza los teléfonos con la caja. ' +
      'En la computadora de la caja, abre una terminal en la carpeta del proyecto y ejecuta:</p>' +
      '<pre class="ms-code">node server.js</pre>' +
      '<p>Después abre el punto de venta desde la dirección que aparece en la terminal ' +
      '(por ejemplo <b>http://192.168.1.20:3000</b>) y vuelve a esta pestaña.</p>' +
      (state.error ? '<p class="ms-err">Detalle: ' + esc(state.error) + '</p>' : '') +
    '</div>';
  }

  function teamPanel() {
    var cards = state.meseros.map(meseroCard).join('');
    return '<section class="ms-card">' +
      '<header class="ms-card-head">' +
        '<div><h3>Equipo</h3><p>Código personal e ingreso directo para cada mesero.</p></div>' +
      '</header>' +
      '<form class="ms-add" data-ms-form="mesero">' +
        '<input id="ms-nuevo" type="text" maxlength="40" placeholder="Nombre del mesero" autocomplete="off">' +
        '<button class="btn btn-primary btn-sm" type="submit">Agregar</button>' +
      '</form>' +
      '<div class="ms-team">' + (cards || '<p class="ms-empty-note">Aún no hay meseros. Agrega el primero arriba.</p>') + '</div>' +
    '</section>';
  }

  function meseroCard(m) {
    return '<article class="ms-mesero" data-mesero="' + esc(m.id) + '">' +
      '<div class="ms-qr" data-qr="' + esc(m.id) + '" aria-label="Código QR de ' + esc(m.name) + '"></div>' +
      '<div class="ms-mesero-body">' +
        '<strong>' + esc(m.name) + '</strong>' +
        '<span class="ms-codigo">Código ' + esc(m.code) + '</span>' +
        '<span class="ms-link">' + esc(m.url) + '</span>' +
        '<div class="ms-mesero-actions">' +
          '<button class="btn btn-ghost btn-xs" data-ms="copiar" data-url="' + esc(m.url) + '">Copiar enlace</button>' +
          '<button class="btn btn-ghost btn-xs" data-ms="recodigo" data-id="' + esc(m.id) + '">Nuevo código</button>' +
          '<button class="btn btn-ghost btn-xs danger" data-ms="borrar" data-id="' + esc(m.id) + '">Quitar</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function ordersPanel() {
    var list = state.ordenes.slice().sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
    var abiertas = list.filter(function (o) { return o.status === 'nueva'; });
    var resto = list.filter(function (o) { return o.status !== 'nueva'; });

    return '<section class="ms-card">' +
      '<header class="ms-card-head">' +
        '<div><h3>Órdenes de meseros</h3><p>Revisa, pasa a ticket y cobra como cualquier venta.</p></div>' +
        '<span class="ms-count">' + abiertas.length + ' nueva' + (abiertas.length === 1 ? '' : 's') + '</span>' +
      '</header>' +
      (list.length
        ? '<div class="ms-orders">' +
            abiertas.map(orderCard).join('') +
            (resto.length ? '<h4 class="ms-subhead">Atendidas</h4>' + resto.slice(0, 20).map(orderCard).join('') : '') +
          '</div>'
        : '<p class="ms-empty-note">Cuando un mesero envíe una orden, aparecerá aquí al instante.</p>') +
    '</section>';
  }

  var STATUS = {
    nueva: 'Nueva', en_caja: 'En caja', cobrada: 'Cobrada', cancelada: 'Cancelada'
  };

  function orderCard(o) {
    var items = o.items.map(function (it) {
      var meta = [];
      if (it.size && it.size !== 'M') meta.push({ S: 'Chico', L: 'Grande' }[it.size] || it.size);
      (it.extras || []).forEach(function (id) {
        var map = { shot: 'shot extra', vainilla: 'vainilla', caramelo: 'caramelo', chocolate: 'chocolate', crema: 'crema' };
        meta.push(map[id] || id);
      });
      return '<li><b>' + it.qty + '×</b> ' + esc(it.name) +
        (meta.length ? ' <span>' + esc(meta.join(', ')) + '</span>' : '') +
        '<span class="ms-price">' + money(it.price * it.qty) + '</span></li>';
    }).join('');

    return '<article class="ms-order' + (o.status === 'nueva' ? ' is-new' : '') + '" data-order="' + esc(o.id) + '">' +
      '<header class="ms-order-head">' +
        '<div>' +
          '<strong>Mesa ' + esc(o.mesa) + '</strong>' +
          '<span class="ms-order-meta">#' + String(o.folio).padStart(2, '0') + ' · ' + esc(o.mesero) + ' · ' + hhmm(o.createdAt) +
            ' <em>' + hace(o.createdAt) + '</em></span>' +
        '</div>' +
        '<span class="ms-badge is-' + esc(o.status) + '">' + (STATUS[o.status] || o.status) + '</span>' +
      '</header>' +
      '<ul class="ms-items">' + items + '</ul>' +
      (o.nota ? '<p class="ms-note">Nota: ' + esc(o.nota) + '</p>' : '') +
      '<footer class="ms-order-foot">' +
        '<span class="ms-total">' + money(o.total) + '</span>' +
        (o.status === 'nueva'
          ? '<div class="ms-order-actions">' +
              '<button class="btn btn-primary btn-sm" data-ms="ticket" data-id="' + esc(o.id) + '">Pasar a ticket</button>' +
              '<button class="btn btn-ghost btn-sm danger" data-ms="cancelar" data-id="' + esc(o.id) + '">Cancelar</button>' +
            '</div>'
          : '<span class="ms-order-done">' + (o.status === 'en_caja' ? 'En el ticket actual' : 'Atendida') + '</span>') +
      '</footer>' +
    '</article>';
  }

  /* ---------------- QR ---------------- */

  function renderQrs() {
    if (typeof window.QRCode !== 'function') {
      var nodes = document.querySelectorAll('.ms-qr');
      for (var i = 0; i < nodes.length; i++) nodes[i].innerHTML = '<span class="ms-qr-fallback">QR</span>';
      return;
    }
    state.meseros.forEach(function (m) {
      var host = document.querySelector('[data-qr="' + m.id + '"]');
      if (!host || host.dataset.done === m.code) return;
      host.innerHTML = '';
      try {
        new window.QRCode(host, {
          text: m.url,
          width: 132,
          height: 132,
          colorDark: '#14100e',
          colorLight: '#ffffff',
          correctLevel: window.QRCode.CorrectLevel.M
        });
        host.dataset.done = m.code;
      } catch (err) {
        host.innerHTML = '<span class="ms-qr-fallback">' + esc(m.code) + '</span>';
      }
    });
  }

  function printCodes() {
    if (!state.meseros.length) { toast('Agrega al menos un mesero'); return; }
    var win = window.open('', '_blank');
    if (!win) { toast('Permite las ventanas emergentes para imprimir'); return; }

    var cards = state.meseros.map(function (m) {
      var host = document.querySelector('[data-qr="' + m.id + '"]');
      var canvas = host && host.querySelector('canvas');
      var img = canvas ? '<img src="' + canvas.toDataURL('image/png') + '" alt="QR de ' + esc(m.name) + '">' : '';
      return '<div class="code-card">' + img +
        '<strong>' + esc(m.name) + '</strong>' +
        '<span>' + esc(m.code) + '</span>' +
        '<small>' + esc(m.url) + '</small>' +
      '</div>';
    }).join('');

    win.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8">' +
      '<title>Códigos de meseros · Café Nocturno</title><style>' +
      '@page{margin:14mm}*{box-sizing:border-box}' +
      'body{font:14px/1.4 system-ui,sans-serif;color:#1a1512;margin:0;padding:10px}' +
      'h1{font-size:19px;margin:0 0 4px}p{color:#6b5a4a;font-size:12.5px;margin:0 0 18px}' +
      '.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12mm}' +
      '.code-card{border:1.5px dashed #c9b79f;border-radius:14px;padding:14px;text-align:center;page-break-inside:avoid}' +
      'img{width:150px;height:150px;display:block;margin:0 auto 8px}' +
      'strong{display:block;font-size:16px}.code-card span{display:block;font-size:13px;letter-spacing:.18em;color:#8a5a1f;margin:2px 0 6px}' +
      '.code-card small{display:block;font-size:10px;color:#7d6a5a;word-break:break-all}' +
      '</style></head><body>' +
      '<h1>Café Nocturno · códigos de meseros</h1>' +
      '<p>Escanea tu código con la cámara del teléfono para abrir tu comanda. Guarda la página en la pantalla de inicio.</p>' +
      '<div class="grid">' + cards + '</div></body></html>');
    win.document.close();
    setTimeout(function () { win.focus(); win.print(); }, 400);
  }

  /* ---------------- acciones ---------------- */

  function setStatus(id, status) {
    return api('/api/ordenes/' + encodeURIComponent(id), { method: 'PATCH', body: { status: status } })
      .then(function () { return refresh(); })
      .catch(function (err) { toast(err.message || 'No se pudo actualizar la orden'); });
  }

  var pendingTicket = [];

  function toTicket(id) {
    var order = state.ordenes.filter(function (o) { return o.id === id; })[0];
    if (!order) return;

    var added = 0;
    if (BRIDGE && BRIDGE.addItems) added = BRIDGE.addItems(order.items);

    if (!added) {
      toast('Esos productos ya no están en el menú');
      return;
    }

    pendingTicket.push(id);
    setStatus(id, 'en_caja').then(function () {
      toast('Mesa ' + order.mesa + ' pasó al ticket');
      if (BRIDGE && BRIDGE.goTo) BRIDGE.goTo('venta');
    });
  }

  function bindActions() {
    var section = $('view-meseros');
    if (!section) return;

    section.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-ms]');
      if (!btn) return;
      var action = btn.getAttribute('data-ms');
      var id = btn.getAttribute('data-id');

      if (action === 'refresh') { refresh(); return; }
      if (action === 'print') { printCodes(); return; }

      if (action === 'copiar') {
        var url = btn.getAttribute('data-url');
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () { toast('Enlace copiado'); },
            function () { toast('Copia manual: ' + url); });
        } else {
          toast('Enlace: ' + url);
        }
        return;
      }

      if (action === 'recodigo') {
        if (!window.confirm('¿Generar un código nuevo? El anterior dejará de funcionar.')) return;
        api('/api/meseros/' + encodeURIComponent(id) + '/codigo', { method: 'POST' })
          .then(function () { return refresh(); })
          .then(function () { toast('Código actualizado'); })
          .catch(function (err) { toast(err.message); });
        return;
      }

      if (action === 'borrar') {
        if (!window.confirm('¿Quitar a este mesero de la lista?')) return;
        api('/api/meseros/' + encodeURIComponent(id), { method: 'DELETE' })
          .then(function () { return refresh(); })
          .catch(function (err) { toast(err.message); });
        return;
      }

      if (action === 'ticket') { toTicket(id); return; }

      if (action === 'cancelar') {
        if (!window.confirm('¿Cancelar esta orden?')) return;
        setStatus(id, 'cancelada');
        return;
      }
    });

    section.addEventListener('submit', function (e) {
      var form = e.target.closest('[data-ms-form="mesero"]');
      if (!form) return;
      e.preventDefault();
      var input = $('ms-nuevo');
      var name = (input.value || '').trim();
      if (name.length < 2) { toast('Escribe el nombre del mesero'); return; }
      btnBusy(form, true);
      api('/api/meseros', { method: 'POST', body: { name: name } })
        .then(function (data) {
          input.value = '';
          return refresh().then(function () {
            toast('Mesero agregado: ' + data.mesero.name);
          });
        })
        .catch(function (err) { toast(err.message || 'No se pudo agregar'); })
        .finally(function () { btnBusy(form, false); });
    });
  }

  function btnBusy(form, busy) {
    var btn = form.querySelector('button');
    if (!btn) return;
    btn.disabled = busy;
    btn.textContent = busy ? 'Guardando…' : 'Agregar';
  }

  /* ---------------- cierre de cuentas ---------------- */

  /* Cuando la caja cobra, las órdenes que venían en ese ticket
     pasan a "cobrada" y el mesero lo ve en su teléfono. */
  function onSale(sale) {
    if (!pendingTicket.length) return;
    var ids = pendingTicket.slice();
    pendingTicket = [];
    var salePids = (sale.items || []).map(function (it) { return it.pid; });

    state.ordenes.filter(function (o) { return ids.indexOf(o.id) >= 0; }).forEach(function (o) {
      var cubierta = o.items.every(function (it) { return salePids.indexOf(it.pid) >= 0; });
      if (!cubierta) return;
      api('/api/ordenes/' + encodeURIComponent(o.id), { method: 'PATCH', body: { status: 'cobrada' } })
        .then(function () { refresh(); })
        .catch(function () { /* se reintenta al refrescar */ });
    });
  }

  window.POSWaiterSync = { onSale: onSale };

  /* ---------------- inicio ---------------- */

  function init() {
    mount();
    bindActions();
    refresh();
    connectEvents();
    setInterval(function () {
      if (document.visibilityState === 'visible') refresh();
    }, 25000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
