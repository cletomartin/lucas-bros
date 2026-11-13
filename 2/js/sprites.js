// =============================================================
// SPRITES — pixel art de todos los personajes
// =============================================================
//
// Cada sprite es un grid de caracteres. Cada letra es un color de la
// PALETA. Para cambiar el aspecto de un personaje, basta con cambiar
// las letras de su grid o los colores que se le pasan al generador
// (kidGrid, girlGrid, adultGrid). ¡Nada de imágenes externas!
//
// El motor añade solo:
//   - un contorno oscuro alrededor de cada sprite,
//   - sombreado (luz arriba-izquierda, sombra abajo-derecha),
//   - fotogramas de animación (andar, saltar, caer, parpadear...).
//
// Convención del grid:
//   '.' = transparente
//   'K' = negro (contorno)       'W' = blanco
//   's' = piel clara             'S' = piel oscura
//   'h' = pelo marrón            'H' = pelo rubio
//   'G' = pelo gris              'n' = pelo negro       'q' = pelo pelirrojo
//   'r' = rojo        'R' = rojo oscuro
//   'b' = azul        'B' = azul marino     'u' = vaquero
//   'c' = cyan
//   'g' = verde       'D' = verde oscuro
//   'y' = amarillo    'o' = naranja
//   'p' = rosa        'P' = morado          'l' = lila
//   'm' = marrón oscuro (zapatos / madera)
//   't' = gris claro  'T' = gris oscuro

const PALETTE = {
  '.': null,
  'K': '#1c1228',
  'W': '#ffffff',
  's': '#fdd2ac',
  'S': '#c89060',
  'h': '#5a3218',
  'H': '#ffd25a',
  'G': '#c4c4cc',
  'n': '#2a2230',
  'q': '#d8642a',
  'r': '#e0342c',
  'R': '#8a1420',
  'b': '#2f6cf0',
  'B': '#1c2c6c',
  'u': '#4a78c8',
  'c': '#20c0f0',
  'g': '#30b040',
  'D': '#106020',
  'y': '#f8d020',
  'o': '#f88420',
  'p': '#fca8c0',
  'P': '#7a40b0',
  'l': '#c8a0f0',
  'm': '#5c3418',
  't': '#b0b0b8',
  'T': '#50505c',
  'e': '#241838',   // ojos (no se sombrean)
};

// Animaciones por sprite base: KID_ANIMS.get(grid) -> {idle, blink, walk[4], jump, fall, hurt, slip[2], sit}
const KID_ANIMS = new Map();
// Cuántas filas (lógicas) forman la "cabeza" de cada grid (modo cabezón).
const SPRITE_HEAD_ROWS = new Map();

// -------------------------------------------------------------
// PERSONAJES — se montan con el generador de chargen.js.
// Opciones de makeCharacter():
//   kind: 'kid' | 'adult' | 'toddler' | 'boss'
//   hair (color) + hairStyle: short, spiky, curly, long, bangs, ponytail,
//        pigtails, bob, bun, bald, wavy
//   shirt, pants, shoes, skin, skirt, dress, shorts, longSleeves,
//   glasses, beard, mustache, woman, brows, angry, mouth ('grin', 'flat'...)
//   extra: { torso, torsoOver, face, front } para detalles propios.
// -------------------------------------------------------------

// detalle: franja en el pecho
const stripe = (col, at = 0.35) => ({
  torso: (p, { g, top, bottom }) => {
    const y = Math.floor(top + (bottom - top) * at);
    for (let x = g.torso.x0; x <= g.torso.x1; x++) { p.set(x, y, col); p.set(x, y + 1, col); }
  },
});

// LUCAS — protagonista, pelo castaño, camiseta azul con franja, zapatillas rojas
const SPR_LUCAS = makeCharacter({ hair: 'h', hairStyle: 'short', shirt: 'b', pants: 'B', shoes: 'r', extra: stripe('W') });
// CLETO — hermano mediano, camiseta verde, pelo de punta, un pelín más alto
const SPR_CLETO = makeCharacter({ hair: 'h', hairStyle: 'spiky', shirt: 'g', pants: 'B', shoes: 'W', tall: true, extra: stripe('y', 0.3) });

