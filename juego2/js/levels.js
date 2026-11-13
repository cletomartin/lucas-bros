// LOS NIVELES.
//
// Cada nivel es un grid de caracteres (15 filas, anchura libre).
// Tile types (ver level.js para detalles):
//   '.' = aire, '#' = suelo, '=' = plataforma, 'b' = ladrillo
//   'P' = spawn del jugador (Lucas o Cleto, según se elija en el título)
//   'D' = Diego (hermano pequeño)
//   'A' = Papá, 'M' = Mamá (gruñones: te regañan)
//   'G' = Ángeles, 'E' = Pepe, 'O' = Rosa, 'U' = Asun (padres de amigos: te dan cosas)
//   'R' = Rafa, 'T' = Matías, 'S' = Santiago, 'J' = Carlos, 'N' = Fran (amigos = power-up)
//   '*' = cromo coleccionable (recogerlos todos da vida y +1000)
//   'Q' = bocadillo (rellena la barriga; con 4 bocadillos puedes tirarte un pedo con E)
//   '?' = bloque sorpresa (pegar con la cabeza; suelta cromo o corazón)
//   't' = trampolín
//   'F' = bandera (meta), 'B' = jefe
//   'a'..'e' = compañeros traviesos (mapeados en enemyTable de cada nivel)
//
// Los niveles BONUS (bonus: true) no tienen enemigos: hay que coger todo
// lo que cae del cielo antes de que se acabe el tiempo.

// Helper para repetir tiles fácilmente
const r = (ch, n) => ch.repeat(n);

// -------------------------------------------------------------
// CONSTRUCTOR DE ESCENARIOS
// Los niveles normales se "construyen" por tramos en vez de escribir
// cada fila a mano: así es fácil ver los huecos y las alturas.
//   S.ground(desde, hasta, alto)  suelo en columnas [desde, hasta) cuya
//                                 superficie está en la fila `alto` (11 = normal)
//   S.plat(col, largo, fila)      plataforma '='
//   S.wall(col, filaArriba, filaAbajo, ch)  columna de ladrillos
//   S.put(col, fila, 'texto')     coloca caracteres (los '.' no pisan nada)
//
// Física de referencia (sin power-ups): un salto sube ~4,7 baldosas y
// corriendo llega ~7 baldosas de lejos. El trampolín sube ~6 baldosas.
// -------------------------------------------------------------
function stage(W, build) {
  const g = [];
  for (let i = 0; i < 15; i++) g.push(new Array(W).fill('.'));
  const S = {
    ground(c0, c1, top = 11) { for (let c = c0; c < c1; c++) for (let y = top; y < 15; y++) g[y][c] = '#'; },
    plat(c, len, row) { for (let i = 0; i < len; i++) g[row][c + i] = '='; },
    wall(c, rowTop, rowBot, ch = 'b') { for (let y = rowTop; y <= rowBot; y++) g[y][c] = ch; },
    put(c, row, str) { for (let i = 0; i < str.length; i++) if (str[i] !== '.') g[row][c + i] = str[i]; },
  };
  build(S);
  return g.map(row => row.join(''));
}

// Cada nivel tiene un tiempo objetivo (`par`, en segundos): si lo bates
// ganas una estrella y puntos extra. Los niveles van de más fácil a más
// difícil: más largos, huecos más anchos, plataformas más altas, más
// compañeros traviesos y, al final, compañeros que tiran chupetes.
// Ya no hay portales: ¡hay que recorrerse el nivel entero!

