// Efectos visuales: partículas explosivas, texto flotante, confeti.
// Todos viven en el array game.effects, se actualizan y dibujan junto
// con el resto del mundo y se eliminan cuando expiran.

class Particle {
  constructor({ x, y, vx, vy, color, life = 30, gravity = 0.2, size = 2 }) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.gravity = gravity;
    this.size = size;
    this.dead = false;
  }
  update() {
    this.life--;
    if (this.life <= 0) { this.dead = true; return; }
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
  }
  draw(ctx, camX) {
    if (this.dead) return;
    const alpha = this.life / this.maxLife;
    if (alpha < 0.4 && this.life % 2 !== 0) return; // parpadeo al final
    ctx.fillStyle = this.color;
    ctx.fillRect(Math.round(this.x - camX), Math.round(this.y), this.size, this.size);
  }
}

class FloatText {
  constructor({ x, y, text, color = '#ffffff', life = 36 }) {
    this.x = x; this.y = y;
    this.text = text;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.dead = false;
  }
  update() {
    this.life--;
    if (this.life <= 0) { this.dead = true; return; }
    this.y -= 0.6;
  }
  draw(ctx, camX) {
    if (this.dead) return;
    if (this.life < 8 && this.life % 2 !== 0) return;
    ctx.font = '6px monospace';
    const x = Math.round(this.x - camX);
    const y = Math.round(this.y);
    // contorno negro
    ctx.fillStyle = '#000';
    ctx.fillText(this.text, x - 1, y);
    ctx.fillText(this.text, x + 1, y);
    ctx.fillText(this.text, x, y - 1);
    ctx.fillText(this.text, x, y + 1);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, x, y);
  }
}

const Effects = {
  // Partículas radiales saliendo de un punto.
  burst(x, y, color, count = 8) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 1 + Math.random() * 1.8;
      out.push(new Particle({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.8,
        color,
        life: 24 + Math.random() * 12,
      }));
    }
    return out;
  },

  // "Estrella" pequeña: 4 partículas rápidas en cruz.
  star(x, y, color = '#ffd860') {
    const out = [];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of dirs) {
      out.push(new Particle({
        x, y,
        vx: dx * 2, vy: dy * 2,
        color, life: 18, gravity: 0,
      }));
    }
    return out;
  },

  // Confeti que cae desde la parte de arriba.
  confetti(width, count = 4) {
    const out = [];
    const colors = ['#ff66ff', '#66ddff', '#ffd860', '#88ff88', '#ff6666', '#ffaa44'];
    for (let i = 0; i < count; i++) {
      out.push(new Particle({
        x: Math.random() * width,
        y: -8,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 0.6 + Math.random() * 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 140 + Math.random() * 60,
        gravity: 0.04,
        size: 2,
      }));
    }
    return out;
  },

  // Texto flotante con +N puntos.
  scorePopup(x, y, points) {
    return new FloatText({
      x, y,
      text: '+' + points,
      color: points >= 300 ? '#ff66ff' : (points >= 200 ? '#ffd860' : '#ffffff'),
      life: 36,
    });
  },

  // Texto libre (para "K.O.!", "BOSS!", etc.)
  text(x, y, msg, color = '#ffffff', life = 50) {
    return new FloatText({ x, y, text: msg, color, life });
  },

  // Polvo al aterrizar fuerte (trampolín / caída larga).
  dust(x, y, color = '#cccccc') {
    const out = [];
    for (let i = 0; i < 6; i++) {
      out.push(new Particle({
        x: x + (Math.random() - 0.5) * 8,
        y,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -0.5 - Math.random() * 0.8,
        color,
        life: 14 + Math.random() * 6,
        gravity: 0.05,
      }));
    }
    return out;
  },
};