// AMIGOS (aliados rescatables que dan power-ups)
const SPR_RAFA      = makeCharacter({ hair: 'h', hairStyle: 'curly', shirt: 'r', pants: 'B', shoes: 'T' });
const SPR_MATIAS    = makeCharacter({ hair: 'n', hairStyle: 'short', shirt: 'D', pants: 'u', shoes: 'W', extra: stripe('g', 0.2) });
const SPR_SANTIAGO  = makeCharacter({ hair: 'H', hairStyle: 'short', shirt: 'y', pants: 'B', shoes: 'b' });
const SPR_CARLOS    = makeCharacter({ hair: 'h', hairStyle: 'spiky', shirt: 'c', pants: 'T', shoes: 'r' });
const SPR_FRAN      = makeCharacter({ hair: 'q', hairStyle: 'curly', shirt: 'o', pants: 'u', shoes: 'm' });

// PADRES de Lucas y Cleto (gruñones: te regañan y te quedas quieto)
const SPR_PAPA = makeCharacter({ kind: 'adult', hair: 'h', hairStyle: 'short', beard: true, shirt: 'T', pants: 'B', shoes: 'm', angry: true, mouth: 'flat' });
const SPR_MAMA = makeCharacter({ kind: 'adult', hair: 'h', hairStyle: 'bob', woman: true, glasses: true, shirt: 'P', pants: 'b', skirt: true, shoes: 'R', angry: true, mouth: 'flat' });

// PADRES DE LOS AMIGOS (simpáticos: te dan cosas)
const SPR_ANGELES = makeCharacter({ kind: 'adult', hair: 'H', hairStyle: 'wavy', woman: true, shirt: 'p', pants: 'B', shoes: 'm' });           // madre de Rafa
const SPR_PEPE    = makeCharacter({ kind: 'adult', hair: 'n', hairStyle: 'short', glasses: true, shirt: 'r', pants: 'u', shoes: 'm', mouth: 'grin' }); // padre de Rafa
const SPR_ROSA    = makeCharacter({ kind: 'adult', hair: 'n', hairStyle: 'long', woman: true, shirt: 'c', pants: 'T', skirt: true, shoes: 'B' }); // madre de Santiago
const SPR_ASUN    = makeCharacter({ kind: 'adult', hair: 'q', hairStyle: 'curly', woman: true, shirt: 'l', pants: 'B', shoes: 'P' });          // madre de Matías

// DIEGO — hermano pequeño (2 años). Rubio, con chupete y peto vaquero.
const SPR_DIEGO = makeCharacter({
  kind: 'toddler', hair: 'H', hairStyle: 'curly', shirt: 'y', pants: 'b', shoes: 'r', mouth: 'flat',
  extra: {
    torso: (p, { g, top, bottom }) => {
      // peto: pechera y tirantes
      for (let y = Math.floor(top + 2); y <= bottom; y++)
        for (let x = g.torso.x0 + 1; x <= g.torso.x1 - 1; x++) p.set(x, y, 'b');
      p.set(g.torso.x0 + 1, top + 1, 'b'); p.set(g.torso.x1 - 1, top + 1, 'b');
      p.set(g.torso.x0 + 3, top + 3, 'y'); // botón
    },
    face: (L, { mx, my }) => {
      // chupete
      for (let y = -1; y <= 1; y++) for (let x = 0; x <= 2; x++) L.set(mx + x, my + y, 'p');
      L.set(mx + 1, my, 'W'); L.set(mx + 3, my, 'K');
    },
  },
});

// COMPAÑEROS ENEMIGOS (los traviesos de clase): sonrisa pícara y cejas de enfado
const SPR_IRENE    = makeCharacter({ hair: 'h', hairStyle: 'long', shirt: 'p', pants: 'P', skirt: true, socks: true, shoes: 'P', brows: true, angry: true, mouth: 'grin' });
const SPR_BERTA    = makeCharacter({ hair: 'H', hairStyle: 'ponytail', shirt: 'P', pants: 'B', skirt: true, socks: true, shoes: 'r', brows: true, angry: true, mouth: 'grin' });
const SPR_ANDREINA = makeCharacter({ hair: 'n', hairStyle: 'bangs', shirt: 'g', pants: 'B', skirt: true, socks: true, shoes: 'm', brows: true, angry: true, mouth: 'grin' });
const SPR_ADRIAN   = makeCharacter({ hair: 'h', hairStyle: 'spiky', shirt: 'r', pants: 'T', shorts: true, socks: true, shoes: 'T', brows: true, angry: true, mouth: 'grin', extra: stripe('W', 0.5) });
const SPR_MARTIN   = makeCharacter({ hair: 'H', hairStyle: 'spiky', shirt: 'o', pants: 'B', shoes: 'b', brows: true, angry: true, mouth: 'grin' });

