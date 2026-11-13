// Efectos visuales: partículas, polvo, anillos, texto flotante, confeti.
// Todos viven en game.effects, se actualizan y dibujan junto con el
// resto del mundo y se eliminan cuando expiran.

class Particle {
  constructor({ x, y, vx, vy, color, life = 30, gravity = 0.2, size = 2, shape = 'square', drag = 1, grow = 0, spin = 0, screen = false }) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.gravity = gravity;
    this.size = size;
    this.shape = shape;
    this.drag = drag;
    this.grow = grow;
    this.rot = Math.random() * 6;
    this.spin = spin;
    this.screen = screen; // coordenadas de pantalla (no se mueve con la cámara)
    this.dead = false;
  }
  update() {
    this.life--;
    if (this.life <= 0) { this.dead = true; return; }
    this.vy += this.gravity;
    this.vx *= this.drag; this.vy *= this.drag;
    this.x += this.vx;
    this.y += this.vy;
    this.size += this.grow;
    this.rot += this.spin;
  }
  draw(ctx, camX) {
    if (this.dead) return;
    const k = this.life / this.maxLife;
    const x = this.screen ? this.x : this.x - camX;
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 2);
    ctx.fillStyle = this.color;
    if (this.shape === 'circle') {
      ctx.beginPath(); ctx.arc(x, this.y, Math.max(0.3, this.size), 0, Math.PI * 2); ctx.fill();
    } else if (this.shape === 'confetti') {
      ctx.translate(x, this.y); ctx.rotate(this.rot);
      ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size * Math.abs(Math.sin(this.rot * 2)) * 0.6 + 0.5);
    } else if (this.shape === 'star') {
      const s = this.size;
      ctx.fillRect(snap(x - s), snap(this.y - 0.5), s * 2, 1);
      ctx.fillRect(snap(x - 0.5), snap(this.y - s), 1, s * 2);
    } else {
      ctx.fillRect(snap(x - this.size / 2), snap(this.y - this.size / 2), this.size, this.size);
    }
    ctx.restore();
  }
}

class Ring {
  constructor({ x, y, color = '#ffffff', life = 16, radius = 14 }) {
    this.x = x; this.y = y; this.color = color;
    this.life = life; this.maxLife = life; this.radius = radius; this.dead = false;
  }
  update() { if (--this.life <= 0) this.dead = true; }
  draw(ctx, camX) {
    const k = 1 - this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2 * (1 - k) + 0.3;
    ctx.beginPath(); ctx.arc(this.x - camX, this.y, 2 + this.radius * k, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

class FloatText {
  constructor({ x, y, text, color = '#ffffff', life = 40, size = 7 }) {
    this.x = x; this.y = y;
    this.text = text;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.dead = false;
  }
  update() {
    this.life--;
    if (this.life <= 0) { this.dead = true; return; }
    this.y -= 0.45 * (this.life / this.maxLife) + 0.1;
  }
  draw(ctx, camX) {
    if (this.dead) return;
    const age = this.maxLife - this.life;
    // "pop": entra grande y se asienta
    const pop = age < 6 ? 1 + (6 - age) * 0.08 : 1;
    const alpha = this.life < 10 ? this.life / 10 : 1;
    const x = Math.max(4, Math.min(VIEW_W - 4, this.x - camX));
    drawText(ctx, this.text, x, this.y, { size: this.size * pop, color: this.color, align: 'center', alpha });
  }
}

const Effects = {
  burst(x, y, color, count = 8) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 1 + Math.random() * 1.8;
      out.push(new Particle({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 0.8,
        color, life: 24 + Math.random() * 12, size: 1.5 + Math.random(), drag: 0.97,
      }));
    }
    out.push(new Ring({ x, y, color, radius: 12 }));
    return out;
  },

  star(x, y, color = '#ffd860') {
    const out = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6;
      out.push(new Particle({ x, y, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6, color, life: 18, gravity: 0, size: 1.5, shape: 'star', drag: 0.9 }));
    }
    out.push(new Ring({ x, y, color: '#fff8c0', radius: 9, life: 12 }));
    return out;
  },

  // Nubecillas de polvo (aterrizaje, derrape, correr).
  dust(x, y, color = '#e8e0d0', n = 5, dir = 0) {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(new Particle({
        x: x + (Math.random() - 0.5) * 8, y: y - 1,
        vx: (Math.random() - 0.5) * 1.2 + dir * 0.6, vy: -0.3 - Math.random() * 0.5,
        color, life: 18 + Math.random() * 10, gravity: -0.01, size: 1.2 + Math.random(),
        shape: 'circle', grow: 0.08, drag: 0.92,
      }));
    }
    return out;
  },

  // Trozos que saltan al dar un cabezazo.
  debris(x, y, color) {
    const out = [];
    for (let i = 0; i < 4; i++) {
      out.push(new Particle({ x, y, vx: (i - 1.5) * 0.8, vy: -2 - Math.random(), color, life: 30, gravity: 0.25, size: 1.5 }));
    }
    return out;
  },

  ring(x, y, color, radius = 14) { return new Ring({ x, y, color, radius }); },

  // Confeti que cae desde arriba (en coordenadas de pantalla).
  confetti(width, count = 4) {
    const out = [];
    const colors = ['#ff66ff', '#66ddff', '#ffd860', '#88ff88', '#ff6666', '#ffaa44'];
    for (let i = 0; i < count; i++) {
      out.push(new Particle({
        x: Math.random() * width, y: -8,
        vx: (Math.random() - 0.5) * 1.5, vy: 0.6 + Math.random() * 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 160 + Math.random() * 60, gravity: 0.02, size: 3, shape: 'confetti',
        spin: (Math.random() - 0.5) * 0.3, drag: 0.995, screen: true,
      }));
    }
    return out;
  },

  scorePopup(x, y, points) {
    return new FloatText({
      x, y, text: '+' + points,
      color: points >= 300 ? '#ff88ff' : (points >= 200 ? '#ffd860' : '#ffffff'),
      life: 40, size: points >= 300 ? 8 : 7,
    });
  },

  text(x, y, msg, color = '#ffffff', life = 50, size = 7) {
    return new FloatText({ x, y, text: msg, color, life, size });
  },
};
