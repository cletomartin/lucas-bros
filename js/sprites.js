// =============================================================
// SPRITES — pixel art de todos los personajes
// =============================================================
//
// Cada sprite es un grid de caracteres (16x16 para chavales,
// 24x32 para los profes). Cada letra es un color de la PALETA.
// Para cambiar el aspecto de un personaje, basta con cambiar
// las letras de su grid o la PALETA. ¡Nada de imágenes externas!
//
// Convención del grid:
//   '.' = transparente
//   'K' = negro (contorno)
//   'W' = blanco
//   's' = piel clara
//   'S' = piel oscura
//   'h' = pelo marrón
//   'H' = pelo rubio
//   'G' = pelo gris (profes mayores)
//   'r' = rojo        'R' = rojo oscuro
//   'b' = azul        'B' = azul marino
//   'c' = cyan
//   'g' = verde       'D' = verde oscuro
//   'y' = amarillo
//   'o' = naranja
//   'p' = rosa        'P' = morado
//   'm' = marrón oscuro (zapatos / madera)
//   't' = gris claro  'T' = gris oscuro

const PALETTE = {
  '.': null,
  'K': '#000000',
  'W': '#ffffff',
  's': '#fcd0a8',
  'S': '#c89060',
  'h': '#3c1c00',
  'H': '#ffd860',
  'G': '#b8b8b8',
  'r': '#d82820',
  'R': '#700800',
  'b': '#2858f0',
  'B': '#0c1c5c',
  'c': '#00b8f8',
  'g': '#20a020',
  'D': '#005010',
  'y': '#f8d000',
  'o': '#f88018',
  'p': '#fca8c0',
  'P': '#7038a0',
  'm': '#5c2c00',
  't': '#a8a8a8',
  'T': '#404040',
};

// -------------------------------------------------------------
// Plantilla para un chaval (16x16)
// H = pelo, S = camiseta, P = pantalón
// -------------------------------------------------------------
function kidGrid({hair, shirt, pants, eyes='K'}) {
  const tpl = [
    '................',
    '.....KKKKK......',
    '....KHHHHHK.....',
    '...KHHHHHHHK....',
    '...KHssssssK....',
    '...KsKssKssK....',
    '....ssssssss....',
    '....KsssssK.....',
    '.....KKKKK......',
    '....SSSSSSS.....',
    '...SKSSSSSKS....',
    '...SKSSSSSKS....',
    '....SSSSSSS.....',
    '....KPPPPPK.....',
    '....KP.K.PK.....',
    '....KK.K.KK.....',
  ];
  return tpl.map(row =>
    row
      .replace(/H/g, hair)
      .replace(/S/g, shirt)
      .replace(/P/g, pants)
      // Los "K" del medio de la cara son los ojos (configurables)
      .split('').map((c, i) => (i === 4 || i === 7) && row[i] === 'K' && tpl.indexOf(row) === 5 ? eyes : c).join('')
  );
}

// -------------------------------------------------------------
// Plantilla para una chavala (16x16) — pelo más largo
// -------------------------------------------------------------
function girlGrid({hair, shirt, pants}) {
  const tpl = [
    '................',
    '....KHHHHHHK....',
    '...KHHHHHHHHK...',
    '..KHHHHHHHHHHK..',
    '..KHsssssssHK...',
    '..KHsKssKssHK...',
    '..KHsssssssHK...',
    '...KHsssssHK....',
    '....KHKKKHK.....',
    '....SSSSSSS.....',
    '...SKSSSSSKS....',
    '...SKSSSSSKS....',
    '....SSSSSSS.....',
    '....KPPPPPK.....',
    '....KP.K.PK.....',
    '....KK.K.KK.....',
  ];
  return tpl.map(row =>
    row.replace(/H/g, hair).replace(/S/g, shirt).replace(/P/g, pants)
  );
}

// -------------------------------------------------------------
// PERSONAJES PRINCIPALES (chavales 16x16)
// -------------------------------------------------------------

// LUCAS — protagonista, pelo marrón, camiseta azul, vaqueros
const SPR_LUCAS = kidGrid({hair: 'h', shirt: 'b', pants: 'B'});