// -------------------------------------------------------------
// PROFES (jefes 24x32 lógicos) — mismo generador, cuerpo grande
// -------------------------------------------------------------
const boss = (spec) => makeCharacter({ kind: 'boss', ...spec });
// centro del pecho: en 3/4 queda algo desplazado hacia donde mira
const midX = (g) => (g.torso.x0 + g.torso.x1) / 2 + 1.5;

// MARI PAZ — música, melena rubia, vestido rosa con notas
const SPR_MARI_PAZ = boss({
  hair: 'H', hairStyle: 'wavy', woman: true, shirt: 'p', pants: 'p', dress: true, shoes: 'r', mouth: 'grin',
  extra: {
    torsoOver: (p, { g, top }) => {
      for (const [ox, oy] of [[-4, 9], [3, 15], [-1, 22]]) {
        const x = midX(g) + ox, y = top + oy;
        p.rect(x, y, 2, 2, 'K'); p.rect(x + 2, y - 4, 1, 6, 'K'); p.set(x + 3, y - 4, 'K'); p.set(x + 3, y - 3, 'K');
      }
    },
  },
});

// CÉSAR — educación física, chándal rojo, silbato
const SPR_CESAR = boss({
  hair: 'h', hairStyle: 'short', shirt: 'r', pants: 'r', longSleeves: true, shoes: 'W', mouth: 'grin',
  extra: {
    torso: (p, { g, top, bottom }) => {
      for (let y = Math.floor(top + 1); y <= bottom; y++) { p.set(g.torso.x0 + 1, y, 'W'); p.set(g.torso.x1 - 1, y, 'W'); }
      for (let y = Math.floor(top); y < top + 6; y++) p.set(midX(g) + 2, y, 'W'); // cremallera
    },
    torsoOver: (p, { g, top }) => {
      for (let i = 0; i < 6; i++) p.set(midX(g) + 4 - i * 0.4, top + 1 + i, 'T'); // cordón
      p.rect(midX(g) + 1, top + 7, 4, 2, 'y'); // silbato
    },
  },
});

// LUCRE — profe veterana (la de Cleto), gafas, moño gris, vestido verde
const SPR_LUCRE = boss({
  hair: 'G', hairStyle: 'bun', woman: true, glasses: true, shirt: 'D', pants: 'D', dress: true, longSleeves: true, shoes: 'm', mouth: 'flat',
  extra: {
    torso: (p, { g, top }) => { for (let x = g.torso.x0 + 4; x <= g.torso.x1 - 4; x++) p.set(x, top + 1, 'W'); },
  },
});

// JUANJO — el tutor. Polo verde, vaqueros, pelo corto castaño.
const SPR_JUANJO = boss({
  hair: 'h', hairStyle: 'short', shirt: 'g', pants: 'u', shoes: 'T', mouth: 'smile',
  extra: {
    torso: (p, { g, top }) => {
      const m = midX(g);
      for (let i = 0; i < 4; i++) { p.set(m - 1 - i, top + i * 0.5, 'W'); p.set(m + 1 + i, top + i * 0.5, 'W'); }
      for (let y = 0; y < 5; y++) p.set(m, top + y, 'D');
      p.set(m, top + 2, 'W'); p.set(m, top + 4, 'W');
    },
  },
});

// JULIO — profe de inglés. Pelo de punta, jersey con la bandera británica.
const SPR_JULIO = boss({
  hair: 'n', hairStyle: 'spiky', shirt: 'B', pants: 'T', longSleeves: true, sleeveColor: 'B', shoes: 'm', mouth: 'grin',
  extra: {
    torso: (p, { g, top, bottom }) => {
      const m = midX(g), cyy = (top + bottom) / 2 - 1;
      for (let y = Math.floor(top + 1); y <= bottom - 1; y++) for (let x = g.torso.x0; x <= g.torso.x1; x++) {
        const d1 = Math.abs((x - m) * 0.9 - (y - cyy)), d2 = Math.abs((x - m) * 0.9 + (y - cyy));
        if (Math.abs(x - m) < 2.5 || Math.abs(y - cyy) < 2) p.set(x, y, Math.abs(x - m) < 1.5 || Math.abs(y - cyy) < 1 ? 'r' : 'W');
        else if (d1 < 1.2 || d2 < 1.2) p.set(x, y, 'W');
      }
    },
  },
});

