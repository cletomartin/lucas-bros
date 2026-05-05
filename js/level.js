// Sistema de niveles basado en tiles de 16x16.
//
// Cada nivel se define en levels.js como un array de filas de texto.
// Cada carácter es un tile:
//
//   '.'  vacío (aire)
//   '#'  bloque sólido (suelo / pared)
//   '='  plataforma (sólida también, simple)
//   'b'  ladrillo (sólido, decorativo)
//   '|'  hierba (sólida, decorativa)
//   'F'  bandera de meta (no sólida)
//   'P'  spawn de Lucas (no sólido)
//   'C'  spawn de Cleto (no sólido)
//   'D'  spawn de Diego (no sólido)
//   '1'-'5'  spawn del jefe (no sólido)
//   'a'-'e'  spawn de enemigos compañeros (no sólido)
//
// Para colisión, todo lo que sea '#', '=', 'b' o '|' es sólido.

const TILE_SIZE = 16;
// Tiles sólidos: incluye bloques sorpresa ('?' activos y '!' usados) y
// trampolines ('t').
const SOLID_TILES = new Set(['#', '=', 'b', '|', '?', '!', 't']);

// Decorado: cómo dibujar cada tipo de tile, según el "tema" del nivel.
// Cada tema tiene un color de fondo y colores para los distintos tiles.
const THEMES = {
  patio: { // nivel 1
    bg: '#7cc8ff',
    cloudColor: '#ffffff',
    ground: { fill: '#5c2c00', top: '#20a020' },         // tierra con hierba
    block:  { fill: '#a06030', edge: '#5c2c00' },         // ladrillo
    platform:{fill: '#a06030', edge: '#5c2c00' },
  },
  musica: { // nivel 2
    bg: '#604898',
    cloudColor: '#ffd860',
    ground: { fill: '#3c1c5c', top: '#fca8c0' },          // moqueta
    block:  { fill: '#a04880', edge: '#3c1c5c' },
    platform:{fill: '#a04880', edge: '#3c1c5c' },
  },
  gym: { // nivel 3
    bg: '#88aa66',
    cloudColor: '#ffffff',
    ground: { fill: '#8c4810', top: '#d8a060' },          // tarima
    block:  { fill: '#508050', edge: '#204020' },          // colchoneta
    platform:{fill: '#508050', edge: '#204020' },
  },
  aula: { // nivel 4
    bg: '#f8d8a0',
    cloudColor: '#ffffff',
    ground: { fill: '#603810', top: '#9c5818' },          // tarima madera
    block:  { fill: '#e0c080', edge: '#604020' },          // pared aula
    platform:{fill: '#e0c080', edge: '#604020' },
  },
  direccion: { // nivel 5 (jefe final)
    bg: '#202040',
    cloudColor: '#5c5c80',
    ground: { fill: '#101020', top: '#404060' },
    block:  { fill: '#404060', edge: '#101020' },
    platform:{fill: '#404060', edge: '#101020' },
  },
  infantil: { // nivel Teresa: aula de infantil con colores pastel
    bg: '#ffd0e8',
    cloudColor: '#ffffff',
    ground: { fill: '#a86060', top: '#ffd860' },          // moqueta amarilla con base rosa
    block:  { fill: '#fca8c0', edge: '#a04880' },          // bloques rosas
    platform:{fill: '#fca8c0', edge: '#a04880' },
  },
  segundo: { // nivel Juanjo: aula de segundo, verde escolar
    bg: '#a8e0f8',
    cloudColor: '#ffffff',
    ground: { fill: '#604030', top: '#88c060' },          // suelo de madera con hierba
    block:  { fill: '#80b870', edge: '#205020' },          // bloques verdes
    platform:{fill: '#80b870', edge: '#205020' },
  },
};

class Level {
  constructor(data) {
    // Convertimos cada fila de string a array de chars para poder mutar
    // tiles concretos en runtime (p.ej. al "popear" un bloque sorpresa).
    this.tiles = data.tiles.map(row => Array.from(row));
    this.theme = THEMES[data.theme];
    this.themeName = data.theme;
    this.title = data.title;
    this.bossClass = data.bossClass;
    this.enemyTable = data.enemyTable;
    this.heightTiles = this.tiles.length;
    this.widthTiles = Math.max(...this.tiles.map(r => r.length));
    this.widthPx = this.widthTiles * TILE_SIZE;
    this.heightPx = this.heightTiles * TILE_SIZE;
    // Bloques sorpresa abiertos este frame (pa que game.js suelte premio).
    this.poppedBlocks = [];
  }