// CLETO — hermano MEDIANO (estilo Luigi), camiseta verde.
// 17 filas: lo dibujamos un pelín más alto que Lucas.
const SPR_CLETO = [
  '................',
  '.....KKKKK......',
  '....KhhhhhK.....',
  '...KhhhhhhhK....',
  '...KhssssssK....',
  '...KsKssKssK....',
  '....ssssssss....',
  '....KsssssK.....',
  '.....KKKKK......',
  '....ggggggg.....',  // camiseta verde
  '...gKgggggKg....',
  '...gKgggggKg....',
  '....ggggggg.....',
  '....KBBBBBK.....',
  '....KB.K.BK.....',
  '....KB.K.BK.....',
  '....KK.K.KK.....',
];

// AMIGOS (aliados — aparecen como rescatables que dan power-ups)
const SPR_RAFA      = kidGrid({hair: 'h', shirt: 'r', pants: 'B'}); // rojo
const SPR_MATIAS    = kidGrid({hair: 'h', shirt: 'g', pants: 'B'}); // verde
const SPR_SANTIAGO  = kidGrid({hair: 'H', shirt: 'y', pants: 'B'}); // rubio + amarillo
const SPR_JORGE     = kidGrid({hair: 'h', shirt: 'o', pants: 'B'}); // naranja

// DIEGO — hermano pequeño (2 años). Aparece haciendo trastadas.
// 12x12, gordito, rubio, con chupete (m=marrón del chupete).
const SPR_DIEGO = [
  '............',
  '...KKKKKK...',
  '..KHHHHHHK..',
  '..KHsssssK..',
  '..KssKsKsK..',
  '..KKsKKsKs..',  // chupete asomando
  '...KsKKsK...',
  '...KKKKK....',
  '..KyyyyyK...',  // peto amarillo
  '.KyyyyyyyK..',
  '.KyyyyyyyK..',
  '..KK.KK.K...',
];

// PAPÁ — adulto, pelo y barba marrón, jersey gris, gruñón.
// 16x22 (algo más alto que los chavales).
const SPR_PAPA = [
  '................',
  '.....KKKKKK.....',
  '....KhhhhhhK....',
  '...KhhhhhhhhK...',
  '...Khssssssh....',
  '...KKsKsKsKKK...',  // cejas enfadadas
  '...KsssssssK....',
  '....KKKKKKK.....',  // barba marcada
  '...KhhhhhhhK....',
  '....KKKKKKK.....',
  '...KTTTTTTTK....',  // jersey gris
  '..KTTTTTTTTTK...',
  '..KTTTTTTTTTK...',
  '..KTTTTTTTTTK...',
  '...KTTTTTTTK....',
  '....KKKKKKK.....',
  '....KBBBBBBK....',  // pantalón azul oscuro
  '....KBBBBBBK....',
  '....KBBBBBBK....',
  '....KB.K.BK.....',
  '....KB.K.BK.....',
  '....KK.K.KK.....',
];

// MAMÁ — adulta, pelo largo castaño, gafas, blusa morada, gruñona.
// 16x22.
const SPR_MAMA = [
  '................',
  '....KHHHHHHK....',
  '...KhhhhhhhhK...',
  '..KhhhhhhhhhhK..',
  '..Khssssssssh...',
  '..KhKKsKsKKsh...',  // gafas + cejas
  '..KhsKsssKsh....',
  '..KhsssMssh.....',
  '...Khsssssh.....',
  '....KhhhhKK.....',
  '....KPPPPPPK....',  // blusa morada
  '...KPPPPPPPPK...',
  '...KPPPPPPPPK...',
  '...KPPPPPPPPK...',
  '....KPPPPPPK....',
  '....KKKKKKKK....',
  '....KbbbbbbK....',  // falda azul
  '....KbbbbbbK....',
  '....KbbbbbbK....',
  '....Kb.Kb.bK....',
  '.....b...b......',
  '....KK...KK.....',
];

// COMPAÑEROS ENEMIGOS (Goombas)
const SPR_IRENE    = girlGrid({hair: 'h', shirt: 'p', pants: 'P'}); // rosa
const SPR_BERTA    = girlGrid({hair: 'H', shirt: 'P', pants: 'B'}); // morado
const SPR_ANDREINA = girlGrid({hair: 'h', shirt: 'g', pants: 'B'}); // verde
const SPR_ADRIAN   = kidGrid({hair: 'h', shirt: 'r', pants: 'T'});  // rojo + pant gris (gamberro)
const SPR_MARTIN   = kidGrid({hair: 'H', shirt: 'b', pants: 'B'});  // azul rubio

