// =============================================================
// GENERADOR DE PERSONAJES — pixel art a doble resolución
// =============================================================
//
// En lugar de dibujar cada personaje a mano en una rejilla de 16x16,
// los "montamos" como muñecos recortables: cabeza, pelo, ojos, torso,
// brazos y piernas. Cada parte se rasteriza en una rejilla del DOBLE de
// resolución (32x32 para un niño) y con su propio contorno, así que las
// piezas que se solapan (un brazo delante del cuerpo, una pierna delante
// de la otra) se distinguen bien.
//
// Como el muñeco tiene "huesos", cada fotograma de animación es sólo una
// pose distinta: andar, saltar, caer, resbalar, culetazo...
//
// Las rejillas resultantes son arrays de strings como los de siempre
// (mismos colores de la PALETA), pero marcadas como "hi-res": cada
// carácter mide medio píxel lógico. sprites.js se encarga de dibujarlas.

// Rejillas hi-res (cada carácter = medio píxel lógico).
const HIRES_GRIDS = new Set();

class PixLayer {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.d = [];
    for (let y = 0; y < h; y++) this.d.push(new Array(w).fill('.'));
  }
  get(x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? '.' : this.d[y][x]; }
  set(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y][x] = c;
  }
  rows() { return this.d.map(r => r.join('')); }
}

// Una "parte" del muñeco: conjunto de píxeles con color.
class Part {
  constructor(w, h) { this.w = w; this.h = h; this.px = new Map(); }
  set(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    if (c === null) this.px.delete(y * this.w + x);
    else this.px.set(y * this.w + x, c);
  }
  has(x, y) { return this.px.has(y * this.w + x); }
  // Elipse rellena (centros de píxel dentro). fn(x,y) -> color | null
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) {
      for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) {
          const col = typeof c === 'function' ? c(x, y) : c;
          if (col) this.set(x, y, col);
        }
      }
    }
    return this;
  }
  rect(x0, y0, w, h, c) {
    for (let y = Math.floor(y0); y < y0 + h; y++)
      for (let x = Math.floor(x0); x < x0 + w; x++) this.set(x, y, typeof c === 'function' ? c(x, y) : c);
    return this;
  }
  // "Salchicha": todos los píxeles a distancia <= r del segmento.
  // c puede ser función de t (0 en el inicio, 1 al final).
  capsule(x0, y0, x1, y1, r, c) {
    const dx = x1 - x0, dy = y1 - y0;
    const L2 = dx * dx + dy * dy || 1;
    for (let y = Math.floor(Math.min(y0, y1) - r - 1); y <= Math.max(y0, y1) + r + 1; y++) {
      for (let x = Math.floor(Math.min(x0, x1) - r - 1); x <= Math.max(x0, x1) + r + 1; x++) {
        const px = x + 0.5, py = y + 0.5;
        let t = ((px - x0) * dx + (py - y0) * dy) / L2;
        t = Math.max(0, Math.min(1, t));
        const qx = x0 + dx * t - px, qy = y0 + dy * t - py;
        if (qx * qx + qy * qy <= r * r) this.set(x, y, typeof c === 'function' ? c(t) : c);
      }
    }
    return this;
  }
}

// Pega una parte en la capa. Con outline, los píxeles vecinos que ya
// estaban pintados (lo que queda detrás) se convierten en línea oscura,
// así la parte se "despega" de lo que tiene detrás.
function stampPart(layer, part, outline = true) {
  if (outline) {
    for (const key of part.px.keys()) {
      const x = key % part.w, y = (key / part.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (part.has(nx, ny)) continue;
        if (layer.get(nx, ny) !== '.') layer.set(nx, ny, 'K');
      }
    }
  }
  for (const [key, c] of part.px) layer.set(key % part.w, (key / part.w) | 0, c);
}

