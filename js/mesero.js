/* ============================================================
   Café Nocturno — app de meseros (móvil / tablet)
   Toma órdenes y las envía a la caja por la red local.
   ============================================================ */
(function () {
  'use strict';

  var D = window.POS_DATA;
  var A = window.POS_ART;

  var SIZES = {
    S: { key: 'S', label: 'Chico', f: 0.75, pf: 0.85 },
    M: { key: 'M', label: 'Mediano', f: 1, pf: 1 },
    L: { key: 'L', label: 'Grande', f: 1.3, pf: 1.16 }
  };

  var MILKS = [
    { id: 'leche', name: 'Entera', extra: 0 },
    { id: 'lecheDesl', name: 'Deslactosada', extra: 0 },
    { id: 'almendra', name: 'Almendra', extra: 8 },
    { id: 'avena', name: 'Avena', extra: 8 }
  ];

  var EXTRAS = [
    { id: 'shot', name: 'Shot extra', price: 12, recipe: [['espresso', 30]] },
    { id: 'vainilla', name: 'Vainilla', price: 10, recipe: [['vainilla', 15]] },
    { id: 'caramelo', name: 'Caramelo', price: 10, recipe: [['caramelo', 15]] },
    { id: 'chocolate', name: 'Chocolate', price: 10, recipe: [['chocolate', 15]] },
    { id: 'crema', name: 'Crema', price: 12, recipe: [['crema', 20]] }
  ];

  var CART_KEY = 'cafe-nocturno-mesero-cart';
  var MESA_KEY = 'cafe-nocturno-mesero-mesa';

  var $ = function (id) { return document.getElementById(id); };
  var nf = new Intl.NumberFormat('es-MX');

  function money(n) { return '$' + nf.format(Math.round(n)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function hhmm(iso) {
    try { return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return ''; }
  }

  /* ---------------- estado ---------------- */

  var state = {
    code: '',
    me: null,
    cat: 'all',
    cart: [],
    orders: [],
    cfg: null,
    nota: ''
  };

  function productById(id) {
    for (var i = 0; i < D.products.length; i++) if (D.products[i].id === id) return D.products[i];
    return null;
  }
  function hasMilk(p) { return p.recipe.some(function (r) { return r[0] === 'leche'; }); }
  function hasEspresso(p) { return p.recipe.some(function (r) { return r[0] === 'espresso'; }); }
  function sizeOf(p, s) { return p.sizes === false ? SIZES.M : (SIZES[s] || SIZES.M); }

  function recipeFor(p, o) {
    o = o || {};
    var size = p.sizes === false ? 'M' : (o.size || 'M');
    var f = sizeOf(p, size).f;
    var milk = o.milk || 'leche';
    var extras = Array.isArray(o.extras) ? o.extras : [];
    var map = new Map();

    p.recipe.forEach(function (row) {
      var key = row[0];
      var amt = row[1];
      if (key === 'leche' && milk !== 'leche') key = milk;
      map.set(key, (map.get(key) || 0) + amt * f);
    });
    extras.forEach(function (id) {
      var ex = EXTRAS.filter(function (x) { return x.id === id; })[0];
      if (!ex) return;
      if (id === 'shot' && !hasEspresso(p)) return;
      ex.recipe.forEach(function (row) {
        map.set(row[0], (map.get(row[0]) || 0) + row[1]);
      });
    });

    var list = [];
    map.forEach(function (amount, key) {
      var ing = D.ingredients[key];
      if (!ing) return;
      list.push({
        key: key,
        name: ing.name,
        unit: ing.unit,
        color: ing.color,
        artColor: ing.artColor || ing.color,
        amount: amount
      });
    });
    var total = list.reduce(function (s, r) { return s + r.amount; }, 0) || 1;
    list.forEach(function (r) { r.pct = (r.amount / total) * 100; });
    return list;
  }

  function unitPrice(p, o) {
    o = o || {};
    var size = p.sizes === false ? 'M' : (o.size || 'M');
    var price = p.price * sizeOf(p, size).pf;
    if (hasMilk(p) && o.milk) {
      var m = MILKS.filter(function (x) { return x.id === o.milk; })[0];
      if (m) price += m.extra;
    }
    (Array.isArray(o.extras) ? o.extras : []).forEach(function (id) {
      var ex = EXTRAS.filter(function (x) { return x.id === id; })[0];
      if (!ex) return;
      if (id === 'shot' && !hasEspresso(p)) return;
      price += ex.price;
    });
    return Math.round(price);
  }

  function artOf(p, opts) {
    var pp = Object.assign({}, p, { capacity: 0 });
    return A.product(pp, recipeFor(p, opts));
  }

  /* ---------------- red ---------------- */

  var online = true;

  function setOnline(ok) {
    online = ok;
    var conn = $('conn');
    var text = $('conn-text');
    if (!conn) return;
    conn.classList.toggle('is-off', !ok);
    if (text) text.textContent = ok ? 'En línea' : 'Sin conexión';
  }

  function api(path, options) {
    options = options || {};
    var init = { method: options.method || 'GET', headers: { 'Content-Type': 'application/json' } };
    if (options.body) init.body = JSON.stringify(options.body);

    if (typeof AbortController === 'undefined') {
      return fetch(path, init).then(parse);
    }
    var ctrl = new AbortController();
    init.signal = ctrl.signal;
    var timer = setTimeout(function () { ctrl.abort(); }, 9000);
    return fetch(path, init).then(parse).finally(function () { clearTimeout(timer); });

    function parse(res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.error || ('Error ' + res.status));
        return data;
      });
    }
  }

  /* ---------------- avisos ---------------- */

  var toastTimer = null;
  function toast(msg, isError) {
    var el = $('toast');
    el.textContent = msg;
    el.classList.toggle('is-error', !!isError);
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-on'); }, 2800);
  }

  /* ---------------- carrito local ---------------- */

  function loadCart() {
    try {
      var raw = JSON.parse(localStorage.getItem(CART_KEY + ':' + state.code) || '[]');
      if (Array.isArray(raw)) {
        state.cart = raw.filter(function (l) { return l && productById(l.pid) && l.qty > 0; });
      }
    } catch (e) { state.cart = []; }
  }
  function saveCart() {
    try { localStorage.setItem(CART_KEY + ':' + state.code, JSON.stringify(state.cart)); } catch (e) {}
  }

  function cartCount() {
    return state.cart.reduce(function (s, l) { return s + l.qty; }, 0);
  }
  function cartTotal() {
    return state.cart.reduce(function (s, l) {
      var p = productById(l.pid);
      return p ? s + unitPrice(p, l) * l.qty : s;
    }, 0);
  }

  function addLine(pid, opts) {
    var p = productById(pid);
    if (!p) return;
    var size = p.sizes === false ? 'M' : (opts.size || 'M');
    var milk = opts.milk || 'leche';
    var extras = (opts.extras || []).slice().sort();
    var qty = Math.max(1, opts.qty || 1);

    var line = state.cart.filter(function (l) {
      return l.pid === pid && l.size === size && l.milk === milk && l.extras.join(',') === extras.join(',');
    })[0];

    if (line) line.qty += qty;
    else state.cart.push({ pid: pid, size: size, milk: milk, extras: extras, qty: qty });

    saveCart();
    updateCartBar();
    renderProducts();
    toast(p.name + ' agregado');
  }

  function updateCartBar() {
    var bar = $('cartbar');
    var count = cartCount();
    $('cart-count').textContent = count;
    $('cart-label').textContent = count === 1 ? 'artículo' : 'artículos';
    $('cart-total').textContent = money(cartTotal());
    bar.hidden = count === 0;
  }

  /* ---------------- menú ---------------- */

  function renderCats() {
    var html = '<button class="chip' + (state.cat === 'all' ? ' is-on' : '') + '" data-cat="all">Todo</button>';
    D.categories.forEach(function (c) {
      html += '<button class="chip' + (state.cat === c.id ? ' is-on' : '') + '" data-cat="' + esc(c.id) + '">' + esc(c.name) + '</button>';
    });
    $('cats').innerHTML = html;
  }

  function renderProducts() {
    var list = D.products.filter(function (p) {
      return state.cat === 'all' || p.cat === state.cat;
    });

    var counts = {};
    state.cart.forEach(function (l) { counts[l.pid] = (counts[l.pid] || 0) + l.qty; });

    $('products').innerHTML = list.map(function (p) {
      var price = unitPrice(p, { size: 'M', milk: 'leche' });
      var qty = counts[p.id] || 0;
      return '<button class="card" type="button" data-pid="' + esc(p.id) + '">' +
        (qty ? '<span class="qtybadge">' + qty + '</span>' : '') +
        '<span class="card-art">' + artOf(p, { size: 'M', milk: 'leche' }) + '</span>' +
        '<span class="card-name">' + esc(p.name) + '</span>' +
        '<span class="card-price">' + money(price) +
          (p.sizes === false ? '' : ' <small>mediano</small>') +
        '</span>' +
      '</button>';
    }).join('');
  }

  /* ---------------- hojas ---------------- */

  function openSheet(html) {
    $('sheet').innerHTML = html;
    $('sheet-root').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeSheet() {
    $('sheet-root').hidden = true;
    $('sheet').innerHTML = '';
    state.cfg = null;
    document.body.style.overflow = '';
  }

  function openProduct(pid) {
    var p = productById(pid);
    if (!p) return;

    var needsOptions = p.sizes !== false || hasMilk(p) || p.recipe.length > 1;
    var hasExtras = hasEspresso(p) || EXTRAS.some(function (ex) { return ex.id !== 'shot'; });
    if (!needsOptions && !hasExtras) {
      addLine(pid, { qty: 1 });
      return;
    }

    state.cfg = {
      pid: pid,
      size: p.sizes === false ? 'M' : 'M',
      milk: 'leche',
      extras: [],
      qty: 1
    };
    renderCfg();
  }

  function renderCfg() {
    var c = state.cfg;
    if (!c) return;
    var p = productById(c.pid);
    if (!p) return;

    var price = unitPrice(p, c) * c.qty;

    var sizeBlock = '';
    if (p.sizes !== false) {
      sizeBlock = '<div><span class="section-label">Tamaño</span><div class="opts">' +
        Object.keys(SIZES).map(function (k) {
          var s = SIZES[k];
          return '<button class="opt' + (c.size === k ? ' is-on' : '') + '" data-size="' + k + '">' +
            s.label + '<small>' + money(unitPrice(p, { size: k, milk: c.milk, extras: c.extras })) + '</small></button>';
        }).join('') + '</div></div>';
    }

    var milkBlock = '';
    if (hasMilk(p)) {
      milkBlock = '<div><span class="section-label">Leche</span><div class="opts two">' +
        MILKS.map(function (m) {
          return '<button class="opt' + (c.milk === m.id ? ' is-on' : '') + '" data-milk="' + m.id + '">' +
            esc(m.name) + (m.extra ? '<small>+' + money(m.extra) + '</small>' : '') + '</button>';
        }).join('') + '</div></div>';
    }

    var extrasList = EXTRAS.filter(function (ex) {
      return ex.id !== 'shot' || hasEspresso(p);
    });
    var extrasBlock = extrasList.length
      ? '<div><span class="section-label">Extras</span><div class="opts two">' +
        extrasList.map(function (ex) {
          var on = c.extras.indexOf(ex.id) >= 0;
          return '<button class="opt' + (on ? ' is-on' : '') + '" data-extra="' + ex.id + '">' +
            esc(ex.name) + '<small>+' + money(ex.price) + '</small></button>';
        }).join('') + '</div></div>'
      : '';

    openSheet(
      '<div class="sheet-head">' +
        '<div><span class="eyebrow">Agregar a la orden</span><h2>' + esc(p.name) + '</h2></div>' +
        '<button class="x" data-close-sheet aria-label="Cerrar">×</button>' +
      '</div>' +
      '<div class="sheet-body">' +
        '<div class="sheet-art">' + artOf(p, c) + '</div>' +
        sizeBlock + milkBlock + extrasBlock +
        '<div class="step">' +
          '<span class="section-label" style="margin:0">Cantidad</span>' +
          '<div class="step-btns">' +
            '<button data-qty="-1" aria-label="Quitar uno">−</button>' +
            '<span class="n">' + c.qty + '</span>' +
            '<button data-qty="1" aria-label="Agregar uno">+</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="sheet-foot">' +
        '<button class="primary" data-add-line>Agregar · ' + money(price) + '</button>' +
      '</div>'
    );
  }

  function renderCartSheet() {
    if (!state.cart.length) return;

    var lines = state.cart.map(function (l, i) {
      var p = productById(l.pid);
      if (!p) return '';
      var meta = [];
      if (p.sizes !== false) meta.push(sizeOf(p, l.size).label);
      if (hasMilk(p) && l.milk !== 'leche') {
        var m = MILKS.filter(function (x) { return x.id === l.milk; })[0];
        if (m) meta.push(m.name);
      }
      l.extras.forEach(function (id) {
        var ex = EXTRAS.filter(function (x) { return x.id === id; })[0];
        if (ex) meta.push(ex.name);
      });
      return '<div class="line">' +
        '<span class="line-art">' + artOf(p, l) + '</span>' +
        '<span><span class="line-name">' + esc(p.name) + '</span>' +
          '<span class="line-meta">' + esc(meta.join(' · ') || 'Sin opciones') + '</span></span>' +
        '<span class="line-right">' +
          '<span class="line-price">' + money(unitPrice(p, l) * l.qty) + '</span>' +
          '<span class="mini-step">' +
            '<button data-line="' + i + '" data-delta="-1" aria-label="Quitar uno">−</button>' +
            '<span>' + l.qty + '</span>' +
            '<button data-line="' + i + '" data-delta="1" aria-label="Agregar uno">+</button>' +
          '</span>' +
        '</span>' +
      '</div>';
    }).join('');

    openSheet(
      '<div class="sheet-head">' +
        '<div><span class="eyebrow">Orden abierta</span><h2>Mesa ' + esc($('mesa').value || '—') + '</h2></div>' +
        '<button class="x" data-close-sheet aria-label="Cerrar">×</button>' +
      '</div>' +
      '<div class="sheet-body">' +
        lines +
        '<div><span class="section-label">Nota para la barra (opcional)</span>' +
          '<textarea class="note-input" id="order-note" placeholder="Ej. sin azúcar, para llevar, alergias…">' + esc(state.nota) + '</textarea></div>' +
        '<div>' +
          '<div class="total-row"><span>Artículos</span><span>' + cartCount() + '</span></div>' +
          '<div class="total-row grand"><span>Total</span><span>' + money(cartTotal()) + '</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="sheet-foot">' +
        '<button class="primary" data-send ' + (online ? '' : 'disabled') + '>Enviar a caja · ' + money(cartTotal()) + '</button>' +
      '</div>'
    );
  }

  function sendOrder() {
    var mesa = ($('mesa').value || '').trim();
    if (!mesa) {
      closeSheet();
      $('mesa').focus();
      toast('Escribe el número de mesa', true);
      return;
    }
    if (!state.cart.length) return;

    var nota = ($('order-note') && $('order-note').value) || '';
    state.nota = nota;

    var items = state.cart.map(function (l) {
      var p = productById(l.pid);
      return {
        pid: l.pid,
        name: p.name,
        size: l.size,
        milk: l.milk,
        extras: l.extras,
        qty: l.qty,
        price: unitPrice(p, l)
      };
    });

    var btn = document.querySelector('[data-send]');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }

    api('/api/ordenes', { method: 'POST', body: { code: state.code, mesa: mesa, nota: nota, items: items } })
      .then(function (data) {
        state.cart = [];
        state.nota = '';
        saveCart();
        updateCartBar();
        renderProducts();
        closeSheet();
        setOnline(true);
        toast('Orden #' + String(data.orden.folio).padStart(2, '0') + ' enviada a la caja');
        refreshOrders();
      })
      .catch(function (err) {
        setOnline(false);
        toast(err.message || 'No se pudo enviar la orden', true);
        if (btn) { btn.disabled = false; btn.textContent = 'Reintentar envío'; }
      });
  }

  /* ---------------- mis órdenes ---------------- */

  var STATUS = {
    nueva: { label: 'Enviada', cls: 'nueva' },
    en_caja: { label: 'En caja', cls: 'en_caja' },
    cobrada: { label: 'Cobrada', cls: 'cobrada' },
    cancelada: { label: 'Cancelada', cls: 'cancelada' }
  };

  function orderCard(o) {
    var st = STATUS[o.status] || STATUS.nueva;
    var items = o.items.map(function (it) {
      var meta = [];
      if (it.size && it.size !== 'M' && !/^M$/.test(it.size)) meta.push(SIZES[it.size] ? SIZES[it.size].label : it.size);
      it.extras.forEach(function (id) {
        var ex = EXTRAS.filter(function (x) { return x.id === id; })[0];
        if (ex) meta.push(ex.name);
      });
      return '<div>' + it.qty + ' × <b>' + esc(it.name) + '</b>' +
        (meta.length ? ' <span style="color:#96826f">(' + esc(meta.join(', ')) + ')</span>' : '') + '</div>';
    }).join('');

    return '<div class="order">' +
      '<div class="order-top">' +
        '<div><strong>Mesa ' + esc(o.mesa) + '</strong> <small>· #' + String(o.folio).padStart(2, '0') + ' · ' + hhmm(o.createdAt) + '</small></div>' +
        '<span class="badge ' + st.cls + '">' + st.label + '</span>' +
      '</div>' +
      '<div class="order-items">' + items + '</div>' +
      (o.nota ? '<div class="order-items" style="color:#c9863f">Nota: ' + esc(o.nota) + '</div>' : '') +
      '<div class="total-row"><span>Total</span><span>' + money(o.total) + '</span></div>' +
    '</div>';
  }

  function refreshOrders(silent) {
    if (!state.code) return Promise.resolve();
    return api('/api/ordenes?code=' + encodeURIComponent(state.code))
      .then(function (data) {
        state.orders = data.ordenes || [];
        setOnline(true);
        var open = state.orders.filter(function (o) {
          return o.status === 'nueva' || o.status === 'en_caja';
        }).length;
        var pill = $('orders-count');
        pill.textContent = open;
        pill.hidden = open === 0;
        if (!$('sheet-root').hidden && document.querySelector('[data-orders-sheet]')) renderOrdersSheet();
      })
      .catch(function (err) {
        setOnline(false);
        if (!silent) toast('No se pudieron cargar tus órdenes', true);
      });
  }

  function renderOrdersSheet() {
    var list = state.orders.slice().sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
    var body = list.length
      ? list.map(orderCard).join('')
      : '<p class="empty">Todavía no has enviado órdenes.<br>Arma una desde el menú y toca “Enviar a caja”.</p>';

    openSheet(
      '<div class="sheet-head">' +
        '<div><span class="eyebrow">' + esc(state.me ? state.me.name : 'Mesero') + '</span><h2>Mis órdenes</h2></div>' +
        '<button class="x" data-close-sheet aria-label="Cerrar">×</button>' +
      '</div>' +
      '<div class="sheet-body" data-orders-sheet>' + body + '</div>' +
      '<div class="sheet-foot"><button class="ghost2 primary" data-refresh-orders>Actualizar</button></div>'
    );
  }

  /* ---------------- arranque ---------------- */

  function codeFromUrl() {
    var m = location.pathname.match(/\/m\/([A-Za-z0-9]+)/);
    if (m) return m[1].toUpperCase();
    var params = new URLSearchParams(location.search);
    return (params.get('codigo') || params.get('code') || '').toUpperCase().trim();
  }

  function showGate(message) {
    $('gate').hidden = false;
    $('gate-input').value = state.code || '';
    if (message) {
      $('gate-error').textContent = message;
      $('gate-error').hidden = false;
    }
    setTimeout(function () { $('gate-input').focus(); }, 120);
  }

  function hideGate() { $('gate').hidden = true; }

  function connect() {
    if (!state.code) { showGate(''); return; }

    api('/api/mesero?code=' + encodeURIComponent(state.code))
      .then(function (data) {
        state.me = data.mesero;
        hideGate();
        setOnline(true);
        $('me-name').textContent = state.me.name;
        $('me-code').textContent = 'Código ' + state.me.code;
        $('me-avatar').textContent = state.me.name.trim().charAt(0).toUpperCase();
        document.title = state.me.name + ' · Café Nocturno';

        loadCart();
        state.nota = '';
        renderCats();
        renderProducts();
        updateCartBar();
        refreshOrders(true);
        try { history.replaceState(null, '', '/m/' + state.me.code); } catch (e) {}
      })
      .catch(function (err) {
        setOnline(false);
        showGate(err.message || 'No pudimos validar tu código.');
      });
  }

  /* ---------------- eventos ---------------- */

  document.addEventListener('click', function (e) {
    var t = e.target;

    var close = t.closest('[data-close-sheet]');
    if (close) { closeSheet(); return; }

    var cat = t.closest('[data-cat]');
    if (cat) { state.cat = cat.getAttribute('data-cat'); renderCats(); renderProducts(); return; }

    var card = t.closest('[data-pid]');
    if (card) { openProduct(card.getAttribute('data-pid')); return; }

    var size = t.closest('[data-size]');
    if (size) { state.cfg.size = size.getAttribute('data-size'); renderCfg(); return; }

    var milk = t.closest('[data-milk]');
    if (milk) { state.cfg.milk = milk.getAttribute('data-milk'); renderCfg(); return; }

    var extra = t.closest('[data-extra]');
    if (extra) {
      var id = extra.getAttribute('data-extra');
      var i = state.cfg.extras.indexOf(id);
      if (i >= 0) state.cfg.extras.splice(i, 1);
      else state.cfg.extras.push(id);
      renderCfg();
      return;
    }

    var qty = t.closest('[data-qty]');
    if (qty) {
      state.cfg.qty = Math.max(1, Math.min(30, state.cfg.qty + Number(qty.getAttribute('data-qty'))));
      renderCfg();
      return;
    }

    var add = t.closest('[data-add-line]');
    if (add) {
      var cfg = state.cfg;
      addLine(cfg.pid, { size: cfg.size, milk: cfg.milk, extras: cfg.extras, qty: cfg.qty });
      closeSheet();
      return;
    }

    var lineBtn = t.closest('[data-line]');
    if (lineBtn) {
      var idx = Number(lineBtn.getAttribute('data-line'));
      var delta = Number(lineBtn.getAttribute('data-delta'));
      var line = state.cart[idx];
      if (!line) return;
      line.qty += delta;
      if (line.qty <= 0) state.cart.splice(idx, 1);
      saveCart();
      updateCartBar();
      renderProducts();
      if (state.cart.length) renderCartSheet();
      else closeSheet();
      return;
    }

    var send = t.closest('[data-send]');
    if (send) { sendOrder(); return; }

    if (t.closest('#open-cart')) { renderCartSheet(); return; }

    if (t.closest('#orders-btn')) {
      renderOrdersSheet();
      refreshOrders(true);
      return;
    }

    if (t.closest('[data-refresh-orders]')) { refreshOrders(); return; }
  });

  $('mesa').addEventListener('input', function () {
    this.value = this.value.replace(/[^0-9]/g, '').slice(0, 4);
    try { localStorage.setItem(MESA_KEY, this.value); } catch (e) {}
  });

  $('gate-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var value = ($('gate-input').value || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!value) return;
    state.code = value;
    $('gate-error').hidden = true;
    connect();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('sheet-root').hidden) closeSheet();
  });

  /* ---------------- inicio ---------------- */

  (function init() {
    try { $('mesa').value = localStorage.getItem(MESA_KEY) || ''; } catch (e) {}
    state.code = codeFromUrl();
    connect();

    setInterval(function () {
      if (document.visibilityState === 'visible' && state.me) refreshOrders(true);
    }, 12000);

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && state.me) refreshOrders(true);
    });
  })();
})();
