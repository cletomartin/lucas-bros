// Utilidades de render compartidas por todo el juego.
//
// El juego "piensa" en una pantalla lógica de 256x240 (como la NES),
// pero el canvas real es RENDER_SCALE veces más grande. Así los sprites
// siguen siendo pixel-art, pero el texto sale nítido y el movimiento es
// más suave (podemos dibujar en cuartos de píxel).

const VIEW_W = 256;
const VIEW_H = 240;
const RENDER_SCALE = 4;
const FONT_FAMILY = '"Fredoka", "Trebuchet MS", "Segoe UI", Verdana, sans-serif';

function setFont(ctx, size, weight = 700) {
  ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
}

// Texto con contorno (se lee bien encima de cualquier fondo).
function drawText(ctx, text, x, y, opts = {}) {
  const size = opts.size || 8;
  const color = opts.color || '#ffffff';
  const align = opts.align || 'left';
  const outline = opts.outline === undefined ? '#1c1228' : opts.outline;
  const outlineWidth = opts.outlineWidth || Math.max(1.2, size * 0.3);
  const alpha = opts.alpha === undefined ? 1 : opts.alpha;
  setFont(ctx, size, opts.weight || 700);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.textAlign = align;
  ctx.textBaseline = opts.baseline || 'alphabetic';
  if (opts.shadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillText(text, x + size * 0.1, y + size * 0.18);
  }
  if (outline) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = outlineWidth;
    ctx.strokeStyle = outline;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function textWidth(ctx, text, size, weight = 700) {
  setFont(ctx, size, weight);
  return ctx.measureText(text).width;
}

// ---------- colores ----------
const _rgbCache = new Map();
function hexToRgb(hex) {
  let v = _rgbCache.get(hex);
  if (v) return v;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  _rgbCache.set(hex, v);
  return v;
}
function rgbToHex(r, g, b) {
  const c = (x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
// amt > 0 aclara hacia blanco, amt < 0 oscurece (con un toque frío/morado
// en las sombras, que queda más "pintado" que el negro puro).
function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  if (amt >= 0) return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
  const k = 1 + amt;
  return rgbToHex(r * k + 20 * -amt * 0.5, g * k, b * k + 40 * -amt * 0.5);
}
function mixColor(a, b, t) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

// Ruido determinista: mismo (x, y) => mismo valor en [0, 1).
function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  return [c, x];
}

// Ajusta una coordenada a la rejilla real del canvas (cuartos de píxel)
// para que el pixel-art no "tiemble".
function snap(v) { return Math.round(v * RENDER_SCALE) / RENDER_SCALE; }

// ---------- primitivas pixel-art (sin antialiasing) ----------
function pxDisc(ctx, cx, cy, r) {
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy) + 0.35);
    ctx.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1);
  }
}
function pxEllipse(ctx, cx, cy, rx, ry) {
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.floor(rx * Math.sqrt(1 - (dy * dy) / (ry * ry)) + 0.35);
    ctx.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1);
  }
}
// Rectángulo con bisel (luz arriba-izquierda, sombra abajo-derecha).
function bevelRect(ctx, x, y, w, h, base, light, dark) {
  ctx.fillStyle = base; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = light; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y, 1, h);
  ctx.fillStyle = dark; ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x + w - 1, y, 1, h);
}