// -------------------------------------------------------------
// Proporciones de cada tipo de cuerpo (en píxeles hi-res, mirando
// a la derecha).
// -------------------------------------------------------------
function bodyGeom(kind, tall) {
  if (kind === 'toddler') {
    return {
      W: 24, H: 24,
      head: { cx: 12, cy: 8, rx: 7.2, ry: 6.8 },
      eye: { w: 2, h: 3, y: 8, near: 11, far: 15 }, mouthY: 12,
      torso: { x0: 8, x1: 15, top: 14.5, bottom: 20 },
      hipY: 19.5, hips: [10.5, 13.5], footY: 22.6, legR: 1.6, kL: 0.45,
      shoulders: [8.5, 15], shoulderY: 15.5, armLen: 4, armR: 1.3, kA: 0.75, handR: 1.4,
      shoe: { rx: 2.2, ry: 1.4 },
      headRows: 7,
    };
  }
  if (kind === 'adult') {
    return {
      W: 32, H: 44,
      head: { cx: 16, cy: 8, rx: 6.6, ry: 7 },
      eye: { w: 2, h: 3, y: 7, near: 15, far: 19 }, mouthY: 12,
      torso: { x0: 10, x1: 21, top: 15, bottom: 28 },
      hipY: 28, hips: [12.5, 18], footY: 42, legR: 2, kL: 2.4,
      shoulders: [10.5, 20.5], shoulderY: 17, armLen: 10, armR: 1.6, kA: 1.6, handR: 1.6,
      shoe: { rx: 3, ry: 1.6 },
      headRows: 8, adult: true,
    };
  }
  if (kind === 'boss') {
    return {
      W: 48, H: 60,
      head: { cx: 24, cy: 11, rx: 9.5, ry: 10 },
      eye: { w: 3, h: 4, y: 10, near: 22, far: 28 }, mouthY: 17,
      torso: { x0: 15, x1: 32, top: 21, bottom: 39 },
      hipY: 38.5, hips: [19, 27.5], footY: 57.5, legR: 3, kL: 3.3,
      shoulders: [16, 31], shoulderY: 24, armLen: 13, armR: 2.4, kA: 2.2, handR: 2.4,
      shoe: { rx: 4.4, ry: 2.2 },
      headRows: 11, adult: true,
    };
  }
  // niño/a (32x32, Cleto un pelín más alto)
  const t = tall ? 2 : 0;
  return {
    W: 32, H: 32 + t,
    head: { cx: 16, cy: 9.5, rx: 8.2, ry: 7.8 },
    eye: { w: 2, h: 4, y: 9, near: 14, far: 19 }, mouthY: 14,
    torso: { x0: 11, x1: 20, top: 17, bottom: 24 + t },
    hipY: 24.5 + t, hips: [13.5, 17.5], footY: 29.9 + t, legR: 1.75, kL: 1,
    shoulders: [11.5, 19.5], shoulderY: 18.6, armLen: 5, armR: 1.5, kA: 1, handR: 1.6,
    shoe: { rx: 2.7, ry: 1.6 },
    headRows: 9,
  };
}

