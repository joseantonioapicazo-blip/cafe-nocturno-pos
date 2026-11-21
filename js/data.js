/* ============================================================
   Café Nocturno — Catálogo, ingredientes y recetas
   ============================================================ */
window.POS_DATA = (function () {
  const ingredients = {
    /* ---- Café y barra (inventario por unidades) ---- */
    espresso:   { name: 'Café espresso molido', unit: 'ml', unitName: 'bolsa', unitSize: 800,  color: '#5a2d16', stock: 4,  min: 1, cap: 8,  group: 'Café y barra', track: true },
    coldbrew:   { name: 'Cold brew concentrado', unit: 'ml', unitName: 'bote',  unitSize: 800,  color: '#46220f', stock: 3,  min: 1, cap: 6,  group: 'Café y barra', track: true },
    agua:       { name: 'Agua purificada',     unit: 'ml', unitName: 'garrafón', unitSize: 4000, color: '#9fc6d4', artColor: '#a9cdd9', stock: 7,  min: 2, cap: 12, group: 'Café y barra', track: true },
    aguaCal:    { name: 'Agua caliente',       unit: 'ml', unitName: 'bote',  unitSize: 4000, color: '#7c5334', artColor: '#6f4a33', stock: 4,  min: 1, cap: 8,  group: 'Café y barra', track: true },
    chocolate:  { name: 'Salsa de chocolate',  unit: 'ml', unitName: 'botella', unitSize: 750,  color: '#3f1f10', stock: 3,  min: 1, cap: 6,  group: 'Café y barra', track: true },
    caramelo:   { name: 'Salsa de caramelo',   unit: 'ml', unitName: 'botella', unitSize: 750,  color: '#c9822f', stock: 2,  min: 1, cap: 4,  group: 'Café y barra', track: true },
    matcha:     { name: 'Matcha en polvo',     unit: 'g',  unitName: 'lata',  unitSize: 100,  color: '#86a352', stock: 3,  min: 1, cap: 6,  group: 'Café y barra', track: true },
    chai:       { name: 'Concentrado chai',    unit: 'ml', unitName: 'botella', unitSize: 750,  color: '#b06f33', stock: 2,  min: 1, cap: 4,  group: 'Café y barra', track: true },
    manzanilla: { name: 'Manzanilla (hojas)',  unit: 'g',  unitName: 'caja',  unitSize: 50,   color: '#d9ae5a', stock: 5,  min: 1, cap: 10, group: 'Café y barra', track: true },
    teNegro:    { name: 'Té negro (hojas)',    unit: 'g',  unitName: 'caja',  unitSize: 50,   color: '#8a4a1f', stock: 5,  min: 1, cap: 10, group: 'Café y barra', track: true },
    vainilla:   { name: 'Jarabe de vainilla',  unit: 'ml', unitName: 'botella', unitSize: 750,  color: '#e7c98d', stock: 2,  min: 1, cap: 4,  group: 'Café y barra', track: true },

    /* ---- Lácteos (inventario por unidades) ---- */
    leche:      { name: 'Leche entera',        unit: 'ml', unitName: 'bote',  unitSize: 1000, color: '#f4e8d5', stock: 11, min: 2, cap: 20, group: 'Lácteos', track: true },
    lecheDesl:  { name: 'Leche deslactosada',  unit: 'ml', unitName: 'bote',  unitSize: 1000, color: '#f7ecdb', stock: 3,  min: 1, cap: 6,  group: 'Lácteos', track: true },
    almendra:   { name: 'Leche de almendra',   unit: 'ml', unitName: 'bote',  unitSize: 1000, color: '#eadfc6', stock: 2,  min: 1, cap: 4,  group: 'Lácteos', track: true },
    avena:      { name: 'Leche de avena',      unit: 'ml', unitName: 'bote',  unitSize: 1000, color: '#e0cfae', stock: 2,  min: 1, cap: 4,  group: 'Lácteos', track: true },
    espuma:     { name: 'Espuma de leche',     unit: 'ml', unitName: 'bote',  unitSize: 1000, color: '#fdf6ea', stock: 0,  min: 0, cap: 0,  group: 'Lácteos', track: false },
    crema:      { name: 'Crema batida',        unit: 'ml', unitName: 'frasco', unitSize: 500,  color: '#fffaf2', stock: 3,  min: 1, cap: 6,  group: 'Lácteos', track: true },

    /* ---- Panadería y cocina (sin inventario) ---- */
    masa:       { name: 'Masa de hojaldre',    unit: 'g', color: '#ddba88', stock: 0, min: 0, cap: 0, group: 'Panadería', track: false },
    harina:     { name: 'Harina',              unit: 'g', color: '#e8d5b5', stock: 0, min: 0, cap: 0, group: 'Panadería', track: false },
    mantequilla:{ name: 'Mantequilla',         unit: 'g', color: '#f1d79c', stock: 0, min: 0, cap: 0, group: 'Panadería', track: false },
    azucar:     { name: 'Azúcar',              unit: 'g', color: '#f0e0bd', stock: 0, min: 0, cap: 0, group: 'Panadería', track: false },
    arandano:   { name: 'Arándano',            unit: 'g', color: '#6b4a8f', stock: 0, min: 0, cap: 0, group: 'Panadería', track: false },
    canela:     { name: 'Canela molida',       unit: 'g', color: '#a9673a', stock: 0, min: 0, cap: 0, group: 'Panadería', track: false },
    platano:    { name: 'Plátano',             unit: 'g', color: '#e3c264', stock: 0, min: 0, cap: 0, group: 'Panadería', track: false },
    almendraG:  { name: 'Almendra fileteada',  unit: 'g', color: '#d8b98a', stock: 0, min: 0, cap: 0, group: 'Panadería', track: false },
    chispasChoc:{ name: 'Chispas de chocolate',unit: 'g', color: '#3f2415', stock: 0, min: 0, cap: 0, group: 'Panadería', track: false },
    quesoCrema: { name: 'Queso crema',         unit: 'g', color: '#f7f0e0', stock: 0, min: 0, cap: 0, group: 'Cocina', track: false },
    pan:        { name: 'Pan artesanal',       unit: 'g', color: '#d9ab74', stock: 0, min: 0, cap: 0, group: 'Cocina', track: false },
    pavo:       { name: 'Pechuga de pavo',     unit: 'g', color: '#d9a98f', stock: 0, min: 0, cap: 0, group: 'Cocina', track: false },
    lechuga:    { name: 'Lechuga',             unit: 'g', color: '#86ab5c', stock: 0, min: 0, cap: 0, group: 'Cocina', track: false },
    jitomate:   { name: 'Jitomate',            unit: 'g', color: '#c0453a', stock: 0, min: 0, cap: 0, group: 'Cocina', track: false },
    queso:      { name: 'Queso para fundir',   unit: 'g', color: '#f2d489', stock: 0, min: 0, cap: 0, group: 'Cocina', track: false },
    aguacate:   { name: 'Aguacate',            unit: 'g', color: '#8aa855', stock: 0, min: 0, cap: 0, group: 'Cocina', track: false },
    fresa:      { name: 'Fresa',               unit: 'g', color: '#c2495a', stock: 0, min: 0, cap: 0, group: 'Cocina', track: false },
    hielo:      { name: 'Hielo',               unit: 'g', unitName: 'bolsa', unitSize: 2000, color: '#cfe6ee', stock: 4,  min: 1, cap: 8,  group: 'Cocina', track: true }
  };

  const categories = [
    { id: 'calientes', name: 'Café caliente',  sub: 'Barra de espresso' },
    { id: 'frios',     name: 'Bebidas frías',  sub: 'Sobre hielo' },
    { id: 'tes',       name: 'Tés e infusiones', sub: 'Hojas y matcha' },
    { id: 'pan',       name: 'Panadería',      sub: 'Horneado del día' },
    { id: 'cocina',    name: 'Cocina y postres', sub: 'Preparado al momento' }
  ];

  /* Receta = cantidades en tamaño mediano (M) */
  const products = [
    /* ---------------- Café caliente ---------------- */
    {
      id: 'espresso', name: 'Espresso', cat: 'calientes', price: 38,
      vessel: 'demitasse', hot: true, toppings: ['crema'],
      desc: 'Treinta mililitros de espresso recién extraído, con su crema color avellana.',
      recipe: [['espresso', 30], ['espuma', 4]]
    },
    {
      id: 'americano', name: 'Americano', cat: 'calientes', price: 45,
      vessel: 'mug', hot: true, toppings: ['steam'],
      desc: 'Espresso suavizado con agua caliente. Aroma limpio y cuerpo ligero.',
      recipe: [['espresso', 30], ['aguaCal', 140]]
    },
    {
      id: 'latte', name: 'Latte', cat: 'calientes', price: 62,
      vessel: 'mug', hot: true, toppings: ['latteArt', 'steam'],
      desc: 'Espresso con leche al vapor y una capa fina de espuma sedosa.',
      recipe: [['espresso', 30], ['leche', 150], ['espuma', 20]]
    },
    {
      id: 'cappuccino', name: 'Cappuccino', cat: 'calientes', price: 58,
      vessel: 'mug', hot: true, toppings: ['latteArt', 'cocoa', 'steam'],
      desc: 'Partes iguales de espresso, leche y espuma; terminado con cacao.',
      recipe: [['espresso', 30], ['leche', 70], ['espuma', 70]]
    },
    {
      id: 'flatwhite', name: 'Flat White', cat: 'calientes', price: 65,
      vessel: 'mug', hot: true, toppings: ['latteArt'],
      desc: 'Doble espresso con microespuma densa. Intenso y corto.',
      recipe: [['espresso', 45], ['leche', 120], ['espuma', 12]]
    },
    {
      id: 'mocha', name: 'Mocha', cat: 'calientes', price: 72,
      vessel: 'mug', hot: true, toppings: ['cream', 'cocoa', 'steam'],
      desc: 'Espresso, chocolate amargo y leche, coronado con crema batida.',
      recipe: [['espresso', 30], ['chocolate', 30], ['leche', 120], ['crema', 25]]
    },
    {
      id: 'macchiato', name: 'Caramel Macchiato', cat: 'calientes', price: 75,
      vessel: 'mug', hot: true, toppings: ['latteArt', 'caramelDrizzle', 'steam'],
      desc: 'Leche vaporizada, espresso vertido al final y caramelo en hilos.',
      recipe: [['espresso', 30], ['leche', 150], ['caramelo', 20], ['espuma', 20]]
    },
    {
      id: 'chailatte', name: 'Chai Latte', cat: 'calientes', price: 68,
      vessel: 'mug', hot: true, toppings: ['cocoa', 'steam'],
      desc: 'Concentrado de especias y té negro con leche cremosa.',
      recipe: [['chai', 45], ['leche', 140], ['espuma', 20]]
    },
    {
      id: 'chocolatecal', name: 'Chocolate caliente', cat: 'calientes', price: 60,
      vessel: 'mug', hot: true, toppings: ['cream', 'cocoa', 'steam'],
      desc: 'Chocolate de mesa disuelto en leche entera, con crema batida.',
      recipe: [['chocolate', 40], ['leche', 160], ['crema', 20]]
    },

    /* ---------------- Bebidas frías ---------------- */
    {
      id: 'coldbrew', name: 'Cold Brew', cat: 'frios', price: 60,
      vessel: 'glass', hot: false, toppings: ['ice', 'straw'],
      desc: 'Extracción en frío de 18 horas. Dulzor natural, cero amargor.',
      recipe: [['coldbrew', 190], ['agua', 40], ['hielo', 70]]
    },
    {
      id: 'icedlatte', name: 'Iced Latte', cat: 'frios', price: 65,
      vessel: 'glass', hot: false, toppings: ['ice', 'straw'],
      desc: 'Doble espresso sobre leche fría y hielo cristalino.',
      recipe: [['espresso', 40], ['leche', 130], ['hielo', 80]]
    },
    {
      id: 'frappemoka', name: 'Frappé Moka', cat: 'frios', price: 82,
      vessel: 'frappe', hot: false, toppings: ['ice', 'cream', 'cocoa', 'straw'],
      desc: 'Espresso, chocolate y leche licuados con hielo, con crema y cacao.',
      recipe: [['espresso', 30], ['leche', 90], ['chocolate', 30], ['hielo', 110], ['crema', 40]]
    },
    {
      id: 'frappecaramelo', name: 'Frappé Caramelo', cat: 'frios', price: 82,
      vessel: 'frappe', hot: false, toppings: ['ice', 'cream', 'caramelDrizzle', 'straw'],
      desc: 'Café frío licuado con caramelo y crema batida, hilos al final.',
      recipe: [['espresso', 25], ['leche', 100], ['caramelo', 30], ['hielo', 110], ['crema', 40]]
    },
    {
      id: 'matchafrio', name: 'Matcha frío', cat: 'frios', price: 75,
      vessel: 'glass', hot: false, toppings: ['ice', 'straw'],
      desc: 'Matcha ceremonial batido y servido sobre leche fría con hielo.',
      recipe: [['matcha', 6], ['agua', 40], ['leche', 130], ['hielo', 80]]
    },

    /* ---------------- Tés ---------------- */
    {
      id: 'manzanilla', name: 'Té de manzanilla', cat: 'tes', price: 42,
      vessel: 'mug', hot: true, toppings: ['steam'],
      desc: 'Infusión de flores de manzanilla, reposada cuatro minutos.',
      recipe: [['manzanilla', 4], ['aguaCal', 250]]
    },
    {
      id: 'tenegro', name: 'Té negro', cat: 'tes', price: 42,
      vessel: 'mug', hot: true, toppings: ['steam'],
      desc: 'English Breakfast en hebras, cuerpo firme y notas maltosas.',
      recipe: [['teNegro', 5], ['aguaCal', 250]]
    },
    {
      id: 'matchausucha', name: 'Matcha usucha', cat: 'tes', price: 55,
      vessel: 'bowl', hot: true, toppings: ['steam'],
      desc: 'Matcha ceremonial batido a mano con agua a 80 °C.',
      recipe: [['matcha', 4], ['aguaCal', 120]]
    },

    /* ---------------- Panadería ---------------- */
    {
      id: 'croissant', name: 'Croissant', cat: 'pan', price: 42, art: 'croissant', sizes: false,
      desc: 'Hojaldre de mantequilla, 27 capas, horneado a las 6 de la mañana.',
      recipe: [['masa', 60], ['mantequilla', 25], ['azucar', 5]]
    },
    {
      id: 'croissantalmendra', name: 'Croissant de almendra', cat: 'pan', price: 52, art: 'croissantAlmendra', sizes: false,
      desc: 'Croissant relleno de crema de almendra y almendra fileteada.',
      recipe: [['masa', 60], ['mantequilla', 25], ['almendraG', 15], ['azucar', 10]]
    },
    {
      id: 'muffin', name: 'Muffin de arándano', cat: 'pan', price: 46, art: 'muffin', sizes: false,
      desc: 'Miga húmeda con arándanos enteros y costra de azúcar.',
      recipe: [['harina', 55], ['azucar', 25], ['arandano', 20], ['mantequilla', 15]]
    },
    {
      id: 'cookie', name: 'Cookie con chispas', cat: 'pan', price: 35, art: 'cookie', sizes: false,
      desc: 'Galleta de mantequilla con chispas de chocolate semi amargo.',
      recipe: [['harina', 40], ['chispasChoc', 20], ['mantequilla', 15], ['azucar', 15]]
    },
    {
      id: 'bagel', name: 'Bagel con queso crema', cat: 'pan', price: 48, art: 'bagel', sizes: false,
      desc: 'Bagel fermentado en frío, tostado, con queso crema batido.',
      recipe: [['pan', 80], ['quesoCrema', 30]]
    },
    {
      id: 'rolcanela', name: 'Rol de canela', cat: 'pan', price: 48, art: 'rolCanela', sizes: false,
      desc: 'Espiral de masa briochada con canela y glaseado de azúcar.',
      recipe: [['masa', 65], ['canela', 8], ['azucar', 20], ['mantequilla', 12]]
    },
    {
      id: 'bananabread', name: 'Banana bread', cat: 'pan', price: 44, art: 'bananaBread', sizes: false,
      desc: 'Panqué de plátano maduro con nuez, rebanada gruesa.',
      recipe: [['harina', 50], ['platano', 40], ['azucar', 15], ['mantequilla', 12]]
    },

    /* ---------------- Cocina y postres ---------------- */
    {
      id: 'sandwich', name: 'Sándwich de pavo', cat: 'cocina', price: 85, art: 'sandwich', sizes: false,
      desc: 'Pan artesanal, pavo, queso fundido, lechuga y jitomate.',
      recipe: [['pan', 90], ['pavo', 50], ['lechuga', 20], ['jitomate', 20], ['queso', 20]]
    },
    {
      id: 'avocadotoast', name: 'Tostada de aguacate', cat: 'cocina', price: 72, art: 'avocadoToast', sizes: false,
      desc: 'Pan tostado, aguacate machacado, jitomate y chile en hojuelas.',
      recipe: [['pan', 70], ['aguacate', 60], ['jitomate', 15]]
    },
    {
      id: 'empanada', name: 'Empanada de queso', cat: 'cocina', price: 38, art: 'empanada', sizes: false,
      desc: 'Empanada de masa de hojaldre rellena de queso para fundir.',
      recipe: [['masa', 60], ['queso', 35]]
    },
    {
      id: 'brownie', name: 'Brownie', cat: 'cocina', price: 46, art: 'brownie', sizes: false,
      desc: 'Brownie de chocolate 70 %, centro húmedo y costra craquelada.',
      recipe: [['chocolate', 30], ['harina', 30], ['mantequilla', 25], ['azucar', 20]]
    },
    {
      id: 'cheesecake', name: 'Cheesecake de fresa', cat: 'cocina', price: 58, art: 'cheesecake', sizes: false,
      desc: 'Base de galleta, crema de queso y fresas maceradas.',
      recipe: [['quesoCrema', 60], ['masa', 25], ['fresa', 30], ['azucar', 15]]
    }
  ];

  const settings = {
    name: 'Café Nocturno',
    tagline: 'Tostaduría y barra de café',
    cashier: 'Mariana Ortega',
    register: 'Caja 01',
    taxRate: 16,
    footer: '¡Gracias por tu visita! Te esperamos mañana.'
  };

  return { ingredients, categories, products, settings };
})();