  // Devuelve el carácter del tile en coords de mundo (px). Útil para
  // efectos especiales sin pasar por colisión (trampolines, bloques '?').
  tileAt(x, y) {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    if (row < 0 || row >= this.heightTiles) return '.';
    if (col < 0 || col >= this.tiles[row].length) return '.';
    return this.tiles[row][col] || '.';
  }

  // Si el tile (col, row) es un bloque sorpresa activo '?' lo abre y
  // devuelve true. Lo deja como '!' (sigue siendo sólido).
  popSurpriseBlock(col, row) {
    if (row < 0 || row >= this.heightTiles) return false;
    if (col < 0 || col >= this.tiles[row].length) return false;
    if (this.tiles[row][col] !== '?') return false;
    this.tiles[row][col] = '!';
    this.poppedBlocks.push({ col, row });
    return true;
  }

  // ¿Es sólido el tile en (col, row)?
  solidTile(col, row) {
    if (col < 0 || col >= this.widthTiles) return true;  // paredes invisibles a los lados
    if (row < 0) return false;                            // techo abierto (saltar fuera ok)
    if (row >= this.heightTiles) return false;            // por debajo: caída al vacío
    const ch = this.tiles[row][col] || '.';
    return SOLID_TILES.has(ch);
  }

  // ¿Es sólido el píxel (x, y)?
  solidAt(x, y) {
    return this.solidTile(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));
  }

  // Comprueba colisión de la entidad contra tiles sólidos en el eje dado
  // ('x' o 'y') y la "empuja" para resolverla. Devuelve true si hubo colisión.
  collideAabb(ent, axis) {
    const left   = Math.floor(ent.x / TILE_SIZE);
    const right  = Math.floor((ent.x + ent.w - 1) / TILE_SIZE);
    const top    = Math.floor(ent.y / TILE_SIZE);
    const bottom = Math.floor((ent.y + ent.h - 1) / TILE_SIZE);

    let hit = false;
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        if (!this.solidTile(col, row)) continue;
        hit = true;
        if (axis === 'x') {
          if (ent.vx > 0)      ent.x = col * TILE_SIZE - ent.w;
          else if (ent.vx < 0) ent.x = (col + 1) * TILE_SIZE;
        } else {
          if (ent.vy > 0)      ent.y = row * TILE_SIZE - ent.h;
          else if (ent.vy < 0) ent.y = (row + 1) * TILE_SIZE;
        }
      }
    }
    return hit;
  }

  // ---- ENTIDADES SPAWN ----
  // Recorre el grid extrayendo posiciones de jugadores, enemigos, jefe y meta.
  extractSpawns() {
    const result = {
      lucas: null, cleto: null, diego: [], parents: [], friends: [],
      enemies: [], boss: null, flag: null,
      cromos: [], portals: [], bocadillos: [],
    };
    const friendByChar = {
      'R': 'rafa', 'T': 'matias', 'S': 'santiago', 'J': 'jorge',
    };
    // Portales: '(' y ')' son una pareja (grupo "0").
    //            '[' y ']' son otra pareja (grupo "1"). Suficiente por nivel.
    const portalByChar = {
      '(': '0', ')': '0', '[': '1', ']': '1',
    };
    for (let row = 0; row < this.heightTiles; row++) {
      const line = this.tiles[row];
      for (let col = 0; col < line.length; col++) {
        const ch = line[col];
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;
        if (ch === 'P') result.lucas = { x, y };
        else if (ch === 'C') result.cleto = { x, y };
        else if (ch === 'D') result.diego.push({ x, y });
        else if (ch === 'M') result.parents.push({ x, y, type: 'mama' });
        else if (ch === 'A') result.parents.push({ x, y, type: 'papa' });
        else if (friendByChar[ch]) result.friends.push({ x, y, kind: friendByChar[ch] });
        else if (ch === '*') result.cromos.push({ x, y });
        else if (ch === 'Q') result.bocadillos.push({ x, y });
        else if (portalByChar[ch]) result.portals.push({ x, y, group: portalByChar[ch] });
        else if (ch === 'F') result.flag = { x, y };
        else if (this.enemyTable[ch]) result.enemies.push({ x, y, ...this.enemyTable[ch] });
        else if (ch === 'B') result.boss = { x, y };
      }
    }
    return result;
  }

  // ---- DIBUJADO ----
  draw(ctx, camX) {
    // Fondo
    ctx.fillStyle = this.theme.bg;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Nubes / decoración de fondo (paralaje básico)
    this._drawBackdrop(ctx, camX);

    // Tiles visibles
    const startCol = Math.max(0, Math.floor(camX / TILE_SIZE));
    const endCol   = Math.min(this.widthTiles - 1, Math.ceil((camX + ctx.canvas.width) / TILE_SIZE));
    for (let row = 0; row < this.heightTiles; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const ch = this.tiles[row][col] || '.';
        if (ch === '.' || !ch) continue;
        const px = col * TILE_SIZE - camX;
        const py = row * TILE_SIZE;
        this._drawTile(ctx, ch, px, py, row, col);
      }
    }
  }

  _drawTile(ctx, ch, x, y, row, col) {
    const t = this.theme;
    if (ch === '#' || ch === '|') {
      const above = (row > 0) ? (this.tiles[row-1][col] || '.') : '.';
      // si encima no hay nada sólido, dibujamos "césped"
      ctx.fillStyle = t.ground.fill;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      if (!SOLID_TILES.has(above)) {
        ctx.fillStyle = t.ground.top;
        ctx.fillRect(x, y, TILE_SIZE, 4);
      }
    } else if (ch === '=') {
      ctx.fillStyle = t.platform.fill;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = t.platform.edge;
      ctx.fillRect(x, y, TILE_SIZE, 2);
      ctx.fillRect(x, y + TILE_SIZE - 2, TILE_SIZE, 2);
    } else if (ch === 'b') {
      ctx.fillStyle = t.block.fill;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = t.block.edge;
      // patrón de ladrillo
      ctx.fillRect(x, y, TILE_SIZE, 1);
      ctx.fillRect(x, y + TILE_SIZE/2, TILE_SIZE, 1);
      ctx.fillRect(x + TILE_SIZE/2, y, 1, TILE_SIZE/2);
      ctx.fillRect(x, y + TILE_SIZE/2, 1, TILE_SIZE/2);
      ctx.fillRect(x + TILE_SIZE/4, y + TILE_SIZE/2, 1, TILE_SIZE/2);
    } else if (ch === '?') {
      // Bloque sorpresa activo: amarillo brillante con interrogación
      ctx.fillStyle = '#ffd860';
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = '#a06000';
      ctx.fillRect(x, y, TILE_SIZE, 2);
      ctx.fillRect(x, y + TILE_SIZE - 2, TILE_SIZE, 2);
      ctx.fillRect(x, y, 2, TILE_SIZE);
      ctx.fillRect(x + TILE_SIZE - 2, y, 2, TILE_SIZE);
      ctx.fillStyle = '#000';
      ctx.font = '10px monospace';
      ctx.fillText('?', x + 5, y + 12);
    } else if (ch === '!') {
      // Bloque sorpresa usado: marrón apagado con remache
      ctx.fillStyle = '#806020';
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = '#402810';
      ctx.fillRect(x, y, TILE_SIZE, 2);
      ctx.fillRect(x, y + TILE_SIZE - 2, TILE_SIZE, 2);
      ctx.fillRect(x, y, 2, TILE_SIZE);
      ctx.fillRect(x + TILE_SIZE - 2, y, 2, TILE_SIZE);
      ctx.fillStyle = '#000';
      ctx.fillRect(x + 7, y + 7, 2, 2);
    } else if (ch === 't') {
      // Trampolín: cama elástica verde con muelle
      ctx.fillStyle = '#5c2c00';
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);  // base oscura
      ctx.fillStyle = '#a0d030';
      ctx.fillRect(x, y, TILE_SIZE, 6);          // lona verde clara
      ctx.fillStyle = '#205020';
      ctx.fillRect(x, y, TILE_SIZE, 1);          // borde superior
      ctx.fillStyle = '#888';
      // muelles
      ctx.fillRect(x + 3, y + 6, 1, 8);
      ctx.fillRect(x + 7, y + 6, 1, 8);
      ctx.fillRect(x + 11, y + 6, 1, 8);
    } else if (ch === 'F') {
      // Bandera con palo
      drawSprite(ctx, Sprites.flag, x, y);
    }
    // Spawns no se dibujan (se convierten en entidades al cargar).
  }

  _drawBackdrop(ctx, camX) {
    const t = this.theme;
    // Nubes a velocidad 0.3x para sensación de paralaje
    ctx.fillStyle = t.cloudColor;
    const offsetX = (camX * 0.3) % 80;
    for (let i = 0; i < 5; i++) {
      const cx = i * 80 - offsetX + 10;
      const cy = 16 + (i % 2) * 24;
      this._drawCloud(ctx, cx, cy);
    }
  }
  _drawCloud(ctx, x, y) {
    ctx.fillRect(x, y + 2, 24, 6);
    ctx.fillRect(x + 4, y, 16, 10);
    ctx.fillRect(x + 8, y - 2, 8, 4);
  }
}