// EMILIO — director, traje oscuro, corbata, calvo, jefe final
const SPR_EMILIO = boss({
  hair: 'G', hairStyle: 'bald', mustache: true, shirt: 'T', pants: 'B', longSleeves: true, shoes: 'K', brows: true, angry: true, mouth: 'flat',
  extra: {
    torso: (p, { g, top }) => {
      const m = midX(g);
      for (let y = 0; y < 9; y++) for (let x = -3 + y * 0.35; x <= 3 - y * 0.35; x++) p.set(m + x, top + y, 'W');
      for (let y = 1; y < 12; y++) { const w = y < 2 ? 1 : y > 9 ? 0.5 : 1.2; for (let x = -w; x <= w; x++) p.set(m + x, top + y, y < 2 ? 'R' : 'r'); }
    },
  },
});

// -------------------------------------------------------------
// OBJETOS DEL JUEGO
// -------------------------------------------------------------

// Boomerang de madera (8x8)
const SPR_BOOMERANG = [
  '.KKK....',
  'KoooK...',
  'KoyoK...',
  'KoyoK...',
  'KoyoKKK.',
  'KoyyyyoK',
  '.KoooooK',
  '..KKKKK.',
];

// Cromo coleccionable (mini-carta con cara). 8x10.
const SPR_CROMO = [
  'KKKKKKKK',
  'KyyyyyyK',
  'KyWWWWyK',
  'KyWhhWyK',
  'KyWssWyK',
  'KyWbbWyK',
  'KyWbbWyK',
  'KyyyyyyK',
  'KKKKKKKK',
];
// Reverso del cromo (cuando gira)
const SPR_CROMO_BACK = [
  'KKKKKKKK',
  'KbbbbbbK',
  'KbccccbK',
  'KbcWWcbK',
  'KbcWWcbK',
  'KbccccbK',
  'KbccccbK',
  'KbbbbbbK',
  'KKKKKKKK',
];

// Chupete (proyectil de Diego). 6x6.
const SPR_CHUPETE = [
  '..KKK.',
  '.KppKK',
  'KppppK',
  'KpWppK',
  '.KKKK.',
  '..KK..',
];

// Lápiz (proyectil de Juanjo). 9x7 — punta a la derecha.
const SPR_LAPIZ = [
  'KKKKKKK..',
  'KryyyyyK.',
  'KryyyyyKK',
  'KryyyyysK',
  'KryyyyyKK',
  'KryyyyyK.',
  'KKKKKKK..',
];

// Taza de té (proyectil de Julio). 8x7.
const SPR_TEA = [
  '.W.W....',
  '..W.W...',
  'KKKKKK..',
  'KWWWWKKK',
  'KWrrWK.K',
  'KWWWWKKK',
  '.KKKK...',
];
// Bandera británica (Union Jack) — proyectil de Julio. 11x9.
const SPR_UKFLAG = [
  'KKKKKKKKKKK',
  'KWBBWrWBBWK',
  'KBWBWrWBWBK',
  'KWWWWrWWWWK',
  'KrrrrrrrrrK',
  'KWWWWrWWWWK',
  'KBWBWrWBWBK',
  'KWBBWrWBBWK',
  'KKKKKKKKKKK',
];
// Letras del abecedario. 8x8.
const SPR_LETTER_A = [
  'KKKKKKKK',
  'KccccccK',
  'KccWWccK',
  'KcWccWcK',
  'KcWWWWcK',
  'KcWccWcK',
  'KccccccK',
  'KKKKKKKK',
];
const SPR_LETTER_B = [
  'KKKKKKKK',
  'KooooooK',
  'KoWWWooK',
  'KoWooWoK',
  'KoWWWooK',
  'KoWooWoK',
  'KoWWWooK',
  'KKKKKKKK',
];