// -------------------------------------------------------------
// PROFES (jefes 24x32) — sprites únicos hechos a mano
// -------------------------------------------------------------

// Helper para generar grids vacíos
function rowsOf(w, h) {
  const out = [];
  for (let i = 0; i < h; i++) out.push('.'.repeat(w));
  return out;
}

// RODRIGO — tutor, gafas, barba marrón, traje gris (24x32)
const SPR_RODRIGO = [
  '........................',
  '.........KKKKKK.........',
  '........KhhhhhhK........',
  '.......KhhhhhhhhK.......',
  '.......Khssssssh........',
  '.......KsssssssK........',
  '.......KKssKssKK........',  // gafas
  '......KKWKKKWKK.........',  // gafas marco
  '.......KsKssKssK........',  // ojos dentro de gafas
  '.......KsssMssss........',  // boca
  '.......KhhhhhhhK........',  // barba
  '........KhhhhhK.........',
  '........KKKKKK..........',  // cuello
  '......KTTTTTTTTK........',  // hombros traje
  '.....KTTTTWWTTTTK.......',  // corbata blanca arriba
  '.....KTWTWWWWTWTK.......',
  '.....KTWTWrrWTWTK.......',  // corbata roja
  '.....KTWTWrrWTWTK.......',
  '.....KTWTWWWWTWTK.......',
  '.....KTTTTTTTTTTK.......',
  '.....KTTTTTTTTTTK.......',
  '.....KTTTTTTTTTTK.......',
  '.....KTTTTTTTTTTK.......',
  '......KTTTTTTTTK........',
  '......KTTT..TTTK........',
  '......KTT....TTK........',
  '......KTT....TTK........',
  '.....KBBT....TBBK.......',  // pantalón
  '.....KBBT....TBBK.......',
  '.....KBBK....KBBK.......',
  '.....KKKK....KKKK.......',
  '.....KKKK....KKKK.......',
];

// MARI PAZ — música, pelo largo castaño, vestido con notas
const SPR_MARI_PAZ = [
  '........................',
  '......KKHHHHHHHKK.......',
  '.....KHHHHHHHHHHHK......',
  '....KHHHHHHHHHHHHHK.....',
  '...KHHHHHHHHHHHHHHHK....',
  '...KHHsssssssssHHHHK....',
  '...KHHsKssssKssHHHHK....',
  '...KHHsssMsssssHHHHK....',
  '...KHHKsssssssKHHHHK....',
  '....KHKsssssssKHHHK.....',
  '.....KKKKKKKKKKKKK......',
  '....KppppppppppppK......',  // vestido rosa
  '...KpppKKpppppKKppK.....',  // notas musicales (negras)
  '...KpppKKpppppKKppK.....',
  '...KpppKpppppppKppK.....',
  '...KppppppppppppppK.....',
  '...KppppKKKpppKKKpK.....',
  '...KpppKKKKpKKKKKpK.....',
  '...KppppppppppppppK.....',
  '...KppppppppppppppK.....',
  '...KppppppppppppppK.....',
  '....KpppppppppppppK.....',
  '....KppppppppppppK......',
  '.....KpppppppppppK......',
  '......KppppppppppK......',
  '......KppppKKppppK......',
  '......KppppKKppppK......',
  '......KKKK....KKKK......',
  '.....KKKK......KKKK.....',
  '.....KKK........KKK.....',
  '........................',
  '........................',
];

