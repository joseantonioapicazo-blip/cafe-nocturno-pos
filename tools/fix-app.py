import re
import sys

path = 'js/app.js'
src = open(path, encoding='utf-8').read()

start = src.index('  /* ---------------- puente para meseros (LAN) ---------------- */')
end = src.index('  /* ---------------- init ---------------- */', start)

bridge = '''  /* ---------------- puente para meseros (LAN) ---------------- */

  window.POSBridge = {
    addItems: function (items) {
      var added = 0;
      (items || []).forEach(function (it) {
        var p = productById(it.pid);
        if (!p) return;
        addToCart(p, {
          size: it.size || 'M',
          milk: it.milk || 'leche',
          extras: Array.isArray(it.extras) ? it.extras : [],
          qty: Math.max(1, Number(it.qty) || 1)
        });
        added += 1;
      });
      renderCart();
      return added;
    },
    goTo: function (v) { setView(v); },
    toast: toast,
    money: money,
    checkout: function () { if (typeof openCheckout === 'function') openCheckout(); }
  };

'''

src = src[:start] + bridge + src[end:]
src = src.replace('/* sin conexion de meseros */', '/* sin conexi\u00f3n de meseros */')

assert 'sin conexi\u00f3n de meseros' in src, 'falta el comentario con acento'
assert src.count('window.POSBridge') == 1

open(path, 'w', encoding='utf-8').write(src)
print('app.js normalizado,', len(src), 'caracteres')