// Cáscara de plátano (Diego la suelta y te hace patinar). 8x5.
const SPR_BANANA = [
  '..KKKK..',
  '.KyyyyK.',
  'KyyyyyyK',
  'KyKKKyK.',
  '.KKKKK..',
];

// Bocadillo de jamón y queso (rellena la barriga). 10x6.
const SPR_BOCADILLO = [
  '.KKKKKKKK.',
  'KooooooooK',
  'KrrprrprrK',
  'KyyyyyyyyK',
  'KooooooooK',
  '.KKKKKKKK.',
];

// Objetos del nivel bonus
const SPR_STAR = [
  '....K....',
  '...KyK...',
  'KKKKyKKKK',
  'KyyyWyyyK',
  '.KyyyyyK.',
  '..KyyyK..',
  '.KyyKyyK.',
  'KyKK.KKyK',
  'KK.....KK',
];
const SPR_APPLE = [
  '....K...',
  '...KgK..',
  '.KKKKKK.',
  'KrWrrrrK',
  'KrrrrrrK',
  'KrrrrrrK',
  '.KrrrrK.',
  '..KKKK..',
];
const SPR_DONUT = [
  '..KKKK..',
  '.KppppK.',
  'KpWpppyK',
  'Kpp..ppK',
  'Kpp..ppK',
  'KoppWppK',
  '.KooooK.',
  '..KKKK..',
];
const SPR_CLOCK = [
  '.KKKKK..',
  'KWWWWWK.',
  'KWWKWWWK',
  'KWWKWWWK',
  'KWWKKKWK',
  'KWWWWWWK',
  '.KWWWWK.',
  '..KKKK..',
];
const SPR_BOMB = [
  '.....yo.',
  '....K...',
  '..KKKK..',
  '.KTTTTK.',
  'KTWTTTTK',
  'KTTTTTTK',
  '.KTTTTK.',
  '..KKKK..',
];

// -------------------------------------------------------------
// RENDERIZADO (con caché de sprites)
// -------------------------------------------------------------

// Tamaño LÓGICO del sprite (las rejillas hi-res cuentan la mitad).
function gridSize(grid) {
  let w = 0;
  for (const r of grid) if (r.length > w) w = r.length;
  if (HIRES_GRIDS.has(grid)) return { w: w / 2, h: grid.length / 2 };
  return { w, h: grid.length };
}
function spriteH(grid) { return HIRES_GRIDS.has(grid) ? grid.length / 2 : grid.length; }

// Altura "útil" (sin filas vacías por abajo) — para apoyar los pies en el suelo.
const _contentH = new Map();
function gridContentHeight(grid) {
  let v = _contentH.get(grid);
  if (v !== undefined) return v;
  v = grid.length;
  while (v > 0 && /^\.*$/.test(grid[v - 1])) v--;
  if (HIRES_GRIDS.has(grid)) v = Math.ceil(v / 2);
  _contentH.set(grid, v);
  return v;
}

const _spriteCache = new Map();
const HAIR_CHARS = new Set(['h', 'H', 'G', 'n', 'q']);
const SPR_RES = 2; // los sprites se generan al doble de resolución (estilo 16 bits)

