// Sistema de niveles basado en tiles de 16x16.
//
// Cada nivel se define en levels.js como un array de filas de texto.
// Cada carácter es un tile (ver la lista completa en levels.js).
//
// Para colisión, todo lo que esté en SOLID_TILES es sólido.
// Los tiles "fijos" (suelo, plataformas, ladrillos) se pintan UNA vez en
// un canvas grande al cargar el nivel; los animados (bloques ?, trampolín,
// meta) se pintan cada frame.

const TILE_SIZE = 16;
const SOLID_TILES = new Set(['#', '=', 'b', '|', '?', '!', 't']);

// Temas visuales: estilo de suelo, de plataformas y colores.
//   ground: 'grass' | 'carpet' | 'wood' | 'marble'
//   plat:   'wood' | 'piano' | 'mat' | 'shelf'
//   ambient: partículas de ambiente ('leaves', 'dust', 'notes', 'sparkle')
const THEMES = {
  patio: {
    ground: 'grass', top: ['#8ee05a', '#5cbc3c', '#3a8e2c'], soil: ['#8a5a32', '#6a4024', '#4a2a16'],
    plat: 'wood', platCol: ['#e0a868', '#b87a44', '#7a4a24'],
    brick: ['#e07a50', '#b85434', '#f0d8c0'], ambient: 'leaves',
  },
  ingles: {
    ground: 'wood', top: ['#e8b878', '#c48a4c', '#8a5a2e'], soil: ['#7a5a48', '#5a4034', '#3e2a22'],
    plat: 'wood', platCol: ['#90c8f0', '#5a9ad0', '#2e6aa0'],
    brick: ['#6aa0d8', '#3e70b0', '#e0eef8'], ambient: 'dust',
  },
  musica: {
    ground: 'carpet', top: ['#f080a8', '#c85080', '#8a2a58'], soil: ['#4a2e6a', '#36204e', '#241438'],
    plat: 'piano', platCol: ['#ffffff', '#e0dce8', '#1c1228'],
    brick: ['#a04880', '#782e60', '#e8c8f0'], ambient: 'notes',
  },
  gym: {
    ground: 'wood', top: ['#f0c070', '#d09a48', '#9a6a2a'], soil: ['#8a6a4a', '#6a4e36', '#4a3424'],
    plat: 'mat', platCol: ['#70a8f0', '#3a70d0', '#1c3c8a'],
    brick: ['#60a060', '#3a7a3a', '#d8f0d0'], ambient: 'dust',
  },
  aula: {
    ground: 'wood', top: ['#d8985a', '#b0703a', '#7a4a20'], soil: ['#6a4a34', '#523626', '#3a2418'],
    plat: 'shelf', platCol: ['#f0d090', '#c8a060', '#8a6030'],
    brick: ['#e0c080', '#b89050', '#fff0d0'], ambient: 'dust',
  },
  direccion: {
    ground: 'marble', top: ['#c8c4e0', '#9a96bc', '#5a5680'], soil: ['#34304e', '#26223c', '#18142a'],
    plat: 'shelf', platCol: ['#9a6a44', '#6a4428', '#3e2614'],
    brick: ['#5a5680', '#3e3a60', '#9a96bc'], ambient: 'dust',
  },
  bonus: {
    ground: 'grass', top: ['#b070f0', '#8048d0', '#5a2aa0'], soil: ['#3a2470', '#2a1858', '#1c1040'],
    plat: 'mat', platCol: ['#ffd860', '#f0a030', '#a06010'],
    brick: ['#f06090', '#c03868', '#ffd0e0'], ambient: 'sparkle',
  },
};

