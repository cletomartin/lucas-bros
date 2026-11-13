// Fondos con paralaje para cada tema de nivel.
//
// Cada fondo tiene un "cielo" fijo (256x240) y varias capas que se
// repiten en horizontal y se mueven más despacio que la cámara (cuanto
// más lejos, más lento). Todo se pinta UNA vez al cargar, en canvas
// pequeños, con primitivas pixel-art. Luego cada frame sólo se copian.

const Backdrops = {
  _cache: {},
  get(theme) {
    if (!this._cache[theme]) {
      const b = BACKDROP_BUILDERS[theme] || BACKDROP_BUILDERS.patio;
      this._cache[theme] = b();
    }
    return this._cache[theme];
  },
};

// Dibuja `fn(x)` en x, x-W y x+W para que el canvas se repita sin cortes.
function wrap(W, x, fn) { fn(x); fn(x - W); fn(x + W); }

function bandGradient(ctx, x, y, w, h, top, bottom, bands = 12) {
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = mixColor(top, bottom, i / (bands - 1));
    const y0 = y + Math.floor((h * i) / bands);
    const y1 = y + Math.floor((h * (i + 1)) / bands);
    ctx.fillRect(x, y0, w, y1 - y0);
  }
}

function makeBackdrop({ sky, layers, drawExtra, vignette = 0.3, fg = null }) {
  return {
    sky, layers, vignette, fg,
    // Primer plano: pasa POR DELANTE del suelo, más rápido que la cámara.
    drawFg(ctx, camX) {
      if (!fg) return;
      const W = fg.cv.width;
      let off = (camX * fg.f) % W;
      if (off < 0) off += W;
      for (let x = -off; x < VIEW_W; x += W) ctx.drawImage(fg.cv, snap(x), 0);
    },
    draw(ctx, camX, t) {
      ctx.drawImage(sky, 0, 0);
      if (drawExtra) drawExtra(ctx, camX, t, 'back');
      for (const L of layers) {
        const W = L.cv.width;
        let off = (camX * L.f + t * (L.drift || 0)) % W;
        if (off < 0) off += W;
        for (let x = -off; x < VIEW_W; x += W) ctx.drawImage(L.cv, snap(x), L.y || 0);
      }
      if (drawExtra) drawExtra(ctx, camX, t, 'front');
    },
  };
}

// ---------- piezas reutilizables ----------
function pxCloud(c, x, y, s, light, shadow) {
  c.fillStyle = shadow;
  pxEllipse(c, x, y + 2, 14 * s, 5 * s);
  c.fillStyle = light;
  pxDisc(c, x - 7 * s, y, 6 * s);
  pxDisc(c, x + 1 * s, y - 3 * s, 8 * s);
  pxDisc(c, x + 9 * s, y, 5 * s);
  c.fillRect(x - 13 * s, y, 26 * s, 3 * s);
}

function pxTree(c, x, base, h, r, cols) {
  c.fillStyle = cols.trunk;
  c.fillRect(x - 2, base - h, 5, h);
  c.fillStyle = shade(cols.trunk, -0.3);
  c.fillRect(x + 2, base - h, 1, h);
  const cy = base - h - r + 4;
  c.fillStyle = cols.dark;
  pxDisc(c, x + 2, cy + 3, r);
  pxDisc(c, x - r + 3, cy + 6, r - 3);
  pxDisc(c, x + r - 1, cy + 7, r - 4);
  c.fillStyle = cols.mid;
  pxDisc(c, x, cy, r - 1);
  pxDisc(c, x - r + 4, cy + 4, r - 5);
  pxDisc(c, x + r - 3, cy + 5, r - 6);
  c.fillStyle = cols.light;
  pxDisc(c, x - 3, cy - 3, Math.max(2, r - 7));
  pxDisc(c, x - r + 4, cy + 1, Math.max(1, r - 10));
}

function pxWindow(c, x, y, w, h, frame, skyTop, skyBot) {
  c.fillStyle = shade(frame, -0.35);
  c.fillRect(x - 2, y - 2, w + 4, h + 5);
  c.fillStyle = frame;
  c.fillRect(x - 2, y - 2, w + 4, h + 4);
  bandGradient(c, x, y, w, h, skyTop, skyBot, 6);
  // nubecita
  c.fillStyle = 'rgba(255,255,255,0.8)';
  c.fillRect(x + 4, y + 6, 9, 2); c.fillRect(x + 6, y + 5, 5, 1);
  c.fillStyle = frame;
  c.fillRect(x + Math.floor(w / 2) - 1, y, 2, h);
  c.fillRect(x, y + Math.floor(h / 2) - 1, w, 2);
  // brillo del cristal
  c.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 6; i++) c.fillRect(x + 3 + i, y + h - 4 - i, 1, 1);
  // alféizar
  c.fillStyle = shade(frame, 0.2);
  c.fillRect(x - 4, y + h + 2, w + 8, 2);
}

