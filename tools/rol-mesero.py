path = 'js/app.js'
src = open(path, encoding='utf-8').read()

pares = []
pares.append((
    "  var ROLES = { admin: 'Administrador', gerente: 'Gerente', cajero: 'Cajero' };",
    "  var ROLES = { admin: 'Administrador', gerente: 'Gerente', cajero: 'Cajero', mesero: 'Mesero' };"
))
pares.append((
    "      { id: 'u_cajero',  name: 'Luc\u00eda Ram\u00edrez',  username: 'cajero',  password: 'cajero',  role: 'cajero' }\n    ];",
    "      { id: 'u_cajero',  name: 'Luc\u00eda Ram\u00edrez',  username: 'cajero',  password: 'cajero',  role: 'cajero' },\n      { id: 'u_mesero',  name: 'Ana Beltr\u00e1n',    username: 'mesero',  password: 'mesero',  role: 'mesero' }\n    ];"
))
pares.append((
    "      historial: ['admin', 'gerente', 'cajero'],",
    "      historial: ['admin', 'gerente', 'cajero'],\n      meseros: ['admin', 'gerente', 'cajero', 'mesero'],"
))
pares.append((
    "    return (map[perm] || []).indexOf(r) >= 0;\n  }\n",
    "    return (map[perm] || []).indexOf(r) >= 0;\n  }\n\n  /* vista inicial seg\u00fan el rol: el mesero solo entra a sus comandas */\n  function homeView() {\n    return can('venta') ? 'venta' : (can('meseros') ? 'meseros' : 'venta');\n  }\n"
))
pares.append((
    "              ['admin','gerente','cajero'].map(function (r) { return '<option value=\"' + r + '\"' + (u.role === r ? ' selected' : '') + '>' + roleLabel(r) + '</option>'; }).join('') +",
    "              Object.keys(ROLES).map(function (r) { return '<option value=\"' + r + '\"' + (u.role === r ? ' selected' : '') + '>' + roleLabel(r) + '</option>'; }).join('') +"
))
pares.append((
    "por rol: administrador, gerente y cajero.",
    "por rol: administrador, gerente, cajero y mesero."
))
pares.append((
    "    if (name === 'corte' && !can('corte')) name = 'venta';\n"
    "    if (name === 'inventario' && !can('inventarioView')) name = 'venta';\n"
    "    if (name === 'usuarios' && !can('usuarios')) name = 'venta';\n"
    "    if (name === 'recetas' && !can('recetas')) name = 'venta';\n"
    "    if (name === 'ingredientes' && !can('ingredientes')) name = 'venta';\n"
    "    if (name === 'vasos' && !can('recetas')) name = 'venta';",
    "    if (name === 'corte' && !can('corte')) name = homeView();\n"
    "    if (name === 'inventario' && !can('inventarioView')) name = homeView();\n"
    "    if (name === 'usuarios' && !can('usuarios')) name = homeView();\n"
    "    if (name === 'recetas' && !can('recetas')) name = homeView();\n"
    "    if (name === 'ingredientes' && !can('ingredientes')) name = homeView();\n"
    "    if (name === 'vasos' && !can('recetas')) name = homeView();\n"
    "    if (name === 'meseros' && !can('meseros')) name = homeView();\n"
    "    if ((name === 'venta' || name === 'historial') && !can('venta')) name = homeView();"
))
pares.append((
    "    // tabs visibles por rol\n"
    "    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {\n"
    "      var v = b.getAttribute('data-view');\n"
    "      var show = true;\n"
    "      if (v === 'corte') show = can('corte');\n"
    "      if (v === 'inventario') show = can('inventarioView');\n"
    "      if (v === 'usuarios') show = can('usuarios');\n"
    "      if (v === 'recetas') show = can('recetas');\n"
    "      if (v === 'ingredientes') show = can('ingredientes');\n"
    "      if (v === 'vasos') show = can('recetas');\n"
    "      b.hidden = !show;\n"
    "    });\n"
    "    // si la vista actual ya no est\u00e1 permitida, ir a venta\n"
    "    var active = document.querySelector('.tab.is-active');\n"
    "    if (active && active.hidden) setView('venta');",
    "    // tabs visibles por rol\n"
    "    var viewPerm = {\n"
    "      venta: 'venta',\n"
    "      historial: 'historial',\n"
    "      corte: 'corte',\n"
    "      inventario: 'inventarioView',\n"
    "      usuarios: 'usuarios',\n"
    "      recetas: 'recetas',\n"
    "      ingredientes: 'ingredientes',\n"
    "      vasos: 'recetas'\n"
    "    };\n"
    "    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {\n"
    "      var v = b.getAttribute('data-view');\n"
    "      if (v === 'meseros') { b.hidden = !can('meseros'); return; }\n"
    "      var perm = viewPerm[v];\n"
    "      b.hidden = perm ? !can(perm) : false;\n"
    "    });\n"
    "    // si la vista actual ya no est\u00e1 permitida, ir a la que corresponda\n"
    "    var active = document.querySelector('.tab.is-active');\n"
    "    if (active && active.hidden) setView(homeView());"
))
pares.append((
    "        renderCart();\n        setView('venta');\n        return true;",
    "        renderCart();\n        setView(homeView());\n        return true;"
))
pares.append((
    "    goTo: function (view) { setView(view); },\n    toast: toast,",
    "    goTo: function (view) { setView(view); },\n    meseroUsers: function () {\n      return users.filter(function (u) { return u.role === 'mesero'; }).map(function (u) {\n        return { id: u.id, name: u.name };\n      });\n    },\n    toast: toast,"
))

for i, (old, new) in enumerate(pares, 1):
    n = src.count(old)
    if n != 1:
        raise SystemExit('cambio %d: encontrado %d veces' % (i, n))
    src = src.replace(old, new, 1)

open(path, 'w', encoding='utf-8').write(src)
print('app.js actualizado')
