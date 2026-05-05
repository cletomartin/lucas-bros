// LOS NIVELES.
//
// Cada nivel es un grid de caracteres (15 filas, anchura libre).
// Tile types (ver level.js para detalles):
//   '.' = aire, '#' = suelo, '=' = plataforma, 'b' = ladrillo, '|' = decoración
//   'P' = spawn del jugador (Lucas o Cleto, según se elija en el título)
//   'D' = spawn Diego (uno por nivel)
//   'A' = spawn Papá, 'M' = spawn Mamá (uno por nivel cada uno)
//   'R' = Rafa, 'T' = Matías, 'S' = Santiago, 'J' = Jorge (amigos = power-up)
//   '*' = cromo coleccionable (suma puntos; recogerlos todos da vida y +1000)
//   'Q' = bocadillo (rellena la barriga; con 4 bocadillos puedes eructar con E)
//   '?' = bloque sorpresa (pegar con la cabeza; suelta cromo o corazón)
//   '!' = bloque sorpresa ya usado (sólido, decorativo)
//   't' = trampolín (saltas encima y rebotas alto)
//   '(' ')' = pareja de portales tipo 1 (parar 0.4s dentro para activar)
//   '[' ']' = pareja de portales tipo 2
//   'F' = bandera (meta), 'B' = spawn jefe
//   'a'..'e' = compañeros enemigos (mapeados en enemyTable de cada nivel)

// Helper para repetir tiles fácilmente
const r = (ch, n) => ch.repeat(n);

// =============================================================
// NIVEL 1 — Patio del cole (jefe: Rodrigo)
// =============================================================
const LEVEL_1 = {
  title: 'Nivel 1 — El recreo',
  theme: 'patio',
  bossClass: typeof BossRodrigo !== 'undefined' ? BossRodrigo : null,
  enemyTable: {
    'a': { sprite: Sprites.adrian,   name: 'Adrián'   },
    'b': { sprite: Sprites.martin,   name: 'Martín'   },
    'c': { sprite: Sprites.irene,    name: 'Irene'    },
  },
  tiles: [
    r('.', 70),
    r('.', 70),
    r('.', 70),
    r('.', 70),
    r('.', 70),
    r('.', 70),
    '............**........???.......*.*.*..............*..*.............',
    '..........=====.................=====...............=====...........',
    r('.', 70),
    '....*.......D..*.....R...*..*....A....*.......t*..Q....*....B...*...',
    'P......a............c......a............c.........a...............F.',
    r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 16),
    r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 16),
    r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 16),
    r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 16),
  ],
};

// =============================================================
// NIVEL 2 — Aula de infantil (jefe: Teresa)  ← NUEVO
//   Suelo continuo (sin huecos) y enemigos espaciados, perfecto
//   como segunda parada después del recreo: ambiente cariñoso
//   pero la profe lanza peluches.
// =============================================================
const LEVEL_TERESA = {
  title: 'Nivel 2 — Aula de Teresa',
  theme: 'infantil',
  bossClass: typeof BossTeresa !== 'undefined' ? BossTeresa : null,
  enemyTable: {
    'a': { sprite: Sprites.irene,    name: 'Irene'    },
    'b': { sprite: Sprites.berta,    name: 'Berta'    },
    'c': { sprite: Sprites.andreina, name: 'Andreína' },
  },
  tiles: [
    r('.', 64),
    r('.', 64),
    r('.', 64),
    '....*.*.*.*.*..............................*.*.*.*.*..........',  // cromos altos
    r('.', 64),
    r('.', 64),
    '...======...............======................======..........',  // plataformas (3-8, 24-29, 47-52)
    '..............???.................???........................',  // bloques sorpresa entre plataformas
    '....*..*..Q..D...R...*..*..Q....*..*..M....*..*..*............',  // cromos + NPCs (sobre el suelo)
    r('.', 64),
    'P...a.....b.....c.....a.....b.....c.....a.....B.....F..........',  // spawn + enemigos + jefe + meta
    r('#', 64),
    r('#', 64),
    r('#', 64),
    r('#', 64),
  ],
};