// -------------------------------------------------------------
// Poses. Pies: desplazamiento respecto a la cadera (x) y al suelo (y).
// Manos: desplazamiento respecto al hombro. En unidades "de niño";
// se escalan con kL / kA para otros cuerpos.
// -------------------------------------------------------------
const POSES = {
  idle:  { feet: [[-0.5, 0], [1, 0]], hands: [[-1.4, 4.8], [1.4, 4.8]], eyes: 'open', mouth: 'smile' },
  blink: { feet: [[-0.5, 0], [1, 0]], hands: [[-1.4, 4.8], [1.4, 4.8]], eyes: 'closed', mouth: 'smile' },
  walk0: { feet: [[-3, 0], [3.2, 0]], hands: [[4.2, 3.4], [-4.2, 3.4]], eyes: 'open', mouth: 'smile', bob: 0 },
  walk1: { feet: [[1, -1.6], [-0.8, 0]], hands: [[1.5, 4.8], [-1.5, 4.8]], eyes: 'open', mouth: 'smile', bob: -1 },
  walk2: { feet: [[3.2, 0], [-3, 0]], hands: [[-4.2, 3.4], [4.2, 3.4]], eyes: 'open', mouth: 'smile', bob: 0 },
  walk3: { feet: [[-0.8, 0], [1, -1.6]], hands: [[-1.5, 4.8], [1.5, 4.8]], eyes: 'open', mouth: 'smile', bob: -1 },
  jump:  { feet: [[-1.5, 0.3], [2.8, -3.4]], hands: [[-3.4, 1.5], [3, -4.5]], eyes: 'open', mouth: 'open' },
  fall:  { feet: [[-2.8, -0.6], [2.8, -1.4]], hands: [[-4.2, -3], [4.2, -3.2]], eyes: 'open', mouth: 'O' },
  hurt:  { feet: [[-2, 0], [2, 0]], hands: [[-4.5, 0.5], [4.5, 0.5]], eyes: 'hurt', mouth: 'open' },
  // ¡resbalón! brazos como aspas, una pierna por los aires
  slip0: { feet: [[-1, 0], [5, -5]], hands: [[-5, -3], [4.5, -5]], eyes: 'wide', mouth: 'O' },
  slip1: { feet: [[0, 0], [5.5, -3.6]], hands: [[-2.5, -6], [1.5, -6]], eyes: 'wide', mouth: 'O' },
  // culetazo: sentado en el suelo, mareado
  sit:   { feet: [[4.5, 0], [7, -0.5]], hands: [[-3.5, 3], [3, 2]], eyes: 'dizzy', mouth: 'wavy', bodyDy: 4.2 },
};