// =============================================================
// NIVEL 1 — El recreo (jefe: Juanjo, el tutor)       ★☆☆☆☆
//   Suelo casi llano, huecos pequeños, pocos compañeros y muchos regalos.
// =============================================================
const LEVEL_1 = {
  title: 'Nivel 1 — El recreo',
  theme: 'patio',
  bossClass: BossJuanjo,
  par: 75,
  enemyTable: {
    'a': { sprite: Sprites.adrian, name: 'Adrián' },
    'b': { sprite: Sprites.martin, name: 'Martín' },
    'c': { sprite: Sprites.irene,  name: 'Irene'  },
  },
  tiles: stage(110, S => {
    S.ground(0, 28);
    S.put(2, 10, 'P');
    S.put(6, 8, '*.*.*');
    S.put(12, 7, '???');
    S.put(18, 10, 'a');
    // primer hueco (2) con cromos encima
    S.put(26, 8, '*...*');
    S.put(27, 7, '*.*');
    S.ground(30, 56);
    S.ground(38, 44, 10);              // escalón
    S.put(34, 10, 'R');
    S.put(40, 8, 'Q');
    S.put(41, 7, '*.*');
    S.put(47, 10, 'b');
    S.put(51, 10, 'G');
    // hueco de 3
    S.put(55, 8, '*.*.*');
    S.ground(59, 83);
    S.put(64, 10, 'D');
    S.put(66, 7, '??');
    S.put(70, 9, 'Q');
    S.put(72, 10, 'c');
    // trampolín con premio arriba
    S.put(78, 10, 't');
    S.put(78, 3, '*');
    S.put(78, 4, '*');
    S.put(78, 5, '*');
    // hueco de 2 y patio del jefe
    S.ground(85, 110);
    S.put(98, 10, 'B');
    S.put(106, 10, 'F');
  }),
};

// =============================================================
// NIVEL 2 — La clase de inglés (jefe: Julio)          ★★☆☆☆
//   Escaleras de libros, una tarima alta y huecos de 3-4.
// =============================================================
const LEVEL_INGLES = {
  title: 'Nivel 2 — La clase de inglés',
  theme: 'ingles',
  bossClass: BossJulio,
  par: 95,
  enemyTable: {
    'a': { sprite: Sprites.adrian,   name: 'Adrián'   },
    'b': { sprite: Sprites.martin,   name: 'Martín'   },
    'c': { sprite: Sprites.berta,    name: 'Berta'    },
    'd': { sprite: Sprites.andreina, name: 'Andreína' },
  },
  tiles: stage(130, S => {
    S.ground(0, 21);
    S.put(2, 10, 'P');
    S.put(6, 8, '*.*.*');
    S.put(9, 7, '???');
    S.put(13, 10, 'a');
    // escalera de libros hasta la tarima
    S.wall(16, 10, 10);
    S.wall(17, 9, 10);
    S.wall(18, 8, 10);
    S.ground(19, 29, 8);
    S.put(21, 5, '******');
    S.put(25, 7, 'b');
    // bajada y hueco de 4 con un pupitre en medio
    S.ground(29, 41);
    S.put(33, 9, 'Q');
    S.plat(42, 2, 8);
    S.put(42, 6, '**');
    S.ground(45, 71);
    S.put(47, 10, 'J');
    S.put(50, 10, 'c');
    S.put(52, 9, 'Q');
    S.put(54, 10, 'E');
    S.put(56, 7, '??');
    S.put(58, 10, 'd');
    S.put(64, 10, 'M');
    // hueco de 4 a pelo
    S.put(71, 8, '*..*');
    S.put(72, 7, '**');
    S.ground(75, 101);
    // trampolín a una estantería alta con premio
    S.put(79, 10, 't');
    S.plat(81, 6, 5);
    S.put(81, 4, '*.**.*');
    S.put(85, 10, 'a');
    S.put(90, 9, 'Q');
    S.put(93, 10, 'b');
    // hueco de 3 y la clase de Julio
    S.ground(104, 130);
    S.put(117, 10, 'B');
    S.put(126, 10, 'F');
  }),
};