// =============================================================
// NIVEL 3 — Aula de música (jefe: Mari Paz)
// =============================================================
const LEVEL_2 = {
  title: 'Nivel 3 — La clase de música',
  theme: 'musica',
  bossClass: typeof BossMariPaz !== 'undefined' ? BossMariPaz : null,
  enemyTable: {
    'a': { sprite: Sprites.berta,    name: 'Berta'    },
    'b': { sprite: Sprites.andreina, name: 'Andreína' },
    'c': { sprite: Sprites.adrian,   name: 'Adrián'   },
  },
  tiles: [
    r('.', 70),
    r('.', 70),
    r('.', 70),
    '.....*.*.*.*.*..............................*.*.*.*.*.*.*..........',
    r('.', 70),
    '................???...................................................',
    '......======...............======................======............',
    r('.', 70),
    '....*.*..t.......D....T...Q..............t..*..*.....M..............',
    '......................(.............................).............',
    'P....a............c......a............c.........a..b........B....F.',
    r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 16),
    r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 16),
    r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 16),
    r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 16),
  ],
};

// =============================================================
// NIVEL 4 — Aula de segundo (jefe: Juanjo)  ← NUEVO
//   Aula de segundo de primaria: ya hay un poco más de chicha,
//   con plataformas en el aire y bloques sorpresa, pero el
//   suelo sigue siendo firme para que la dificultad esté en
//   los enemigos y en el lápiz volador del Juanjo.
// =============================================================
const LEVEL_JUANJO = {
  title: 'Nivel 4 — Aula de Juanjo',
  theme: 'segundo',
  bossClass: typeof BossJuanjo !== 'undefined' ? BossJuanjo : null,
  enemyTable: {
    'a': { sprite: Sprites.adrian,   name: 'Adrián'   },
    'b': { sprite: Sprites.martin,   name: 'Martín'   },
    'c': { sprite: Sprites.berta,    name: 'Berta'    },
    'd': { sprite: Sprites.andreina, name: 'Andreína' },
  },
  tiles: [
    r('.', 70),
    r('.', 70),
    r('.', 70),
    '...*.*.*.*..............*.*.*.*..............*.*.*.*.*.............',  // cromos altos
    r('.', 70),
    r('.', 70),
    '....======...........======.............======.....======..........',  // plataformas
    '...............???..................???.............................',  // bloques sorpresa entre plataformas
    '...*..*..Q..D...A...*..*..Q..*..*..M.t....*..*..*..J................',  // NPCs + amigo
    r('.', 70),
    'P...a....b....c....d....a....b....c....d....a....b....B......F.....',  // spawn + enemigos + jefe + meta
    r('#', 70),
    r('#', 70),
    r('#', 70),
    r('#', 70),
  ],
};

// =============================================================
// NIVEL 5 — Gimnasio (jefe: César)
// =============================================================
const LEVEL_3 = {
  title: 'Nivel 5 — Gimnasio',
  theme: 'gym',
  bossClass: typeof BossCesar !== 'undefined' ? BossCesar : null,
  enemyTable: {
    'a': { sprite: Sprites.martin,   name: 'Martín'   },
    'b': { sprite: Sprites.adrian,   name: 'Adrián'   },
    'c': { sprite: Sprites.berta,    name: 'Berta'    },
    'd': { sprite: Sprites.andreina, name: 'Andreína' },
  },
  tiles: [
    r('.', 80),
    r('.', 80),
    r('.', 80),
    r('.', 80),
    '....*.*.*.*.*.*..............*.*.*.*.*..............*.*.*.*.*.*.*.*............',
    r('.', 80),
    '..........=====...........=========..........================.........=====....',
    r('.', 80),
    '......*.*.*..Q.......D............*.*.*..Q..................*.*..........M.....',
    '...[..........a..b....A...c...d......*..*..S.................c........]..B....',
    'P..................................................................b.........F.',
    r('#', 18) + r('.', 5) + r('#', 16) + r('.', 5) + r('#', 16) + r('.', 4) + r('#', 16),
    r('#', 18) + r('.', 5) + r('#', 16) + r('.', 5) + r('#', 16) + r('.', 4) + r('#', 16),
    r('#', 18) + r('.', 5) + r('#', 16) + r('.', 5) + r('#', 16) + r('.', 4) + r('#', 16),
    r('#', 18) + r('.', 5) + r('#', 16) + r('.', 5) + r('#', 16) + r('.', 4) + r('#', 16),
  ],
};