// Convierte el grid en un canvas "16 bits":
//   1. Quita el contorno negro exterior dibujado a mano.
//   2. Escala x2 con Scale2x (EPX), que redondea diagonales y curvas.
//   3. Sombreado en varios tonos (luz arriba-izquierda), sombra que
//      proyecta la cabeza sobre el cuerpo y brillo en el pelo.
//   4. Brillo en las pupilas.
//   5. Contorno fino de color (más oscuro que el píxel vecino).
function _buildSprite(grid, flipped, big, flash) {
  const hires = HIRES_GRIDS.has(grid);
  const { w: gw, h: gh } = (() => { let m = 0; for (const r of grid) if (r.length > m) m = r.length; return { w: m, h: grid.length }; })();
  // 1) matriz de caracteres (volteada si hace falta)
  const src = [];
  for (let y = 0; y < gh; y++) {
    const row = [];
    for (let x = 0; x < gw; x++) {
      const sx = flipped ? gw - 1 - x : x;
      const ch = grid[y][sx] || '.';
      row.push(PALETTE[ch] ? ch : '.');
    }
    src.push(row);
  }
  const at0 = (x, y) => (x < 0 || y < 0 || x >= gw || y >= gh) ? '.' : src[y][x];
  // contorno exterior negro -> transparente (lo rehacemos más fino)
  const base = src.map((row, y) => row.map((ch, x) => {
    if (ch !== 'K') return ch;
    const n = [at0(x - 1, y), at0(x + 1, y), at0(x, y - 1), at0(x, y + 1)];
    return n.includes('.') ? '.' : ch;
  }));

  let w, h, W2, H2, g2;
  const glints = [];
  if (hires) {
    // 2') ya viene a doble resolución: se usa tal cual
    w = gw / 2; h = gh / 2; W2 = gw; H2 = gh;
    g2 = base;
  } else {
    w = gw; h = gh;
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? '.' : base[y][x];
    // 2) Scale2x
    W2 = w * 2; H2 = h * 2;
    g2 = [];
    for (let y = 0; y < H2; y++) g2.push(new Array(W2).fill('.'));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const P = base[y][x];
        const A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
        g2[y * 2][x * 2]         = (C === A && C !== D && A !== B) ? A : P;
        g2[y * 2][x * 2 + 1]     = (A === B && A !== C && B !== D) ? B : P;
        g2[y * 2 + 1][x * 2]     = (D === C && D !== B && C !== A) ? C : P;
        g2[y * 2 + 1][x * 2 + 1] = (B === D && B !== A && D !== C) ? D : P;
        // pupila junto a blanco = ojo -> brillito
        if (P === 'K' && (at(x - 1, y) === 'W' || at(x + 1, y) === 'W')) glints.push([x * 2 + (at(x - 1, y) === 'W' ? 1 : 0), y * 2]);
      }
    }
  }
  const at2 = (x, y) => (x < 0 || y < 0 || x >= W2 || y >= H2) ? '.' : g2[y][x];
  const isEdge = (c) => c === '.' || c === 'K';

  const P = 2; // margen (en píxeles del canvas) para el contorno
  const [cv, c] = makeCanvas(W2 + P * 2, H2 + P * 2);
  for (let y = 0; y < H2; y++) {
    for (let x = 0; x < W2; x++) {
      const ch = g2[y][x];
      if (ch === '.') {
        // 5) contorno de color
        let nb = null;
        for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
          const v = at2(x + dx, y + dy);
          if (v !== '.' && v !== 'K') { nb = v; break; }
        }
        if (nb) {
          c.fillStyle = flash ? '#ffffff' : shade(PALETTE[nb], -0.72);
          c.fillRect(x + P, y + P, 1, 1);
        }
        continue;
      }
      let col = PALETTE[ch];
      if (flash) { c.fillStyle = '#ffffff'; c.fillRect(x + P, y + P, 1, 1); continue; }
      if (ch === 'K') col = '#2a1c38';
      if (ch !== 'K' && ch !== 'W' && ch !== 'e') {
        // 3) sombreado por distancia al borde
        let amt = 0;
        if (isEdge(at2(x + 1, y)) || isEdge(at2(x, y + 1))) amt -= 0.26;
        else if (isEdge(at2(x + 2, y)) || isEdge(at2(x, y + 2))) amt -= 0.12;
        if (amt === 0) {
          if (isEdge(at2(x - 1, y)) || isEdge(at2(x, y - 1))) amt += 0.2;
          else if (isEdge(at2(x - 2, y)) || isEdge(at2(x, y - 2))) amt += 0.08;
        }
        // sombra proyectada: color distinto justo encima (cabeza sobre camiseta...)
        const up1 = at2(x, y - 1), up2 = at2(x, y - 2);
        if ((up1 !== ch && !isEdge(up1)) || (up2 !== ch && !isEdge(up2) && up1 === ch)) {
          if (!HAIR_CHARS.has(ch)) amt -= up1 !== ch ? 0.16 : 0.08;
        }
        // brillo del pelo: una franja clara cerca de la parte de arriba
        if (HAIR_CHARS.has(ch) && isEdge(at2(x, y - 3)) && !isEdge(at2(x, y - 2)) && (x + y) % 3 !== 0) amt += 0.28;
        // ligero degradado vertical
        amt -= (y / H2) * 0.06;
        col = amt ? shade(col, amt) : col;
      }
      c.fillStyle = col;
      c.fillRect(x + P, y + P, 1, 1);
    }
  }
  // 4) brillos en los ojos
  if (!flash) {
    c.fillStyle = '#ffffff';
    for (const [gx, gy] of glints) c.fillRect(gx + P, gy + P, 1, 1);
  }

  const R = SPR_RES;
  if (!big) return { cv, ox: P / R, oy: P / R, w, h, R };

  // Modo cabezón: la cabeza (primeras headRows filas) al doble de tamaño.
  const headRows = SPRITE_HEAD_ROWS.get(grid) || 0;
  if (!headRows) return { cv, ox: P / R, oy: P / R, w, h, R };
  const ox = Math.floor(w / 2) + 2;   // en píxeles lógicos
  const oy = headRows + 2;
  const [bc, bx] = makeCanvas((ox + w * 2 + 4) * R, (oy + h + 2) * R);
  const headPx = headRows * R + P;     // filas de canvas de la cabeza (incl. margen)
  // cuerpo a tamaño normal
  bx.drawImage(cv, 0, headPx, cv.width, cv.height - headPx,
    ox * R - P, (oy + headRows) * R, cv.width, cv.height - headPx);
  // cabeza a 2x
  bx.drawImage(cv, 0, 0, cv.width, headPx,
    (ox - Math.floor(w / 2)) * R - P * 2, (oy - headRows) * R - P * 2, cv.width * 2, headPx * 2);
  return { cv: bc, ox, oy, w, h, R };
}

