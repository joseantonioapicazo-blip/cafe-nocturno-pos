/* ============================================================
   Café Nocturno — lógica del punto de venta
   ============================================================ */
(function () {
  'use strict';

  var D = window.POS_DATA;
  var A = window.POS_ART;

  var LS_KEY = 'cafe-nocturno-pos-v1';
  var EXTRA_SHOT = 12;
  var SIZES = {
    S: { key: 'S', label: 'Chico',   f: 0.75, pf: 0.85, ml: '240 ml' },
    M: { key: 'M', label: 'Mediano', f: 1,    pf: 1,    ml: '360 ml' },
    L: { key: 'L', label: 'Grande',  f: 1.3,  pf: 1.16, ml: '480 ml' }
  };
  var MILKS = [
    { id: 'leche',     name: 'Leche entera',      extra: 0 },
    { id: 'lecheDesl', name: 'Leche deslactosada', extra: 0 },
    { id: 'almendra',  name: 'Leche de almendra', extra: 8 },
    { id: 'avena',     name: 'Leche de avena',    extra: 8 }
  ];
  var PAY_METHODS = [
    { id: 'efectivo',      name: 'Efectivo' },
    { id: 'tarjeta',       name: 'Tarjeta' },
    { id: 'transferencia', name: 'Transferencia' }
  ];
  var EXTRAS = [
    { id: 'shot',       name: 'Shot extra de espresso', price: 12, recipe: [['espresso', 30]] },
    { id: 'vainilla',   name: 'Jarabe de vainilla',     price: 10, recipe: [['vainilla', 15]] },
    { id: 'caramelo',   name: 'Jarabe de caramelo',     price: 10, recipe: [['caramelo', 15]] },
    { id: 'chocolate',  name: 'Salsa de chocolate',     price: 10, recipe: [['chocolate', 15]] },
    { id: 'crema',      name: 'Crema batida extra',     price: 12, recipe: [['crema', 20]] }
  ];

  var nf = new Intl.NumberFormat('es-MX');
  var ICON = {
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 11.4v5M12 8.1v.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    cash: '<svg viewBox="0 0 24 24"><rect x="2.5" y="6.5" width="19" height="11" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
    card: '<svg viewBox="0 0 24 24"><rect x="2.5" y="5.5" width="19" height="13" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M2.5 10h19" stroke="currentColor" stroke-width="1.7"/><path d="M6 15h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    transfer: '<svg viewBox="0 0 24 24"><path d="M4 9h13l-3.4-3.4M20 15H7l3.4 3.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 8h14l-1.2 12H6.2L5 8z"/><path d="M9 8V6.4A3 3 0 0 1 12 3.4a3 3 0 0 1 3 3V8"/></svg>',
    cup: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 16h20v12a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8z"/><path d="M32 20h3.5a4.5 4.5 0 0 1 0 9H32" stroke-linecap="round"/><path d="M18 10c0-2.4 2.4-2.4 2.4-4.6M25 10c0-2.4 2.4-2.4 2.4-4.6" stroke-linecap="round" opacity=".6"/></svg>'
  };

  /* ---------------- estado ---------------- */

  function defaultStock() {
    var s = {};
    Object.keys(D.ingredients).forEach(function (k) { s[k] = D.ingredients[k].stock; });
    return s;
  }

  function loadState() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { saved = null; }
    var base = {
      stock: defaultStock(),
      sales: [],
      folio: 1,
      cart: [],
      products: D.products.map(function (p) { return JSON.parse(JSON.stringify(p)); }),
      settings: Object.assign({}, D.settings)
    };
    if (!saved || typeof saved !== 'object') return base;
    var stock = Object.assign(base.stock, saved.stock || {});
    Object.keys(D.ingredients).forEach(function (k) {
      if (typeof stock[k] !== 'number') stock[k] = D.ingredients[k].stock;
    });
    var cart = Array.isArray(saved.cart) ? saved.cart : [];
    cart.forEach(function (l) {
      if (!Array.isArray(l.extras)) {
        l.extras = l.extra ? ['shot'] : [];
      }
    });
    var products = Array.isArray(saved.products) && saved.products.length ? saved.products : base.products;
    products.forEach(function (p) {
      if (p.id === 'matchausucha' && p.vessel === 'demitasse') p.vessel = 'bowl';
    });
    return {
      stock: stock,
      sales: Array.isArray(saved.sales) ? saved.sales : [],
      folio: saved.folio || 1,
      cart: cart,
      products: products,
      settings: Object.assign(base.settings, saved.settings || {})
    };
  }

  var state = loadState();

  /* ---------------- ingredientes (persistencia) ---------------- */
  var ING_KEY = 'cafe-nocturno-ingredients-v1';
  function saveIngredients() {
    try { localStorage.setItem(ING_KEY, JSON.stringify(D.ingredients)); } catch (e) {}
  }
  (function loadIngredients() {
    try {
      var saved = JSON.parse(localStorage.getItem(ING_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        Object.keys(saved).forEach(function (k) {
          D.ingredients[k] = saved[k];
        });
      }
    } catch (e) {}
    // asegurar stock para ingredientes nuevos
    Object.keys(D.ingredients).forEach(function (k) {
      if (typeof state.stock[k] !== 'number') state.stock[k] = D.ingredients[k].stock || 0;
    });
    save();
  })();

  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* almacenamiento no disponible */ }
  }

  /* ---------------- usuarios ---------------- */

  var USERS_KEY = 'cafe-nocturno-users-v1';
  var SESSION_KEY = 'cafe-nocturno-session-v1';
  var ROLES = { admin: 'Administrador', gerente: 'Gerente', cajero: 'Cajero' };

  function defaultUsers() {
    return [
      { id: 'u_admin',   name: 'Mariana Ortega', username: 'admin',   password: 'admin',   role: 'admin' },
      { id: 'u_gerente', name: 'Carlos Mendoza', username: 'gerente', password: 'gerente', role: 'gerente' },
      { id: 'u_cajero',  name: 'Lucía Ramírez',  username: 'cajero',  password: 'cajero',  role: 'cajero' }
    ];
  }

  function loadUsers() {
    try {
      var u = JSON.parse(localStorage.getItem(USERS_KEY) || 'null');
      if (Array.isArray(u) && u.length) return u;
    } catch (e) {}
    var d = defaultUsers();
    try { localStorage.setItem(USERS_KEY, JSON.stringify(d)); } catch (e) {}
    return d;
  }
  function saveUsers(list) { try { localStorage.setItem(USERS_KEY, JSON.stringify(list)); } catch (e) {} }
  function loadSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; } }
  function saveSession(s) { try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) {} }
  function clearSession() { try { localStorage.removeItem(SESSION_KEY); } catch (e) {} }

  var users = loadUsers();
  var currentUser = null;
  (function restoreSession() {
    var s = loadSession();
    if (s && s.userId) {
      for (var i = 0; i < users.length; i++) if (users[i].id === s.userId) { currentUser = users[i]; break; }
    }
  })();

  function roleLabel(r) { return ROLES[r] || r; }
  function can(perm) {
    if (!currentUser) return false;
    var r = currentUser.role;
    var map = {
      venta: ['admin', 'gerente', 'cajero'],
      historial: ['admin', 'gerente', 'cajero'],
      voidSale: ['admin', 'gerente'],
      corte: ['admin', 'gerente'],
      inventarioView: ['admin', 'gerente'],
      inventarioEdit: ['admin', 'gerente'],
      usuarios: ['admin'],
      productos: ['admin'],
      ingredientes: ['admin'],
      recetas: ['admin']
    };
    return (map[perm] || []).indexOf(r) >= 0;
  }

  function genUserId() { return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* ---------------- utilidades ---------------- */

  function $(id) { return document.getElementById(id); }
  function money(n) { return '$' + nf.format(Math.round(n)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n, len) { var s = String(n); while (s.length < len) s = '0' + s; return s; }
  function allProducts() { return (state.products && state.products.length) ? state.products : D.products; }
  function productById(id) {
    var list = allProducts();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function categoryName(id) {
    for (var i = 0; i < D.categories.length; i++) if (D.categories[i].id === id) return D.categories[i].name;
    return '';
  }
  function hasMilk(p) { return p.recipe.some(function (r) { return r[0] === 'leche'; }); }

  /* ---------------- Comanda rápida ---------------- */

  var DRINK_CODES = {
    ESP: 'espresso', ESPRESSO: 'espresso',
    AME: 'americano', AMERICANO: 'americano',
    LAT: 'latte', LATTE: 'latte',
    CAP: 'cappuccino', CAPP: 'cappuccino', CAPPUCCINO: 'cappuccino',
    FLA: 'flatwhite', FLAT: 'flatwhite', FLATWHITE: 'flatwhite',
    MOC: 'mocha', MOCHA: 'mocha',
    MAC: 'macchiato', MACCHIATO: 'macchiato',
    CHAI: 'chailatte', CHAILATTE: 'chailatte',
    CHOC: 'chocolatecal', CHOCOLATE: 'chocolatecal',
    COL: 'coldbrew', COLDBREW: 'coldbrew',
    ICE: 'icedlatte', ICELATTE: 'icedlatte', ICEDLATTE: 'icedlatte',
    FM: 'frappemoka', FMO: 'frappemoka', FRAPPEMOKA: 'frappemoka', MOKA: 'frappemoka',
    FC: 'frappecaramelo', FRAPPECARAMELO: 'frappecaramelo', CARAMEL: 'frappecaramelo',
    MAT: 'matchafrio', MATCHA: 'matchafrio', MATCHAFRIO: 'matchafrio',
    MAN: 'manzanilla', MANZANILLA: 'manzanilla',
    TEN: 'tenegro', TE: 'tenegro', TENEGRO: 'tenegro',
    MUS: 'matchausucha', USUCHA: 'matchausucha', MATCHAUSUCHA: 'matchausucha'
  };
  var MILK_CODES = {
    E: 'leche', ENT: 'leche', ENTERA: 'leche',
    D: 'lecheDesl', DESL: 'lecheDesl', DESLACTOSADA: 'lecheDesl',
    A: 'almendra', ALM: 'almendra', ALMENDRA: 'almendra',
    V: 'avena', AV: 'avena', AVENA: 'avena', O: 'avena'
  };
  var EXTRA_CODES = {
    CR: 'caramelo', CARAMELO: 'caramelo',
    CH: 'chocolate', CHOC: 'chocolate', CHOCOLATE: 'chocolate',
    VA: 'vainilla', VAINILLA: 'vainilla', VANILLA: 'vainilla',
    SH: 'shot', SHOT: 'shot',
    CM: 'crema', CREMA: 'crema'
  };
  var SIZE_CODES = { CH: 'S', S: 'S', CHICO: 'S', SMALL: 'S',
    M: 'M', MED: 'M', MEDIANO: 'M', MEDIUM: 'M',
    G: 'L', GR: 'L', GRANDE: 'L', L: 'L', LARGE: 'L' };

  function parseComanda(str) {
    str = String(str || '').trim();
    if (!str) return null;
    var parts = str.split('-');
    var drinkToken = parts[0].trim();
    // size suffix on drink token
    var size = 'M';
    var m = drinkToken.match(/^([A-Za-z]+)(\d?)([A-Za-z]*)$/);
    // try to extract trailing size letters
    var drinkCode = drinkToken.toUpperCase();
    // check if drinkCode contains a size suffix
    var sizeMatch = drinkCode.match(/(CH|S|M|G|GR|L)$/);
    // only treat as size if the rest is a known drink code
    var candidateDrink = drinkCode;
    var candidateSize = null;
    if (sizeMatch) {
      var suf = sizeMatch[1];
      var base = drinkCode.slice(0, drinkCode.length - suf.length);
      if (DRINK_CODES[base]) { candidateDrink = base; candidateSize = suf; }
    }
    var pid = DRINK_CODES[candidateDrink];
    if (!pid) return null;
    var p = productById(pid);
    if (!p) return null;
    if (candidateSize && SIZE_CODES[candidateSize]) size = SIZE_CODES[candidateSize];

    var milk = 'leche';
    var extras = [];
    for (var i = 1; i < parts.length; i++) {
      var part = parts[i].trim();
      if (!part) continue;
      // size token standalone
      var up = part.toUpperCase();
      if (SIZE_CODES[up] && !MILK_CODES[up] && !EXTRA_CODES[up]) { size = SIZE_CODES[up]; continue; }
      var subs = part.split('+');
      subs.forEach(function (sub, idx) {
        var code = sub.trim().toUpperCase();
        if (!code) return;
        if (idx === 0) {
          if (MILK_CODES[code]) { milk = MILK_CODES[code]; return; }
          if (EXTRA_CODES[code]) { if (extras.indexOf(EXTRA_CODES[code]) < 0) extras.push(EXTRA_CODES[code]); return; }
          if (SIZE_CODES[code]) { size = SIZE_CODES[code]; return; }
        } else {
          if (EXTRA_CODES[code]) { if (extras.indexOf(EXTRA_CODES[code]) < 0) extras.push(EXTRA_CODES[code]); return; }
          if (SIZE_CODES[code]) { size = SIZE_CODES[code]; return; }
        }
      });
    }
    // map extra codes to EXTRAS ids
    var extraIds = [];
    extras.forEach(function (c) {
      if (c === 'shot') extraIds.push('shot');
      else if (c === 'crema') extraIds.push('crema');
      else extraIds.push(c); // caramelo/chocolate/vainilla are extra ids already
    });
    return { pid: pid, size: size, milk: milk, extras: extraIds, qty: 1 };
  }

  function addComanda(str) {
    var parsed = parseComanda(str);
    if (!parsed) { toast('Comanda no reconocida'); return false; }
    var p = productById(parsed.pid);
    addToCart(p, parsed);
    var input = $('comanda-input');
    if (input) input.value = '';
    toast(p.name + ' agregado (' + str.trim() + ')');
    return true;
  }
  function hasEspresso(p) { return p.recipe.some(function (r) { return r[0] === 'espresso'; }); }
  function isDrink(p) { return !p.art; }
  function sizeOf(p, s) { return p.sizes === false ? SIZES.M : (SIZES[s] || SIZES.M); }

  function money0(n) { return nf.format(Math.round(n)); }
  function fmtNum(n) {
    var r = Math.round(n * 100) / 100;
    if (Number.isInteger(r)) return String(r);
    var s = r.toFixed(2).replace(/0+$/, '');
    return s.endsWith('.') ? s + '0' : s;
  }

  /* color de texto legible sobre un color de ingrediente */
  function ink(hex) {
    var h = String(hex).replace('#', '');
    var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 148 ? 'rgba(22,14,8,.82)' : 'rgba(255,250,244,.94)';
  }

  /* ---------------- recetas ---------------- */

  function recipeFor(p, o) {
    o = o || {};
    var size = p.sizes === false ? 'M' : (o.size || 'M');
    var f = sizeOf(p, size).f;
    var milk = o.milk || 'leche';
    var extras = Array.isArray(o.extras) ? o.extras.slice() : (o.extra ? ['shot'] : []);
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
        var key = row[0];
        var amt = row[1];
        map.set(key, (map.get(key) || 0) + amt);
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
    var extras = Array.isArray(o.extras) ? o.extras.slice() : (o.extra ? ['shot'] : []);
    extras.forEach(function (id) {
      var ex = EXTRAS.filter(function (x) { return x.id === id; })[0];
      if (!ex) return;
      if (id === 'shot' && !hasEspresso(p)) return;
      price += ex.price;
    });
    return Math.round(price);
  }

  function artOf(p, opts) {
    var pp = Object.assign({}, p, { capacity: p.capacity || vesselCap(p.vessel) });
    return A.product(pp, recipeFor(p, opts));
  }

  function milkName(id) {
    var m = MILKS.filter(function (x) { return x.id === id; })[0];
    return m ? m.name : 'Leche entera';
  }

  /* ---------------- carrito ---------------- */

  var viewed = { cat: 'all', q: '', view: 'venta' };

  function cartLine(uid) {
    for (var i = 0; i < state.cart.length; i++) if (state.cart[i].uid === uid) return state.cart[i];
    return null;
  }

  function cartTotals() {
    var total = 0, count = 0;
    state.cart.forEach(function (l) {
      var p = productById(l.pid);
      if (!p) return;
      total += unitPrice(p, l) * l.qty;
      count += l.qty;
    });
    var rate = Number(state.settings.taxRate) || 0;
    var tax = total - total / (1 + rate / 100);
    return { total: total, tax: tax, count: count, subtotal: total };
  }

  function addToCart(p, opts) {
    var existing = null;
    for (var i = 0; i < state.cart.length; i++) {
      var l = state.cart[i];
      var sameExtras = JSON.stringify(l.extras || []) === JSON.stringify(opts.extras || []);
      if (l.pid === p.id && l.size === opts.size && l.milk === opts.milk && sameExtras) {
        existing = l; break;
      }
    }
    if (existing) existing.qty += opts.qty;
    else {
      state.cart.push({
        uid: 'l' + Date.now() + Math.random().toString(36).slice(2, 6),
        pid: p.id,
        size: p.sizes === false ? 'M' : opts.size,
        milk: opts.milk,
        extras: Array.isArray(opts.extras) ? opts.extras.slice() : [],
        extra: !!(opts.extras && opts.extras.length),
        qty: opts.qty
      });
    }
    save();
    renderCart();
  }

  /* ---------------- render: venta ---------------- */

  function renderChips() {
    var counts = {};
    allProducts().forEach(function (p) { counts[p.cat] = (counts[p.cat] || 0) + 1; });
    var html = '<button class="chip' + (viewed.cat === 'all' ? ' is-active' : '') + '" data-cat="all">Todo <span class="chip-count">' + allProducts().length + '</span></button>';
    D.categories.forEach(function (c) {
      html += '<button class="chip' + (viewed.cat === c.id ? ' is-active' : '') + '" data-cat="' + c.id + '">' +
        esc(c.name) + ' <span class="chip-count">' + (counts[c.id] || 0) + '</span></button>';
    });
    $('cats').innerHTML = html;
  }

  function volumeText(p) {
    var rec = recipeFor(p, {});
    var units = {};
    rec.forEach(function (r) { units[r.unit] = (units[r.unit] || 0) + r.amount; });
    if (p.art) return money0(units.g || 0) + ' g · pieza';
    if (units.ml) return money0(units.ml) + ' ml · ' + rec.length + ' ingr.';
    return rec.length + ' ingredientes';
  }

  function renderProducts() {
    var q = viewed.q.trim().toLowerCase();
    var list = allProducts().filter(function (p) {
      if (viewed.cat !== 'all' && p.cat !== viewed.cat) return false;
      if (!q) return true;
      if (p.name.toLowerCase().indexOf(q) > -1) return true;
      if ((p.desc || '').toLowerCase().indexOf(q) > -1) return true;
      return p.recipe.some(function (r) {
        var ing = D.ingredients[r[0]];
        return ing && ing.name.toLowerCase().indexOf(q) > -1;
      });
    });

    $('products').innerHTML = list.map(function (p) {
      var price = unitPrice(p, { size: 'M', milk: 'leche' });
      var from = unitPrice(p, { size: 'S', milk: 'leche' });
      return '<div class="card" data-open="' + p.id + '" tabindex="0" role="button" aria-label="Ver ' + esc(p.name) + '">' +
        '<div class="card-art">' + artOf(p, { size: 'M', milk: 'leche' }) + '</div>' +
        '<button class="card-info-btn" data-info="' + p.id + '" title="Ver dibujo y proporciones" aria-label="Ver receta de ' + esc(p.name) + '">' + ICON.info + '</button>' +
        '<div class="card-info">' +
          '<span class="card-name">' + esc(p.name) + '</span>' +
          '<span class="card-meta">' + volumeText(p) + '</span>' +
          '<span class="card-price">' + money(price) +
            (p.sizes === false ? '' : '<span class="size-hint">desde ' + money(from) + '</span>') +
          '</span>' +
        '</div>' +
      '</div>';
    }).join('');

    $('no-results').hidden = list.length > 0;
  }

  function renderCart() {
    var items = $('cart-items');
    $('cart-folio').textContent = '#' + pad(state.folio, 4);

    if (!state.cart.length) {
      items.innerHTML = '<div class="cart-empty">' +
        '<span class="glyph">' + ICON.cup + '</span>' +
        '<b>Ticket vacío</b>' +
        '<span>Toca un producto del menú para empezar la venta.</span>' +
        '</div>';
    } else {
      items.innerHTML = state.cart.map(function (l) {
        var p = productById(l.pid);
        if (!p) return '';
        var unit = unitPrice(p, l);
        var meta = [];
        if (p.sizes !== false) meta.push(SIZES[l.size] ? SIZES[l.size].label : 'Mediano');
        if (hasMilk(p) && l.milk !== 'leche') meta.push(milkName(l.milk));
        var extras = Array.isArray(l.extras) ? l.extras : (l.extra ? ['shot'] : []);
        extras.forEach(function (id) {
          var ex = EXTRAS.filter(function (x) { return x.id === id; })[0];
          if (ex) meta.push(ex.name);
        });
        return '<div class="line" data-line="' + l.uid + '">' +
          '<div class="line-art" data-edit="' + l.uid + '">' + artOf(p, l) + '</div>' +
          '<div class="line-body" data-edit="' + l.uid + '">' +
            '<div class="line-title">' + esc(p.name) + '</div>' +
            '<div class="line-meta">' + esc(meta.join(' · ') || 'Sin opciones') + '</div>' +
          '</div>' +
          '<div class="line-right">' +
            '<span class="line-price">' + money(unit * l.qty) + '</span>' +
            '<div class="stepper">' +
              '<button data-dec="' + l.uid + '" aria-label="Quitar uno">−</button>' +
              '<span class="qty">' + l.qty + '</span>' +
              '<button data-inc="' + l.uid + '" aria-label="Agregar uno">+</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    var t = cartTotals();
    $('sum-subtotal').textContent = money(t.subtotal);
    $('sum-tax').textContent = money(t.tax);
    $('sum-count').textContent = t.count;
    $('sum-total').textContent = money(t.total);
    $('checkout-amount').textContent = money(t.total);
    $('checkout').disabled = state.cart.length === 0;
    $('clear-cart').disabled = state.cart.length === 0;
  }

  /* ---------------- modal base ---------------- */

  var modalRoot = $('modal-root');
  var modalCard = $('modal-card');

  function openModal(html) {
    modalCard.innerHTML = '<button class="modal-close" data-close-modal aria-label="Cerrar">' + ICON.close + '</button>' + html;
    modalRoot.hidden = false;
    modalCard.scrollTop = 0;
  }
  function closeModal() {
    modalRoot.hidden = true;
    modalCard.innerHTML = '';
  }

  /* ---------------- configurador de producto ---------------- */

  var cfg = null;

  function openProduct(id, uid) {
    var p = productById(id);
    if (!p) return;
    var line = uid ? cartLine(uid) : null;
    cfg = {
      pid: id,
      uid: uid || null,
      size: line ? line.size : 'M',
      milk: line ? line.milk : 'leche',
      extras: line ? (Array.isArray(line.extras) ? line.extras.slice() : (line.extra ? ['shot'] : [])) : [],
      qty: line ? line.qty : 1
    };
    renderCfg();
  }

  function renderCfg() {
    var p = productById(cfg.pid);
    if (!p) return;
    var opts = { size: cfg.size, milk: cfg.milk, extras: cfg.extras };
    var rec = recipeFor(p, opts);
    var price = unitPrice(p, opts);
    var drink = isDrink(p);
    var size = sizeOf(p, cfg.size);
    var totalAmt = rec.reduce(function (s, r) { return s + r.amount; }, 0);
    var unitSet = {};
    rec.forEach(function (r) { unitSet[r.unit] = true; });
    var oneUnit = Object.keys(unitSet).length === 1 ? Object.keys(unitSet)[0] : null;

    var segs = rec.map(function (r) {
      return '<div class="comp-seg" style="width:' + r.pct.toFixed(2) + '%;background:' + r.color + ';color:' + ink(r.color) + '">' +
        (r.pct >= 13 ? '<span>' + Math.round(r.pct) + '%</span>' : '') + '</div>';
    }).join('');

    var legend = rec.map(function (r) {
      return '<div class="legend-item">' +
        '<span class="swatch" style="background:' + r.color + '"></span>' +
        '<span class="legend-name"><b>' + esc(r.name) + '</b></span>' +
        '<span class="legend-val">' + money0(r.amount) + ' ' + r.unit + ' · ' + Math.round(r.pct) + '%</span>' +
        '</div>';
    }).join('');

    var sizeRow = '';
    if (p.sizes !== false) {
      sizeRow = '<div class="opt"><span class="opt-label">Tamaño</span><div class="sizes">' +
        ['S', 'M', 'L'].map(function (k) {
          return '<button class="size-btn' + (cfg.size === k ? ' is-active' : '') + '" data-size="' + k + '">' +
            '<b>' + SIZES[k].label + '</b><small>' + SIZES[k].ml + '</small></button>';
        }).join('') + '</div></div>';
    }

    var milkRow = '';
    if (hasMilk(p)) {
      milkRow = '<div class="opt"><span class="opt-label">Tipo de leche</span>' +
        '<select class="select" data-milk>' +
        MILKS.map(function (m) {
          return '<option value="' + m.id + '"' + (cfg.milk === m.id ? ' selected' : '') + '>' +
            m.name + (m.extra ? ' (+' + money(m.extra) + ')' : '') + '</option>';
        }).join('') + '</select></div>';
    }

    var availExtras = isDrink(p) ? EXTRAS.filter(function (x) {
      if (x.id === 'shot' && !hasEspresso(p)) return false;
      return true;
    }) : [];
    var extrasRow = '';
    if (availExtras.length) {
      extrasRow = '<div class="opt" style="grid-column:1/-1"><span class="opt-label">Extras (costo adicional)</span>' +
        '<div class="extras">' + availExtras.map(function (x) {
          var on = cfg.extras.indexOf(x.id) > -1;
          return '<label class="extra-chip' + (on ? ' is-on' : '') + '">' +
            '<input type="checkbox" data-extra-id="' + x.id + '"' + (on ? ' checked' : '') + '>' +
            '<span>' + esc(x.name) + '</span><b>+' + money(x.price) + '</b></label>';
        }).join('') + '</div></div>';
    }

    var measure = oneUnit
      ? money0(totalAmt) + ' ' + oneUnit + ' en total'
      : rec.length + ' ingredientes';

    openModal(
      '<div class="detail">' +
        '<div class="detail-art">' +
          artOf(p, opts) +
          '<span class="art-caption">' + (drink ? 'Dibujo de la bebida' : 'Dibujo del producto') + '</span>' +
        '</div>' +
        '<div class="detail-body">' +
          '<div class="detail-top">' +
            '<span class="detail-cat">' + esc(categoryName(p.cat)) + '</span>' +
            '<h2 class="detail-title">' + esc(p.name) + '</h2>' +
            '<p class="detail-desc">' + esc(p.desc) + '</p>' +
          '</div>' +

          '<div class="comp">' +
            '<div class="comp-head">' +
              '<h3>Proporción de ingredientes</h3>' +
              '<span class="comp-note">' + measure + '</span>' +
            '</div>' +
            '<div class="comp-bar">' + segs + '</div>' +
            '<div class="legend">' + legend + '</div>' +
          '</div>' +

          ((p.sizes !== false || hasMilk(p) || availExtras.length)
            ? '<div class="options">' + sizeRow + milkRow + extrasRow + '</div>' : '') +

          '<div class="detail-foot">' +
            '<div class="price-preview">' +
              '<span>' + (p.sizes === false ? 'Precio' : size.label + ' · ' + size.ml) + '</span>' +
              '<strong>' + money(price * cfg.qty) + '</strong>' +
            '</div>' +
            '<div class="foot-actions">' +
              '<div class="qty-control">' +
                '<button data-cfg-qty="-1" aria-label="Menos">−</button>' +
                '<span class="qty">' + cfg.qty + '</span>' +
                '<button data-cfg-qty="1" aria-label="Más">+</button>' +
              '</div>' +
              '<button class="btn btn-primary" data-cfg-save>' + (cfg.uid ? 'Actualizar ticket' : 'Agregar al ticket') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  /* ---------------- cobro ---------------- */

  var pay = { method: 'efectivo', received: 0, sale: null };

  function openCheckout() {
    if (!state.cart.length) return;
    pay = { method: 'efectivo', received: 0, sale: null };
    renderPay();
  }

  function renderPay() {
    var t = cartTotals();
    var methods = PAY_METHODS.map(function (m) {
      var ic = m.id === 'efectivo' ? ICON.cash : (m.id === 'tarjeta' ? ICON.card : ICON.transfer);
      return '<button class="method' + (pay.method === m.id ? ' is-active' : '') + '" data-method="' + m.id + '">' +
        ic + '<span>' + m.name + '</span></button>';
    }).join('');

    var cashPanel = '';
    if (pay.method === 'efectivo') {
      var rec = pay.received || 0;
      var diff = rec - t.total;
      var exacto = t.total;
      var quick = [50, 100, 200, 500].map(function (v) {
        return '<button data-cash="' + v + '">$' + v + '</button>';
      }).join('');
      cashPanel = '<div class="cash-box">' +
        '<div class="cash-input"><span>$</span><input id="cash-input" type="number" min="0" step="1" inputmode="numeric" placeholder="' + Math.round(t.total) + '" value="' + (pay.received ? Math.round(pay.received) : '') + '"></div>' +
        '<div class="quick-cash">' + quick + '<button data-cash="exact">Exacto</button></div>' +
        '<div class="change-row' + (rec > 0 && diff < 0 ? ' is-short' : '') + '" id="change-row">' +
          '<span>' + (rec > 0 && diff < 0 ? 'Falta por cubrir' : 'Cambio') + '</span>' +
          '<strong id="change-value">' + money(Math.abs(rec > 0 ? diff : 0)) + '</strong>' +
        '</div>' +
      '</div>';
    }

    var items = state.cart.map(function (l) {
      var p = productById(l.pid);
      if (!p) return '';
      var opts = [];
      if (p.sizes !== false) opts.push((SIZES[l.size] || SIZES.M).label);
      if (hasMilk(p) && l.milk !== 'leche') opts.push(milkName(l.milk));
      var extras2 = Array.isArray(l.extras) ? l.extras : (l.extra ? ['shot'] : []);
      extras2.forEach(function (id) {
        var ex = EXTRAS.filter(function (x) { return x.id === id; })[0];
        if (ex) opts.push(ex.name);
      });
      return '<div class="total-row"><span>' + l.qty + ' × ' + esc(p.name) +
        (opts.length ? ' <span style="color:#7d6a5a">(' + esc(opts.join(', ')) + ')</span>' : '') +
        '</span><span>' + money(unitPrice(p, l) * l.qty) + '</span></div>';
    }).join('');

    var change = pay.method === 'efectivo' ? money(Math.max(0, (pay.received || 0) - t.total)) : money(0);
    var canPay = pay.method !== 'efectivo' || (pay.received || 0) >= t.total;

    openModal(
      '<div class="pay">' +
        '<div class="pay-head">' +
          '<div><h2>Cobrar ticket</h2><p style="font-size:13px;color:var(--muted);margin-top:4px">' + t.count + ' artículo' + (t.count === 1 ? '' : 's') + ' · IVA incluido</p></div>' +
          '<div class="pay-total"><span>Total</span><strong>' + money(t.total) + '</strong></div>' +
        '</div>' +
        '<div class="methods">' + methods + '</div>' +
        cashPanel +
        '<div class="pay-summary">' + items +
          '<div class="total-row muted" style="margin-top:6px"><span>IVA incluido (' + state.settings.taxRate + ' %)</span><span>' + money(t.tax) + '</span></div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:14px">' +
          '<span style="font-size:12.5px;color:var(--muted)">' +
            (pay.method === 'efectivo' ? 'Cambio: <b style="color:var(--ok)">' + change + '</b>' : 'Cobro con ' + (pay.method === 'tarjeta' ? 'terminal' : 'transferencia')) +
          '</span>' +
          '<button class="btn btn-primary" data-confirm style="padding:14px 26px"' + (canPay ? '' : ' disabled') + '>' +
            'Confirmar cobro · ' + money(t.total) + '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function updateChange() {
    var t = cartTotals();
    var rec = pay.received || 0;
    var row = $('change-row');
    var val = $('change-value');
    if (!row || !val) return;
    var diff = rec - t.total;
    row.classList.toggle('is-short', diff < 0 && rec > 0);
    row.firstElementChild.textContent = diff < 0 && rec > 0 ? 'Falta por cubrir' : 'Cambio';
    val.textContent = money(Math.abs(rec > 0 ? diff : 0));
    var btn = modalCard.querySelector('[data-confirm]');
    if (btn) btn.disabled = pay.method === 'efectivo' && rec < t.total;
  }

  function saleItems() {
    return state.cart.map(function (l) {
      var p = productById(l.pid);
      var rec = recipeFor(p, l);
      return {
        pid: p.id,
        name: p.name,
        size: l.size,
        milk: l.milk,
        extra: !!l.extra,
        qty: l.qty,
        unit: unitPrice(p, l),
        total: unitPrice(p, l) * l.qty,
        recipe: rec.map(function (r) { return { key: r.key, amount: r.amount }; })
      };
    });
  }

  function adjustStock(items, sign) {
    items.forEach(function (it) {
      it.recipe.forEach(function (r) {
        var ing = D.ingredients[r.key];
        if (!ing || !ing.track) return;
        var cur = typeof state.stock[r.key] === 'number' ? state.stock[r.key] : ing.stock;
        var unitSize = ing.unitSize || 1;
        var consumed = (r.amount / unitSize) * it.qty;
        state.stock[r.key] = Math.max(0, Math.round((cur + sign * consumed) * 10000) / 10000);
      });
    });
  }

  function completeSale() {
    var t = cartTotals();
    var items = saleItems();
    if (!items.length) return;
    var sale = {
      folio: state.folio,
      at: Date.now(),
      items: items,
      total: t.total,
      tax: t.tax,
      method: pay.method,
      received: pay.method === 'efectivo' ? (pay.received || t.total) : t.total,
      change: pay.method === 'efectivo' ? Math.max(0, (pay.received || 0) - t.total) : 0,
      cashier: state.settings.cashier,
      voided: false
    };
    adjustStock(items, -1);
    state.sales.unshift(sale);
    state.folio = state.folio + 1;
    state.cart = [];
    save();
    renderCart();
    renderProducts();
    toast('Venta #' + pad(sale.folio, 4) + ' cobrada · ' + money(sale.total));
    openTicket(sale);
  }

  /* ---------------- ticket ---------------- */

  function fmtDateTime(ts) {
    var d = new Date(ts);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' +
      d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  function barcode(seed) {
    var x = (seed * 7919 + 13) % 97;
    var out = '';
    for (var i = 0; i < 52; i++) {
      x = (x * 37 + 29) % 101;
      out += '<i style="width:' + (x % 4 === 0 ? 3 : 1.5) + 'px;opacity:' + (x % 5 === 0 ? .5 : 1) + '"></i>';
    }
    return out;
  }

  function ticketHTML(sale) {
    var items = sale.items.map(function (it) {
      var opts = [];
      if (it.size && it.size !== 'M') opts.push('tamaño ' + (SIZES[it.size] || SIZES.M).label);
      if (it.milk && it.milk !== 'leche') opts.push(milkName(it.milk));
      if (it.extra) opts.push('shot extra');
      return '<div class="ticket-line"><span class="t-name">' + it.qty + ' × ' + esc(it.name) +
        (opts.length ? '<small>' + esc(opts.join(' · ')) + '</small>' : '') +
        '</span><span>' + money(it.total) + '</span></div>';
    }).join('');

    return '<div class="ticket">' +
      '<div class="ticket-head">' +
        '<h3>' + esc(state.settings.name) + '</h3>' +
        '<p>' + esc(state.settings.tagline) + '</p>' +
        '<p>RFC: CNO240118K21 · Tel. 55 4821 9090</p>' +
      '</div>' +
      '<div class="ticket-meta">' +
        '<span>Ticket #' + pad(sale.folio, 4) + '</span>' +
        '<span>' + esc(fmtDateTime(sale.at)) + '</span>' +
      '</div>' +
      '<div class="ticket-meta"><span>Cajero: ' + esc(sale.cashier) + '</span><span>' + esc(state.settings.register) + '</span></div>' +
      '<div class="ticket-items">' + items + '</div>' +
      '<div class="ticket-tot">' +
        '<div><span>Subtotal</span><span>' + money(sale.total - sale.tax) + '</span></div>' +
        '<div><span>IVA (' + state.settings.taxRate + ' %)</span><span>' + money(sale.tax) + '</span></div>' +
        '<div class="big"><span>TOTAL</span><span>' + money(sale.total) + '</span></div>' +
        '<div><span>' + (sale.method === 'efectivo' ? 'Efectivo' : sale.method === 'tarjeta' ? 'Tarjeta' : 'Transferencia') + '</span><span>' + money(sale.received) + '</span></div>' +
        (sale.method === 'efectivo' ? '<div><span>Cambio</span><span>' + money(sale.change) + '</span></div>' : '') +
      '</div>' +
      '<div class="barcode">' + barcode(sale.folio) + '</div>' +
      '<div class="ticket-foot">' + esc(state.settings.footer) + '<br>Conserva tu ticket · ' + pad(sale.folio, 4) + '-' + new Date(sale.at).getFullYear() + '</div>' +
    '</div>';
  }

  function openTicket(sale) {
    openModal(
      '<div class="ticket-wrap">' +
        ticketHTML(sale) +
        '<div class="ticket-actions">' +
          '<button class="btn btn-block" data-print>Imprimir ticket</button>' +
          '<button class="btn btn-primary btn-block" data-close-modal>Nueva venta</button>' +
        '</div>' +
      '</div>'
    );
  }

  /* ---------------- vistas: corte ---------------- */

  function sameDay(ts, d) {
    var a = new Date(ts), b = d || new Date();
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function daySales() {
    return state.sales.filter(function (s) { return sameDay(s.at) && !s.voided; });
  }

  function renderCorte() {
    var sales = daySales();
    var total = sales.reduce(function (s, x) { return s + x.total; }, 0);
    var tickets = sales.length;
    var avg = tickets ? total / tickets : 0;
    var units = sales.reduce(function (s, x) {
      return s + x.items.reduce(function (a, i) { return a + i.qty; }, 0);
    }, 0);

    var byProduct = {};
    sales.forEach(function (s) {
      s.items.forEach(function (it) {
        var e = byProduct[it.pid] || (byProduct[it.pid] = { name: it.name, qty: 0, total: 0 });
        e.qty += it.qty;
        e.total += it.total;
      });
    });
    var top = Object.keys(byProduct).map(function (k) { return byProduct[k]; })
      .sort(function (a, b) { return b.qty - a.qty; }).slice(0, 6);
    var maxQty = top.length ? top[0].qty : 1;

    var byMethod = { efectivo: 0, tarjeta: 0, transferencia: 0 };
    sales.forEach(function (s) { byMethod[s.method] = (byMethod[s.method] || 0) + s.total; });

    var low = Object.keys(D.ingredients).filter(function (k) {
      var ing = D.ingredients[k];
      if (!ing.track) return false;
      return (state.stock[k] || 0) <= ing.min;
    }).sort(function (a, b) {
      var ra = (state.stock[a] || 0) / (D.ingredients[a].cap || 1);
      var rb = (state.stock[b] || 0) / (D.ingredients[b].cap || 1);
      return ra - rb;
    }).slice(0, 5);

    var statsPrev = state.sales.filter(function (s) {
      var d = new Date(); d.setDate(d.getDate() - 1);
      return sameDay(s.at, d) && !s.voided;
    }).reduce(function (a, s) { return a + s.total; }, 0);

    var html = '';

    html += '<div class="page-head">' +
      '<div><h2>Corte de caja</h2><p>' + new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</p></div>' +
      '<div class="head-actions">' +
        '<button class="btn btn-sm" data-export>Exportar CSV</button>' +
        '<button class="btn btn-sm btn-danger" data-reset-day>Nueva jornada</button>' +
      '</div></div>';

    html += '<div class="kpis">' +
      kpi('Ventas del día', money(total), tickets + ' ticket' + (tickets === 1 ? '' : 's') + ' · ' + units + ' artículos') +
      kpi('Ticket promedio', money(avg), 'Ayer: ' + money(statsPrev)) +
      kpi('Efectivo en caja', money(byMethod.efectivo), Math.round(total ? byMethod.efectivo / total * 100 : 0) + ' % del total') +
      kpi('Bajo inventario', String(low.length) + ' <small>insumos</small>', low.length ? 'Revisa la sección de inventario' : 'Todo en orden') +
    '</div>';

    html += '<div class="panels">' +
      '<div class="panel"><div class="panel-head"><h3>Productos más vendidos</h3><span>Hoy</span></div>' +
        (top.length ? '<div class="bar-list">' + top.map(function (p) {
          return '<div class="bar-row"><div class="bar-top"><b>' + esc(p.name) + '</b><span>' + p.qty + ' · ' + money(p.total) + '</span></div>' +
            '<div class="bar-track"><div class="bar-fill" style="width:' + Math.max(6, p.qty / maxQty * 100).toFixed(1) + '%"></div></div></div>';
        }).join('') + '</div>' : '<div class="empty-state"><b>Aún sin ventas</b><span>Los productos aparecerán aquí conforme se vendan.</span></div>') +
      '</div>' +
      '<div class="panel"><div class="panel-head"><h3>Formas de pago</h3><span>' + money(total) + '</span></div>' +
        '<div class="pay-mix">' + PAY_METHODS.map(function (m) {
          var amt = byMethod[m.id] || 0;
          var ic = m.id === 'efectivo' ? ICON.cash : (m.id === 'tarjeta' ? ICON.card : ICON.transfer);
          return '<div class="pay-item"><span class="pay-icon">' + ic + '</span>' +
            '<span class="pay-name"><b>' + m.name + '</b><span>' + (total ? Math.round(amt / total * 100) : 0) + ' % del cobrado</span></span>' +
            '<span class="pay-amount">' + money(amt) + '</span></div>';
        }).join('') + '</div>' +
        '<div class="panel-head" style="margin-top:6px;border-top:1px solid var(--line-soft);padding-top:14px"><h3>Insumos por agotarse</h3><span>Stock</span></div>' +
        (low.length ? '<div class="bar-list">' + low.map(function (k) {
          var ing = D.ingredients[k];
          var pct = Math.min(100, (state.stock[k] || 0) / (ing.cap || 1) * 100);
          return '<div class="bar-row"><div class="bar-top"><b>' + esc(ing.name) + '</b><span>' + fmtNum(state.stock[k] || 0) + ' ' + (ing.unitName || 'unidad') + '</span></div>' +
            '<div class="bar-track"><div class="bar-fill ' + ((state.stock[k] || 0) <= 0 ? 'bad' : 'warn') + '" style="width:' + Math.max(3, pct).toFixed(1) + '%"></div></div></div>';
        }).join('') + '</div>' : '<p style="font-size:12.5px;color:var(--muted)">Sin alertas de inventario.</p>') +
      '</div>' +
    '</div>';

    html += '<div class="panel"><div class="panel-head"><h3>Datos del negocio</h3><span>Se imprimen en el ticket</span></div>' +
      '<div class="settings">' +
        '<div class="field"><label for="set-name">Nombre</label><input id="set-name" value="' + esc(state.settings.name) + '"></div>' +
        '<div class="field"><label for="set-tagline">Giro</label><input id="set-tagline" value="' + esc(state.settings.tagline) + '"></div>' +
        '<div class="field"><label for="set-cashier">Cajero</label><input id="set-cashier" value="' + esc(state.settings.cashier) + '"></div>' +
        '<div class="field"><label for="set-register">Caja</label><input id="set-register" value="' + esc(state.settings.register) + '"></div>' +
        '<div class="field"><label for="set-tax">IVA (%)</label><input id="set-tax" type="number" min="0" max="30" value="' + esc(state.settings.taxRate) + '"></div>' +
        '<div class="field"><label for="set-footer">Mensaje del ticket</label><input id="set-footer" value="' + esc(state.settings.footer) + '"></div>' +
      '</div>' +
      '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:4px">' +
        '<button class="btn" data-save-settings>Guardar datos</button>' +
      '</div>' +
    '</div>';

    $('view-corte').innerHTML = '<div class="page">' + html + '</div>';
  }

  function kpi(label, value, foot) {
    return '<div class="kpi"><span class="kpi-label">' + label + '</span>' +
      '<span class="kpi-value">' + value + '</span>' +
      '<span class="kpi-foot">' + foot + '</span></div>';
  }

  /* ---------------- vistas: historial ---------------- */

  var histQ = '';

  function renderHistorial() {
    var list = state.sales.filter(function (s) {
      if (!histQ) return true;
      return String(s.folio).indexOf(histQ) > -1 || s.items.some(function (i) {
        return i.name.toLowerCase().indexOf(histQ.toLowerCase()) > -1;
      });
    });

    var rows = list.map(function (s) {
      var units = s.items.reduce(function (a, i) { return a + i.qty; }, 0);
      return '<tr class="' + (s.voided ? 'is-void' : '') + '">' +
        '<td class="strong">#' + pad(s.folio, 4) + '</td>' +
        '<td>' + esc(fmtDateTime(s.at)) + '</td>' +
        '<td>' + esc(s.items.map(function (i) { return i.name; }).slice(0, 2).join(', ')) + (s.items.length > 2 ? ' +' + (s.items.length - 2) : '') + '</td>' +
        '<td class="num">' + units + '</td>' +
        '<td><span class="pill ' + (s.voided ? 'void' : s.method) + '">' + (s.voided ? 'Cancelada' : (s.method === 'efectivo' ? 'Efectivo' : s.method === 'tarjeta' ? 'Tarjeta' : 'Transferencia')) + '</span></td>' +
        '<td class="num strong">' + money(s.total) + '</td>' +
        '<td style="text-align:right;white-space:nowrap">' +
          '<button class="row-btn" data-ticket="' + s.folio + '">Ver</button> ' +
          (s.voided || !can('voidSale') ? '' : '<button class="row-btn" data-void="' + s.folio + '">Cancelar</button>') +
        '</td>' +
      '</tr>';
    }).join('');

    var total = list.filter(function (s) { return !s.voided; }).reduce(function (a, s) { return a + s.total; }, 0);

    $('view-historial').innerHTML = '<div class="page">' +
      '<div class="page-head"><div><h2>Historial de ventas</h2><p>' + list.length + ' tickets · ' + money(total) + ' cobrados</p></div>' +
        '<div class="head-actions"><label class="search" style="height:40px"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>' +
        '<input id="hist-search" placeholder="Folio o producto…" value="' + esc(histQ) + '"></label></div></div>' +
      (list.length ? '<div class="table-wrap"><table class="sales"><thead><tr>' +
        '<th>Folio</th><th>Fecha</th><th>Productos</th><th>Art.</th><th>Pago</th><th>Total</th><th></th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<div class="empty-state"><b>Sin ventas registradas</b><span>Cuando cobres el primer ticket aparecerá aquí con su detalle completo.</span></div>') +
    '</div>';
  }

  /* ---------------- vistas: inventario ---------------- */

  var invGroup = 'all';

  function renderInventario() {
    var groups = ['all'];
    Object.keys(D.ingredients).forEach(function (k) {
      var g = D.ingredients[k].group;
      if (groups.indexOf(g) === -1) groups.push(g);
    });

    var keys = Object.keys(D.ingredients).filter(function (k) {
      var ing = D.ingredients[k];
      if (!ing.track) return false;
      return invGroup === 'all' || ing.group === invGroup;
    });

    var lowCount = keys.filter(function (k) {
      return (state.stock[k] || 0) <= D.ingredients[k].min;
    }).length;

    var chips = groups.map(function (g) {
      return '<button class="chip' + (invGroup === g ? ' is-active' : '') + '" data-inv-group="' + esc(g) + '">' +
        (g === 'all' ? 'Todos' : esc(g)) + '</button>';
    }).join('');

    var cards = keys.map(function (k) {
      var ing = D.ingredients[k];
      var stock = state.stock[k] || 0;
      var pct = Math.min(100, stock / (ing.cap || 1) * 100);
      var level = stock <= 0 ? 'out' : (stock <= ing.min ? 'low' : '');
      var tag = stock <= 0 ? '<span class="pill void">Agotado</span>'
        : (stock <= ing.min ? '<span class="pill void" style="color:#e2b45c;background:rgba(226,180,92,.1);border-color:rgba(226,180,92,.3)">Bajo</span>' : '');
      var unitName = ing.unitName || 'unidad';
      return '<div class="inv-card">' +
        '<div class="inv-top"><div>' +
          '<div class="inv-name"><span class="swatch" style="background:' + ing.color + '"></span>' + esc(ing.name) + '</div>' +
          '<div class="inv-group">' + esc(ing.group) + ' · ' + ing.unitSize + ' ' + ing.unit + '/' + unitName + '</div>' +
        '</div>' + tag + '</div>' +
        '<div class="inv-qty"><span>Existencias</span><b>' + fmtNum(stock) + ' ' + unitName + '</b></div>' +
        '<div class="meter"><div class="meter-fill ' + level + '" style="width:' + Math.max(1.5, pct).toFixed(1) + '%"></div></div>' +
        '<div class="inv-actions">' +
          (can('inventarioEdit') ?
            ('<input type="number" min="0" step="1" placeholder="+1" data-restock-input="' + k + '" aria-label="Cantidad a reabastecer de ' + esc(ing.name) + '">' +
             '<button class="btn btn-sm" data-restock="' + k + '">Reabastecer</button>') :
            '<span class="muted" style="font-size:12px">Solo lectura</span>') +
        '</div>' +
      '</div>';
    }).join('');

    $('view-inventario').innerHTML = '<div class="page">' +
      '<div class="page-head"><div><h2>Inventario</h2><p>Se descuenta automáticamente con cada venta, según la receta de cada producto.</p></div>' +
        '<div class="head-actions"><span class="pill' + (lowCount ? ' void' : '') + '">' + lowCount + ' por reabastecer</span></div></div>' +
      '<div class="chips">' + chips + '</div>' +
      '<div class="inv-grid">' + cards + '</div>' +
    '</div>';
  }

  /* ---------------- Productos (bebidas) ---------------- */

  var editingProduct = null;
  var editingIngredient = null;
  var vesselKeys = ['demitasse', 'mug', 'glass', 'frappe', 'bowl'];
  var toppingList = ['cream', 'ice', 'cocoa', 'latteArt', 'caramelDrizzle', 'steam', 'straw'];

  var VESSELS_KEY = 'cafe-nocturno-vessels-v1';
  var VESSEL_DEFAULTS = {
    demitasse: { name: 'Demitasse', cap: 60 },
    mug: { name: 'Taza', cap: 360 },
    glass: { name: 'Vaso alto', cap: 400 },
    frappe: { name: 'Vaso frappé', cap: 500 },
    bowl: { name: 'Tazón', cap: 150 }
  };
  function loadVessels() {
    var out = {};
    Object.keys(VESSEL_DEFAULTS).forEach(function (k) {
      out[k] = { name: VESSEL_DEFAULTS[k].name, cap: VESSEL_DEFAULTS[k].cap };
    });
    try {
      var saved = JSON.parse(localStorage.getItem(VESSELS_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        Object.keys(out).forEach(function (k) {
          if (saved[k]) {
            if (saved[k].name) out[k].name = String(saved[k].name);
            if (Number(saved[k].cap) > 0) out[k].cap = Number(saved[k].cap);
          }
        });
      }
    } catch (e) {}
    return out;
  }
  function saveVessels() { try { localStorage.setItem(VESSELS_KEY, JSON.stringify(vessels)); } catch (e) {} }
  var vessels = loadVessels();
  function vesselCap(id) { return (vessels[id] && vessels[id].cap) || VESSEL_DEFAULTS.mug.cap; }
  function vesselName(id) { return (vessels[id] && vessels[id].name) || id; }
  function vesselLabel(id) { return vesselName(id) + ' · ' + vesselCap(id) + ' ml'; }

  function renderRecetas() {
    if (!can('recetas')) { $('view-recetas').innerHTML = '<div class="page"><p>Sin permiso.</p></div>'; return; }
    if (editingProduct) { renderRecipeEditor(); return; }
    var drinks = allProducts().filter(function (p) { return p.sizes !== false; });
    var cards = drinks.map(function (p) {
      return '<div class="user-card">' +
        '<div class="uc-top">' +
          '<div style="width:52px;height:52px">' + artOf(p, { size: 'M', milk: 'leche' }) + '</div>' +
          '<div style="flex:1"><div class="uc-name">' + esc(p.name) + '</div><div class="uc-user">' + esc(p.cat) + ' · ' + money(unitPrice(p, { size: 'M', milk: 'leche' })) + '</div></div>' +
        '</div>' +
        '<div class="uc-actions">' +
          '<button class="btn btn-sm" data-prod-edit="' + esc(p.id) + '">Editar</button>' +
          '<button class="btn btn-ghost btn-sm" data-prod-del="' + esc(p.id) + '">Eliminar</button>' +
        '</div>' +
      '</div>';
    }).join('');

    $('view-recetas').innerHTML = '<div class="users-wrap">' +
      '<div class="users-head"><div><h2>Recetas de bebidas</h2><p>Configura bebidas: vaso, ingredientes, cantidades y orden. Arrastra los ingredientes para reordenarlos.</p></div>' +
        '<button class="btn btn-primary" data-prod-new>+ Nueva bebida</button></div>' +
      '<div class="users-grid">' + (cards || '<p class="empty-note">Sin bebidas.</p>') + '</div>' +
    '</div>';
  }

  function renderRecipeEditor() {
    var p = editingProduct === 'new' ? {
      name: '', price: 50, vessel: 'mug', cat: 'calientes', hot: true, desc: '', toppings: [], recipe: [['espresso', 30], ['leche', 150]]
    } : allProducts().filter(function (x) { return x.id === editingProduct; })[0];
    if (!p) { editingProduct = null; renderRecetas(); return; }

    var recipeRows = (p.recipe || []).map(function (r, i) {
      var ing = D.ingredients[r[0]];
      return '<div class="recipe-row" data-recipe-row="' + i + '" data-ing="' + esc(r[0]) + '" draggable="true">' +
        '<span class="drag-grip" title="Arrastrar para reordenar">⋮⋮</span>' +
        '<span class="swatch" style="background:' + (ing ? ing.color : '#888') + '"></span>' +
        '<span class="recipe-name">' + esc(ing ? ing.name : r[0]) + '</span>' +
        '<button type="button" class="qty-btn" data-qty="-1">−</button>' +
        '<input type="number" min="1" step="1" value="' + r[1] + '" data-recipe-amt>' +
        '<span class="recipe-unit">ml</span>' +
        '<button type="button" class="qty-btn" data-qty="1">+</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-recipe-del>✕</button>' +
      '</div>';
    }).join('');

    var groups = [];
    Object.keys(D.ingredients).forEach(function (k) {
      var g = D.ingredients[k].group || 'Otros';
      if (groups.indexOf(g) < 0) groups.push(g);
    });
    var groupChips = '<button type="button" class="chip is-active" data-ing-group="all">Todos</button>' +
      groups.map(function (g) { return '<button type="button" class="chip" data-ing-group="' + esc(g) + '">' + esc(g) + '</button>'; }).join('');

    var pickCards = Object.keys(D.ingredients).map(function (k) {
      var ing = D.ingredients[k];
      var on = (p.recipe || []).some(function (r) { return r[0] === k; });
      return '<button type="button" class="ing-pick-card' + (on ? ' is-on' : '') + '" data-ing-toggle="' + k + '" data-ing-name="' + esc(ing.name) + '" data-ing-group-card="' + esc(ing.group || 'Otros') + '">' +
        '<span class="swatch" style="background:' + ing.color + '"></span>' +
        '<span class="ing-pick-name">' + esc(ing.name) + '</span>' +
        '<span class="ing-pick-unit">ml</span>' +
        '<span class="ing-pick-check">✓</span>' +
      '</button>';
    }).join('');

    var toppingChips = toppingList.map(function (t) {
      return '<label class="extra-chip' + ((p.toppings || []).indexOf(t) >= 0 ? ' is-on' : '') + '"><input type="checkbox" name="topping" value="' + t + '"' + ((p.toppings || []).indexOf(t) >= 0 ? ' checked' : '') + '> ' + t + '</label>';
    }).join('');

    $('view-recetas').innerHTML =
      '<div class="recipe-editor">' +
        '<div class="recipe-menu">' +
          '<div class="recipe-menu-head">' +
            '<div class="recipe-back-row">' +
              '<button class="btn btn-ghost btn-sm" type="button" data-prod-cancel>← Volver</button>' +
              '<span class="eyebrow">Recetas</span>' +
            '</div>' +
            '<h2>' + (editingProduct === 'new' ? 'Nueva bebida' : 'Editar bebida') + '</h2>' +
            '<p>Selecciona los ingredientes del menú; se agregan a la receta de la derecha.</p>' +
            '<label class="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>' +
              '<input id="ing-search" type="search" placeholder="Buscar ingrediente…" autocomplete="off" aria-label="Buscar ingrediente">' +
            '</label>' +
            '<div class="chips" id="ing-cats">' + groupChips + '</div>' +
          '</div>' +
          '<div class="recipe-menu-wrap">' +
            '<div class="ing-pick-grid" id="ing-pick-grid">' + pickCards + '</div>' +
            '<p class="empty-note" id="ing-no-results" hidden>No encontramos ingredientes con ese nombre.</p>' +
          '</div>' +
        '</div>' +
        '<aside class="recipe-panel">' +
          '<header class="recipe-panel-head">' +
            '<div><span class="eyebrow">Receta</span><h2>Lo que lleva</h2></div>' +
            '<span class="pill" id="recipe-count">0 ingr.</span>' +
          '</header>' +
          '<form class="recipe-form" data-prod-form>' +
            '<div class="recipe-panel-body">' +
              '<div class="recipe-preview-box"><div id="prod-preview" class="prod-preview"></div></div>' +
              '<div class="recipe-fill">' +
                '<div class="recipe-fill-head"><span>Llenado del vaso</span><b id="fill-label">0 / 0 ml</b></div>' +
                '<div class="fill-track"><div class="fill-bar" id="fill-bar"></div></div>' +
                '<div class="recipe-fill-note" id="fill-note"></div>' +
              '</div>' +
              '<div class="recipe-fields">' +
                '<div class="row">' +
                  '<label class="field"><span>Nombre</span><input name="name" required value="' + esc(p.name) + '"></label>' +
                  '<label class="field"><span>Precio (M)</span><input name="price" type="number" min="1" required value="' + p.price + '"></label>' +
                '</div>' +
                '<div class="row">' +
                  '<label class="field"><span>Vaso</span><select name="vessel">' +
                    vesselKeys.map(function (v) { return '<option value="' + v + '"' + (p.vessel === v ? ' selected' : '') + '>' + esc(vesselLabel(v)) + '</option>'; }).join('') +
                  '</select></label>' +
                  '<label class="field"><span>Categoría</span><select name="cat">' +
                    ['calientes','frios','tes'].map(function (c) { return '<option value="' + c + '"' + (p.cat === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') +
                  '</select></label>' +
                '</div>' +
                '<label class="field"><span>Descripción</span><input name="desc" value="' + esc(p.desc || '') + '"></label>' +
                '<label class="field"><span>Caliente</span><input name="hot" type="checkbox" ' + (p.hot ? 'checked' : '') + ' style="width:auto"></label>' +
                '<div class="field"><span>Toppings</span><div class="recipe-toppings">' + toppingChips + '</div></div>' +
              '</div>' +
              '<div class="recipe-section-title">Ingredientes</div>' +
              '<div id="recipe-rows" class="recipe-rows">' + recipeRows + '</div>' +
              '<p class="empty-note" id="recipe-empty" hidden>Agrega ingredientes desde el menú de la izquierda.</p>' +
            '</div>' +
            '<div class="recipe-save-bar">' +
              '<button class="btn btn-ghost" type="button" data-prod-cancel>Cancelar</button>' +
              '<button class="btn btn-primary" type="submit">Guardar bebida</button>' +
            '</div>' +
          '</form>' +
        '</aside>' +
      '</div>';
    setTimeout(updateProdPreview, 0);
  }

  function applyIngFilter() {
    var grid = document.getElementById('ing-pick-grid');
    if (!grid) return;
    var q = ((document.getElementById('ing-search') || {}).value || '').trim().toLowerCase();
    var active = document.querySelector('#ing-cats .chip.is-active');
    var group = active ? active.getAttribute('data-ing-group') : 'all';
    var any = false;
    grid.querySelectorAll('[data-ing-toggle]').forEach(function (card) {
      var name = String(card.getAttribute('data-ing-name') || '').toLowerCase();
      var g = card.getAttribute('data-ing-group-card') || '';
      var show = (!q || name.indexOf(q) >= 0) && (group === 'all' || g === group);
      card.hidden = !show;
      if (show) any = true;
    });
    var none = document.getElementById('ing-no-results');
    if (none) none.hidden = any;
  }

  function updateProdPreview() {
    var preview = document.getElementById('prod-preview');
    if (!preview) return;
    var form = document.querySelector('[data-prod-form]');
    if (!form) return;
    var rows = form.querySelectorAll('.recipe-row').length;
    var countEl = document.getElementById('recipe-count');
    if (countEl) countEl.textContent = rows + ' ingr.';
    var emptyEl = document.getElementById('recipe-empty');
    if (emptyEl) emptyEl.hidden = rows > 0;
    var vessel = (form.querySelector('[name="vessel"]') || {}).value || 'mug';
    var hot = !!(form.querySelector('[name="hot"]') && form.querySelector('[name="hot"]').checked);
    var toppings = [];
    form.querySelectorAll('input[name="topping"]:checked').forEach(function (cb) { toppings.push(cb.value); });
    var recipe = [];
    form.querySelectorAll('.recipe-row').forEach(function (row) {
      var ing = row.getAttribute('data-ing');
      var amt = Number((row.querySelector('[data-recipe-amt]') || {}).value) || 0;
      if (ing && amt > 0) recipe.push([ing, amt]);
    });
    var totalMl = recipe.reduce(function (s, r) { return s + r[1]; }, 0);
    var cap = vesselCap(vessel);
    var bar = document.getElementById('fill-bar');
    var label = document.getElementById('fill-label');
    var note = document.getElementById('fill-note');
    if (bar) {
      bar.style.width = (cap > 0 ? Math.min(100, totalMl / cap * 100) : 0).toFixed(1) + '%';
      bar.classList.toggle('is-over', totalMl > cap);
    }
    if (label) label.textContent = totalMl + ' / ' + cap + ' ml';
    if (note) {
      note.textContent = totalMl > cap
        ? 'Excede la capacidad por ' + (totalMl - cap) + ' ml'
        : 'Capacidad del vaso: ' + cap + ' ml';
    }
    var temp = { id: 'preview', name: 'Vista previa', vessel: vessel, hot: hot, toppings: toppings, recipe: recipe, sizes: true, capacity: cap };
    try {
      preview.innerHTML = '<div style="width:140px;height:140px;margin:0 auto">' + artOf(temp, { size: 'M', milk: 'leche' }) + '</div>';
    } catch (e) { preview.innerHTML = ''; }
  }

  function recipeTotal(form, skipRow) {
    var total = 0;
    if (!form) return total;
    form.querySelectorAll('.recipe-row').forEach(function (row) {
      if (row === skipRow) return;
      var inp = row.querySelector('[data-recipe-amt]');
      total += Number(inp && inp.value) || 0;
    });
    return total;
  }

  function renderIngredientes() {
    if (!can('ingredientes')) { $('view-ingredientes').innerHTML = '<div class="page"><p>Sin permiso.</p></div>'; return; }
    var keys = Object.keys(D.ingredients);
    var groups = {};
    keys.forEach(function (k) { var g = D.ingredients[k].group || 'Otros'; if (!groups[g]) groups[g] = []; groups[g].push(k); });
    var cards = keys.map(function (k) {
      var ing = D.ingredients[k];
      return '<div class="user-card">' +
        '<div class="uc-top">' +
          '<span class="swatch" style="background:' + ing.color + ';width:24px;height:24px;border-radius:6px"></span>' +
          '<div style="flex:1"><div class="uc-name">' + esc(ing.name) + '</div><div class="uc-user">' + esc(k) + ' · ' + esc(ing.unit) + ' · ' + (ing.track ? 'inventario: sí' : 'sin inventario') + '</div></div>' +
        '</div>' +
        '<div class="uc-actions">' +
          '<button class="btn btn-sm" data-ing-edit="' + esc(k) + '">Editar</button>' +
        '</div>' +
      '</div>';
    }).join('');

    var form = '';
    if (editingIngredient) {
      var ing = editingIngredient === 'new' ? { name: '', unit: 'g', unitName: '', unitSize: 100, color: '#888888', group: 'Café y barra', track: true, stock: 0, min: 0, cap: 0, artColor: '' } : D.ingredients[editingIngredient];
      if (!ing && editingIngredient !== 'new') { editingIngredient = null; }
      else {
        form = '<form class="user-form" data-ing-form style="max-width:640px">' +
          '<h3 style="margin:0 0 4px;font-family:Fraunces,serif;font-size:18px">' + (editingIngredient === 'new' ? 'Nuevo ingrediente' : 'Editar ingrediente') + '</h3>' +
          '<div class="row">' +
            '<label class="field"><span>Clave (id)</span><input name="key" required value="' + esc(editingIngredient === 'new' ? '' : editingIngredient) + '"' + (editingIngredient === 'new' ? '' : ' readonly') + '></label>' +
            '<label class="field"><span>Nombre</span><input name="name" required value="' + esc(ing.name) + '"></label>' +
          '</div>' +
          '<div class="row">' +
            '<label class="field"><span>Color</span><input name="color" type="color" value="' + esc(ing.color || '#888888') + '" style="height:40px;padding:2px"></label>' +
            '<label class="field"><span>Unidad (medida)</span><input name="unit" required value="' + esc(ing.unit) + '" placeholder="ml, g"></label>' +
          '</div>' +
          '<div class="row">' +
            '<label class="field"><span>Nombre del envase</span><input name="unitName" value="' + esc(ing.unitName || '') + '" placeholder="bote, bolsa"></label>' +
            '<label class="field"><span>Tamaño del envase</span><input name="unitSize" type="number" min="1" value="' + (ing.unitSize || 0) + '"></label>' +
          '</div>' +
          '<div class="row">' +
            '<label class="field"><span>Grupo</span><input name="group" value="' + esc(ing.group || '') + '"></label>' +
            '<label class="field"><span>Inventariar</span><select name="track"><option value="true"' + (ing.track ? ' selected' : '') + '>Sí</option><option value="false"' + (!ing.track ? ' selected' : '') + '>No</option></select></label>' +
          '</div>' +
          '<div class="row">' +
            '<label class="field"><span>Stock (unidades)</span><input name="stock" type="number" min="0" value="' + (ing.stock || 0) + '"></label>' +
            '<label class="field"><span>Mínimo</span><input name="min" type="number" min="0" value="' + (ing.min || 0) + '"></label>' +
            '<label class="field"><span>Capacidad</span><input name="cap" type="number" min="0" value="' + (ing.cap || 0) + '"></label>' +
          '</div>' +
          '<label class="field"><span>Color en dibujo (artColor, opcional)</span><input name="artColor" value="' + esc(ing.artColor || '') + '"></label>' +
          '<div style="display:flex;gap:8px;margin-top:8px">' +
            '<button class="btn btn-primary" type="submit">Guardar</button>' +
            '<button class="btn btn-ghost" type="button" data-ing-cancel>Cancelar</button>' +
          '</div>' +
        '</form>';
      }
    }

    $('view-ingredientes').innerHTML = '<div class="users-wrap">' +
      '<div class="users-head"><div><h2>Ingredientes</h2><p>Edita nombre, color, unidades y si se inventaria. Los cambios se guardan en el navegador.</p></div>' +
        '<button class="btn btn-primary" data-ing-new>+ Nuevo ingrediente</button></div>' +
      '<div class="users-grid">' + (cards || '<p class="empty-note">Sin ingredientes.</p>') + '</div>' +
      (form ? '<div>' + form + '</div>' : '') +
    '</div>';
  }

  function renderVasos() {
    if (!can('recetas')) { $('view-vasos').innerHTML = '<div class="page"><p>Sin permiso.</p></div>'; return; }
    var cards = vesselKeys.map(function (id) {
      var v = vessels[id];
      var demo = { id: 'demo_' + id, vessel: id, hot: false, toppings: [], recipe: [['agua', v.cap]], capacity: v.cap };
      var art = '';
      try { art = A.product(demo, recipeFor(demo, {})); } catch (e) { art = ''; }
      return '<div class="user-card vessel-card">' +
        '<div class="vessel-art">' + art + '</div>' +
        '<div class="uc-name">' + esc(v.name) + '</div>' +
        '<div class="uc-user">' + v.cap + ' ml de capacidad</div>' +
        '<form class="vessel-form" data-vessel-form="' + id + '">' +
          '<label class="field"><span>Nombre</span><input name="name" required value="' + esc(v.name) + '"></label>' +
          '<label class="field"><span>Capacidad (ml)</span><input name="cap" type="number" min="1" step="1" value="' + v.cap + '"></label>' +
          '<button class="btn btn-primary btn-block" type="submit">Guardar</button>' +
        '</form>' +
      '</div>';
    }).join('');
    $('view-vasos').innerHTML = '<div class="users-wrap">' +
      '<div class="users-head"><div><h2>Vasos</h2><p>Configura el nombre y la capacidad en ml de cada vaso. La receta se llena hasta esa capacidad.</p></div></div>' +
      '<div class="users-grid">' + cards + '</div>' +
    '</div>';
  }

  /* ---------------- Usuarios ---------------- */

  var editingUser = null;

  function renderUsuarios() {
    if (!can('usuarios')) { $('view-usuarios').innerHTML = '<div class="page"><p>Sin permiso.</p></div>'; return; }
    var cards = users.map(function (u) {
      var initials = u.name.split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase();
      return '<div class="user-card">' +
        '<div class="uc-top">' +
          '<div class="uc-avatar">' + esc(initials) + '</div>' +
          '<div><div class="uc-name">' + esc(u.name) + '</div><div class="uc-user">@' + esc(u.username) + '</div></div>' +
          '<span class="uc-role ' + esc(u.role) + '">' + esc(roleLabel(u.role)) + '</span>' +
        '</div>' +
        '<div class="uc-actions">' +
          '<button class="btn btn-sm" data-user-edit="' + esc(u.id) + '">Editar</button>' +
          (u.id === currentUser.id ? '' : '<button class="btn btn-ghost btn-sm" data-user-del="' + esc(u.id) + '">Eliminar</button>') +
        '</div>' +
      '</div>';
    }).join('');

    var form = '';
    if (editingUser) {
      var u = editingUser === 'new' ? { name: '', username: '', password: '', role: 'cajero' } : users.filter(function (x) { return x.id === editingUser; })[0];
      if (!u) editingUser = null;
      else {
        form = '<form class="user-form" data-user-form>' +
          '<h3 style="margin:0 0 4px;font-family:Fraunces,serif;font-size:18px">' + (editingUser === 'new' ? 'Nuevo usuario' : 'Editar usuario') + '</h3>' +
          '<div class="row">' +
            '<label class="field"><span>Nombre</span><input name="name" required value="' + esc(u.name) + '"></label>' +
            '<label class="field"><span>Usuario</span><input name="username" required value="' + esc(u.username) + '"></label>' +
          '</div>' +
          '<div class="row">' +
            '<label class="field"><span>Contraseña</span><input name="password" type="password" ' + (editingUser === 'new' ? 'required' : '') + ' placeholder="' + (editingUser === 'new' ? '' : 'Dejar vacío para no cambiar') + '" value=""></label>' +
            '<label class="field"><span>Rol</span><select name="role">' +
              ['admin','gerente','cajero'].map(function (r) { return '<option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + roleLabel(r) + '</option>'; }).join('') +
            '</select></label>' +
          '</div>' +
          '<div style="display:flex;gap:8px;margin-top:4px">' +
            '<button class="btn btn-primary" type="submit">Guardar</button>' +
            '<button class="btn btn-ghost" type="button" data-user-cancel>Cancelar</button>' +
          '</div>' +
        '</form>';
      }
    }

    $('view-usuarios').innerHTML = '<div class="users-wrap">' +
      '<div class="users-head"><div><h2>Usuarios</h2><p>Administra los accesos al sistema por rol: administrador, gerente y cajero.</p></div>' +
        '<button class="btn btn-primary" data-user-new>+ Nuevo usuario</button></div>' +
      '<div class="users-grid">' + cards + '</div>' +
      (form ? '<div>' + form + '</div>' : '') +
    '</div>';
  }

  /* ---------------- CSV ---------------- */

  function exportCSV() {
    var rows = [['Folio', 'Fecha', 'Hora', 'Productos', 'Articulos', 'Metodo', 'Total', 'Estado']];
    state.sales.forEach(function (s) {
      var d = new Date(s.at);
      rows.push([
        pad(s.folio, 4),
        d.toLocaleDateString('es-MX'),
        d.toLocaleTimeString('es-MX'),
        s.items.map(function (i) { return i.qty + 'x ' + i.name; }).join(' | '),
        s.items.reduce(function (a, i) { return a + i.qty; }, 0),
        s.method,
        s.total,
        s.voided ? 'cancelada' : 'cobrada'
      ]);
    });
    var csv = rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\r\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ventas-cafe-nocturno.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
    toast('Reporte CSV descargado');
  }

  /* ---------------- toast ---------------- */

  var toastTimer = null;
  function toast(msg) {
    var t = $('toast');
    t.innerHTML = '<span class="dot-ok"></span>' + esc(msg);
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 2600);
  }

  /* ---------------- vistas ---------------- */

  function setView(name) {
    if (name === 'corte' && !can('corte')) name = 'venta';
    if (name === 'inventario' && !can('inventarioView')) name = 'venta';
    if (name === 'usuarios' && !can('usuarios')) name = 'venta';
    if (name === 'recetas' && !can('recetas')) name = 'venta';
    if (name === 'ingredientes' && !can('ingredientes')) name = 'venta';
    if (name === 'vasos' && !can('recetas')) name = 'venta';
    viewed.view = name;
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-view') === name);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.view'), function (v) {
      v.classList.toggle('is-active', v.id === 'view-' + name);
    });
    if (name === 'corte') renderCorte();
    if (name === 'historial') renderHistorial();
    if (name === 'inventario') renderInventario();
    if (name === 'usuarios') renderUsuarios();
    if (name === 'recetas') renderRecetas();
    if (name === 'ingredientes') renderIngredientes();
    if (name === 'vasos') renderVasos();
    if (name === 'venta') renderProducts();
  }

  function applySettings() {
    var h1 = document.querySelector('.brand-text h1');
    var p = document.querySelector('.brand-text p');
    if (h1) h1.textContent = state.settings.name;
    if (p) p.textContent = state.settings.tagline;
    document.title = state.settings.name + ' · Punto de venta';
  }

  function applyUserUI() {
    var overlay = $('login-overlay');
    if (!currentUser) { overlay.hidden = false; return; }
    overlay.hidden = true;
    $('cashier-name').textContent = currentUser.name;
    $('cashier-register').textContent = roleLabel(currentUser.role);
    var initials = currentUser.name.split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase();
    $('cashier-avatar').textContent = initials || 'U';
    // tabs visibles por rol
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
      var v = b.getAttribute('data-view');
      var show = true;
      if (v === 'corte') show = can('corte');
      if (v === 'inventario') show = can('inventarioView');
      if (v === 'usuarios') show = can('usuarios');
      if (v === 'recetas') show = can('recetas');
      if (v === 'ingredientes') show = can('ingredientes');
      if (v === 'vasos') show = can('recetas');
      b.hidden = !show;
    });
    // si la vista actual ya no está permitida, ir a venta
    var active = document.querySelector('.tab.is-active');
    if (active && active.hidden) setView('venta');
  }

  function doLogin(username, password) {
    for (var i = 0; i < users.length; i++) {
      if (users[i].username === username && users[i].password === password) {
        currentUser = users[i];
        saveSession({ userId: currentUser.id });
        applyUserUI();
        renderCart();
        setView('venta');
        return true;
      }
    }
    return false;
  }
  function doLogout() {
    currentUser = null;
    clearSession();
    applyUserUI();
  }

  /* ---------------- eventos ---------------- */

  document.addEventListener('click', function (e) {
    var t = e.target;

    var tab = t.closest('[data-view]');
    if (tab) { setView(tab.getAttribute('data-view')); return; }

    var closeBtn = t.closest('[data-close-modal]');
    if (closeBtn) { closeModal(); return; }

    var info = t.closest('[data-info]');
    if (info) { e.stopPropagation(); openProduct(info.getAttribute('data-info')); return; }

    var open = t.closest('[data-open]');
    if (open) {
      var prod = productById(open.getAttribute('data-open'));
      if (prod) openProduct(prod.id);
      return;
    }

    var cat = t.closest('[data-cat]');
    if (cat) { viewed.cat = cat.getAttribute('data-cat'); renderChips(); renderProducts(); return; }

    var edit = t.closest('[data-edit]');
    if (edit) { openProduct(cartLine(edit.getAttribute('data-edit')).pid, edit.getAttribute('data-edit')); return; }

    var inc = t.closest('[data-inc]');
    if (inc) {
      var li = cartLine(inc.getAttribute('data-inc'));
      if (li) { li.qty += 1; save(); renderCart(); }
      return;
    }
    var dec = t.closest('[data-dec]');
    if (dec) {
      var ld = cartLine(dec.getAttribute('data-dec'));
      if (ld) {
        ld.qty -= 1;
        if (ld.qty <= 0) state.cart = state.cart.filter(function (x) { return x.uid !== ld.uid; });
        save(); renderCart();
      }
      return;
    }

    /* configurador */
    var sizeBtn = t.closest('[data-size]');
    if (sizeBtn && cfg) { cfg.size = sizeBtn.getAttribute('data-size'); renderCfg(); return; }

    var qbtn = t.closest('[data-cfg-qty]');
    if (qbtn && cfg) {
      cfg.qty = Math.max(1, Math.min(30, cfg.qty + Number(qbtn.getAttribute('data-cfg-qty'))));
      renderCfg();
      return;
    }

    var saveBtn = t.closest('[data-cfg-save]');
    if (saveBtn && cfg) {
      var p2 = productById(cfg.pid);
      if (cfg.uid) {
        var line = cartLine(cfg.uid);
        if (line) {
          line.size = cfg.size; line.milk = cfg.milk; line.extra = cfg.extra; line.qty = cfg.qty;
        }
        save(); renderCart(); closeModal();
        toast('Ticket actualizado');
      } else {
        addToCart(p2, { size: cfg.size, milk: cfg.milk, extras: cfg.extras, qty: cfg.qty });
        closeModal();
        toast(cfg.qty + ' × ' + p2.name + ' agregado');
      }
      cfg = null;
      return;
    }

    /* cobro */
    var method = t.closest('[data-method]');
    if (method) { pay.method = method.getAttribute('data-method'); renderPay(); return; }

    var cash = t.closest('[data-cash]');
    if (cash) {
      var t2 = cartTotals();
      var v = cash.getAttribute('data-cash');
      pay.received = v === 'exact' ? t2.total : Number(v);
      var inp = $('cash-input');
      if (inp) inp.value = Math.round(pay.received);
      updateChange();
      return;
    }

    var confirmBtn = t.closest('[data-confirm]');
    if (confirmBtn) { completeSale(); return; }

    var printBtn = t.closest('[data-print]');
    if (printBtn) { window.print(); return; }

    var ticketBtn = t.closest('[data-ticket]');
    if (ticketBtn) {
      var folio = Number(ticketBtn.getAttribute('data-ticket'));
      var sale = state.sales.filter(function (s) { return s.folio === folio; })[0];
      if (sale) openTicket(sale);
      return;
    }

    var voidBtn = t.closest('[data-void]');
    if (voidBtn) {
      if (!can('voidSale')) { toast('Sin permiso para cancelar tickets'); return; }
      var f2 = Number(voidBtn.getAttribute('data-void'));
      var s2 = state.sales.filter(function (s) { return s.folio === f2; })[0];
      if (!s2) return;
      if (!window.confirm('¿Cancelar el ticket #' + pad(s2.folio, 4) + ' por ' + money(s2.total) + '? El inventario se repondrá.')) return;
      adjustStock(s2.items, 1);
      s2.voided = true;
      save(); renderHistorial(); renderCorte(); renderProducts(); renderInventario();
      toast('Ticket #' + pad(s2.folio, 4) + ' cancelado');
      return;
    }

    var exportBtn = t.closest('[data-export]');
    if (exportBtn) { exportCSV(); return; }

    var resetBtn = t.closest('[data-reset-day]');
    if (resetBtn) {
      if (!window.confirm('¿Cerrar la jornada? Se archivarán las ventas del día y el inventario se restablecerá a los niveles iniciales.')) return;
      state.sales = [];
      state.folio = 1;
      state.stock = defaultStock();
      state.cart = [];
      save(); renderCart(); renderCorte(); renderInventario(); renderHistorial();
      toast('Jornada cerrada, inventario restablecido');
      return;
    }

    var saveSet = t.closest('[data-save-settings]');
    if (saveSet) {
      state.settings.name = $('set-name').value.trim() || D.settings.name;
      state.settings.tagline = $('set-tagline').value.trim();
      state.settings.cashier = $('set-cashier').value.trim() || D.settings.cashier;
      state.settings.register = $('set-register').value.trim() || D.settings.register;
      state.settings.taxRate = Math.max(0, Math.min(30, Number($('set-tax').value) || 0));
      state.settings.footer = $('set-footer').value.trim();
      save(); applySettings(); renderCorte(); renderCart();
      toast('Datos del negocio guardados');
      return;
    }

    var restock = t.closest('[data-restock]');
    if (restock) {
      if (!can('inventarioEdit')) { toast('Sin permiso para reabastecer'); return; }
      var key = restock.getAttribute('data-restock');
      var ing = D.ingredients[key];
      var input = modalCard.querySelector('[data-restock-input="' + key + '"]') ||
        document.querySelector('[data-restock-input="' + key + '"]');
      var amount = Number(input && input.value);
      if (!amount || amount <= 0) amount = 1;
      state.stock[key] = (state.stock[key] || 0) + amount;
      save(); renderInventario();
      toast(ing.name + ' +' + fmtNum(amount) + ' ' + (ing.unitName || 'unidad'));
      return;
    }

    var invChip = t.closest('[data-inv-group]');
    if (invChip) { invGroup = invChip.getAttribute('data-inv-group'); renderInventario(); return; }

    var userNew = t.closest('[data-user-new]');
    if (userNew) { if (can('usuarios')) { editingUser = 'new'; renderUsuarios(); } return; }
    var userEdit = t.closest('[data-user-edit]');
    if (userEdit) { if (can('usuarios')) { editingUser = userEdit.getAttribute('data-user-edit'); renderUsuarios(); } return; }
    var userDel = t.closest('[data-user-del]');
    if (userDel) {
      if (!can('usuarios')) return;
      var did = userDel.getAttribute('data-user-del');
      if (did === (currentUser && currentUser.id)) { toast('No puedes eliminar tu propia cuenta'); return; }
      if (!window.confirm('¿Eliminar este usuario?')) return;
      users = users.filter(function (x) { return x.id !== did; });
      saveUsers(users);
      editingUser = null;
      renderUsuarios();
      toast('Usuario eliminado');
      return;
    }
    var userCancel = t.closest('[data-user-cancel]');
    if (userCancel) { editingUser = null; renderUsuarios(); return; }
  });

  /* product events */
  document.addEventListener('click', function (e) {
    var t = e.target;
    var pn = t.closest('[data-prod-new]');
    if (pn) { if (can('recetas')) { editingProduct = 'new'; renderRecetas(); } return; }
    var pe = t.closest('[data-prod-edit]');
    if (pe) { if (can('recetas')) { editingProduct = pe.getAttribute('data-prod-edit'); renderRecetas(); } return; }
    var pd = t.closest('[data-prod-del]');
    if (pd) {
      if (!can('recetas')) return;
      var pid = pd.getAttribute('data-prod-del');
      if (!window.confirm('¿Eliminar este bebida?')) return;
      state.products = allProducts().filter(function (p) { return p.id !== pid; });
      save(); renderRecetas(); renderChips(); renderProducts();
      toast('Bebida eliminada');
      return;
    }
    var pc = t.closest('[data-prod-cancel]');
    if (pc) { editingProduct = null; renderRecetas(); return; }
    var ingToggle = t.closest('[data-ing-toggle]');
    if (ingToggle) {
      var key = ingToggle.getAttribute('data-ing-toggle');
      var container = document.getElementById('recipe-rows');
      var palette = document.getElementById('ing-palette');
      if (container) {
        var existing = container.querySelector('.recipe-row[data-ing="' + key + '"]');
        if (existing) {
          existing.remove();
          if (ingToggle) ingToggle.classList.remove('is-on');
        } else {
          var formEl = document.querySelector('[data-prod-form]');
          var vsel = formEl && formEl.querySelector('[name="vessel"]');
          var capNow = vesselCap(vsel ? vsel.value : 'mug');
          var remaining = capNow - recipeTotal(formEl);
          if (remaining <= 0) { toast('El vaso está lleno (' + capNow + ' ml)'); return; }
          var defAmt = Math.min(30, remaining);
          var ing = D.ingredients[key];
          var row = document.createElement('div');
          row.className = 'recipe-row';
          row.setAttribute('draggable', 'true');
          row.setAttribute('data-ing', key);
          row.innerHTML = '<span class="drag-grip" title="Arrastrar para reordenar">⋮⋮</span>' +
            '<span class="swatch" style="background:' + ing.color + '"></span>' +
            '<span class="recipe-name">' + esc(ing.name) + '</span>' +
            '<button type="button" class="qty-btn" data-qty="-1">−</button>' +
            '<input type="number" min="1" step="1" value="' + defAmt + '" data-recipe-amt>' +
            '<span class="recipe-unit">ml</span>' +
            '<button type="button" class="qty-btn" data-qty="1">+</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-recipe-del>✕</button>';
          container.appendChild(row);
          if (ingToggle) ingToggle.classList.add('is-on');
        }
        updateProdPreview();
      }
      return;
    }
    var qtyBtn = t.closest('[data-qty]');
    if (qtyBtn) {
      var rowEl = qtyBtn.closest('.recipe-row');
      if (rowEl) {
        var input = rowEl.querySelector('[data-recipe-amt]');
        var delta = Number(qtyBtn.getAttribute('data-qty'));
        var qform = qtyBtn.closest('[data-prod-form]');
        var qvsel = qform && qform.querySelector('[name="vessel"]');
        var qcap = vesselCap(qvsel ? qvsel.value : 'mug');
        var maxAmt = Math.max(1, qcap - recipeTotal(qform, rowEl));
        var cur = Number(input.value) || 0;
        var next = Math.max(1, cur + delta);
        if (next > maxAmt) { next = maxAmt; toast('Capacidad del vaso: ' + qcap + ' ml'); }
        input.value = next;
        updateProdPreview();
      }
      return;
    }
    var rd = t.closest('[data-recipe-del]');
    if (rd) {
      var rowEl2 = rd.closest('.recipe-row');
      if (rowEl2) {
        var ingKey = rowEl2.getAttribute('data-ing');
        rowEl2.remove();
        if (ingKey) {
          var chip = document.querySelector('[data-ing-toggle="' + ingKey + '"]');
          if (chip) chip.classList.remove('is-on');
        }
        updateProdPreview();
      }
      return;
    }
  });

  /* ingredient events */
  document.addEventListener('click', function (e) {
    var t = e.target;
    var igroup = t.closest('[data-ing-group]');
    if (igroup) {
      var cats = document.getElementById('ing-cats');
      if (cats) cats.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('is-active'); });
      igroup.classList.add('is-active');
      applyIngFilter();
      return;
    }
    var inew = t.closest('[data-ing-new]');
    if (inew) { if (can('ingredientes')) { editingIngredient = 'new'; renderIngredientes(); } return; }
    var iedit = t.closest('[data-ing-edit]');
    if (iedit) { if (can('ingredientes')) { editingIngredient = iedit.getAttribute('data-ing-edit'); renderIngredientes(); } return; }
    var icancel = t.closest('[data-ing-cancel]');
    if (icancel) { editingIngredient = null; renderIngredientes(); return; }
  });

  // ---- drag & drop reorder for recipe rows ----
  var dragSrc = null;
  document.addEventListener('dragstart', function (e) {
    var row = e.target && e.target.closest ? e.target.closest('.recipe-row') : null;
    if (!row) return;
    dragSrc = row;
    row.classList.add('dragging');
    try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', ''); } catch (err) {}
  });
  document.addEventListener('dragover', function (e) {
    var row = e.target && e.target.closest ? e.target.closest('.recipe-row') : null;
    if (!row || !dragSrc || row === dragSrc) return;
    e.preventDefault();
    var rect = row.getBoundingClientRect();
    var before = (e.clientY - rect.top) < rect.height / 2;
    row.classList.toggle('drag-over-top', before);
    row.classList.toggle('drag-over-bottom', !before);
  });
  document.addEventListener('drop', function (e) {
    var row = e.target && e.target.closest ? e.target.closest('.recipe-row') : null;
    if (!row || !dragSrc || row === dragSrc) return;
    e.preventDefault();
    var rect = row.getBoundingClientRect();
    var before = (e.clientY - rect.top) < rect.height / 2;
    var container = dragSrc.parentNode;
    if (before) container.insertBefore(dragSrc, row);
    else container.insertBefore(dragSrc, row.nextSibling);
    updateProdPreview();
  });
  document.addEventListener('dragend', function () {
    if (dragSrc) dragSrc.classList.remove('dragging');
    document.querySelectorAll('.recipe-row').forEach(function (r) {
      r.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    dragSrc = null;
  });

  document.addEventListener('submit', function (e) {
    var pform = e.target.closest('[data-prod-form]');
    if (pform) {
      if (!can('recetas')) return;
      e.preventDefault();
      var fd = new FormData(pform);
      var name = String(fd.get('name') || '').trim();
      var price = Number(fd.get('price'));
      var vessel = String(fd.get('vessel') || 'mug');
      var cat = String(fd.get('cat') || 'calientes');
      var hot = !!pform.querySelector('[name="hot"]').checked;
      var desc = String(fd.get('desc') || '').trim();
      var toppings = [];
      pform.querySelectorAll('input[name="topping"]:checked').forEach(function (cb) { toppings.push(cb.value); });
      var recipe = [];
      pform.querySelectorAll('.recipe-row').forEach(function (row) {
        var ing = row.getAttribute('data-ing');
        var amtInput = row.querySelector('[data-recipe-amt]');
        var amt = amtInput ? Number(amtInput.value) : 0;
        if (ing && amt > 0) recipe.push([ing, amt]);
      });
      var vselPost = pform.querySelector('[name="vessel"]');
      var capPost = vesselCap(vselPost ? vselPost.value : 'mug');
      var totalPost = recipe.reduce(function (s, r) { return s + r[1]; }, 0);
      if (totalPost > capPost) { toast('La receta supera la capacidad del vaso (' + capPost + ' ml)'); return; }
      if (!name || !recipe.length) { toast('Nombre y receta son obligatorios'); return; }
      if (editingProduct === 'new') {
        var newId = 'prod_' + Date.now().toString(36) + Math.random().toString(36).slice(2,5);
        allProducts().push({ id: newId, name: name, cat: cat, price: price, vessel: vessel, hot: hot, toppings: toppings, desc: desc, recipe: recipe, sizes: true });
      } else {
        var idx = -1;
        var list = allProducts();
        for (var i = 0; i < list.length; i++) if (list[i].id === editingProduct) { idx = i; break; }
        if (idx < 0) return;
        list[idx].name = name; list[idx].price = price; list[idx].vessel = vessel; list[idx].cat = cat;
        list[idx].hot = hot; list[idx].desc = desc; list[idx].toppings = toppings; list[idx].recipe = recipe;
      }
      save();
      editingProduct = null;
      renderRecetas(); renderChips(); renderProducts();
      toast('Bebida guardada');
      return;
    }

    var vform = e.target.closest('[data-vessel-form]');
    if (vform) {
      if (!can('recetas')) return;
      e.preventDefault();
      var vid = vform.getAttribute('data-vessel-form');
      if (!vessels[vid]) return;
      var vfd = new FormData(vform);
      var vname = String(vfd.get('name') || '').trim();
      var vcap = Math.max(1, Number(vfd.get('cap')) || 0);
      if (!vname) { toast('El nombre del vaso es obligatorio'); return; }
      vessels[vid].name = vname;
      vessels[vid].cap = vcap;
      saveVessels();
      renderVasos();
      toast('Vaso actualizado');
      return;
    }

    var iform = e.target.closest('[data-ing-form]');
    if (iform) {
      if (!can('ingredientes')) return;
      e.preventDefault();
      var fd = new FormData(iform);
      var key = String(fd.get('key') || '').trim();
      var name = String(fd.get('name') || '').trim();
      if (!key || !name) { toast('Clave y nombre son obligatorios'); return; }
      var color = String(fd.get('color') || '#888888');
      var unit = String(fd.get('unit') || 'g').trim();
      var unitName = String(fd.get('unitName') || '').trim();
      var unitSize = Number(fd.get('unitSize')) || 0;
      var group = String(fd.get('group') || '').trim() || 'Otros';
      var track = String(fd.get('track')) === 'true';
      var stock = Number(fd.get('stock')) || 0;
      var min = Number(fd.get('min')) || 0;
      var cap = Number(fd.get('cap')) || 0;
      var artColor = String(fd.get('artColor') || '').trim();
      var isNew = editingIngredient === 'new';
      if (isNew) {
        if (D.ingredients[key]) { toast('Esa clave ya existe'); return; }
        D.ingredients[key] = { name: name, unit: unit, unitName: unitName, unitSize: unitSize, color: color, group: group, track: track, stock: stock, min: min, cap: cap };
        if (artColor) D.ingredients[key].artColor = artColor;
      } else {
        if (!D.ingredients[editingIngredient]) { toast('Ingrediente no encontrado'); return; }
        if (key !== editingIngredient) { toast('No se puede cambiar la clave'); return; }
        var ing = D.ingredients[editingIngredient];
        ing.name = name; ing.color = color; ing.unit = unit; ing.unitName = unitName;
        ing.unitSize = unitSize; ing.group = group; ing.track = track;
        ing.stock = stock; ing.min = min; ing.cap = cap;
        if (artColor) ing.artColor = artColor; else delete ing.artColor;
      }
      if (track) state.stock[key] = stock; else delete state.stock[key];
      save();
      saveIngredients();
      editingIngredient = null;
      renderIngredientes();
      toast('Ingrediente guardado');
      return;
    }

    var form = e.target.closest('[data-user-form]');
    if (!form) return;
    if (!can('usuarios')) return;
    e.preventDefault();
    var fd = new FormData(form);
    var name = String(fd.get('name') || '').trim();
    var username = String(fd.get('username') || '').trim();
    var password = String(fd.get('password') || '');
    var role = String(fd.get('role') || 'cajero');
    if (!name || !username) { toast('Nombre y usuario son obligatorios'); return; }
    if (editingUser === 'new') {
      if (users.some(function (x) { return x.username === username; })) { toast('Ese usuario ya existe'); return; }
      if (!password) { toast('La contraseña es obligatoria'); return; }
      users.push({ id: genUserId(), name: name, username: username, password: password, role: role });
    } else {
      var idx = -1;
      for (var i = 0; i < users.length; i++) if (users[i].id === editingUser) { idx = i; break; }
      if (idx < 0) return;
      if (users.some(function (x, i) { return x.username === username && i !== idx; })) { toast('Ese usuario ya existe'); return; }
      users[idx].name = name;
      users[idx].username = username;
      if (password) users[idx].password = password;
      users[idx].role = role;
      // si editamos el usuario actual, refrescar sesión
      if (currentUser && currentUser.id === users[idx].id) currentUser = users[idx];
    }
    saveUsers(users);
    editingUser = null;
    renderUsuarios();
    applyUserUI();
    toast('Usuario guardado');
  });

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('[data-prod-form]')) updateProdPreview();
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('[data-milk]') && cfg) { cfg.milk = t.value; renderCfg(); }
    if (t.matches('[data-extra-id]') && cfg) {
      var id = t.getAttribute('data-extra-id');
      if (t.checked) { if (cfg.extras.indexOf(id) === -1) cfg.extras.push(id); }
      else { cfg.extras = cfg.extras.filter(function (x) { return x !== id; }); }
      renderCfg();
    }
    if (t.matches('[data-recipe-amt]')) {
      var cform = t.closest('[data-prod-form]');
      if (cform) {
        var cvsel = cform.querySelector('[name="vessel"]');
        var ccap = vesselCap(cvsel ? cvsel.value : 'mug');
        var cmax = Math.max(1, ccap - recipeTotal(cform, t.closest('.recipe-row')));
        if ((Number(t.value) || 0) > cmax) { t.value = cmax; toast('Capacidad del vaso: ' + ccap + ' ml'); }
        updateProdPreview();
      }
    }
  });

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'search') {
      viewed.q = t.value;
      renderProducts();
    }
    if (t.id === 'ing-search') {
      applyIngFilter();
    }
    if (t.id === 'cash-input') {
      pay.received = Number(t.value) || 0;
      updateChange();
    }
    if (t.id === 'hist-search') {
      histQ = t.value;
      var focusAtEnd = t.value.length;
      renderHistorial();
      var again = $('hist-search');
      if (again) { again.focus(); try { again.setSelectionRange(focusAtEnd, focusAtEnd); } catch (err) { /* noop */ } }
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modalRoot.hidden) { closeModal(); cfg = null; return; }
    var card = e.target.closest && e.target.closest('[data-open]');
    if (card && e.target.closest('[data-info]')) return;
    if (card && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      var prod = productById(card.getAttribute('data-open'));
      if (prod) openProduct(prod.id);
    }
  });

  $('clear-cart').addEventListener('click', function () {
    if (!state.cart.length) return;
    if (!window.confirm('¿Vaciar el ticket actual?')) return;
    state.cart = [];
    save(); renderCart();
  });
  $('checkout').addEventListener('click', openCheckout);

  /* ---------------- reloj ---------------- */

  function tick() {
    var d = new Date();
    $('clock-time').textContent = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    $('clock-date').textContent = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  /* ---------------- login / logout ---------------- */

  var loginForm = $('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var u = ($('login-user').value || '').trim();
      var p = $('login-pass').value || '';
      if (doLogin(u, p)) {
        $('login-error').hidden = true;
        $('login-pass').value = '';
      } else {
        $('login-error').hidden = false;
      }
    });
  }
  var logoutBtn = $('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      if (window.confirm('¿Cerrar sesión?')) doLogout();
    });
  }

  var comandaInput = $('comanda-input');
  if (comandaInput) {
    comandaInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); addComanda(comandaInput.value); }
    });
  }
  var comandaHelp = $('comanda-help');
  if (comandaHelp) {
    comandaHelp.addEventListener('click', function () {
      alert('Códigos de comanda:\n' +
        'Bebida: ESP, AME, LAT, CAP, FLA, MOC, MAC, CHAI, CHOC, COL, ICE, FM, FC, MAT, MAN, TEN, MUS\n' +
        'Tamaño (sufijo o token): CH/S, M, G/L\n' +
        'Leche: E (entera), D (deslactosada), A (almendra), V (avena)\n' +
        'Extras: CR (caramelo), CH (chocolate), VA (vainilla), SH (shot), CM (crema)\n' +
        'Ejemplo: Cap-D-CR+Sh = Cappuccino, deslactosada, caramelo + shot');
    });
  }

  /* ---------------- init ---------------- */

  applySettings();
  applyUserUI();
  renderChips();
  renderProducts();
  renderCart();
  window.__addComanda = function (val) { addComanda(val); };
  window.__comandaHelp = function () {
    alert('Códigos de comanda:\n' +
      'Bebida: ESP, AME, LAT, CAP, FLA, MOC, MAC, CHAI, CHOC, COL, ICE, FM, FC, MAT, MAN, TEN, MUS\n' +
      'Tamaño (sufijo o token): CH/S, M, G/L\n' +
      'Leche: E (entera), D (deslactosada), A (almendra), V (avena)\n' +
      'Extras: CR (caramelo), CH (chocolate), VA (vainilla), SH (shot), CM (crema)\n' +
      'Ejemplo: Cap-D-CR+Sh = Cappuccino, deslactosada, caramelo + shot');
  };
  tick();
  setInterval(tick, 15000);
})();