// =============================================================
// NIVEL 3 — La clase de música (jefe: Mari Paz)       ★★★☆☆
//   Escenario elevado, Diego tirando plátanos y un foso con atriles.
// =============================================================
const LEVEL_2 = {
  title: 'Nivel 3 — La clase de música',
  theme: 'musica',
  bossClass: BossMariPaz,
  par: 110,
  enemyTable: {
    'a': { sprite: Sprites.berta,    name: 'Berta'    },
    'b': { sprite: Sprites.andreina, name: 'Andreína' },
    'c': { sprite: Sprites.adrian,   name: 'Adrián'   },
  },
  tiles: stage(140, S => {
    S.ground(0, 19);
    S.put(2, 10, 'P');
    S.put(10, 10, 'a');
    S.put(13, 7, '??');
    // hueco de 3
    S.put(19, 8, '*.*');
    S.ground(22, 31);
    S.ground(29, 31, 10);
    // escenario elevado (2 alturas)
    S.ground(31, 46, 9);
    S.put(33, 8, 'T');
    S.put(36, 8, 'D');
    S.put(39, 7, 'Q');
    S.put(42, 8, 'b');
    S.put(34, 5, '*.*.*.*');
    // bajada con hueco de 4
    S.put(46, 7, '*..*');
    S.ground(50, 63);
    S.put(55, 10, 'c');
    S.put(59, 9, 'Q');
    // foso con atriles (plataformas a distintas alturas)
    S.plat(65, 3, 9);
    S.plat(70, 3, 8);
    S.plat(75, 3, 9);
    S.put(65, 7, '*.*');
    S.put(70, 6, '*.*');
    S.put(71, 7, 'a');
    S.put(75, 7, '*.*');
    S.ground(81, 109);
    S.put(84, 10, 'U');
    S.put(86, 10, 'A');
    S.put(89, 7, '??');
    S.put(92, 10, 'a');
    S.put(95, 9, 'Q');
    S.put(100, 10, 'c');
    // hueco de 3 y el aula de Mari Paz
    S.put(109, 8, '*.*');
    S.ground(112, 140);
    S.put(126, 10, 'B');
    S.put(136, 10, 'F');
  }),
};

// =============================================================
// NIVEL 4 — El gimnasio (jefe: César)                  ★★★☆☆
//   Espalderas que sólo se saltan con trampolín, huecos de 5 y un
//   foso de colchonetas. Los compañeros corren más.
// =============================================================
const LEVEL_3 = {
  title: 'Nivel 4 — El gimnasio',
  theme: 'gym',
  bossClass: BossCesar,
  par: 120,
  enemySpeed: 0.5,
  enemyTable: {
    'a': { sprite: Sprites.martin,   name: 'Martín'   },
    'b': { sprite: Sprites.adrian,   name: 'Adrián'   },
    'c': { sprite: Sprites.berta,    name: 'Berta'    },
    'd': { sprite: Sprites.andreina, name: 'Andreína' },
  },
  tiles: stage(150, S => {
    S.ground(0, 17);
    S.put(2, 10, 'P');
    S.put(10, 10, 'a');
    // hueco de 4
    S.put(17, 8, '*..*');
    S.ground(21, 51);
    S.put(23, 10, 'S');
    S.put(26, 10, 'b');
    // espaldera: 5 de alto, hay que usar el trampolín
    S.put(31, 10, 't');
    S.wall(34, 6, 10);
    S.put(34, 2, '*');
    S.put(34, 3, '*');
    S.put(40, 9, 'Q');
    S.put(42, 10, 'c');
    S.put(47, 10, 'd');
    // hueco de 5 (¡coge carrerilla!)
    S.put(51, 8, '*...*');
    S.put(52, 7, '***');
    S.ground(56, 76);
    S.put(58, 10, 'O');
    S.plat(60, 5, 8);
    S.put(62, 7, 'a');
    S.put(60, 6, '*.*.*');
    S.put(70, 9, 'Q');
    // foso de colchonetas
    S.plat(79, 2, 9);
    S.plat(84, 2, 7);
    S.plat(89, 2, 9);
    S.put(79, 7, '**');
    S.put(84, 5, '**');
    S.put(89, 7, '**');
    S.ground(95, 119);
    S.put(97, 10, 'N');
    S.put(100, 10, 'b');
    S.put(105, 10, 'c');
    S.put(108, 10, 'M');
    S.put(112, 10, 'd');
    // hueco de 4 y la pista de César
    S.put(119, 8, '*..*');
    S.ground(123, 150);
    S.put(136, 10, 'B');
    S.put(146, 10, 'F');
  }),
};

