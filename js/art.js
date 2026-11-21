/* ============================================================
   Café Nocturno — Ilustraciones SVG
   Las bebidas se dibujan a partir de sus capas de ingredientes:
   el vaso muestra literalmente la proporción de la receta.
   ============================================================ */
window.POS_ART = (function () {
  let uid = 0;
  const nid = function (p) { return p + (++uid); };

  const VESSELS = {
    demitasse: { topY: 52, botY: 78, tl: 31, tr: 69, bl: 37, br: 63, saucer: true, handle: true, kind: 'cup', creamW: 9 },
    mug:       { topY: 40, botY: 80, tl: 25, tr: 75, bl: 32, br: 68, saucer: true, handle: true, kind: 'cup', creamW: 14 },
    glass:     { topY: 26, botY: 86, tl: 33, tr: 67, bl: 39, br: 61, saucer: false, handle: false, kind: 'glass', creamW: 11 },
    frappe:    { topY: 32, botY: 84, tl: 31, tr: 69, bl: 38, br: 62, saucer: false, handle: false, kind: 'glass', creamW: 13, dome: true },
    bowl:      { topY: 42, botY: 84, tl: 18, tr: 82, bl: 30, br: 70, saucer: true, handle: false, kind: 'cup', creamW: 17 }
  };

  function svg(inner, defs) {
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="art-svg" aria-hidden="true">' +
      (defs ? '<defs>' + defs + '</defs>' : '') + inner + '</svg>';
  }

  function bodyPath(v, inset) {
    inset = inset || 0;
    const tl = v.tl + inset, tr = v.tr - inset, bl = v.bl + inset, br = v.br - inset;
    const ty = v.topY + inset, by = v.botY - inset;
    return 'M' + tl + ',' + ty + ' L' + bl + ',' + (by - 7) +
      ' Q' + bl + ',' + by + ' ' + (bl + 6) + ',' + by +
      ' L' + (br - 6) + ',' + by + ' Q' + br + ',' + by + ' ' + br + ',' + (by - 7) +
      ' L' + tr + ',' + ty + ' Z';
  }

  function widthAt(v) { return (v.tr - v.tl) / 2 - 4; }

  /* ---------------- Bebidas ---------------- */

  function drink(p, entries) {
    const v = VESSELS[p.vessel] || VESSELS.mug;
    const t = p.toppings || [];
    const cupId = nid('cup');
    const clipId = nid('clip');
    const gradId = nid('cg');

    const layers = entries.filter(function (e) { return e.key !== 'hielo'; });
    const total = layers.reduce(function (s, e) { return s + e.amount; }, 0) || 1;
    const allTotal = entries.reduce(function (s, e) { return s + e.amount; }, 0) || 1;
    const top = v.topY + 7;
    const bot = v.botY - 5;
    const H = bot - top;
    const cap = Number(p.capacity) || 0;
    const fillRatio = cap > 0 ? Math.min(1, allTotal / cap) : 1;
    const drawH = H * fillRatio;

    let stack = '', acc = 0;
    layers.forEach(function (e, i) {
      const h = (e.amount / total) * drawH;
      const y = bot - acc - h;
      stack += '<rect x="0" y="' + y.toFixed(2) + '" width="100" height="' + (h + 0.7).toFixed(2) +
        '" fill="' + (e.artColor || e.color) + '"/>';
      /* línea de separación entre capas de la receta */
      if (i > 0) {
        stack += '<rect x="0" y="' + y.toFixed(2) + '" width="100" height="0.9" fill="rgba(0,0,0,.16)"/>';
      }
      acc += h;
    });

    const topLayer = layers.length ? (layers[layers.length - 1].artColor || layers[layers.length - 1].color) : '#5a2d16';
    const surfaceY = bot - drawH;

    const ceramic = '#efe4d5';
    const isGlass = v.kind === 'glass';

    let out = '';
    out += '<ellipse cx="50" cy="' + (v.botY + 6) + '" rx="' + (v.saucer ? 31 : 21) + '" ry="4.5" fill="rgba(0,0,0,.38)"/>';

    if (v.saucer) {
      out += '<ellipse cx="50" cy="' + (v.botY + 3) + '" rx="33" ry="5.6" fill="#cdbfae"/>' +
        '<ellipse cx="50" cy="' + (v.botY + 2) + '" rx="26" ry="4.2" fill="#e7dccd"/>';
    }

    if (v.handle) {
      out += '<path d="M' + (v.tr - 5) + ',' + (v.topY + 10) + ' q17,3 15,16 q-2,12 -17,11" fill="none" stroke="' +
        ceramic + '" stroke-width="7.5" stroke-linecap="round"/>';
    }

    out += '<path d="' + bodyPath(v) + '" fill="' + (isGlass ? 'rgba(255,255,255,.055)' : 'url(#' + gradId + ')') + '"' +
      (isGlass ? ' stroke="rgba(255,255,255,.30)" stroke-width="1.6"' : '') + '/>';

    /* líquido */
    out += '<g clip-path="url(#' + clipId + ')">' + stack +
      '<ellipse cx="50" cy="' + surfaceY.toFixed(2) + '" rx="' + widthAt(v) + '" ry="2.8" fill="' + topLayer + '"/>' +
      '<rect x="0" y="' + surfaceY + '" width="9" height="' + drawH + '" fill="rgba(255,255,255,.10)"/>';
    if (t.indexOf('ice') > -1) {
      const cubes = [[38, 52, -12], [55, 46, 14], [46, 66, 6]];
      cubes.forEach(function (c) {
        out += '<rect x="' + c[0] + '" y="' + c[1] + '" width="13" height="13" rx="3.4" ' +
          'transform="rotate(' + c[2] + ' ' + (c[0] + 6.5) + ' ' + (c[1] + 6.5) + ')" ' +
          'fill="rgba(226,244,252,.62)" stroke="rgba(255,255,255,.8)" stroke-width="1"/>';
      });
    }
    out += '</g>';

    if (t.indexOf('ice') > -1) {
      out += '<rect x="56" y="' + (v.topY - 8) + '" width="6.5" height="' + (v.botY - v.topY) + '" rx="3.2" ' +
        'fill="#cf6f5e" transform="rotate(11 59 ' + v.topY + ')"/>';
    }

    /* borde del vaso / taza */
    if (isGlass) {
      out += '<ellipse cx="50" cy="' + v.topY + '" rx="' + ((v.tr - v.tl) / 2) + '" ry="3.4" fill="rgba(255,255,255,.10)" ' +
        'stroke="rgba(255,255,255,.45)" stroke-width="1.4"/>';
    } else {
      out += '<ellipse cx="50" cy="' + v.topY + '" rx="' + ((v.tr - v.tl) / 2) + '" ry="3.8" fill="' + ceramic + '"/>' +
        '<ellipse cx="50" cy="' + (v.topY + 0.4) + '" rx="' + ((v.tr - v.tl) / 2 - 2.6) + '" ry="2.6" fill="#cdbba5"/>';
    }

    /* crema batida */
    if (t.indexOf('cream') > -1) {
      const w = v.creamW, cy = v.topY - 2;
      out += '<g fill="#fffaf3">' +
        '<ellipse cx="50" cy="' + cy + '" rx="' + w + '" ry="4.2"/>' +
        '<circle cx="' + (50 - w * 0.62) + '" cy="' + (cy - 5) + '" r="' + (w * 0.52) + '"/>' +
        '<circle cx="' + (50 + w * 0.6) + '" cy="' + (cy - 6) + '" r="' + (w * 0.48) + '"/>' +
        '<circle cx="50" cy="' + (cy - 10) + '" r="' + (w * 0.56) + '"/>' +
        '<path d="M50,' + (cy - 12) + ' q6,-7 2,-12 q-6,3 -7,8 z"/>' +
        '</g>' +
        '<ellipse cx="47" cy="' + (cy - 11) + '" rx="3" ry="1.6" fill="rgba(255,255,255,.75)"/>';
      if (t.indexOf('caramelDrizzle') > -1) {
        out += '<path d="M40,' + (cy - 3) + ' q5,4 9,-1 q4,-5 9,1 q3,3 6,-2" fill="none" stroke="#c9822f" ' +
          'stroke-width="2" stroke-linecap="round" opacity=".95"/>';
      }
      if (t.indexOf('cocoa') > -1) {
        out += '<g fill="#4a2a18" opacity=".55"><circle cx="45" cy="' + (cy - 8) + '" r="1.4"/>' +
          '<circle cx="53" cy="' + (cy - 6) + '" r="1.2"/><circle cx="50" cy="' + (cy - 13) + '" r="1.1"/></g>';
      }
    }

    /* latte art sobre la espuma */
    if (t.indexOf('latteArt') > -1 && t.indexOf('cream') === -1) {
      const y = surfaceY + 4.5;
      out += '<path d="M50,' + (y - 1) + ' c-3.4,-4.6 -10.4,-1.2 -8.2,3.6 c1.6,3.4 8.2,6.6 8.2,6.6 ' +
        'c0,0 6.6,-3.2 8.2,-6.6 c2.2,-4.8 -4.8,-8.2 -8.2,-3.6 z" fill="rgba(122,78,48,.85)"/>';
    }

    /* cacao en polvo */
    if (t.indexOf('cocoa') > -1 && t.indexOf('cream') === -1) {
      out += '<g fill="#4a2a18" opacity=".5">' +
        '<circle cx="44" cy="' + (surfaceY + 3) + '" r="1.3"/><circle cx="52" cy="' + (surfaceY + 4.5) + '" r="1.1"/>' +
        '<circle cx="58" cy="' + (surfaceY + 2.5) + '" r="1.2"/><circle cx="48" cy="' + (surfaceY + 1.5) + '" r="0.9"/></g>';
    }

    /* cúpula de frappé */
    if (v.dome) {
      out += '<path d="M' + (v.tl - 1) + ',' + v.topY + ' Q50,' + (v.topY - 22) + ' ' + (v.tr + 1) + ',' + v.topY +
        ' Z" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.34)" stroke-width="1.5"/>';
    }

    /* vapor */
    if (p.hot && t.indexOf('cream') === -1) {
      out += '<g stroke="#ffffff" stroke-opacity=".20" stroke-width="2.2" fill="none" stroke-linecap="round">' +
        '<path d="M41,' + (v.topY - 8) + ' q-4,-7 0,-12 q4,-5 0,-11"/>' +
        '<path d="M50,' + (v.topY - 12) + ' q-4,-7 0,-12 q4,-5 0,-10"/>' +
        '<path d="M59,' + (v.topY - 8) + ' q4,-7 0,-12 q-4,-5 0,-11"/></g>';
    }

    const defs = '<linearGradient id="' + gradId + '" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#e3d6c4"/><stop offset=".55" stop-color="#f5ebdc"/>' +
      '<stop offset="1" stop-color="#d9cab6"/></linearGradient>' +
      '<clipPath id="' + clipId + '"><path d="' + bodyPath(v, 4) + '"/></clipPath>';

    void cupId;
    return svg(out, defs);
  }

  /* ---------------- Panadería y cocina ---------------- */

  function shadow(rx, cy) {
    return '<ellipse cx="50" cy="' + (cy || 82) + '" rx="' + (rx || 30) + '" ry="5" fill="rgba(0,0,0,.32)"/>';
  }

  const FOOD = {
    croissant: function () {
      const g = nid('g');
      return svg(
        shadow(30) +
        '<path d="M50 26 C69 26 85 41 85 61 C85 69 80 73 73 70 C69 60 61 55 50 55 C39 55 31 60 27 70 C20 73 15 69 15 61 C15 41 31 26 50 26 Z" fill="url(#' + g + ')"/>' +
        '<path d="M50 55 C61 55 69 60 73 70 C65 74 57 73 50 73 Z" fill="#b8813f" opacity=".55"/>' +
        '<g stroke="#a9713a" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".8">' +
        '<path d="M30 34 q-6 12 -1 22"/><path d="M41 29 q-5 14 -1 25"/>' +
        '<path d="M59 29 q5 14 1 25"/><path d="M70 34 q6 12 1 22"/></g>' +
        '<g stroke="#f7dca6" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5">' +
        '<path d="M36 33 q-3 10 0 18"/><path d="M64 33 q3 10 0 18"/></g>' +
        '<path d="M28 46 C34 40 41 36 50 35" stroke="#ffdfa9" stroke-width="2.4" fill="none" opacity=".45"/>',
        '<linearGradient id="' + g + '" x1="0" y1="0" x2=".3" y2="1">' +
        '<stop offset="0" stop-color="#f0c179"/><stop offset=".5" stop-color="#d9a254"/>' +
        '<stop offset="1" stop-color="#a9722f"/></linearGradient>'
      );
    },

    croissantAlmendra: function () {
      const g = nid('g');
      let almonds = '';
      [[34, 40, -28], [46, 32, 16], [60, 33, -12], [72, 42, 24], [40, 52, 8], [66, 54, -18], [52, 44, 32]].forEach(function (a) {
        almonds += '<ellipse cx="' + a[0] + '" cy="' + a[1] + '" rx="5" ry="2.6" transform="rotate(' + a[2] + ' ' + a[0] + ' ' + a[1] + ')" fill="#f0dcb5" stroke="#c0a373" stroke-width="0.8"/>';
      });
      return svg(
        shadow(30) +
        '<path d="M50 26 C69 26 85 41 85 61 C85 69 80 73 73 70 C69 60 61 55 50 55 C39 55 31 60 27 70 C20 73 15 69 15 61 C15 41 31 26 50 26 Z" fill="url(#' + g + ')"/>' +
        '<g stroke="#a06f32" stroke-width="2" fill="none" stroke-linecap="round" opacity=".55">' +
        '<path d="M30 34 q-6 12 -1 22"/><path d="M41 29 q-5 14 -1 25"/>' +
        '<path d="M59 29 q5 14 1 25"/><path d="M70 34 q6 12 1 22"/></g>' + almonds +
        '<g fill="#fffdf7" opacity=".85"><circle cx="38" cy="30" r="1.1"/><circle cx="55" cy="27" r="0.9"/>' +
        '<circle cx="64" cy="38" r="1"/><circle cx="45" cy="48" r="0.8"/><circle cx="72" cy="55" r="0.9"/></g>',
        '<linearGradient id="' + g + '" x1="0" y1="0" x2=".3" y2="1">' +
        '<stop offset="0" stop-color="#e0ad61"/><stop offset="1" stop-color="#9c6829"/></linearGradient>'
      );
    },

    muffin: function () {
      const g = nid('g'), w = nid('w');
      return svg(
        shadow(26) +
        '<path d="M33 56 L39 80 Q50 84 61 80 L67 56 Z" fill="url(#' + w + ')"/>' +
        '<g stroke="#a86f3c" stroke-width="1.4" opacity=".5">' +
        '<path d="M40 58 L44 81"/><path d="M47 58 L49 82"/><path d="M54 58 L56 82"/><path d="M61 58 L58 81"/></g>' +
        '<path d="M31 57 Q27 38 50 34 Q73 38 69 57 Q50 63 31 57 Z" fill="url(#' + g + ')"/>' +
        '<g fill="#f6e2bb">' +
        '<circle cx="40" cy="45" r="4"/><circle cx="50" cy="38" r="3.6"/><circle cx="60" cy="46" r="3.4"/></g>' +
        '<g fill="#5c3d78"><circle cx="44" cy="52" r="2.8"/><circle cx="56" cy="52" r="2.6"/>' +
        '<circle cx="50" cy="47" r="2.4"/><circle cx="63" cy="54" r="2.2"/><circle cx="37" cy="53" r="2"/></g>' +
        '<path d="M32 57 Q50 63 68 57" stroke="#c08b4a" stroke-width="2" fill="none" opacity=".7"/>',
        '<linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#efc684"/><stop offset="1" stop-color="#c4914d"/></linearGradient>' +
        '<linearGradient id="' + w + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#e2c79b"/><stop offset="1" stop-color="#a87b4c"/></linearGradient>'
      );
    },

    cookie: function () {
      const g = nid('g');
      let chips = '';
      [[40, 46, 3.4], [55, 40, 3], [62, 55, 3.2], [45, 60, 3], [52, 52, 2.6], [34, 57, 2.4], [58, 66, 2.2], [48, 38, 2.2]].forEach(function (c) {
        chips += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '" fill="#43281a"/>';
      });
      return svg(
        shadow(24) +
        '<circle cx="50" cy="52" r="27" fill="url(#' + g + ')"/>' +
        '<circle cx="50" cy="52" r="27" fill="none" stroke="#b7833f" stroke-width="1.2" opacity=".6"/>' +
        chips +
        '<path d="M31 40 Q40 34 50 35" stroke="#f7d9a4" stroke-width="2.4" fill="none" opacity=".55"/>',
        '<radialGradient id="' + g + '" cx=".38" cy=".3" r=".85">' +
        '<stop offset="0" stop-color="#efc079"/><stop offset=".6" stop-color="#d09b51"/>' +
        '<stop offset="1" stop-color="#a3712f"/></radialGradient>'
      );
    },

    bagel: function () {
      const g = nid('g');
      return svg(
        shadow(24) +
        '<circle cx="50" cy="56" r="26" fill="url(#' + g + ')"/>' +
        '<circle cx="50" cy="56" r="26" fill="none" stroke="#a4702f" stroke-width="1.6"/>' +
        '<circle cx="50" cy="56" r="9.5" fill="#181412"/>' +
        '<circle cx="50" cy="56" r="9.5" fill="none" stroke="#8b5c24" stroke-width="1.4"/>' +
        '<g fill="#f8eed6"><ellipse cx="50" cy="38" rx="10" ry="5" transform="rotate(-8 50 38)"/>' +
        '<ellipse cx="44" cy="42" rx="7" ry="3.6" transform="rotate(-18 44 42)"/>' +
        '<ellipse cx="57" cy="41" rx="6" ry="3.2" transform="rotate(10 57 41)"/></g>' +
        '<g fill="#fffdf7" opacity=".6"><circle cx="35" cy="47" r="1.1"/><circle cx="63" cy="64" r="1.1"/>' +
        '<circle cx="42" cy="72" r="1"/><circle cx="66" cy="50" r="0.9"/></g>',
        '<radialGradient id="' + g + '" cx=".4" cy=".28" r=".9">' +
        '<stop offset="0" stop-color="#eec178"/><stop offset="1" stop-color="#b17d3a"/></radialGradient>'
      );
    },

    rolCanela: function () {
      const g = nid('g');
      return svg(
        shadow(26) +
        '<circle cx="50" cy="58" r="26" fill="url(#' + g + ')"/>' +
        '<path d="M50 58 m-1 0 a1 1 0 1 1 2 0 a2.6 2.6 0 1 1 -5 0 a5.2 5.2 0 1 1 10 0 a8 8 0 1 1 -16 0 a11 11 0 1 1 22 0 a14 14 0 1 1 -28 0 a17 17 0 1 1 34 0 a20 20 0 1 1 -40 0 a23 23 0 1 1 46 0" fill="none" stroke="#8a5222" stroke-width="2.6" opacity=".75"/>' +
        '<path d="M32 44 q6 -8 12 -4 q4 3 1 7 q-3 4 -8 1" fill="none" stroke="#fdf7ea" stroke-width="3.4" stroke-linecap="round" opacity=".9"/>' +
        '<path d="M52 40 q8 -4 12 2" fill="none" stroke="#fdf7ea" stroke-width="3" stroke-linecap="round" opacity=".8"/>' +
        '<g fill="#f6e7c8" opacity=".55"><circle cx="40" cy="68" r="1.2"/><circle cx="62" cy="66" r="1"/></g>',
        '<radialGradient id="' + g + '" cx=".4" cy=".3" r=".9">' +
        '<stop offset="0" stop-color="#e4b271"/><stop offset="1" stop-color="#a86e30"/></radialGradient>'
      );
    },

    bananaBread: function () {
      const g = nid('g');
      return svg(
        shadow(28, 84) +
        '<path d="M24 50 Q24 30 50 29 Q76 30 76 50 L74 80 Q50 84 26 80 Z" fill="url(#' + g + ')"/>' +
        '<path d="M24 50 Q24 30 50 29 Q76 30 76 50 Q50 44 24 50 Z" fill="#b07a3f"/>' +
        '<g fill="#8a5a2a" opacity=".55"><circle cx="40" cy="60" r="2.2"/><circle cx="58" cy="66" r="1.8"/>' +
        '<circle cx="48" cy="72" r="2"/><circle cx="64" cy="56" r="1.6"/><circle cx="34" cy="70" r="1.6"/></g>' +
        '<path d="M30 55 Q50 50 70 55" stroke="#e6c08c" stroke-width="1.6" fill="none" opacity=".5"/>',
        '<linearGradient id="' + g + '" x1="0" y1="0" x2=".2" y2="1">' +
        '<stop offset="0" stop-color="#e5bd85"/><stop offset="1" stop-color="#bd8547"/></linearGradient>'
      );
    },

    sandwich: function () {
      const c = nid('c');
      return svg(
        shadow(30) +
        '<defs><clipPath id="' + c + '"><path d="M22 76 L50 34 L78 76 Z"/></clipPath></defs>' +
        '<path d="M22 76 L50 34 L78 76 Z" fill="#e0b379"/>' +
        '<g clip-path="url(#' + c + ')">' +
        '<rect x="20" y="52" width="62" height="8" fill="#86ab5c"/>' +
        '<rect x="20" y="60" width="62" height="9" fill="#d9a98f"/>' +
        '<rect x="20" y="69" width="62" height="7" fill="#f2d489"/>' +
        '<rect x="20" y="76" width="62" height="8" fill="#e8c89a"/>' +
        '</g>' +
        '<path d="M22 76 L50 34 L78 76 Z" fill="none" stroke="#b5813f" stroke-width="2"/>' +
        '<path d="M30 72 q14 -6 26 -2" stroke="#f6dfb4" stroke-width="2" fill="none" opacity=".5"/>' +
        '<path d="M44 44 L52 40" stroke="#c08b46" stroke-width="1.6" opacity=".6"/>',
        ''
      );
    },

    avocadoToast: function () {
      const g = nid('g');
      return svg(
        shadow(28) +
        '<path d="M20 44 Q20 36 27 36 L73 34 Q80 34 80 42 L80 76 Q80 82 73 82 L27 82 Q20 82 20 76 Z" fill="url(#' + g + ')"/>' +
        '<path d="M25 45 Q27 40 32 40 L69 39 Q74 39 75 44 L75 74 Q75 78 70 78 L30 78 Q25 78 25 74 Z" fill="#f2e2c4"/>' +
        '<path d="M28 48 Q34 42 44 44 Q52 36 62 42 Q71 42 72 50 Q74 60 66 66 Q58 74 48 70 Q36 72 30 64 Q24 56 28 48 Z" fill="#8aa855"/>' +
        '<path d="M35 47 Q40 44 45 47" stroke="#a9c273" stroke-width="2" fill="none"/>' +
        '<g fill="#c0453a"><circle cx="40" cy="55" r="2.6"/><circle cx="58" cy="52" r="2.4"/><circle cx="52" cy="62" r="2.2"/>' +
        '<circle cx="64" cy="62" r="1.8"/></g>' +
        '<g fill="#f5ceae"><circle cx="47" cy="47" r="2.2"/><circle cx="35" cy="63" r="1.8"/></g>',
        '<linearGradient id="' + g + '" x1="0" y1="0" x2=".2" y2="1">' +
        '<stop offset="0" stop-color="#e2b47a"/><stop offset="1" stop-color="#b98546"/></linearGradient>'
      );
    },

    empanada: function () {
      const g = nid('g');
      let crimp = '';
      for (let i = 0; i < 9; i++) {
        const x = 25 + i * 6.2;
        crimp += '<path d="M' + x + ',58 q3,-5 6,0" fill="none" stroke="#a4712f" stroke-width="1.8"/>';
      }
      return svg(
        shadow(28) +
        '<path d="M18 60 Q50 20 82 60 Q50 84 18 60 Z" fill="url(#' + g + ')"/>' +
        '<path d="M18 60 Q50 84 82 60 Q50 70 18 60 Z" fill="#c08b45" opacity=".4"/>' +
        crimp +
        '<path d="M32 46 Q44 34 56 36" stroke="#f8dfae" stroke-width="2.6" fill="none" opacity=".5" stroke-linecap="round"/>',
        '<linearGradient id="' + g + '" x1="0" y1="0" x2=".3" y2="1">' +
        '<stop offset="0" stop-color="#f0c67f"/><stop offset="1" stop-color="#bd8840"/></linearGradient>'
      );
    },

    brownie: function () {
      const g = nid('g');
      return svg(
        shadow(28) +
        '<path d="M24 46 L64 34 L80 44 L40 58 Z" fill="#8b5a34"/>' +
        '<path d="M24 46 L40 58 L40 82 L24 70 Z" fill="#4a2b1a"/>' +
        '<path d="M40 58 L80 44 L80 68 L40 82 Z" fill="url(#' + g + ')"/>' +
        '<g stroke="#c8945c" stroke-width="1.4" opacity=".7" fill="none">' +
        '<path d="M46 62 q8 -4 14 -8"/><path d="M50 70 q9 -4 16 -9"/><path d="M52 56 q6 -3 10 -5"/></g>' +
        '<g fill="#3a2013"><circle cx="56" cy="56" r="2.2"/><circle cx="66" cy="50" r="1.8"/><circle cx="62" cy="66" r="1.6"/></g>',
        '<linearGradient id="' + g + '" x1="0" y1="0" x2=".4" y2="1">' +
        '<stop offset="0" stop-color="#5d3721"/><stop offset="1" stop-color="#331d10"/></linearGradient>'
      );
    },

    cheesecake: function () {
      return svg(
        shadow(26) +
        '<path d="M28 54 L50 34 L72 54 L72 78 L28 78 Z" fill="#f7edd9"/>' +
        '<path d="M28 68 L72 68 L72 78 L28 78 Z" fill="#d8b37c"/>' +
        '<path d="M28 54 L50 34 L72 54 Q50 62 28 54 Z" fill="#c2495a"/>' +
        '<path d="M50 34 L72 54 Q60 60 50 58 Z" fill="#d95d6b"/>' +
        '<circle cx="50" cy="50" r="6.5" fill="#e2626f"/>' +
        '<path d="M50 44 q3 6 0 12 q-3 -6 0 -12" fill="#b83a4b"/>' +
        '<path d="M36 74 L64 74" stroke="#a87a48" stroke-width="1.6" opacity=".5"/>',
        ''
      );
    }
  };

  function food(key) {
    const f = FOOD[key];
    return f ? f() : '';
  }

  function product(p, entries) {
    if (p.art) return food(p.art);
    return drink(p, entries || []);
  }

  return { product: product, drink: drink, food: food, VESSELS: VESSELS };
})();