// ---------- mini fuente pixel 3x5 (para pizarras, carteles...) ----------
const PIXEL_FONT = {
  'A': ['.#.', '#.#', '###', '#.#', '#.#'], 'B': ['##.', '#.#', '##.', '#.#', '##.'],
  'C': ['.##', '#..', '#..', '#..', '.##'], 'D': ['##.', '#.#', '#.#', '#.#', '##.'],
  'E': ['###', '#..', '##.', '#..', '###'], 'F': ['###', '#..', '##.', '#..', '#..'],
  'G': ['.##', '#..', '#.#', '#.#', '.##'], 'H': ['#.#', '#.#', '###', '#.#', '#.#'],
  'I': ['###', '.#.', '.#.', '.#.', '###'], 'J': ['..#', '..#', '..#', '#.#', '.#.'],
  'K': ['#.#', '#.#', '##.', '#.#', '#.#'], 'L': ['#..', '#..', '#..', '#..', '###'],
  'M': ['#.#', '###', '###', '#.#', '#.#'], 'N': ['##.', '#.#', '#.#', '#.#', '#.#'],
  'O': ['.#.', '#.#', '#.#', '#.#', '.#.'], 'P': ['##.', '#.#', '##.', '#..', '#..'],
  'Q': ['.#.', '#.#', '#.#', '##.', '.##'], 'R': ['##.', '#.#', '##.', '#.#', '#.#'],
  'S': ['.##', '#..', '.#.', '..#', '##.'], 'T': ['###', '.#.', '.#.', '.#.', '.#.'],
  'U': ['#.#', '#.#', '#.#', '#.#', '###'], 'V': ['#.#', '#.#', '#.#', '#.#', '.#.'],
  'W': ['#.#', '#.#', '###', '###', '#.#'], 'X': ['#.#', '#.#', '.#.', '#.#', '#.#'],
  'Y': ['#.#', '#.#', '.#.', '.#.', '.#.'], 'Z': ['###', '..#', '.#.', '#..', '###'],
  '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['##.', '..#', '.#.', '#..', '###'], '3': ['##.', '..#', '.#.', '..#', '##.'],
  '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '##.'],
  '+': ['...', '.#.', '###', '.#.', '...'], '-': ['...', '...', '###', '...', '...'],
  '=': ['...', '###', '...', '###', '...'], 'x': ['...', '#.#', '.#.', '#.#', '...'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'], '?': ['##.', '..#', '.#.', '...', '.#.'],
  '.': ['...', '...', '...', '...', '.#.'], ' ': ['...', '...', '...', '...', '...'],
};
function drawPixelText(ctx, text, x, y, color) {
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of String(text).toUpperCase()) {
    const g = PIXEL_FONT[ch] || PIXEL_FONT[' '];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 3; c++) if (g[r][c] === '#') ctx.fillRect(cx + c, y + r, 1, 1);
    }
    cx += 4;
  }
}

// ---------- sombras y post-proceso ----------

// Sombra elíptica en el suelo debajo de una entidad. Busca el suelo
// hacia abajo y la hace más pequeña/transparente cuanto más lejos esté.
function drawGroundShadow(ctx, level, cx, footY, width, camX) {
  if (!level) return;
  let gy = null;
  for (let y = Math.floor(footY); y < footY + 72; y += 2) {
    if (y >= level.heightPx) break;
    if (level.solidAt(cx, y)) { gy = Math.floor(y / TILE_SIZE) * TILE_SIZE; break; }
  }
  if (gy === null) return;
  const k = Math.max(0, 1 - (gy - footY) / 72);
  if (k <= 0.05) return;
  ctx.fillStyle = `rgba(20,10,30,${0.32 * k})`;
  ctx.beginPath();
  ctx.ellipse(cx - camX, gy + 0.5, (width / 2) * (0.55 + 0.45 * k), 1.6 * (0.6 + 0.4 * k), 0, 0, Math.PI * 2);
  ctx.fill();
}

const _vignetteCache = new Map();
function drawVignette(ctx, strength) {
  if (strength <= 0) return;
  let g = _vignetteCache.get(strength);
  if (!g) {
    g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 70, VIEW_W / 2, VIEW_H / 2, 185);
    g.addColorStop(0, 'rgba(10,0,20,0)');
    g.addColorStop(1, `rgba(10,0,20,${strength})`);
    _vignetteCache.set(strength, g);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

// Panel redondeado semitransparente (menús, carteles...).
function drawPanel(ctx, x, y, w, h, opts = {}) {
  const r = opts.radius === undefined ? 4 : opts.radius;
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  ctx.fillStyle = opts.fill || 'rgba(20,12,40,0.82)';
  ctx.fill();
  if (opts.border !== null) {
    ctx.lineWidth = opts.borderWidth || 1;
    ctx.strokeStyle = opts.border || 'rgba(255,255,255,0.35)';
    ctx.stroke();
  }
  ctx.restore();
}

// Corazón pixel (para el HUD).
const HEART_PX = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
function drawHeart(ctx, x, y, filled) {
  for (let r = 0; r < HEART_PX.length; r++) {
    for (let c = 0; c < 7; c++) {
      if (HEART_PX[r][c] !== '#') continue;
      ctx.fillStyle = filled ? (r === 1 && c <= 2 ? '#ffb0b8' : (r >= 3 ? '#c8182c' : '#f03a4a')) : '#4a2a44';
      ctx.fillRect(x + c, y + r, 1, 1);
    }
  }
}