class Level {
  constructor(data) {
    // Convertimos cada fila de string a array de chars para poder mutar
    // tiles concretos en runtime (p.ej. al "popear" un bloque sorpresa).
    this.tiles = data.tiles.map(row => Array.from(row));
    this.themeName = THEMES[data.theme] ? data.theme : 'patio';
    this.theme = THEMES[this.themeName];
    this.title = data.title;
    this.bossClass = data.bossClass;
    this.enemyTable = data.enemyTable || {};
    this.heightTiles = this.tiles.length;
    this.widthTiles = Math.max(...this.tiles.map(r => r.length));
    for (const row of this.tiles) while (row.length < this.widthTiles) row.push('.');
    this.widthPx = this.widthTiles * TILE_SIZE;
    this.heightPx = this.heightTiles * TILE_SIZE;
    this.poppedBlocks = [];
    this.bumps = [];        // animación de bloques golpeados
    this.springs = new Map(); // "col,row" -> frames de compresión
    this.ambient = [];
    this.time = 0;
    this.flagLocked = false;
    this.backdrop = Backdrops.get(this.themeName);
    this._prerender();
  }

  tileAt(x, y) {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    if (row < 0 || row >= this.heightTiles) return '.';
    if (col < 0 || col >= this.widthTiles) return '.';
    return this.tiles[row][col] || '.';
  }

  popSurpriseBlock(col, row) {
    if (row < 0 || row >= this.heightTiles) return false;
    if (col < 0 || col >= this.widthTiles) return false;
    if (this.tiles[row][col] !== '?') return false;
    this.tiles[row][col] = '!';
    this.poppedBlocks.push({ col, row });
    this.bumps.push({ col, row, t: 12 });
    return true;
  }

  // Golpe de cabeza a un ladrillo: sólo animación.
  bumpTile(col, row) {
    if (this.bumps.some(b => b.col === col && b.row === row)) return;
    this.bumps.push({ col, row, t: 12 });
  }

  springAt(x, y) {
    const col = Math.floor(x / TILE_SIZE), row = Math.floor(y / TILE_SIZE);
    this.springs.set(col + ',' + row, 14);
  }

  solidTile(col, row) {
    if (col < 0 || col >= this.widthTiles) return true;  // paredes invisibles a los lados
    if (row < 0) return false;
    if (row >= this.heightTiles) return false;
    return SOLID_TILES.has(this.tiles[row][col] || '.');
  }