// =============================================================
// NIVEL 6 — Aula del hermano Cleto (jefe: Lucre)
// =============================================================
const LEVEL_4 = {
  title: 'Nivel 6 — La clase de Lucre',
  theme: 'aula',
  bossClass: typeof BossLucre !== 'undefined' ? BossLucre : null,
  enemyTable: {
    'a': { sprite: Sprites.irene,    name: 'Irene'    },
    'b': { sprite: Sprites.berta,    name: 'Berta'    },
    'c': { sprite: Sprites.andreina, name: 'Andreína' },
    'd': { sprite: Sprites.adrian,   name: 'Adrián'   },
    'e': { sprite: Sprites.martin,   name: 'Martín'   },
  },
  tiles: [
    r('.', 80),
    r('.', 80),
    r('.', 80),
    '...*.*..Q..*.*....*.*....*.*..Q.*.*....*.*....*.*....*.*..Q.*.*....*.*..........',
    r('.', 80),
    r('.', 80),
    '......======......======......======......======......======......======.......',
    '......................................D.......................................',
    '..*a......b...*..c.....d..*..e.....a.*..b....J.....c.....d.*...e.....a.b...*...',
    '..........................................................................B...',
    'P..................................................................b.........F.',
    r('#', 12) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 10),
    r('#', 12) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 10),
    r('#', 12) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 10),
    r('#', 12) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 14) + r('.', 4) + r('#', 10),
  ],
};

// =============================================================
// NIVEL 7 — Despacho del director (jefe FINAL: Emilio)
// =============================================================
const LEVEL_5 = {
  title: 'Nivel 7 — El despacho de Emilio',
  theme: 'direccion',
  bossClass: typeof BossEmilio !== 'undefined' ? BossEmilio : null,
  enemyTable: {
    'a': { sprite: Sprites.adrian,   name: 'Adrián'   },
    'b': { sprite: Sprites.martin,   name: 'Martín'   },
    'c': { sprite: Sprites.irene,    name: 'Irene'    },
    'd': { sprite: Sprites.berta,    name: 'Berta'    },
    'e': { sprite: Sprites.andreina, name: 'Andreína' },
  },
  tiles: (() => {
    const W = 110;
    return [
      r('.', W),                                                          // 0
      r('.', W),                                                          // 1
      r('.', W),                                                          // 2
      '....*.*.*..............*.*.*..............*.*.*.*..............',  // 3 high cromos
      r('.', W),                                                          // 4
      r('.', W),                                                          // 5
      r('.', W),                                                          // 6
      '....======.......======........======.........======......',       // 7 platforms (alcanzables)
      '....*..*.D..A...Q*.*..M..T....*..*..Q..S....*.*..*.....',          // 8 cromos + NPCs
      '...a....b....c....d....e....a....b....c....d....e' + r('.', 38) + 'B' + r('.', W - 89),  // 9 enemies + boss (col 88)
      'P' + r('.', 96) + 'F' + r('.', W - 98),                            // 10 spawn + flag (col 97)
      r('#', W),                                                          // 11
      r('#', W),                                                          // 12
      r('#', W),                                                          // 13
      r('#', W),                                                          // 14
    ];
  })(),
};

// Orden final: Rodrigo → Teresa (infantil) → Mari Paz → Juanjo (segundo)
//              → César → Lucre → Emilio (final).
const LEVELS = [LEVEL_1, LEVEL_TERESA, LEVEL_2, LEVEL_JUANJO, LEVEL_3, LEVEL_4, LEVEL_5];