// CÉSAR — educación física, chándal rojo, silbato
const SPR_CESAR = [
  '........................',
  '.........KKKKKK.........',
  '........KhhhhhhK........',
  '........KhhhhhhK........',  // pelo corto
  '........Kssssssh........',
  '........KsKssKsK........',
  '........KsssssssK.......',
  '........KKsssssK........',
  '........KsssMsK.........',  // boca y silbato saliendo
  '.........KKKKK..yK......',  // silbato
  '........KrrrrrrK........',
  '.......KrrrrrrrrK.......',  // chándal rojo
  '......KrrWWWWWWrrK......',  // banda blanca pecho
  '......KrrWWWWWWrrK......',
  '.....KrrrrrrrrrrrrK.....',  // brazos
  '.....KrrrrrrrrrrrrK.....',
  '.....KrrrrrrrrrrrrK.....',
  '......KrrrrrrrrrrK......',
  '......KrrrrrrrrrrK......',
  '......KrrrrWWrrrrK......',  // raya blanca
  '......KrrrrWWrrrrK......',
  '......KrrrrWWrrrrK......',
  '......KBBBKKKBBBK.......',  // pantalón corto azul
  '......KBBBKKKBBBK.......',
  '.....KBBBK..KBBBK.......',
  '.....KBBBK..KBBBK.......',
  '.....KssK....KssK.......',  // piernas
  '.....KssK....KssK.......',
  '.....KssK....KssK.......',
  '.....KKKK....KKKK.......',  // zapatillas
  '.....KWWK....KWWK.......',
  '........................',
];

// LUCRE — profe veterana, gafas, pelo gris recogido, vestido verde
const SPR_LUCRE = [
  '........................',
  '........KKKKKKKK........',
  '.......KGGGGGGGGK.......',
  '......KGGGGGGGGGGK......',  // moño
  '.....KGGGGGGGGGGGGK.....',
  '......KGGGGGGGGGGK......',
  '.......KsssssssssK......',  // cara
  '.......KKsKKKsKKK.......',  // gafas
  '......KKWKKWKKWKKK......',
  '.......KsKsKsKsK........',  // ojos en gafas
  '........KsssMsss........',
  '........KsssssK.........',
  '........KKKKKK..........',
  '......KDDDDDDDDDK.......',  // vestido verde oscuro
  '.....KDDDDDDDDDDDK......',
  '.....KDDDWWWWWDDDK......',  // collar de perlas
  '.....KDDDDDDDDDDDK......',
  '.....KDDDDDDDDDDDK......',
  '.....KDDDDDDDDDDDK......',
  '.....KDDDDDDDDDDDK......',
  '......KDDDDDDDDDK.......',
  '......KDDDDDDDDDK.......',
  '......KDDDDDDDDDK.......',
  '......KDDDDDDDDDK.......',
  '......KDDDDDDDDDK.......',
  '.....KDDDDDDDDDDDK......',
  '.....KDDDDDDDDDDDK......',
  '......KKKK..KKKK........',
  '......KKKK..KKKK........',
  '........................',
  '........................',
  '........................',
];

// TERESA — profesora de infantil. Joven, alegre, vestido rosa con
// florecitas amarillas, pelo castaño rizado y mejillas rosadas. La
// más cariñosa del cole (pero cuando se enfada lanza peluches!).
const SPR_TERESA = [
  '........................',
  '......KhhhhhhhhhK.......',
  '.....KhhhhhhhhhhhK......',
  '....KhhhhhhhhhhhhhK.....',
  '....KhhssssssssshhK.....',
  '....KhsKsssssKsshhK.....',  // ojos
  '....Khssssssssssh.K.....',
  '....KhpsssMssspshK......',  // boca con mejillas rosadas
  '....KhssssssssshK.......',
  '.....KhKKKKKKhK.........',
  '......KKKKKKKK..........',  // cuello
  '......KppppppppK........',  // vestido rosa
  '.....KppyppppyppK.......',  // florecillas amarillas
  '.....KpppppyppppK.......',
  '.....KppyppppppyK.......',
  '.....KppppyppppppK......',
  '.....Kpppppppyppp.......',
  '.....KppppppyppppK......',
  '.....KppppppppppK.......',
  '.....KppppppppppK.......',
  '......KppppppppK........',
  '......KKKKKKKKKK........',
  '......KbbbbbbbbK........',  // medias azules
  '......KbbbbbbbbK........',
  '......KbbKKKKbbK........',
  '......KbbK..KbbK........',
  '......KbbK..KbbK........',
  '.....KKKK....KKKK.......',
  '.....KKKK....KKKK.......',
  '........................',
  '........................',
  '........................',
];