// =============================================================
// NIVEL 5 — La clase de Lucre (la profe de Cleto)      ★★★★☆
//   Cadena de pupitres sobre el vacío, un armario que hay que saltar
//   y compañeros que tiran chupetes.
// =============================================================
const LEVEL_4 = {
  title: 'Nivel 5 — La clase de Lucre',
  theme: 'aula',
  bossClass: BossLucre,
  par: 140,
  enemySpeed: 0.5,
  shooters: true,
  enemyTable: {
    'a': { sprite: Sprites.irene,    name: 'Irene'    },
    'b': { sprite: Sprites.berta,    name: 'Berta'    },
    'c': { sprite: Sprites.andreina, name: 'Andreína' },
    'd': { sprite: Sprites.adrian,   name: 'Adrián'   },
    'e': { sprite: Sprites.martin,   name: 'Martín'   },
  },
  tiles: stage(160, S => {
    S.ground(0, 15);
    S.put(2, 10, 'P');
    S.put(9, 10, 'a');
    // pupitres sobre el vacío
    S.plat(17, 3, 9);
    S.plat(22, 3, 7);
    S.plat(27, 3, 8);
    S.plat(32, 3, 6);
    S.plat(37, 3, 9);
    S.put(17, 7, '*.*');
    S.put(22, 5, '*.*');
    S.put(28, 7, 'b');
    S.put(32, 4, '*.*');
    S.put(37, 7, '*.*');
    S.ground(41, 61);
    S.put(43, 10, 'R');
    S.put(44, 9, 'Q');
    S.put(46, 10, 'A');
    S.put(50, 10, 'c');
    S.put(54, 10, 'M');
    S.put(57, 10, 'd');
    // armario de 4 de alto
    S.wall(61, 7, 10);
    S.wall(62, 7, 10);
    S.put(61, 5, '**');
    S.ground(61, 81);
    S.put(70, 10, 'e');
    S.put(73, 7, '??');
    S.put(76, 10, 'a');
    // hueco de 5
    S.put(81, 8, '*...*');
    S.ground(86, 102);
    S.ground(90, 94, 10);
    S.ground(94, 98, 9);
    S.ground(98, 102, 8);
    S.put(99, 6, '*.*');
    // foso con un pupitre
    S.plat(104, 2, 9);
    S.put(104, 7, '**');
    S.ground(109, 131);
    S.put(112, 9, 'Q');
    S.put(114, 10, 'b');
    S.put(117, 10, 'D');
    S.put(120, 10, 'c');
    S.put(126, 10, 'd');
    // hueco de 3 y la mesa de Lucre
    S.ground(134, 160);
    S.put(146, 10, 'B');
    S.put(156, 10, 'F');
  }),
};