  solidAt(x, y) {
    return this.solidTile(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));
  }

  // Comprueba colisión de la entidad contra tiles sólidos en el eje dado
  // ('x' o 'y') y la "empuja" para resolverla. Devuelve true si hubo colisión.
  collideAabb(ent, axis) {
    const left   = Math.floor(ent.x / TILE_SIZE);
    const right  = Math.floor((ent.x + ent.w - 1) / TILE_SIZE);
    const top    = Math.floor(ent.y / TILE_SIZE);
    // En vertical cuenta cualquier contacto, aunque sea de una fracción de
    // píxel: si no, al caer despacio un personaje "flota" unos frames sobre
    // el suelo y su postura parpadea entre andar y caer. En horizontal
    // dejamos 1 px de margen para no chocar con el suelo que pisamos.
    const bottom = axis === 'y'
      ? Math.floor((ent.y + ent.h - 0.01) / TILE_SIZE)
      : Math.floor((ent.y + ent.h - 1) / TILE_SIZE);
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
  extractSpawns() {
    const result = {
      lucas: null, cleto: null, diego: [], parents: [], friends: [],
      enemies: [], boss: null, flag: null,
      cromos: [], portals: [], bocadillos: [],
    };
    const friendByChar = { 'R': 'rafa', 'T': 'matias', 'S': 'santiago', 'J': 'carlos', 'N': 'fran' };
    const parentByChar = {
      'A': 'papa', 'M': 'mama',
      'G': 'angeles', 'E': 'pepe', 'O': 'rosa', 'U': 'asun',
    };
    const portalByChar = { '(': '0', ')': '0', '[': '1', ']': '1' };
    for (let row = 0; row < this.heightTiles; row++) {
      const line = this.tiles[row];
      for (let col = 0; col < line.length; col++) {
        const ch = line[col];
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;
        if (ch === 'P') result.lucas = { x, y };
        else if (ch === 'C') result.cleto = { x, y };
        else if (ch === 'D') result.diego.push({ x, y });
        else if (parentByChar[ch]) result.parents.push({ x, y, type: parentByChar[ch] });
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

  // Busca un sitio de suelo firme hacia la mitad del nivel para poner
  // el punto de control. Devuelve null si el nivel es corto.
  findCheckpoint(bossX) {
    if (this.widthTiles < 50) return null;
    const maxCol = bossX ? Math.floor(bossX / TILE_SIZE) - 10 : this.widthTiles - 12;
    const mid = Math.min(Math.floor(this.widthTiles * 0.45), maxCol);
    for (let d = 0; d < 20; d++) {
      for (const col of [mid - d, mid + d]) {
        if (col < 3 || col > maxCol) continue;
        for (let row = 6; row < this.heightTiles - 1; row++) {
          const ok = this.solidTile(col, row + 1) && this.solidTile(col - 1, row + 1) && this.solidTile(col + 1, row + 1)
            && !this.solidTile(col, row) && !this.solidTile(col, row - 1) && this.tiles[row + 1][col] === '#';
          if (ok) return { x: col * TILE_SIZE, y: row * TILE_SIZE };
        }
      }
    }
    return null;
  }

  // ---------------- PINTADO ----------------
  _isSolidCh(ch) { return SOLID_TILES.has(ch); }
  _ch(col, row) {
    if (row < 0 || row >= this.heightTiles || col < 0 || col >= this.widthTiles) return '.';
    return this.tiles[row][col] || '.';
  }

  _prerender() {
    const [cv, c] = makeCanvas(this.widthPx, this.heightPx);
    this.tileCanvas = cv;
    this.dynamicTiles = [];
    for (let row = 0; row < this.heightTiles; row++) {
      for (let col = 0; col < this.widthTiles; col++) {
        const ch = this.tiles[row][col];
        if (ch === '?' || ch === '!' || ch === 't' || ch === 'F') { this.dynamicTiles.push({ col, row }); continue; }
        const x = col * TILE_SIZE, y = row * TILE_SIZE;
        if (ch === '#' || ch === '|') this._paintGround(c, col, row, x, y);
        else if (ch === '=') this._paintPlatform(c, col, row, x, y);
        else if (ch === 'b') this._paintBrick(c, col, row, x, y);
      }
    }
    this._outlineTiles(c);
    // Sombra suave bajo plataformas flotantes (da profundidad).
    for (let row = 1; row < this.heightTiles; row++) {
      for (let col = 0; col < this.widthTiles; col++) {
        const above = this._ch(col, row - 1);
        const here = this._ch(col, row);
        if (!this._isSolidCh(here) && (above === '=' || above === 'b' || above === '?' || above === '!')) {
          const x = col * TILE_SIZE, y = row * TILE_SIZE;
          for (let i = 0; i < 6; i++) {
            c.fillStyle = `rgba(20,10,40,${0.2 * (1 - i / 6)})`;
            c.fillRect(x, y + i, TILE_SIZE, 1);
          }
        }
      }
    }
  }

  // Contorno oscuro alrededor de todo lo sólido: así suelo, plataformas
  // y ladrillos se separan bien del fondo aunque tengan colores parecidos.
  _outlineTiles(c) {
    const W = this.widthPx, H = this.heightPx;
    const img = c.getImageData(0, 0, W, H);
    const d = img.data;
    const solid = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) solid[i] = d[i * 4 + 3] > 40 ? 1 : 0;
    const out = c.createImageData(W, H);
    const o = out.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (solid[i]) continue;
        const n = (x > 0 && solid[i - 1]) || (x < W - 1 && solid[i + 1]) ||
                  (y > 0 && solid[i - W]) || (y < H - 1 && solid[i + W]);
        if (n) { o[i * 4] = 28; o[i * 4 + 1] = 18; o[i * 4 + 2] = 40; o[i * 4 + 3] = 255; }
      }
    }
    const [oc, ox] = makeCanvas(W, H);
    ox.putImageData(out, 0, 0);
    c.drawImage(oc, 0, 0);
  }

  _paintGround(c, col, row, x, y) {
    const t = this.theme;
    const S = TILE_SIZE;
    const solid = (dc, dr) => this._isSolidCh(this._ch(col + dc, row + dr));
    const topOpen = !solid(0, -1);
    const leftOpen = !solid(-1, 0);
    const rightOpen = !solid(1, 0);
    // profundidad: cuántos tiles sólidos hay encima en la columna
    let depth = 0;
    for (let r = row - 1; r >= 0 && this._isSolidCh(this._ch(col, r)); r--) depth++;

    // ---- cuerpo ----
    const body = mixColor(t.soil[1], t.soil[2], Math.min(1, depth * 0.28));
    c.fillStyle = body;
    c.fillRect(x, y, S, S);
    if (t.ground === 'grass') {
      for (let i = 0; i < 7; i++) {
        const px = x + Math.floor(hash2(col * 7 + i, row) * 15);
        const py = y + Math.floor(hash2(row * 5 + i, col) * 15);
        const big = hash2(col + i, row + i) < 0.3;
        c.fillStyle = shade(body, -0.25); c.fillRect(px, py + 1, big ? 3 : 2, 1);
        c.fillStyle = shade(body, 0.18); c.fillRect(px, py, big ? 3 : 2, 1);
      }
    } else if (t.ground === 'wood') {
      for (let py = 0; py < S; py += 4) {
        c.fillStyle = shade(body, -0.22); c.fillRect(x, y + py + 3, S, 1);
        const jx = Math.floor(hash2(col, row * 4 + py) * 14);
        c.fillRect(x + jx, y + py, 1, 3);
        c.fillStyle = shade(body, 0.08); c.fillRect(x, y + py, S, 1);
      }
    } else if (t.ground === 'carpet') {
      c.fillStyle = shade(body, 0.08);
      for (let py = 0; py < S; py += 2) for (let px = (py / 2) % 2; px < S; px += 2) if (hash2(x + px, y + py) < 0.35) c.fillRect(x + px, y + py, 1, 1);
    } else if (t.ground === 'marble') {
      const chk = (col + row) % 2 === 0;
      c.fillStyle = chk ? shade(body, 0.06) : shade(body, -0.06);
      c.fillRect(x, y, S, S);
      c.fillStyle = shade(body, 0.15);
      const vx = Math.floor(hash2(col, row) * 10);
      for (let i = 0; i < 10; i++) c.fillRect(x + vx + Math.floor(i * 0.6), y + 3 + i, 1, 1);
    }

    // ---- bordes laterales (huecos) ----
    if (leftOpen) {
      c.fillStyle = shade(body, -0.35); c.fillRect(x, y, 2, S);
      c.fillStyle = shade(body, 0.15); c.fillRect(x + 2, y, 1, S);
    }
    if (rightOpen) {
      c.fillStyle = shade(body, -0.45); c.fillRect(x + S - 2, y, 2, S);
    }

    // ---- superficie ----
    if (topOpen) {
      const [tl, tm, td] = t.top;
      if (t.ground === 'grass') {
        c.fillStyle = tm; c.fillRect(x, y, S, 4);
        c.fillStyle = tl; c.fillRect(x, y, S, 1);
        // flecos de hierba que cuelgan
        for (let px = 0; px < S; px++) {
          const h = 1 + Math.floor(hash2(col * 16 + px, row) * 3);
          c.fillStyle = td; c.fillRect(x + px, y + 4, 1, h);
          if (h === 3) { c.fillStyle = tm; c.fillRect(x + px, y + 4, 1, 1); }
        }
        // briznas por encima del suelo
        for (let i = 0; i < 4; i++) {
          const px = Math.floor(hash2(col * 3 + i, row * 9) * 15);
          c.fillStyle = hash2(i, col) < 0.5 ? tl : tm;
          c.fillRect(x + px, y - 1, 1, 1);
          if (hash2(col, i * 7) < 0.4) c.fillRect(x + px + 1, y - 2, 1, 1);
        }
        // alguna florecilla
        if (hash2(col, row * 13) < 0.12 && this.themeName === 'patio') {
          const px = x + 3 + Math.floor(hash2(col, 99) * 9);
          c.fillStyle = hash2(col, 98) < 0.5 ? '#ffffff' : '#ffd040';
          c.fillRect(px - 1, y - 3, 3, 1); c.fillRect(px, y - 4, 1, 3);
          c.fillStyle = '#f08030'; c.fillRect(px, y - 3, 1, 1);
        }
      } else if (t.ground === 'carpet') {
        c.fillStyle = tm; c.fillRect(x, y, S, 5);
        c.fillStyle = tl; c.fillRect(x, y, S, 1);
        c.fillStyle = td; c.fillRect(x, y + 5, S, 1);
        c.fillStyle = shade(tm, 0.15);
        for (let px = 0; px < S; px += 2) c.fillRect(x + px + (row % 2), y + 2, 1, 1);
      } else if (t.ground === 'wood') {
        c.fillStyle = tm; c.fillRect(x, y, S, 5);
        c.fillStyle = tl; c.fillRect(x, y, S, 1);
        c.fillStyle = shade(tl, 0.3); c.fillRect(x + ((col * 5) % 12), y, 3, 1);
        c.fillStyle = td; c.fillRect(x, y + 4, S, 1);
        if (col % 3 === 0) { c.fillStyle = td; c.fillRect(x, y + 1, 1, 3); }
        // zócalo oscuro
        c.fillStyle = shade(t.soil[0], -0.1); c.fillRect(x, y + 5, S, 2);
      } else if (t.ground === 'marble') {
        c.fillStyle = tm; c.fillRect(x, y, S, 4);
        c.fillStyle = tl; c.fillRect(x, y, S, 1);
        c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x + ((col * 7) % 10), y + 1, 4, 1);
        c.fillStyle = td; c.fillRect(x, y + 4, S, 1);
      }
      // esquinas redondeadas
      if (leftOpen) { c.clearRect(x, y, 1, 2); c.clearRect(x, y, 2, 1); c.fillStyle = t.top[2]; c.fillRect(x, y + 2, 1, 3); }
      if (rightOpen) { c.clearRect(x + S - 1, y, 1, 2); c.clearRect(x + S - 2, y, 2, 1); c.fillStyle = t.top[2]; c.fillRect(x + S - 1, y + 2, 1, 3); }
    }
  }

  _paintPlatform(c, col, row, x, y) {
    const t = this.theme;
    const [l, m, d] = t.platCol;
    const S = TILE_SIZE;
    const leftEnd = this._ch(col - 1, row) !== '=';
    const rightEnd = this._ch(col + 1, row) !== '=';
    if (t.plat === 'piano') {
      // ¡teclas de piano!
      c.fillStyle = '#1c1228'; c.fillRect(x, y, S, S);
      c.fillStyle = l; c.fillRect(x, y + 1, S, S - 3);
      c.fillStyle = m;
      for (let k = 0; k < 4; k++) c.fillRect(x + k * 4, y + S - 4, 4, 1);
      c.fillStyle = '#b8b0c8';
      for (let k = 0; k < 4; k++) c.fillRect(x + k * 4 + 3, y + 1, 1, S - 3);
      c.fillStyle = '#1c1228';
      for (let k = 0; k < 4; k++) if ((col * 4 + k) % 7 !== 2 && (col * 4 + k) % 7 !== 6) c.fillRect(x + k * 4 + 2, y + 1, 3, 8);
      c.fillStyle = '#5a5070';
      for (let k = 0; k < 4; k++) if ((col * 4 + k) % 7 !== 2 && (col * 4 + k) % 7 !== 6) c.fillRect(x + k * 4 + 2, y + 1, 1, 7);
      c.fillStyle = '#7a2a3a'; c.fillRect(x, y, S, 1);
      if (leftEnd) { c.fillStyle = '#4a1a2a'; c.fillRect(x, y, 2, S); }
      if (rightEnd) { c.fillStyle = '#4a1a2a'; c.fillRect(x + S - 2, y, 2, S); }
      return;
    }
    if (t.plat === 'mat') {
      bevelRect(c, x, y + 2, S, S - 4, m, l, d);
      c.fillStyle = 'rgba(255,255,255,0.7)';
      for (let px = 1; px < S; px += 3) c.fillRect(x + px, y + 4, 2, 1);
      for (let px = 1; px < S; px += 3) c.fillRect(x + px, y + S - 5, 2, 1);
      c.fillStyle = d; c.fillRect(x, y + 2, S, 1);
      c.fillStyle = l; c.fillRect(x, y + 3, S, 1);
      if (!leftEnd) { c.fillStyle = shade(m, -0.15); c.fillRect(x, y + 3, 1, S - 6); }
      if (leftEnd) { c.clearRect(x, y + 2, 1, 1); c.clearRect(x, y + S - 3, 1, 1); }
      if (rightEnd) { c.clearRect(x + S - 1, y + 2, 1, 1); c.clearRect(x + S - 1, y + S - 3, 1, 1); }
      return;
    }
    // madera / estantería: tablón con vetas y soportes
    const ph = t.plat === 'shelf' ? 7 : 9;
    c.fillStyle = m; c.fillRect(x, y, S, ph);
    c.fillStyle = l; c.fillRect(x, y, S, 2);
    c.fillStyle = shade(l, 0.3); c.fillRect(x + ((col * 5) % 10), y, 4, 1);
    c.fillStyle = shade(m, -0.15);
    c.fillRect(x + 2 + (col % 3), y + 4, 6, 1); c.fillRect(x + 9 - (col % 2) * 3, y + 6, 5, 1);
    c.fillStyle = d; c.fillRect(x, y + ph - 1, S, 1);
    if (!leftEnd) { c.fillStyle = d; c.fillRect(x, y + 2, 1, ph - 3); }
    c.fillStyle = '#d0c8b0'; c.fillRect(x + 2, y + 3, 1, 1); c.fillRect(x + 13, y + 3, 1, 1);
    // escuadras debajo
    if (leftEnd || rightEnd || col % 3 === 0) {
      const bx = leftEnd ? x + 2 : (rightEnd ? x + S - 5 : x + 6);
      c.fillStyle = d;
      for (let i = 0; i < 4; i++) c.fillRect(bx + (rightEnd ? 0 : 0), y + ph + i, 3 - Math.floor(i * 0.7), 1);
    }
    if (leftEnd) { c.clearRect(x, y, 1, 1); c.fillStyle = d; c.fillRect(x, y + 1, 1, ph - 1); }
    if (rightEnd) { c.clearRect(x + S - 1, y, 1, 1); c.fillStyle = d; c.fillRect(x + S - 1, y + 1, 1, ph - 1); }
  }

  _paintBrick(c, col, row, x, y) {
    const [l, m, mortar] = this.theme.brick;
    const S = TILE_SIZE;
    c.fillStyle = shade(mortar, -0.35); c.fillRect(x, y, S, S);
    for (let r = 0; r < 4; r++) {
      const off = (r % 2) * 4;
      for (let bx = -off; bx < S; bx += 8) {
        const x0 = Math.max(0, bx), x1 = Math.min(S, bx + 7);
        if (x1 <= x0) continue;
        const v = hash2(col * 4 + bx, row * 4 + r) * 0.12 - 0.06;
        bevelRect(c, x + x0, y + r * 4, x1 - x0, 3, shade(m, v), shade(l, v), shade(m, -0.3));
      }
    }
  }

  // ---- tiles animados ----
  _bumpOffset(col, row) {
    for (const b of this.bumps) if (b.col === col && b.row === row) return -Math.sin((b.t / 12) * Math.PI) * 5;
    return 0;
  }

  _drawQuestion(ctx, x, y, used) {
    const S = TILE_SIZE;
    if (used) {
      bevelRect(ctx, x, y, S, S, '#b07a48', '#e0aa70', '#5a3818');
      ctx.strokeStyle = '#1c1228'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, S - 1, S - 1);
      ctx.fillStyle = '#5a3818';
      for (const [px, py] of [[2, 2], [13, 2], [2, 13], [13, 13]]) ctx.fillRect(x + px, y + py, 1, 1);
      return;
    }
    const pulse = Math.sin(this.time * 0.1) * 0.5 + 0.5;
    const base = mixColor('#f0a818', '#ffc838', pulse);
    bevelRect(ctx, x, y, S, S, base, '#fff0a0', '#a05a08');
    ctx.strokeStyle = '#1c1228'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, S - 1, S - 1);
    ctx.fillStyle = '#a05a08';
    for (const [px, py] of [[2, 2], [13, 2], [2, 13], [13, 13]]) ctx.fillRect(x + px, y + py, 1, 1);
    // signo de interrogación pixel
    const Q = ['.###.', '##.##', '...##', '..##.', '..##.', '.....', '..##.'];
    for (let r = 0; r < Q.length; r++) for (let cc = 0; cc < 5; cc++) {
      if (Q[r][cc] !== '#') continue;
      ctx.fillStyle = '#7a3a00'; ctx.fillRect(x + 6 + cc, y + 5 + r, 1, 1);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 5 + cc, y + 4 + r, 1, 1);
    }
    // destello que cruza el bloque
    const sh = (this.time + x) % 140;
    if (sh < 16) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < S; i++) {
        const px = sh - i;
        if (px >= 1 && px < S - 1) ctx.fillRect(x + px, y + i, 2, 1);
      }
    }
  }

  _drawSpring(ctx, x, y, col, row) {
    const k = this.springs.get(col + ',' + row) || 0;
    const comp = k > 0 ? Math.sin((k / 14) * Math.PI) * 5 : 0;
    // base
    ctx.fillStyle = '#4a4a58'; ctx.fillRect(x + 1, y + 13, 14, 3);
    ctx.fillStyle = '#6a6a7a'; ctx.fillRect(x + 1, y + 13, 14, 1);
    // muelles
    const top = y + 4 + comp;
    ctx.fillStyle = '#c0c0d0';
    for (const sx of [x + 3, x + 11]) {
      for (let yy = top + 3; yy < y + 13; yy += 2) ctx.fillRect(sx, yy, 3, 1);
    }
    // lona
    ctx.fillStyle = '#e03a3a'; ctx.fillRect(x, top, 16, 4);
    ctx.fillStyle = '#ff7070'; ctx.fillRect(x, top, 16, 1);
    ctx.fillStyle = '#ffd040'; ctx.fillRect(x + 2, top + 2, 12, 1);
  }

  _drawFlag(ctx, x, y) {
    // mástil de 4 tiles con bola dorada y bandera ondeando
    const baseY = y + TILE_SIZE;
    const topY = baseY - 64;
    ctx.fillStyle = '#5a5a68'; ctx.fillRect(x + 2, baseY - 3, 9, 3);
    ctx.fillStyle = '#c8c8d8'; ctx.fillRect(x + 5, topY, 3, 64);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 5, topY, 1, 64);
    ctx.fillStyle = '#f0c030'; pxDisc(ctx, x + 6, topY - 2, 3);
    ctx.fillStyle = '#fff0a0'; ctx.fillRect(x + 5, topY - 4, 1, 1);
    const locked = this.flagLocked;
    const cols = locked ? ['#8a8a98', '#6a6a78'] : ['#e83a4a', '#f8d040'];
    for (let i = 0; i < 20; i++) {
      const wave = Math.round(Math.sin(this.time * 0.15 - i * 0.45) * 1.5 * (i / 20));
      const h = 14 - Math.floor(i / 4);
      const fy = topY + 2 + wave + Math.floor((14 - h) / 2);
      ctx.fillStyle = cols[0]; ctx.fillRect(x + 8 + i, fy, 1, h);
      ctx.fillStyle = cols[1]; ctx.fillRect(x + 8 + i, fy + Math.floor(h / 2) - 1, 1, 3);
    }
    if (locked) {
      // candado: hay que vencer al profe primero
      const lx = x + 13, ly = topY + 22;
      ctx.fillStyle = '#c8a030'; ctx.fillRect(lx, ly + 4, 9, 7);
      ctx.fillStyle = '#7a7a88'; ctx.fillRect(lx + 2, ly, 1, 4); ctx.fillRect(lx + 6, ly, 1, 4); ctx.fillRect(lx + 2, ly, 5, 1);
      ctx.fillStyle = '#5a4010'; ctx.fillRect(lx + 4, ly + 6, 1, 3);
    }
  }

  // ---- ambiente ----
  updateAmbient(camX) {
    this.time++;
    for (const b of this.bumps) b.t--;
    this.bumps = this.bumps.filter(b => b.t > 0);
    for (const [k, v] of this.springs) { if (v <= 1) this.springs.delete(k); else this.springs.set(k, v - 1); }

    const kind = this.theme.ambient;
    const max = kind === 'leaves' ? 10 : kind === 'notes' ? 6 : 22;
    if (this.ambient.length < max && Math.random() < 0.15) {
      const p = { x: camX + Math.random() * (VIEW_W + 40) - 20, y: 0, t: 0, life: 400, seed: Math.random() * 10 };
      if (kind === 'leaves') { p.y = -6; p.vx = -0.3 - Math.random() * 0.4; p.vy = 0.35 + Math.random() * 0.3; p.col = ['#e08a30', '#c8c040', '#e0603a', '#70b040'][Math.floor(Math.random() * 4)]; }
      else if (kind === 'notes') { p.y = 60 + Math.random() * 100; p.vx = 0.1; p.vy = -0.15; p.life = 300; }
      else if (kind === 'sparkle') { p.y = Math.random() * 170; p.vx = 0; p.vy = -0.1; p.life = 120; }
      else { p.y = 20 + Math.random() * 150; p.vx = 0.05 + Math.random() * 0.1; p.vy = -0.02; p.life = 360; }
      this.ambient.push(p);
    }
    for (const p of this.ambient) {
      p.t++;
      p.x += p.vx + (kind === 'leaves' ? Math.sin(p.t * 0.05 + p.seed) * 0.4 : Math.sin(p.t * 0.02 + p.seed) * 0.08);
      p.y += p.vy;
    }
    this.ambient = this.ambient.filter(p => p.t < p.life && p.y < VIEW_H && p.x > camX - 60 && p.x < camX + VIEW_W + 60);
  }

  drawAmbient(ctx, camX) {
    const kind = this.theme.ambient;
    for (const p of this.ambient) {
      const a = Math.min(1, p.t / 30, (p.life - p.t) / 30);
      const x = p.x - camX, y = p.y;
      if (kind === 'leaves') {
        ctx.fillStyle = p.col;
        const flip = Math.sin(p.t * 0.1 + p.seed) > 0;
        ctx.fillRect(snap(x), snap(y), flip ? 3 : 2, flip ? 2 : 3);
      } else if (kind === 'notes') {
        ctx.globalAlpha = a * 0.5;
        ctx.fillStyle = '#e8d8ff';
        ctx.fillRect(snap(x), snap(y + 4), 3, 2); ctx.fillRect(snap(x + 2), snap(y), 1, 5);
        ctx.globalAlpha = 1;
      } else if (kind === 'sparkle') {
        ctx.globalAlpha = a * (0.5 + 0.5 * Math.sin(p.t * 0.3));
        ctx.fillStyle = '#fff8c0';
        ctx.fillRect(snap(x), snap(y - 1), 1, 3); ctx.fillRect(snap(x - 1), snap(y), 3, 1);
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = a * 0.55;
        ctx.fillStyle = '#fff6d8';
        ctx.fillRect(snap(x), snap(y), 0.75, 0.75);
        ctx.globalAlpha = 1;
      }
    }
  }

  // ---- DIBUJADO ----
  drawBackground(ctx, camX) {
    this.backdrop.draw(ctx, camX, this.time);
    this.drawAmbient(ctx, camX);
  }

  drawTiles(ctx, camX) {
    const sx = Math.max(0, Math.floor(camX));
    const sw = Math.min(VIEW_W + 2, this.widthPx - sx);
    ctx.drawImage(this.tileCanvas, sx, 0, sw, this.heightPx, snap(sx - camX), 0, sw, this.heightPx);
    for (const { col, row } of this.dynamicTiles) {
      const x = col * TILE_SIZE - camX;
      if (x < -80 || x > VIEW_W + 16) continue;
      const ch = this.tiles[row][col];
      const y = row * TILE_SIZE + this._bumpOffset(col, row);
      const px = snap(x), py = snap(y);
      if (ch === '?') this._drawQuestion(ctx, px, py, false);
      else if (ch === '!') this._drawQuestion(ctx, px, py, true);
      else if (ch === 't') this._drawSpring(ctx, px, py, col, row);
      else if (ch === 'F') this._drawFlag(ctx, px, py);
    }
  }

  drawForeground(ctx, camX) {
    this.backdrop.drawFg(ctx, camX);
  }
}