// JUANJO — profesor de segundo. Hombre joven, polo verde, vaqueros,
// pelo corto castaño. Llevará un lápiz gigante a modo de espada.
const SPR_JUANJO = [
  '........................',
  '.........KKKKKK.........',
  '........KhhhhhhK........',
  '........KhhhhhhK........',  // pelo corto
  '........KhssssshK.......',
  '........KsKsssKsK.......',
  '........KsssssssK.......',
  '........KKsssssKK.......',
  '........KsssMsssK.......',  // boca
  '.........KsssssK........',
  '..........KKKKK.........',
  '......KggggggggggK......',  // polo verde
  '.....KggWggggggWggK.....',  // botoncitos blancos
  '.....KggggggggggggK.....',
  '....KgggggggggggggggK...',  // mangas
  '....KgggggggggggggggK...',
  '.....KggggggggggggK.....',
  '......KggggggggggK......',
  '......KBBBBBBBBBBK......',  // vaqueros azules
  '......KBBBBBBBBBBK......',
  '......KBBWWWWWWBBK......',  // cinturón
  '......KBBBBBBBBBBK......',
  '......KBBBBBBBBBBK......',
  '......KBBBK..KBBBK......',
  '......KBBBK..KBBBK......',
  '.....KBBBK....KBBBK.....',
  '.....KBBBK....KBBBK.....',
  '.....KKKKK....KKKKK.....',  // zapatillas
  '.....KWWWK....KWWWK.....',
  '........................',
  '........................',
  '........................',
];

// EMILIO — director, traje negro, corbata, calvo, jefe final
const SPR_EMILIO = [
  '........................',
  '.........KKKKKK.........',
  '........KssssssK........',  // calvo
  '........KssssssK........',
  '........KsssssssK.......',
  '........KsKsKsKsK.......',  // ojos serios
  '........KsssssssK.......',
  '........KsKKKKKKK.......',  // bigote
  '........KsssMsssK.......',
  '........KKsssssKK.......',
  '.......KKKKKKKKKK.......',  // cuello
  '......KTTTTTTTTTTK......',
  '.....KTTTTTWWWTTTTK.....',  // chaqueta negra + camisa blanca
  '.....KTTTTWWrWWTTTK.....',  // corbata roja
  '.....KTTTTWrRrWTTTK.....',
  '.....KTTTTWrRrWTTTK.....',
  '.....KTTTTWWrWWTTTK.....',
  '.....KTTTTTWWWTTTTK.....',
  '.....KTTTTTTTTTTTTK.....',
  '.....KTTTTTTTTTTTTK.....',
  '.....KTTTTTTTTTTTTK.....',
  '......KTTTTTTTTTTK......',
  '......KTTT....TTTK......',
  '......KTT......TTK......',
  '.....KTT........TTK.....',
  '.....KTT........TTK.....',
  '.....KBB........BBK.....',  // pantalón
  '.....KBB........BBK.....',
  '.....KBBK......KBBK.....',
  '.....KKKK......KKKK.....',
  '.....KKKK......KKKK.....',
  '........................',
];

// -------------------------------------------------------------
// OBJETOS DEL JUEGO
// -------------------------------------------------------------

// Boomerang (ladrillo de borrador!) 8x8
const SPR_BOOMERANG = [
  '....KKKK',
  '...KppppK',  // 9, normalize
  '..KppWWppK',
  '..KpWrrWpK',
  '..KpWrrWpK',
  '..KppWWppK',
  '...KppppK.',
  '....KKKK..',
];
// (no nos preocupa el ancho exacto, el renderer lo normaliza)

// Moneda — un libro pequeño (8x8)
const SPR_BOOK = [
  '..KKKKKK',
  '.KrrrrrK',
  '.KrWWWrK',
  '.KrWrWrK',
  '.KrWWWrK',
  '.KrrrrrK',
  '.KKKKKKK',
  '........',
];

// Cromo coleccionable (mini-carta con cara). 8x10.
const SPR_CROMO = [
  'KKKKKKKK',
  'KbbbbbbK',
  'KbWWWWbK',
  'KbWhhWbK',
  'KbWooWbK',
  'KbWWWWbK',
  'KbWmmWbK',
  'KbbbbbbK',
  'KKKKKKKK',
  '........',
];