function _spriteEntry(grid, flipped, big, flash) {
  let rec = _spriteCache.get(grid);
  if (!rec) { rec = {}; _spriteCache.set(grid, rec); }
  const key = (flipped ? 1 : 0) | (big ? 2 : 0) | (flash ? 4 : 0);
  if (!rec[key]) rec[key] = _buildSprite(grid, flipped, big, flash);
  return rec[key];
}

// Dibuja un sprite con su esquina superior-izquierda en (x, y).
// opts: { flash, scaleX, scaleY, rot, alpha } — escala y rotación se
// aplican respecto al centro de los pies del sprite.
function drawSprite(ctx, grid, x, y, flipped = false, opts = null) {
  const big = Sprites.bigHead && SPRITE_HEAD_ROWS.has(grid);
  const e = _spriteEntry(grid, flipped, big, opts && opts.flash);
  const dw = e.cv.width / e.R, dh = e.cv.height / e.R;
  if (!opts || (!opts.scaleX && !opts.scaleY && !opts.rot && (opts.alpha === undefined || opts.alpha === 1))) {
    ctx.drawImage(e.cv, snap(x - e.ox), snap(y - e.oy), dw, dh);
    return;
  }
  ctx.save();
  if (opts.alpha !== undefined) ctx.globalAlpha *= opts.alpha;
  ctx.translate(snap(x + e.w / 2), snap(y + e.h));
  if (opts.rot) ctx.rotate(opts.rot);
  ctx.scale(opts.scaleX || 1, opts.scaleY || 1);
  ctx.drawImage(e.cv, -e.w / 2 - e.ox, -e.h - e.oy, dw, dh);
  ctx.restore();
}

// Elige el fotograma de animación adecuado para un personaje.
//   state: 'idle' | 'walk' | 'jump' | 'fall' | 'hurt' | 'slip' | 'sit'
function animFrame(grid, state, t) {
  const a = KID_ANIMS.get(grid);
  if (!a) return grid;
  if (state === 'walk') return a.walk[Math.floor(t) % a.walk.length];
  if (state === 'slip') return a.slip ? a.slip[Math.floor(t) % a.slip.length] : a.fall;
  if (state === 'sit') return a.sit || a.hurt;
  if (state === 'jump') return a.jump;
  if (state === 'fall') return a.fall;
  if (state === 'hurt') return a.hurt;
  // parpadeo de vez en cuando
  return (Math.floor(t) % 180) < 7 ? a.blink : a.idle;
}