function pxBlackboard(c, x, y, w, h, lines) {
  c.fillStyle = '#7a4a24'; c.fillRect(x - 3, y - 3, w + 6, h + 6);
  c.fillStyle = '#9a6234'; c.fillRect(x - 3, y - 3, w + 6, 1);
  bandGradient(c, x, y, w, h, '#2f6048', '#24483a', 4);
  c.fillStyle = 'rgba(255,255,255,0.06)';
  c.fillRect(x + 6, y + 4, w - 20, 2);
  let ly = y + 6;
  for (const l of lines) { drawPixelText(c, l, x + 6, ly, '#e8f2e4'); ly += 8; }
  // repisa con tizas
  c.fillStyle = '#6a3e1c'; c.fillRect(x - 4, y + h + 3, w + 8, 2);
  c.fillStyle = '#ffffff'; c.fillRect(x + 8, y + h + 2, 3, 1);
  c.fillStyle = '#ffd860'; c.fillRect(x + 14, y + h + 2, 3, 1);
}

function pxClock(c, x, y) {
  c.fillStyle = '#3a3040'; pxDisc(c, x, y, 7);
  c.fillStyle = '#ffffff'; pxDisc(c, x, y, 6);
  c.fillStyle = '#3a3040';
  c.fillRect(x, y - 4, 1, 5); c.fillRect(x, y, 3, 1);
  c.fillRect(x - 5, y, 1, 1); c.fillRect(x + 5, y, 1, 1); c.fillRect(x, y - 5, 1, 1); c.fillRect(x, y + 5, 1, 1);
}

function pxDesk(c, x, base, top, legs) {
  // silla detrás
  c.fillStyle = shade(top, -0.25);
  c.fillRect(x + 26, base - 30, 12, 3);
  c.fillRect(x + 35, base - 30, 3, 30);
  c.fillRect(x + 26, base - 16, 12, 2);
  c.fillRect(x + 27, base - 14, 2, 14);
  // pupitre
  c.fillStyle = legs;
  c.fillRect(x + 2, base - 22, 2, 22); c.fillRect(x + 30, base - 22, 2, 22);
  c.fillStyle = top; c.fillRect(x, base - 24, 34, 4);
  c.fillStyle = shade(top, 0.25); c.fillRect(x, base - 24, 34, 1);
  c.fillStyle = shade(top, -0.3); c.fillRect(x, base - 20, 34, 1);
  c.fillStyle = shade(legs, -0.2); c.fillRect(x + 4, base - 19, 26, 6);
}

function pxShelf(c, x, base, w, h, wood, seed) {
  c.fillStyle = shade(wood, -0.3); c.fillRect(x, base - h, w, h);
  c.fillStyle = wood;
  c.fillRect(x, base - h, w, 2); c.fillRect(x, base - h, 2, h); c.fillRect(x + w - 2, base - h, 2, h);
  const cols = ['#c83030', '#3060c0', '#30a050', '#e0b030', '#8040a0', '#e07030', '#40a0b0', '#f0f0e0'];
  for (let sy = base - h + 2; sy < base - 4; sy += 13) {
    c.fillStyle = wood; c.fillRect(x, sy + 11, w, 2);
    let bx = x + 3;
    let i = 0;
    while (bx < x + w - 4) {
      const bw = 2 + Math.floor(hash2(seed + bx, sy) * 3);
      const bh = 7 + Math.floor(hash2(bx, seed + sy) * 4);
      if (bx + bw > x + w - 3) break;
      const col = cols[Math.floor(hash2(bx * 3, sy + seed) * cols.length)];
      c.fillStyle = col; c.fillRect(bx, sy + 11 - bh, bw, bh);
      c.fillStyle = shade(col, 0.3); c.fillRect(bx, sy + 11 - bh, 1, bh);
      bx += bw + (hash2(bx, sy) < 0.15 ? 3 : 0);
      i++;
    }
  }
}

function lightShaft(c, x, y, w, len, alpha) {
  c.fillStyle = `rgba(255,250,220,${alpha})`;
  c.beginPath();
  c.moveTo(x, y); c.lineTo(x + w, y);
  c.lineTo(x + w + len * 0.6, y + len); c.lineTo(x + len * 0.6, y + len);
  c.closePath(); c.fill();
}

function wainscot(c, W, y, h, col, rail) {
  c.fillStyle = col; c.fillRect(0, y, W, h);
  c.fillStyle = shade(col, -0.15);
  for (let x = 6; x < W; x += 32) c.fillRect(x, y + 6, 24, h - 10);
  c.fillStyle = shade(col, 0.1);
  for (let x = 6; x < W; x += 32) c.fillRect(x, y + 6, 24, 1);
  c.fillStyle = rail; c.fillRect(0, y - 2, W, 3);
  c.fillStyle = shade(rail, 0.3); c.fillRect(0, y - 2, W, 1);
}

function indoorSky(wallTop, wallBottom) {
  const [cv, c] = makeCanvas(VIEW_W, VIEW_H);
  bandGradient(c, 0, 0, VIEW_W, VIEW_H, wallTop, wallBottom, 10);
  return cv;
}