// Chupete (proyectil de Diego). 6x6.
const SPR_CHUPETE = [
  '..KKK.',
  '.KppKK',
  'KppppK',
  'KppppK',
  '.KKKK.',
  '..KK..',
];

// Peluche (proyectil de Teresa). 8x8 — osito marrón muy mono.
const SPR_PELUCHE = [
  '.KKKKKK.',
  'KhhhhhhK',
  'KhKhhKhK',  // ojitos
  'KhhhhhhK',
  'KhsKKshK',  // boca
  'KhhhhhhK',
  'KhKhhKhK',  // patitas
  '.KKKKKK.',
];

// Lápiz (proyectil de Juanjo). 8x8 — punta a la derecha.
const SPR_LAPIZ = [
  '........',
  'KKKKKKK.',
  'KrrrrryK',
  'KryyyyyKK',
  'KryyyyyKW',  // amarillo con punta blanca
  'KryyyyyKK',
  'KrrrrryK.',
  'KKKKKKK..',
];

// Cáscara de plátano (Diego la suelta y te hace patinar). 8x5.
const SPR_BANANA = [
  '..KKKK..',
  '.KyyyyK.',
  'KyyyyyyK',
  'KyKKKyK.',
  '.KKKKK..',
];

// Bocadillo de jamón y queso (rellena la barriga). 8x6.
const SPR_BOCADILLO = [
  '.KKKKKK.',
  'KyyyyyyK',
  'KrrrrrrK',
  'KggggggK',
  'KyyyyyyK',
  '.KKKKKK.',
];

// Bandera de meta (16x16)
const SPR_FLAG = [
  '....K...........',
  '....KK..........',
  '....KrrrrrrK....',
  '....KryyyyrK....',
  '....KryyyyrK....',
  '....KrrrrrrK....',
  '....K...........',
  '....K...........',
  '....K...........',
  '....K...........',
  '....K...........',
  '....K...........',
  '....K...........',
  '....K...........',
  '....K...........',
  '....K...........',
];

// -------------------------------------------------------------
// RENDERIZADO
// -------------------------------------------------------------

// Convierte un grid (array de strings) en pixeles que luego dibujamos.
function gridSize(grid) {
  return { w: Math.max(...grid.map(r => r.length)), h: grid.length };
}

// Dibuja un sprite en (x, y). flipped=true lo voltea horizontalmente.
//
// Modo cabezón (Sprites.bigHead === true + sprite registrado en
// SPRITE_HEAD_ROWS): las primeras `headRows` filas se dibujan al doble
// de tamaño. La cabeza queda centrada horizontalmente sobre el cuerpo
// (que se sigue dibujando a tamaño normal), y se desplaza hacia arriba
// para que su borde inferior siga tocando el cuello original. Así el
// suelo, la hitbox y el resto del juego no cambian: sólo se ve una
// cabezota gigante asomando por encima.
function drawSprite(ctx, grid, x, y, flipped = false) {
  const { w, h } = gridSize(grid);
  const headRows = (Sprites.bigHead && SPRITE_HEAD_ROWS.get(grid)) || 0;
  const HEAD_SCALE = 2;
  for (let row = 0; row < h; row++) {
    const line = grid[row];
    const isHead = row < headRows;
    for (let col = 0; col < w; col++) {
      const ch = line[col];
      if (!ch || ch === '.') continue;
      const color = PALETTE[ch];
      if (!color) continue;
      const sCol = flipped ? (w - 1 - col) : col;
      ctx.fillStyle = color;
      if (isHead) {
        const px = x + sCol * HEAD_SCALE - Math.floor(w / 2);
        const py = y + row * HEAD_SCALE - headRows;
        ctx.fillRect(px, py, HEAD_SCALE, HEAD_SCALE);
      } else {
        ctx.fillRect(x + sCol, y + row, 1, 1);
      }
    }
  }
}