// -------------------------------------------------------------
// Peinados. Devuelven partes { back, front } (back va detrás del cuerpo).
// -------------------------------------------------------------
function hairParts(spec, g, P, dy) {
  const { cx, rx, ry } = g.head;
  const cy = g.head.cy + dy;
  const c = spec.hair;
  const style = spec.hairStyle || 'short';
  const back = P(), front = P();
  const s = rx / 8.2; // escala del peinado
  // casquete base: un poco mayor que la cabeza, recortado por el flequillo
  const cap = (fringeFront, fringeBack, jag = true) => {
    front.ellipse(cx - 0.6 * s, cy - 0.9 * s, rx + 1.1 * s, ry + 0.4 * s, (x, y) => {
      const backSide = x + 0.5 < cx - 4.5 * s;
      let lim = backSide ? cy + fringeBack * ry : cy + fringeFront * ry;
      if (!backSide && jag && ((x * 7) % 3 === 0)) lim += 1;
      return y + 0.5 < lim ? c : null;
    });
  };
  if (style === 'short') cap(-0.22, 0.3);
  else if (style === 'spiky') {
    cap(-0.22, 0.3);
    const top = cy - ry - 0.4 * s;
    for (const [ox, h, lean] of [[-6, 3.5, -2.5], [-2.5, 4.5, -1.5], [1.5, 4, -0.5], [5, 2.8, 0.8]]) {
      const bx = cx + ox * s;
      front.capsule(bx, top + 2.5 * s, bx + lean * s, top - h * s + 2.5 * s, 1.2 * s, c);
    }
  } else if (style === 'curly') {
    cap(-0.18, 0.55, false);
    for (let a = Math.PI * 0.55; a < Math.PI * 2.05; a += 0.42) {
      const bx = cx - 0.6 * s + Math.cos(a) * (rx + 0.6 * s), by = cy - 1.2 * s + Math.sin(a) * (ry + 0.2 * s);
      if (by > cy + 0.55 * ry) continue;
      front.ellipse(bx, by, 1.9 * s, 1.9 * s, c);
    }
  } else if (style === 'long' || style === 'bangs') {
    cap(style === 'bangs' ? -0.05 : -0.25, 0.6);
    // melena por detrás, hasta los hombros
    back.ellipse(cx - 2.2 * s, cy + 0.5 * s, rx + 0.4 * s, ry + 0.6 * s, c);
    back.rect(cx - rx - 0.4 * s, cy, rx + 3 * s, ry + 4.5 * s, (x, y) => {
      const bot = cy + ry + 4.5 * s - (x > cx ? 2 : 0) - ((x % 2) ? 0 : 1);
      return y < bot ? c : null;
    });
  } else if (style === 'ponytail') {
    cap(-0.25, 0.45);
    back.ellipse(cx - rx - 1.3 * s, cy + 1.8 * s, 2.4 * s, 4.6 * s, c);
    back.ellipse(cx - rx + 0.4 * s, cy - 2.6 * s, 1.6 * s, 1.6 * s, 'r'); // goma
  } else if (style === 'pigtails') {
    cap(-0.25, 0.45);
    back.ellipse(cx - rx - 0.6 * s, cy + 2.8 * s, 2.2 * s, 3.6 * s, c);
    back.ellipse(cx + rx * 0.4, cy + ry * 0.7, 1.8 * s, 3 * s, c);
  } else if (style === 'bob') {
    cap(-0.25, 0.75);
    back.ellipse(cx - 1.5 * s, cy + 1.2 * s, rx + 1.1 * s, ry + 0.6 * s, (x, y) => (y < cy + ry * 0.85 ? c : null));
  } else if (style === 'bun') {
    cap(-0.35, 0.4, false);
    back.ellipse(cx - rx * 0.55, cy - ry * 0.95, 3.2 * s, 2.8 * s, c);
  } else if (style === 'bald') {
    // sólo una franja por detrás y encima de la oreja
    front.ellipse(cx - 0.6 * s, cy - 0.5 * s, rx + 0.9 * s, ry + 0.4 * s, (x, y) =>
      (x + 0.5 < cx - 2.5 * s && y + 0.5 > cy - 2.5 * s && y + 0.5 < cy + 3 * s) ? c : null);
  } else if (style === 'wavy') {
    cap(-0.2, 0.6, false);
    back.ellipse(cx - 1.5 * s, cy + 2 * s, rx + 1.2 * s, ry + 2.4 * s, (x, y) => {
      const bot = cy + ry + 1.5 * s + Math.sin(x * 1.3) * 1.2;
      return y < bot ? c : null;
    });
  }
  return { back, front };
}

