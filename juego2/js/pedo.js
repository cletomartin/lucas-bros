// Nube de pedo. Sale por detrás del jugador cuando pulsa E con la
// barriga llena (y de paso le da un empujoncito hacia delante). Se
// expande, vive ~40 frames y aturde a cualquier enemigo que toque
// (ver game.js > handlePedoEnemyHits).
// No daña al jefe (los profes son muy serios para eso).

class PedoCloud {
  // dir: hacia dónde sale la nube (al revés de donde mira el jugador)
  constructor(x, y, dir) {
    this.x = x;
    this.y = y;
    this.dir = dir > 0 ? 1 : -1;
    this.life = 40;
    this.maxLife = 40;
    this.dead = false;
    this.w = 18;
    this.h = 14;
    this.vx = this.dir * 1.6;
    this.hitSet = new WeakSet();
    this.hitBoss = false;
    this.blobs = [];
    for (let i = 0; i < 8; i++) {
      this.blobs.push({ dx: (Math.random() - 0.3) * 14, dy: (Math.random() - 0.5) * 8, r: 3 + Math.random() * 3, ph: Math.random() * 6 });
    }
    // moscas dando vueltas
    this.flies = [0, 1, 2].map(i => ({ ph: i * 2.1, r: 6 + i * 2 }));
  }

  rect() {
    const phase = (this.maxLife - this.life) / this.maxLife;
    const grow = 1 + phase * 1.4;
    const w = Math.round(this.w * grow);
    const h = Math.round(this.h * grow);
    const x = this.dir > 0 ? this.x : this.x + this.w - w;
    const y = this.y - (h - this.h) / 2;
    return { x, y, w, h };
  }

  update() {
    this.life--;
    if (this.life <= 0) { this.dead = true; return; }
    this.x += this.vx;
    this.vx *= 0.93;
  }

  draw(ctx, camX) {
    if (this.dead) return;
    const r = this.rect();
    const cx = r.x + r.w / 2 - camX;
    const cy = r.y + r.h / 2;
    const phase = 1 - this.life / this.maxLife;
    const grow = 1 + phase * 1.4;
    ctx.save();
    ctx.globalAlpha = Math.max(0.15, this.life / this.maxLife) * 0.85;
    for (const b of this.blobs) {
      const rr = b.r * grow;
      const bx = cx + b.dx * grow * this.dir, by = cy + b.dy * grow + Math.sin(this.life * 0.3 + b.ph);
      ctx.fillStyle = '#8a8a2a';
      ctx.beginPath(); ctx.arc(bx + 0.6, by + 0.8, rr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c8c860';
      ctx.beginPath(); ctx.arc(bx, by, rr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(240,255,180,0.5)';
      ctx.beginPath(); ctx.arc(bx - rr * 0.35, by - rr * 0.35, rr * 0.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // moscas
    ctx.fillStyle = '#1c1228';
    for (const f of this.flies) {
      const a = this.life * 0.35 + f.ph;
      ctx.fillRect(snap(cx + Math.cos(a) * f.r * grow * 0.8), snap(cy - 4 + Math.sin(a * 1.7) * 4), 1, 1);
    }
    if (this.life > 22) {
      drawText(ctx, '¡PRRRRT!', cx, r.y - 2, { size: 7, align: 'center', color: '#e8f080', alpha: Math.min(1, (this.life - 22) / 8) });
    }
  }
}