// Capa de primer plano (abajo del todo, sobre el suelo, desenfocada y oscura).
function buildForeground(kind) {
  const W = 640;
  const [cv, c] = makeCanvas(W, VIEW_H);
  if (kind === 'grass') {
    for (let x = 0; x < W; x += 3) {
      const h = 8 + Math.floor(hash2(x, 41) * 22);
      const lean = hash2(x, 42) < 0.5 ? -1 : 1;
      c.fillStyle = hash2(x, 43) < 0.5 ? 'rgba(20,60,30,0.92)' : 'rgba(30,80,40,0.92)';
      for (let i = 0; i < h; i++) c.fillRect(x + Math.round(lean * i * i / 60), VIEW_H - i, 2, 1);
    }
    for (let k = 0; k < 7; k++) {
      const x = Math.floor(hash2(k, 44) * W);
      const y = VIEW_H - 14 - Math.floor(hash2(k, 45) * 10);
      c.fillStyle = ['#ff8090', '#ffe060', '#ffffff'][k % 3];
      pxDisc(c, x, y, 2);
      c.fillStyle = '#ffd040'; c.fillRect(x, y, 1, 1);
    }
    for (const x of [90, 330, 520]) {
      c.fillStyle = 'rgba(18,50,26,0.95)';
      pxDisc(c, x, VIEW_H + 4, 22); pxDisc(c, x + 20, VIEW_H + 8, 18); pxDisc(c, x - 18, VIEW_H + 10, 16);
    }
  } else {
    const col = kind === 'dark' ? 'rgba(8,6,20,0.92)' : 'rgba(40,24,30,0.88)';
    c.fillStyle = col;
    // patas de sillas y mesas, mochilas, montones de libros
    for (const x of [40, 250, 470]) {
      c.fillRect(x, 200, 4, 40); c.fillRect(x + 30, 200, 4, 40); c.fillRect(x - 4, 196, 42, 5);
    }
    for (const x of [150, 380, 590]) {
      pxEllipse(c, x, 228, 13, 16);
      c.fillRect(x - 6, 208, 12, 3);
    }
    for (const x of [320, 560]) {
      for (let i = 0; i < 4; i++) c.fillRect(x - 10 + (i % 2) * 2, 232 - i * 5, 22, 4);
    }
  }
  return { cv, f: 1.35 };
}