// -------------------------------------------------------------
// Monta un fotograma.
// -------------------------------------------------------------
function buildCharFrame(spec, g, poseName) {
  const pose = POSES[poseName];
  const L = new PixLayer(g.W, g.H);
  const P = () => new Part(g.W, g.H);
  const skin = spec.skin || 's';
  const shoes = spec.shoes || 'm';
  const dy = (pose.bodyDy || 0) * (g.kL > 1 ? g.kL * 0.6 : g.kL) + (pose.bob ? 0 : 0);
  const hipY = g.hipY + dy;
  const groundFootY = g.footY;
  const ex = (spec.extra || {});

  const hand = (i) => {
    const [hx, hy] = pose.hands[i];
    return [g.shoulders[i] + hx * g.kA, g.shoulderY + dy + hy * g.kA];
  };
  const foot = (i) => {
    const [fx, fy] = pose.feet[i];
    return [g.hips[i] + fx * g.kL, groundFootY + fy * g.kL];
  };

  // --- piernas (pantalón, o piel con falda/pantalón corto) ---
  const legPart = (i) => {
    const p = P();
    const [fx, fy] = foot(i);
    const hx = g.hips[i];
    const bare = spec.skirt || spec.dress || spec.shorts;
    const bareFrom = spec.shorts ? 0.45 : (spec.skirt || spec.dress) ? 0.25 : 2;
    p.capsule(hx, hipY, fx, fy - g.shoe.ry * 0.6, g.legR, (t) => (bare && t > bareFrom) ? skin : spec.pants);
    if (spec.socks && bare) p.capsule(hx, hipY, fx, fy - g.shoe.ry * 0.6, g.legR, (t) => t > 0.8 ? 'W' : null);
    // zapato: punta hacia delante, suela plana
    p.ellipse(fx + g.shoe.rx * 0.35, fy, g.shoe.rx, g.shoe.ry, (x, y) => (y + 0.5 > g.H ? null : shoes));
    return p;
  };
  // --- brazos (manga + mano) ---
  const armPart = (i) => {
    const p = P();
    const sx = g.shoulders[i], sy = g.shoulderY + dy;
    const [hx, hy] = hand(i);
    const sleeve = spec.longSleeves ? 0.82 : 0.42;
    p.capsule(sx, sy, hx, hy, g.armR, (t) => t < sleeve ? (spec.sleeveColor || spec.shirt) : skin);
    p.ellipse(hx, hy, g.handR, g.handR, skin);
    return p;
  };

  // 1) pelo de atrás
  const hair = hairParts(spec, g, P, dy);
  stampPart(L, hair.back);
  // 2) brazo de atrás. En la vista 3/4 (girado hacia nosotros) el
  // hombro lejano es el del lado de la cara: ese queda detrás del cuerpo.
  stampPart(L, armPart(1));
  // 3) piernas (la cercana, la del lado de la nuca, va delante)
  stampPart(L, legPart(1));
  stampPart(L, legPart(0));
  // 4) cintura + torso
  const T = g.torso;
  const top = T.top + dy, bottom = T.bottom + dy;
  const torso = P();
  const w0 = T.x1 - T.x0 + 1;
  for (let y = Math.floor(top); y <= bottom; y++) {
    let a = T.x0, b = T.x1;
    if (y - top < 1) { a += 2; b -= 2; } else if (y - top < 2) { a += 1; b -= 1; } // hombros redondeados
    // perfil 3/4: la espalda un poco más recta y el pecho hacia delante
    const rel = (y - top) / Math.max(1, bottom - top);
    if (rel > 0.3) a += 1;
    if (rel > 0.15 && rel < 0.6) b += 1;
    for (let x = a; x <= b; x++) torso.set(x, y, spec.shirt);
  }
  if (spec.skirt || spec.dress) {
    const skirtTop = spec.dress ? top + (bottom - top) * 0.55 : bottom - 1;
    const len = (g.adult ? 11 : 4.5) * (g.W === 48 ? 1.4 : 1);
    const col = spec.dress ? spec.shirt : spec.pants;
    for (let y = Math.floor(skirtTop); y <= Math.min(bottom + len, g.H - 4); y++) {
      const flare = Math.max(0, (y - skirtTop)) * 0.35;
      for (let x = Math.round(T.x0 - flare); x <= Math.round(T.x1 + flare); x++) torso.set(x, y, col);
    }
  } else {
    // cinturilla del pantalón
    for (let y = Math.floor(bottom - (g.adult ? 1 : 0)); y <= hipY + 0.5; y++)
      for (let x = T.x0; x <= T.x1; x++) torso.set(x, y, spec.pants);
  }
  if (ex.torso) ex.torso(torso, { g, top, bottom, dy, w0 });
  stampPart(L, torso);
  if (ex.torsoOver) { const p = P(); ex.torsoOver(p, { g, top, bottom, dy }); stampPart(L, p, false); }

  // 5) cabeza (cara + oreja + nariz)
  const H = g.head;
  const hcy = H.cy + dy;
  const head = P();
  head.ellipse(H.cx, hcy, H.rx, H.ry, skin);
  // mandíbula un pelín más ancha delante (perfil 3/4)
  head.ellipse(H.cx + H.rx * 0.12, hcy + H.ry * 0.3, H.rx * 0.88, H.ry * 0.66, skin);
  if (g.adult) head.set(H.cx + H.rx + 0.2, hcy + 1, skin); // nariz
  stampPart(L, head);
  // 6) pelo de delante
  stampPart(L, hair.front, false);
  // oreja
  const ear = P();
  const earX = H.cx - H.rx * 0.62, earY = hcy + H.ry * 0.2;
  if (spec.hairStyle !== 'long' && spec.hairStyle !== 'bangs' && spec.hairStyle !== 'wavy' && spec.hairStyle !== 'bob') {
    ear.ellipse(earX, earY, 1.5 * (H.rx / 8), 1.9 * (H.ry / 7.8), skin);
    stampPart(L, ear, false);
    L.set(earX + 0.5, earY, 'S');
  }

  // 7) cara
  const E = g.eye;
  const ey = E.y + dy;
  const eyes = pose.eyes === 'open' && spec.alwaysSmile ? 'happy' : pose.eyes;
  const drawEye = (x0, w) => {
    const h = E.h;
    if (eyes === 'closed') {
      for (let i = -1; i < w; i++) L.set(x0 + i, ey + h - 2, 'e');
    } else if (eyes === 'happy') {
      for (let i = 0; i < w; i++) L.set(x0 + i, ey + 1, 'e');
      L.set(x0 - 1, ey + 2, 'e'); L.set(x0 + w, ey + 2, 'e');
    } else if (eyes === 'hurt') {
      // > <
      for (let i = 0; i < h; i++) L.set(x0 + (i < h / 2 ? i * 0.7 : (h - 1 - i) * 0.7), ey + i, 'e');
    } else if (eyes === 'dizzy') {
      for (let i = 0; i < w + 1; i++) { L.set(x0 + i - 0.5, ey + i, 'e'); L.set(x0 + w - i - 0.5, ey + i, 'e'); }
    } else if (eyes === 'wide') {
      for (let yy = -1; yy < h + 1; yy++) for (let xx = 0; xx < w + 1; xx++) L.set(x0 + xx - 0.5, ey + yy, 'W');
      L.set(x0 + w * 0.5, ey + h * 0.4, 'e');
      L.set(x0 + w * 0.5, ey + h * 0.4 + 1, 'e');
    } else {
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) L.set(x0 + xx, ey + yy, spec.eyeColor || 'e');
      L.set(x0, ey, 'W');                       // brillo
      if (h >= 4) L.set(x0 + w - 1, ey + h - 1, spec.eyeShine || 'B');
    }
  };
  drawEye(E.near, E.w);
  drawEye(E.far, Math.max(1, E.w - (g.W === 48 ? 1 : 0)));
  // cejas (adultos, y siempre en enfado)
  if (g.adult || spec.brows) {
    const by = ey - 1.6;
    const bc = spec.browColor || (spec.hair === 'G' ? 'T' : spec.hair === 'H' ? 'm' : spec.hair);
    for (let i = -0.5; i < E.w + 0.5; i++) {
      L.set(E.near + i, by - (spec.angry ? (i > 0 ? 0 : -1) : 0), bc);
      L.set(E.far + i, by - (spec.angry ? (i > 0 ? -1 : 0) : 0), bc);
    }
  }
  // gafas
  if (spec.glasses) {
    const gw = E.w + 2, gh = E.h + 2;
    for (const ex0 of [E.near - 1, E.far - 1]) {
      for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
        const border = i === 0 || j === 0 || i === gw - 1 || j === gh - 1;
        L.set(ex0 + i, ey - 1 + j, border ? 'K' : 'W');
      }
      if (eyes === 'closed') for (let i = 1; i < gw - 1; i++) L.set(ex0 + i, ey + 1, 'e');
      else { L.set(ex0 + gw - 2, ey, 'e'); L.set(ex0 + gw - 2, ey + 1, 'e'); }
    }
    for (let x = E.near + E.w + 1; x < E.far - 1; x++) L.set(x, ey, 'K');
    for (let x = earX + 1; x < E.near - 1; x++) L.set(x, ey, 'K');
  }
  // coloretes
  if (!g.adult || spec.woman) {
    L.set(E.near - 1, ey + E.h + 0.5, 'p');
    L.set(E.near, ey + E.h + 0.5, 'p');
    L.set(E.far + E.w, ey + E.h + 0.5, 'p');
    if (g.W === 48) { L.set(E.near - 2, ey + E.h + 0.5, 'p'); L.set(E.near - 1, ey + E.h + 1.5, 'p'); }
  }
  // barba / bigote
  if (spec.beard) {
    const bp = P();
    bp.ellipse(H.cx + H.rx * 0.2, hcy + H.ry * 0.35, H.rx * 0.95, H.ry * 0.7, (x, y) =>
      (y + 0.5 > hcy + H.ry * 0.28 && x + 0.5 > H.cx - H.rx * 0.5 && head.has(x, y)) ? spec.hair : null);
    stampPart(L, bp, false);
  }
  // boca
  const my = g.mouthY + dy;
  const mx = Math.round((E.near + E.far + E.w) / 2 - 2);
  const M = spec.lipColor || 'R';
  const mouth = spec.mouth && pose.mouth === 'smile' ? spec.mouth : pose.mouth;
  if (mouth === 'smile') {
    L.set(mx, my, M); L.set(mx + 1, my + 1, M); L.set(mx + 2, my + 1, M); L.set(mx + 3, my, M);
  } else if (mouth === 'grin') {
    for (let i = 0; i < 4; i++) { L.set(mx + i, my, M); L.set(mx + i, my + 1, i > 0 && i < 3 ? M : '.'); }
    L.set(mx + 1, my, 'W'); L.set(mx + 2, my, 'W');
  } else if (mouth === 'flat') {
    for (let i = 0; i < 3; i++) L.set(mx + i + 0.5, my + 0.5, M);
  } else if (mouth === 'open') {
    for (let i = 0; i < 3; i++) { L.set(mx + i, my, M); L.set(mx + i, my + 1, M); }
    L.set(mx + 1, my + 1, 'r');
  } else if (mouth === 'O') {
    for (let yy = 0; yy < 3; yy++) for (let i = 0; i < 2; i++) L.set(mx + 1 + i, my - 0.5 + yy, M);
  } else if (mouth === 'wavy') {
    for (let i = 0; i < 4; i++) L.set(mx + i, my + (i % 2), M);
  }
  if (spec.mustache) for (let i = -1; i < 5; i++) L.set(mx + i, my - 1, spec.hair);
  if (ex.face) ex.face(L, { g, dy, mx, my, ey });

  // 8) brazo de delante (el cercano)
  stampPart(L, armPart(0));
  if (ex.front) ex.front(L, { g, dy, hand: hand(0) });

  return L.rows();
}

// Genera todos los fotogramas y los registra para animFrame().
function makeCharacter(spec) {
  const g = bodyGeom(spec.kind || 'kid', spec.tall);
  const make = (pose) => {
    const rows = buildCharFrame(spec, g, pose);
    HIRES_GRIDS.add(rows);
    SPRITE_HEAD_ROWS.set(rows, g.headRows);
    return rows;
  };
  // zancada: cuántos "fotogramas de paso" por píxel recorrido. Cuanto
  // más largas las piernas, más distancia por paso (y los pies no patinan).
  const STRIDE = { kid: 0.12, toddler: 0.2, adult: 0.085, boss: 0.07 };
  const set = {
    stride: STRIDE[spec.kind || 'kid'],
    idle: make('idle'),
    blink: make('blink'),
    walk: ['walk0', 'walk1', 'walk2', 'walk3'].map(make),
    jump: make('jump'),
    fall: make('fall'),
    hurt: make('hurt'),
    slip: [make('slip0'), make('slip1')],
    sit: make('sit'),
  };
  KID_ANIMS.set(set.idle, set);
  return set.idle;
}