// -------------------------------------------------------------
// MOVIMIENTO COMÚN de todos los personajes (jugador, compañeros, padres,
// amigos, Diego y profes). Así todos se mueven igual y la postura del
// cuerpo siempre cuadra con lo que están haciendo:
//   - miran hacia donde andan,
//   - los pasos avanzan según la distancia recorrida (los pies no patinan),
//   - en el aire: postura de salto (subiendo) o de caída (bajando),
//   - quietos: de pie, parpadeando de vez en cuando.
// Cada personaje lleva un objeto `walker` con su estado de animación.
// -------------------------------------------------------------
// Tope de velocidad de la animación de andar: como mucho ~9 posturas por
// segundo (unos 2 pasos completos por segundo). Por debajo del tope los
// pasos van acompasados con lo que avanza el personaje; por encima ya no
// se aceleran más, para que brazos y piernas no se vuelvan locos.
const ANIM_MAX_STEP = 0.15;   // fotogramas de paso por actualización (60/s)
function walkAnimStep(vx, sprite) { return Math.min(Math.abs(vx) * strideOf(sprite), ANIM_MAX_STEP); }

function makeWalker(facing = 1) { return { animT: 0, facing, idleT: Math.random() * 180, onGround: true, moving: false }; }

function strideOf(grid) {
  const a = KID_ANIMS.get(grid);
  return a ? a.stride || 0.12 : 0.12;
}

// Llamar una vez por frame tras mover al personaje.
//   lookAt: hacia dónde mirar si está quieto (p. ej. al jugador). Opcional.
function stepWalker(wk, sprite, { vx, onGround, lookAt = 0, lock = false }) {
  wk.idleT++;
  const moving = onGround && Math.abs(vx) > 0.08;
  if (moving) wk.animT += walkAnimStep(vx, sprite);
  else if (onGround) wk.animT = 0;
  if (!lock) {
    if (Math.abs(vx) > 0.08) wk.facing = vx > 0 ? 1 : -1;
    else if (lookAt) wk.facing = lookAt > 0 ? 1 : -1;
  }
  wk.moving = moving;
  wk.onGround = onGround;
}

// Fotograma que toca según el estado (vy: velocidad vertical).
function walkerFrame(wk, sprite, vy = 0) {
  if (!wk.onGround) return animFrame(sprite, vy < 0 ? 'jump' : 'fall', 0);
  if (wk.moving) return animFrame(sprite, 'walk', wk.animT);
  return animFrame(sprite, 'idle', wk.idleT);
}

// Rebote al andar: un píxel arriba en los fotogramas de "paso".
function walkerBob(wk) { return wk.moving && Math.floor(wk.animT) % 2 === 1 ? -1 : 0; }

// Nombre encima de un personaje.
function drawName(ctx, name, centerX, baselineY) {
  drawText(ctx, name, centerX, baselineY, { size: 6, align: 'center', outlineWidth: 2 });
}

// Mapeo público para que otros módulos accedan a los sprites por nombre.
const Sprites = {
  lucas: SPR_LUCAS, cleto: SPR_CLETO,
  diego: SPR_DIEGO,
  papa: SPR_PAPA, mama: SPR_MAMA,
  angeles: SPR_ANGELES, pepe: SPR_PEPE, rosa: SPR_ROSA, asun: SPR_ASUN,
  rafa: SPR_RAFA, matias: SPR_MATIAS, santiago: SPR_SANTIAGO, carlos: SPR_CARLOS, fran: SPR_FRAN,
  irene: SPR_IRENE, berta: SPR_BERTA, andreina: SPR_ANDREINA, adrian: SPR_ADRIAN, martin: SPR_MARTIN,
  juanjo: SPR_JUANJO, julio: SPR_JULIO, mariPaz: SPR_MARI_PAZ, cesar: SPR_CESAR,
  lucre: SPR_LUCRE, emilio: SPR_EMILIO,
  boomerang: SPR_BOOMERANG, chupete: SPR_CHUPETE, lapiz: SPR_LAPIZ, tea: SPR_TEA,
  letterA: SPR_LETTER_A, letterB: SPR_LETTER_B, ukFlag: SPR_UKFLAG,
  cromo: SPR_CROMO, cromoBack: SPR_CROMO_BACK,
  banana: SPR_BANANA, bocadillo: SPR_BOCADILLO,
  star: SPR_STAR, apple: SPR_APPLE, donut: SPR_DONUT, clock: SPR_CLOCK, bomb: SPR_BOMB,
  // Modo Cabezón: tecla X en el título.
  bigHead: false,
};