// ---------- TEMAS ----------
const BACKDROP_BUILDERS = {
  // ===== Patio del cole =====
  patio() {
    const [sky, s] = makeCanvas(VIEW_W, VIEW_H);
    bandGradient(s, 0, 0, VIEW_W, 180, '#3c8ff0', '#c6ecff', 14);
    s.fillStyle = '#c6ecff'; s.fillRect(0, 180, VIEW_W, 60);
    // sol con halo
    s.fillStyle = 'rgba(255,250,200,0.25)'; pxDisc(s, 208, 36, 20);
    s.fillStyle = 'rgba(255,250,200,0.35)'; pxDisc(s, 208, 36, 15);
    s.fillStyle = '#fff6c0'; pxDisc(s, 208, 36, 11);
    s.fillStyle = '#ffe680'; pxDisc(s, 209, 37, 8);

    const W = 512;
    const [clouds, cc] = makeCanvas(W, 90);
    for (const [x, y, sc] of [[40, 30, 1], [150, 18, 1.4], [270, 40, 1], [360, 22, 1.2], [460, 46, 0.8]]) {
      wrap(W, x, (xx) => pxCloud(cc, xx, y, sc, '#ffffff', '#d4e8f8'));
    }

    const [hills, hc] = makeCanvas(W, VIEW_H);
    for (let x = 0; x < W; x++) {
      const a = Math.PI * 2 * x / W;
      const yb = 128 + Math.sin(a * 2) * 10 + Math.sin(a * 5 + 1) * 5;
      hc.fillStyle = '#a8d4d8'; hc.fillRect(x, Math.round(yb), 1, VIEW_H);
      hc.fillStyle = '#c0e2e4'; hc.fillRect(x, Math.round(yb), 1, 1);
      const yf = 148 + Math.sin(a * 3 + 2) * 8 + Math.sin(a * 7) * 3;
      hc.fillStyle = '#86c48c'; hc.fillRect(x, Math.round(yf), 1, VIEW_H);
      hc.fillStyle = '#a2d6a0'; hc.fillRect(x, Math.round(yf), 1, 1);
    }

    // el colegio
    const [school, sc] = makeCanvas(W, VIEW_H);
    const base = 178;
    const brick = '#e2906a', brickD = '#c87458', roof = '#b05048';
    // ala principal
    sc.fillStyle = brick; sc.fillRect(60, 92, 190, base - 92);
    sc.fillStyle = brickD;
    for (let y = 96; y < base; y += 4) for (let x = 60 + ((y / 4) % 2) * 4; x < 250; x += 8) sc.fillRect(x, y, 1, 1);
    sc.fillStyle = roof; sc.fillRect(56, 86, 198, 7);
    sc.fillStyle = shade(roof, 0.25); sc.fillRect(56, 86, 198, 1);
    // frontón con reloj
    sc.fillStyle = brick;
    for (let i = 0; i < 16; i++) sc.fillRect(155 - 30 + i * 2, 86 - i, 60 - i * 4, 1);
    sc.fillStyle = roof;
    for (let i = 0; i < 17; i++) { sc.fillRect(155 - 32 + i * 2, 86 - i, 2, 1); sc.fillRect(155 + 30 - i * 2, 86 - i, 2, 1); }
    pxClock(sc, 155, 76);
    // bandera en el tejado
    sc.fillStyle = '#7a7a80'; sc.fillRect(220, 56, 1, 30);
    sc.fillStyle = '#e04040'; sc.fillRect(221, 57, 10, 3);
    sc.fillStyle = '#f8d040'; sc.fillRect(221, 60, 10, 2);
    sc.fillStyle = '#e04040'; sc.fillRect(221, 62, 10, 2);
    // ventanas
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 7; col++) {
        const wx = 70 + col * 25, wy = 100 + row * 22;
        if (col === 3 && row === 2) continue;
        sc.fillStyle = '#fff4e8'; sc.fillRect(wx - 1, wy - 1, 14, 14);
        bandGradient(sc, wx, wy, 12, 12, '#a8d8f8', '#e0f4ff', 3);
        sc.fillStyle = '#fff4e8'; sc.fillRect(wx + 5, wy, 2, 12); sc.fillRect(wx, wy + 5, 12, 2);
        sc.fillStyle = shade(brick, -0.25); sc.fillRect(wx - 1, wy + 13, 14, 1);
      }
    }
    // puerta y cartel
    sc.fillStyle = '#7a4a2a'; sc.fillRect(145, 150, 20, base - 150);
    sc.fillStyle = '#9a6a3a'; sc.fillRect(147, 152, 7, base - 152); sc.fillRect(156, 152, 7, base - 152);
    sc.fillStyle = '#fff4d0'; sc.fillRect(134, 142, 42, 7);
    drawPixelText(sc, 'COLEGIO', 141, 143, '#a04030');
    // ala secundaria
    sc.fillStyle = mixColor(brick, '#c6ecff', 0.2); sc.fillRect(280, 124, 120, base - 124);
    sc.fillStyle = mixColor(roof, '#c6ecff', 0.2); sc.fillRect(276, 119, 128, 6);
    for (let col = 0; col < 5; col++) {
      const wx = 290 + col * 22;
      sc.fillStyle = '#f0f0f0'; sc.fillRect(wx - 1, 133, 14, 14);
      bandGradient(sc, wx, 134, 12, 12, '#b8e0f8', '#e8f8ff', 3);
    }
    // chopos
    for (const x of [30, 266, 430, 470]) {
      sc.fillStyle = '#5a9a6a'; pxEllipse(sc, x, base - 34, 7, 30);
      sc.fillStyle = '#78b480'; pxEllipse(sc, x - 2, base - 40, 4, 20);
      sc.fillStyle = '#6a4a38'; sc.fillRect(x, base - 6, 2, 6);
    }

    // valla + árboles cercanos
    const [mid, mc] = makeCanvas(W, VIEW_H);
    mc.fillStyle = '#5a8a6a';
    for (let x = 0; x < W; x++) {
      for (let y = 140; y < 178; y++) if ((x + y) % 5 === 0 || (x - y + 1000) % 5 === 0) mc.fillRect(x, y, 1, 1);
    }
    mc.fillStyle = '#3e6a52';
    mc.fillRect(0, 139, W, 2);
    for (let x = 0; x < W; x += 32) mc.fillRect(x, 136, 3, 42);
    for (const [x, h, r] of [[70, 40, 22], [250, 30, 18], [420, 46, 24]]) {
      wrap(W, x, (xx) => pxTree(mc, xx, 178, h, r, { trunk: '#7a4e2e', dark: '#2f8040', mid: '#44a34c', light: '#72c860' }));
    }
    for (let x = 0; x < W; x += 9) {
      const r = 5 + Math.floor(hash2(x, 3) * 5);
      mc.fillStyle = '#3a8a44'; pxDisc(mc, x, 178, r);
      mc.fillStyle = '#56a852'; pxDisc(mc, x - 1, 177, r - 2);
    }

    return makeBackdrop({
      sky,
      vignette: 0.22,
      layers: [
        { cv: clouds, f: 0.05, drift: 0.06 },
        { cv: hills, f: 0.12 },
        { cv: school, f: 0.28 },
        { cv: mid, f: 0.55 },
      ],
      fg: buildForeground('grass'),
    });
  },

  // ===== Clase de inglés (Julio) =====
  ingles() {
    const sky = indoorSky('#d8eef8', '#bcdcec');
    const W = 512;
    const [wall, c] = makeCanvas(W, VIEW_H);
    c.fillStyle = 'rgba(255,255,255,0.18)';
    for (let x = 0; x < W; x += 12) c.fillRect(x, 0, 4, 176);
    wainscot(c, W, 132, 46, '#5a8cbc', '#3c6a96');
    // guirnalda de banderitas Union Jack
    for (let x = 0; x < W; x++) {
      const y = 14 + Math.round(Math.abs(Math.sin((x / 64) * Math.PI)) * -6 + 6);
      c.fillStyle = '#6a5a50'; c.fillRect(x, y, 1, 1);
    }
    for (let x = 8; x < W; x += 32) {
      const y = 15 + Math.round(Math.abs(Math.sin((x / 64) * Math.PI)) * -6 + 6);
      const F = ['WBBWrWBBW', 'BWBWrWBWB', 'WWWWrWWWW', 'rrrrrrrrr', 'WWWWrWWWW', 'BWBWrWBWB', 'WBBWrWBBW'];
      const col = { W: '#ffffff', B: '#1c2c6c', r: '#d02030' };
      for (let r = 0; r < F.length; r++) for (let k = 0; k < 9; k++) { c.fillStyle = col[F[r][k]]; c.fillRect(x + k, y + r, 1, 1); }
    }
    pxBlackboard(c, 30, 46, 120, 62, ['HELLO!', 'MY NAME IS', 'LUCAS', '1 2 3 = ONE TWO']);
    pxWindow(c, 196, 40, 50, 64, '#ffffff', '#5ab0f0', '#c8ecff');
    lightShaft(c, 194, 106, 54, 60, 0.12);
    // bandera británica
    const fx = 290, fy = 50;
    c.fillStyle = '#1c2c6c'; c.fillRect(fx, fy, 40, 24);
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 24; i++) { c.fillRect(fx + Math.floor(i * 40 / 24) - 1, fy + i, 4, 1); c.fillRect(fx + 39 - Math.floor(i * 40 / 24) - 2, fy + i, 4, 1); }
    c.fillStyle = '#d02030';
    for (let i = 0; i < 24; i++) { c.fillRect(fx + Math.floor(i * 40 / 24), fy + i, 1, 1); c.fillRect(fx + 39 - Math.floor(i * 40 / 24), fy + i, 1, 1); }
    c.fillStyle = '#ffffff'; c.fillRect(fx + 16, fy, 8, 24); c.fillRect(fx, fy + 8, 40, 8);
    c.fillStyle = '#d02030'; c.fillRect(fx + 18, fy, 4, 24); c.fillRect(fx, fy + 10, 40, 4);
    // autobús de dos pisos (póster)
    c.fillStyle = '#fff8e8'; c.fillRect(350, 46, 52, 36);
    c.fillStyle = '#d02030'; c.fillRect(356, 54, 40, 20);
    c.fillStyle = '#a8d8f8';
    for (let i = 0; i < 4; i++) { c.fillRect(359 + i * 9, 56, 6, 5); c.fillRect(359 + i * 9, 65, 6, 5); }
    c.fillStyle = '#2a2230'; pxDisc(c, 364, 75, 3); pxDisc(c, 388, 75, 3);
    pxClock(c, 440, 40);
    // mapa
    c.fillStyle = '#7a4a24'; c.fillRect(420, 60, 70, 46);
    c.fillStyle = '#6ab0e0'; c.fillRect(422, 62, 66, 42);
    c.fillStyle = '#7cc070';
    pxEllipse(c, 440, 76, 9, 7); pxEllipse(c, 468, 72, 10, 6); pxEllipse(c, 462, 92, 6, 7); pxEllipse(c, 436, 94, 4, 5);
    const [mid, mc] = makeCanvas(W, VIEW_H);
    for (const x of [10, 140, 270, 400]) pxDesk(mc, x, 178, '#c08048', '#6a6a78');
    return makeBackdrop({ sky, vignette: 0.3, layers: [{ cv: wall, f: 0.3 }, { cv: mid, f: 0.6 }], fg: buildForeground('room') });
  },

  // ===== Clase de música (Mari Paz) =====
  musica() {
    const sky = indoorSky('#5a3c90', '#3e2a6a');
    const W = 512;
    const [wall, c] = makeCanvas(W, VIEW_H);
    c.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = 0; x < W; x += 32) c.fillRect(x, 0, 16, 176);
    // pentagrama gigante pintado en la pared
    c.fillStyle = '#c8b0f0';
    for (let i = 0; i < 5; i++) c.fillRect(0, 36 + i * 5, W, 1);
    const notes = [[30, 3], [60, 1], [90, 4], [120, 2], [160, 0], [190, 3], [230, 2], [270, 4], [300, 1], [340, 3], [380, 0], [420, 2], [460, 4], [490, 1]];
    for (const [x, n] of notes) {
      const y = 36 + n * 5 - 1;
      c.fillStyle = '#ffe080'; pxEllipse(c, x, y + 1, 3, 2);
      c.fillRect(x + 3, y - 12, 1, 13);
      if (n % 2) c.fillRect(x + 3, y - 12, 4, 2);
    }
    // carteles de instrumentos
    for (const [x, col] of [[60, '#f0a040'], [300, '#40c0e0']]) {
      c.fillStyle = '#fff8e8'; c.fillRect(x, 64, 34, 46);
      c.fillStyle = col; pxDisc(c, x + 17, 96, 8); pxDisc(c, x + 17, 84, 6);
      c.fillStyle = '#5a3418'; c.fillRect(x + 16, 68, 3, 18);
      c.fillStyle = '#2a1a10'; pxDisc(c, x + 17, 94, 2);
    }
    pxWindow(c, 170, 62, 44, 50, '#e8d8ff', '#ffb070', '#ffe0b0');
    lightShaft(c, 168, 114, 48, 50, 0.1);
    pxClock(c, 420, 74);
    wainscot(c, W, 136, 42, '#33224f', '#5a3e88');
    const [mid, mc] = makeCanvas(W, VIEW_H);
    // piano de pared
    mc.fillStyle = '#2a1810'; mc.fillRect(40, 128, 80, 50);
    mc.fillStyle = '#3e2618'; mc.fillRect(42, 130, 76, 20);
    mc.fillStyle = '#f4f0e8'; mc.fillRect(40, 150, 80, 7);
    mc.fillStyle = '#1c1228';
    for (let x = 42; x < 118; x += 5) { mc.fillRect(x, 150, 1, 7); if (x % 15 !== 2) mc.fillRect(x + 3, 150, 2, 4); }
    mc.fillStyle = '#2a1810'; mc.fillRect(46, 157, 4, 21); mc.fillRect(110, 157, 4, 21);
    // batería
    mc.fillStyle = '#c03040'; pxDisc(mc, 270, 160, 13);
    mc.fillStyle = '#f0e8e0'; pxDisc(mc, 270, 160, 9);
    mc.fillStyle = '#c03040'; pxDisc(mc, 270, 160, 2);
    mc.fillStyle = '#c03040'; mc.fillRect(246, 140, 14, 10); mc.fillRect(280, 140, 14, 10);
    mc.fillStyle = '#e0c040'; mc.fillRect(236, 128, 16, 2); mc.fillRect(292, 126, 16, 2);
    mc.fillStyle = '#8a8a90'; mc.fillRect(243, 130, 1, 48); mc.fillRect(299, 128, 1, 50);
    // xilófono
    const xcols = ['#e04040', '#f08030', '#f0d040', '#50c050', '#40a0e0', '#6060e0', '#a050d0'];
    for (let i = 0; i < 7; i++) {
      mc.fillStyle = xcols[i]; mc.fillRect(400 + i * 6, 150 + i, 5, 14 - i * 1.5);
    }
    mc.fillStyle = '#5a3418'; mc.fillRect(398, 162, 46, 3); mc.fillRect(402, 165, 2, 13); mc.fillRect(438, 165, 2, 13);
    return makeBackdrop({ sky, vignette: 0.38, layers: [{ cv: wall, f: 0.3 }, { cv: mid, f: 0.6 }], fg: buildForeground('room') });
  },

  // ===== Gimnasio (César) =====
  gym() {
    const sky = indoorSky('#f2e8cc', '#e0d0a8');
    const W = 512;
    const [wall, c] = makeCanvas(W, VIEW_H);
    // ventanas altas
    for (let x = 10; x < W; x += 64) {
      c.fillStyle = '#c0b090'; c.fillRect(x - 1, 21, 42, 18);
      bandGradient(c, x, 22, 40, 16, '#70c0f8', '#d0f0ff', 4);
      c.fillStyle = '#c0b090'; for (let k = 10; k < 40; k += 10) c.fillRect(x + k, 22, 1, 16);
      lightShaft(c, x, 38, 40, 90, 0.08);
    }
    // banderines
    const pcols = ['#e04040', '#40a0e0', '#f0c030', '#50c050'];
    for (let x = 0; x < W; x += 10) {
      const y = 52 + Math.round(Math.sin(x / W * Math.PI * 8) * 3);
      c.fillStyle = '#8a7a60'; c.fillRect(x, y, 10, 1);
      c.fillStyle = pcols[(x / 10) % 4];
      for (let i = 0; i < 5; i++) c.fillRect(x + 1 + i, y + 1 + i, 9 - i * 2, 1);
    }
    // canasta
    c.fillStyle = '#ffffff'; c.fillRect(300, 62, 40, 26);
    c.fillStyle = '#d04030'; c.fillRect(300, 62, 40, 1); c.fillRect(300, 87, 40, 1); c.fillRect(300, 62, 1, 26); c.fillRect(339, 62, 1, 26);
    c.fillRect(312, 72, 16, 1); c.fillRect(312, 72, 1, 10); c.fillRect(327, 72, 1, 10);
    c.fillStyle = '#f07020'; c.fillRect(310, 88, 20, 2);
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) { c.fillRect(311 + i * 4, 90, 1, 9 - Math.abs(2 - i)); }
    c.fillRect(312, 94, 16, 1);
    // espalderas
    c.fillStyle = '#e4cfa0'; c.fillRect(0, 100, W, 78);
    for (let x = 4; x < W; x += 36) {
      if (x > 280 && x < 360) continue;
      c.fillStyle = '#a86a34'; c.fillRect(x, 100, 3, 78); c.fillRect(x + 28, 100, 3, 78);
      c.fillStyle = '#c88a4e';
      for (let y = 104; y < 176; y += 7) { c.fillRect(x + 3, y, 25, 2); }
      c.fillStyle = '#e8b070'; c.fillRect(x, 100, 1, 78);
    }
    const [mid, mc] = makeCanvas(W, VIEW_H);
    // plinto
    const layersC = ['#b87a40', '#a86a34', '#b87a40', '#a86a34'];
    for (let i = 0; i < 4; i++) {
      mc.fillStyle = layersC[i]; mc.fillRect(60 - i * 2, 146 + i * 8, 44 + i * 4, 8);
      mc.fillStyle = shade(layersC[i], 0.2); mc.fillRect(60 - i * 2, 146 + i * 8, 44 + i * 4, 1);
    }
    mc.fillStyle = '#f0e8d8'; mc.fillRect(60, 142, 44, 5);
    // conos
    for (const x of [180, 200, 220]) {
      for (let i = 0; i < 12; i++) { mc.fillStyle = i % 5 === 2 ? '#ffffff' : '#f07020'; mc.fillRect(x - Math.floor(i / 2), 166 + i, 1 + Math.floor(i / 2) * 2, 1); }
    }
    // carro de balones
    mc.fillStyle = '#7a7a88'; mc.fillRect(400, 150, 50, 2); mc.fillRect(400, 150, 2, 28); mc.fillRect(448, 150, 2, 28); mc.fillRect(400, 176, 50, 2);
    for (const [x, y, col] of [[410, 168, '#f07020'], [424, 168, '#ffffff'], [438, 168, '#3070e0'], [417, 158, '#e0c030'], [431, 158, '#f07020']]) {
      mc.fillStyle = col; pxDisc(mc, x, y, 6);
      mc.fillStyle = shade(col, -0.3); mc.fillRect(x - 6, y, 13, 1);
    }
    return makeBackdrop({ sky, vignette: 0.25, layers: [{ cv: wall, f: 0.3 }, { cv: mid, f: 0.6 }], fg: buildForeground('room') });
  },

  // ===== Clase de Lucre =====
  aula() {
    const sky = indoorSky('#f6e4bc', '#e8cf9c');
    const W = 512;
    const [wall, c] = makeCanvas(W, VIEW_H);
    c.fillStyle = 'rgba(160,110,60,0.08)';
    for (let y = 8; y < 176; y += 16) c.fillRect(0, y, W, 1);
    pxBlackboard(c, 40, 44, 130, 62, ['LUCRE', '5 x 3 = 15', 'CLETO 10']);
    pxClock(c, 210, 40);
    // corcho
    c.fillStyle = '#8a5a2a'; c.fillRect(196, 60, 60, 44);
    c.fillStyle = '#c89a5a'; c.fillRect(198, 62, 56, 40);
    const papers = [[202, 66, '#ffffff'], [222, 70, '#fff080'], [238, 64, '#a0e0ff'], [206, 84, '#ffb0c0'], [230, 86, '#ffffff']];
    for (const [x, y, col] of papers) {
      c.fillStyle = col; c.fillRect(x, y, 14, 12);
      c.fillStyle = '#e04040'; c.fillRect(x + 6, y + 1, 2, 2);
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x + 2, y + 5, 9, 1); c.fillRect(x + 2, y + 8, 7, 1);
    }
    pxWindow(c, 300, 42, 50, 66, '#fff8e8', '#60b4f0', '#d0f0ff');
    lightShaft(c, 298, 110, 54, 58, 0.12);
    pxShelf(c, 400, 176, 70, 64, '#9a6234', 7);
    wainscot(c, W, 136, 42, '#b07a44', '#7a4a24');
    const [mid, mc] = makeCanvas(W, VIEW_H);
    for (const x of [20, 150, 280, 410]) pxDesk(mc, x, 178, '#d09858', '#4a7a5a');
    return makeBackdrop({ sky, vignette: 0.3, layers: [{ cv: wall, f: 0.3 }, { cv: mid, f: 0.6 }], fg: buildForeground('room') });
  },

  // ===== Despacho del director (Emilio) — de noche =====
  direccion() {
    const sky = indoorSky('#26264a', '#1a1a34');
    const W = 512;
    const [wall, c] = makeCanvas(W, VIEW_H);
    c.fillStyle = 'rgba(255,255,255,0.03)';
    for (let x = 0; x < W; x += 24) c.fillRect(x, 0, 12, 176);
    // ventanal nocturno
    const wx = 50, wy = 30, ww = 120, wh = 86;
    c.fillStyle = '#4a2c1c'; c.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
    bandGradient(c, wx, wy, ww, wh, '#0a0c28', '#2e3a78', 8);
    c.fillStyle = '#fffbe0'; pxDisc(c, wx + 90, wy + 18, 9);
    c.fillStyle = '#e8e0b0'; pxDisc(c, wx + 93, wy + 16, 2); pxDisc(c, wx + 87, wy + 22, 1);
    for (let i = 0; i < 30; i++) { c.fillStyle = hash2(i, 9) < 0.5 ? '#ffffff' : '#aab0ff'; c.fillRect(wx + Math.floor(hash2(i, 1) * ww), wy + Math.floor(hash2(i, 2) * 50), 1, 1); }
    for (let x = wx; x < wx + ww; x += 8) {
      const h = 14 + Math.floor(hash2(x, 5) * 26);
      c.fillStyle = '#141a3a'; c.fillRect(x, wy + wh - h, 8, h);
      c.fillStyle = '#ffd860';
      for (let yy = wy + wh - h + 3; yy < wy + wh - 2; yy += 4) for (let xx = x + 1; xx < x + 7; xx += 3) if (hash2(xx, yy) < 0.4) c.fillRect(xx, yy, 1, 2);
    }
    c.fillStyle = '#4a2c1c'; c.fillRect(wx + ww / 2 - 2, wy, 4, wh); c.fillRect(wx, wy + wh / 2 - 2, ww, 4);
    lightShaft(c, wx, wy + wh, ww, 50, 0.05);
    // cuadros de antiguos directores
    for (const x of [210, 260]) {
      c.fillStyle = '#c89a30'; c.fillRect(x, 50, 34, 42);
      c.fillStyle = '#ecc860'; c.fillRect(x, 50, 34, 1); c.fillRect(x, 50, 1, 42);
      c.fillStyle = '#3a2a2a'; c.fillRect(x + 3, 53, 28, 36);
      c.fillStyle = '#a07858'; pxDisc(c, x + 17, 66, 6);
      c.fillStyle = '#1a1a24'; c.fillRect(x + 7, 76, 20, 13);
    }
    pxShelf(c, 330, 176, 110, 130, '#5a3420', 3);
    pxShelf(c, 450, 176, 50, 100, '#5a3420', 11);
    wainscot(c, W, 132, 46, '#4a2c1c', '#6a4228');
    const [mid, mc] = makeCanvas(W, VIEW_H);
    // gran escritorio con lámpara
    mc.fillStyle = '#3a2214'; mc.fillRect(60, 146, 90, 32);
    mc.fillStyle = '#5a3a20'; mc.fillRect(56, 142, 98, 5);
    mc.fillStyle = '#7a5030'; mc.fillRect(56, 142, 98, 1);
    mc.fillStyle = '#4a2c1a'; mc.fillRect(66, 152, 30, 22); mc.fillRect(114, 152, 30, 22);
    mc.fillStyle = '#c8a040'; mc.fillRect(80, 162, 3, 1); mc.fillRect(128, 162, 3, 1);
    mc.fillStyle = '#c8a040'; mc.fillRect(128, 128, 1, 14); mc.fillRect(124, 141, 9, 1);
    mc.fillStyle = '#2a8a50'; mc.fillRect(120, 124, 16, 5); mc.fillStyle = '#3aaa60'; mc.fillRect(120, 124, 16, 1);
    // planta
    mc.fillStyle = '#8a4a2a'; mc.fillRect(300, 164, 14, 14);
    mc.fillStyle = '#2a7040';
    for (let i = 0; i < 7; i++) pxEllipse(mc, 300 + i * 2, 156 - (i % 3) * 5, 3, 7);
    // globo terráqueo
    mc.fillStyle = '#c8a040'; mc.fillRect(452, 160, 2, 16); mc.fillRect(446, 176, 14, 2);
    mc.fillStyle = '#3070c0'; pxDisc(mc, 453, 152, 9);
    mc.fillStyle = '#50b060'; pxEllipse(mc, 450, 150, 4, 3); pxEllipse(mc, 457, 156, 3, 3);
    return makeBackdrop({
      sky, vignette: 0.55,
      layers: [{ cv: wall, f: 0.3 }, { cv: mid, f: 0.6 }],
      fg: buildForeground('dark'),
      drawExtra(ctx, camX, t, phase) {
        if (phase !== 'front') return;
        // halo cálido de la lámpara (se mueve con la capa media)
        let x = 128 - ((camX * 0.6) % 512);
        if (x < -60) x += 512;
        const g = ctx.createRadialGradient(x, 132, 2, x, 132, 46);
        g.addColorStop(0, 'rgba(255,220,140,0.30)');
        g.addColorStop(1, 'rgba(255,220,140,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 46, 86, 92, 92);
      },
    });
  },

  // ===== Nivel bonus: fiesta nocturna en el patio =====
  bonus() {
    const [sky, s] = makeCanvas(VIEW_W, VIEW_H);
    bandGradient(s, 0, 0, VIEW_W, VIEW_H, '#140c40', '#6a3aa8', 14);
    s.fillStyle = '#fff6d0'; pxDisc(s, 40, 40, 12);
    s.fillStyle = '#e8d8a0'; pxDisc(s, 36, 36, 2); pxDisc(s, 45, 44, 3);
    const W = 512;
    const [hills, hc] = makeCanvas(W, VIEW_H);
    for (let x = 0; x < W; x++) {
      const a = Math.PI * 2 * x / W;
      const y = 140 + Math.sin(a * 3) * 10 + Math.sin(a * 7 + 1) * 4;
      hc.fillStyle = '#2a1a5a'; hc.fillRect(x, Math.round(y), 1, VIEW_H);
    }
    for (const x of [60, 200, 330, 450]) {
      hc.fillStyle = '#1e1446'; pxDisc(hc, x, 140, 16); hc.fillRect(x - 1, 140, 3, 40);
    }
    return makeBackdrop({
      sky, vignette: 0.35,
      layers: [{ cv: hills, f: 0.2 }],
      drawExtra(ctx, camX, t, phase) {
        if (phase === 'back') {
          for (let i = 0; i < 50; i++) {
            const tw = Math.sin(t * 0.05 + i * 1.7) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(255,255,255,${0.3 + tw * 0.7})`;
            ctx.fillRect(Math.floor(hash2(i, 7) * VIEW_W), Math.floor(hash2(i, 8) * 130), 1, 1);
          }
          return;
        }
        // guirnalda de bombillas de colores
        const cols = ['#ff5060', '#ffd040', '#50e070', '#50b0ff', '#ff80e0'];
        for (let row = 0; row < 2; row++) {
          const y0 = 30 + row * 34;
          for (let x = -4; x < VIEW_W + 8; x += 2) {
            const y = y0 + Math.round(Math.sin((x / VIEW_W) * Math.PI) * 14);
            ctx.fillStyle = '#2a2050'; ctx.fillRect(x, y, 2, 1);
          }
          for (let k = 0; k < 13; k++) {
            const x = 6 + k * 20 + row * 10;
            const y = y0 + Math.round(Math.sin((x / VIEW_W) * Math.PI) * 14) + 2;
            const on = Math.sin(t * 0.08 + k + row * 2) > -0.3;
            const col = cols[(k + row) % cols.length];
            if (on) { ctx.fillStyle = col + '40'; ctx.beginPath(); ctx.arc(x + 1, y + 2, 5, 0, Math.PI * 2); ctx.fill(); }
            ctx.fillStyle = on ? col : shade(col, -0.5);
            ctx.fillRect(x, y, 3, 4);
          }
        }
      },
    });
  },
};