// Dibuja el nombre encima del sprite, con un trazo negro detrás para
// que se lea bien sobre cualquier fondo. (centerX, baselineY) es la
// posición del centro inferior del texto.
function drawName(ctx, name, centerX, baselineY) {
  ctx.font = '6px monospace';
  const w = ctx.measureText(name).width;
  const x = Math.round(centerX - w / 2);
  const y = Math.round(baselineY);
  ctx.fillStyle = '#000';
  // contorno básico (4 direcciones)
  ctx.fillText(name, x - 1, y);
  ctx.fillText(name, x + 1, y);
  ctx.fillText(name, x, y - 1);
  ctx.fillText(name, x, y + 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(name, x, y);
}

// Mapeo público para que otros módulos accedan a los sprites por nombre.
const Sprites = {
  // protagonistas
  lucas: SPR_LUCAS,
  cleto: SPR_CLETO,
  // hermano pequeño (NPC trastada)
  diego: SPR_DIEGO,
  // padres (NPC gruñones)
  papa: SPR_PAPA,
  mama: SPR_MAMA,
  // amigos
  rafa: SPR_RAFA,
  matias: SPR_MATIAS,
  santiago: SPR_SANTIAGO,
  jorge: SPR_JORGE,
  // enemigos compañeros
  irene: SPR_IRENE,
  berta: SPR_BERTA,
  andreina: SPR_ANDREINA,
  adrian: SPR_ADRIAN,
  martin: SPR_MARTIN,
  // jefes profes
  rodrigo: SPR_RODRIGO,
  mariPaz: SPR_MARI_PAZ,
  cesar: SPR_CESAR,
  lucre: SPR_LUCRE,
  emilio: SPR_EMILIO,
  teresa: SPR_TERESA,
  juanjo: SPR_JUANJO,
  // objetos
  boomerang: SPR_BOOMERANG,
  book: SPR_BOOK,
  flag: SPR_FLAG,
  chupete: SPR_CHUPETE,
  peluche: SPR_PELUCHE,
  lapiz: SPR_LAPIZ,
  cromo: SPR_CROMO,
  banana: SPR_BANANA,
  bocadillo: SPR_BOCADILLO,
  // Modo Cabezón: si está en true, todos los personajes con
  // entrada en SPRITE_HEAD_ROWS dibujan la cabeza al doble de
  // tamaño. Se cambia con la tecla X en la pantalla de título.
  bigHead: false,
};

// Cuántas filas del grid forman la "cabeza" de cada sprite. Se usa para
// el modo cabezón: cuando está activo, esas filas se dibujan a 2x.
// Las filas de cuerpo (>= headRows) se mantienen como estaban, así que la
// pose, el suelo y la hitbox no cambian: lo único raro es que la cabeza
// asoma muy por encima.
const SPRITE_HEAD_ROWS = new Map();
SPRITE_HEAD_ROWS.set(SPR_LUCAS, 9);
SPRITE_HEAD_ROWS.set(SPR_CLETO, 9);
SPRITE_HEAD_ROWS.set(SPR_RAFA, 9);
SPRITE_HEAD_ROWS.set(SPR_MATIAS, 9);
SPRITE_HEAD_ROWS.set(SPR_SANTIAGO, 9);
SPRITE_HEAD_ROWS.set(SPR_JORGE, 9);
SPRITE_HEAD_ROWS.set(SPR_IRENE, 9);
SPRITE_HEAD_ROWS.set(SPR_BERTA, 9);
SPRITE_HEAD_ROWS.set(SPR_ANDREINA, 9);
SPRITE_HEAD_ROWS.set(SPR_ADRIAN, 9);
SPRITE_HEAD_ROWS.set(SPR_MARTIN, 9);
SPRITE_HEAD_ROWS.set(SPR_DIEGO, 8);
SPRITE_HEAD_ROWS.set(SPR_PAPA, 10);
SPRITE_HEAD_ROWS.set(SPR_MAMA, 10);
SPRITE_HEAD_ROWS.set(SPR_RODRIGO, 13);
SPRITE_HEAD_ROWS.set(SPR_MARI_PAZ, 11);
SPRITE_HEAD_ROWS.set(SPR_CESAR, 10);
SPRITE_HEAD_ROWS.set(SPR_LUCRE, 13);
SPRITE_HEAD_ROWS.set(SPR_TERESA, 11);
SPRITE_HEAD_ROWS.set(SPR_JUANJO, 11);
SPRITE_HEAD_ROWS.set(SPR_EMILIO, 11);