// =============================================================
// NIVEL 6 — El despacho de Emilio (jefe FINAL)         ★★★★★
//   Columnas sobre el vacío, una estantería enorme (trampolín), un foso
//   de archivadores y un pasillo lleno de compañeros. ¡A por todas!
// =============================================================
const LEVEL_5 = {
  title: 'Nivel 6 — El despacho de Emilio',
  theme: 'direccion',
  bossClass: BossEmilio,
  par: 170,
  enemySpeed: 0.55,
  shooters: true,
  enemyTable: {
    'a': { sprite: Sprites.adrian,   name: 'Adrián'   },
    'b': { sprite: Sprites.martin,   name: 'Martín'   },
    'c': { sprite: Sprites.irene,    name: 'Irene'    },
    'd': { sprite: Sprites.berta,    name: 'Berta'    },
    'e': { sprite: Sprites.andreina, name: 'Andreína' },
  },
  tiles: stage(180, S => {
    S.ground(0, 13);
    S.put(2, 10, 'P');
    S.put(8, 10, 'a');
    // columnas sobre el vacío
    S.ground(17, 19, 9);
    S.ground(23, 25, 8);
    S.ground(29, 31, 9);
    S.ground(35, 37, 10);
    S.put(17, 7, '**');
    S.put(23, 6, '**');
    S.put(29, 7, '**');
    S.put(35, 8, '**');
    S.ground(40, 63);
    S.put(41, 10, 'J');
    S.put(42, 9, 'Q');
    S.put(44, 10, 'A');
    S.put(48, 10, 'b');
    S.put(53, 10, 'c');
    S.put(58, 10, 'd');
    // estantería de 5: sólo con trampolín
    S.put(60, 10, 't');
    S.wall(63, 6, 10);
    S.wall(64, 6, 10);
    S.put(63, 3, '**');
    S.ground(63, 86);
    S.put(70, 10, 'e');
    S.put(72, 7, '??');
    S.put(76, 10, 'a');
    S.put(80, 10, 'M');
    S.put(83, 9, 'Q');
    // foso de archivadores
    S.plat(88, 2, 8);
    S.plat(92, 2, 6);
    S.plat(96, 2, 8);
    S.plat(100, 2, 6);
    S.plat(104, 2, 9);
    S.put(88, 6, '**');
    S.put(92, 4, '**');
    S.put(96, 6, '**');
    S.put(100, 4, '**');
    S.put(104, 7, '**');
    S.ground(108, 141);
    S.put(112, 10, 'D');
    S.put(115, 10, 'G');
    S.put(118, 10, 'c');
    S.put(121, 9, 'Q');
    S.put(124, 10, 'd');
    S.put(130, 10, 'e');
    S.put(136, 10, 'a');
    // último hueco de 5 y el despacho
    S.put(141, 8, '*...*');
    S.ground(146, 180);
    S.put(162, 10, 'B');
    S.put(176, 10, 'F');
  }),
};

// =============================================================
// NIVELES BONUS — contra reloj, sin enemigos.
//   duration: segundos de partida
//   items:    qué cosas caen del cielo (lo que valen está en game.js)
// =============================================================
const BONUS_1 = {
  title: 'Bonus — ¡Lluvia de cromos!',
  theme: 'bonus',
  bonus: true,
  duration: 40,
  items: ['cromo', 'cromo', 'cromo', 'apple', 'donut', 'star', 'bomb'],
  tiles: [
    r('.', 16),
    r('.', 16),
    r('.', 16),
    r('.', 16),
    r('.', 16),
    '.====......====.',
    r('.', 16),
    r('.', 16),
    '.....======.....',
    r('.', 16),
    '.......P........',
    r('#', 16),
    r('#', 16),
    r('#', 16),
    r('#', 16),
  ],
};

const BONUS_2 = {
  title: 'Bonus — ¡Merienda voladora!',
  theme: 'bonus',
  bonus: true,
  duration: 45,
  items: ['apple', 'donut', 'bocadillo', 'cromo', 'cromo', 'star', 'bomb', 'bomb'],
  tiles: [
    r('.', 16),
    r('.', 16),
    r('.', 16),
    r('.', 16),
    '......====......',
    r('.', 16),
    r('.', 16),
    '..===......===..',
    r('.', 16),
    r('.', 16),
    '.t.....P......t.',
    r('#', 16),
    r('#', 16),
    r('#', 16),
    r('#', 16),
  ],
};

// Orden: Juanjo -> Julio -> BONUS -> Mari Paz -> César -> BONUS
//        -> Lucre -> Emilio (final).
const LEVELS = [LEVEL_1, LEVEL_INGLES, BONUS_1, LEVEL_2, LEVEL_3, BONUS_2, LEVEL_4, LEVEL_5];
