// Nube de eructo. Sale de la boca del jugador cuando suelta el botón
// de eructo (E) con la barriga llena. Se expande hacia delante un poco,
// vive ~30 frames, y aturde a cualquier enemigo que toque (ver
// game.js > handleEructoEnemyHits).
//
// No daña al jefe (los profes son muy serios para eso).

class EructoCloud {
  constructor(x, y, dir) {
    this.x = x;
    this.y = y;
    this.dir = dir > 0 ? 1 : -1;
    this.life = 36;
    this.maxLife = 36;
    this.dead = false;
    this.w = 18;
    this.h = 14;
    this.vx = this.dir * 1.6;
    // Marcamos a los enemigos ya aturdidos por esta nube para no
    // resetear su `stunned` cada frame mientras la nube los toca.
    this.hitSet = new WeakSet();
    this.hitBoss = false;
  }

  rect() {
    // La nube crece a medida que avanza, así que la hitbox también.
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
    this.vx *= 0.93; // se va frenando
  }

  draw(ctx, camX) {
    if (this.dead) return;
    const r = this.rect();
    const cx = r.x + r.w / 2 - camX;
    const cy = r.y + r.h / 2;
    const alpha = Math.max(0.2, this.life / this.maxLife);
    // Tres / cuatro burbujas verdes superpuestas, en posiciones pseudo-
    // aleatorias estables para esta nube concreta.
    const blobs = [
      { dx: -6, dy: -2, s: 5, c: '#88ff88' },
      { dx:  4, dy: -4, s: 6, c: '#a0ff60' },
      { dx:  0, dy:  2, s: 7, c: '#66dd66' },
      { dx:  8, dy:  3, s: 4, c: '#bbffbb' },
    ];
    ctx.globalAlpha = alpha;
    for (const b of blobs) {
      ctx.fillStyle = b.c;
      ctx.fillRect(Math.round(cx + b.dx), Math.round(cy + b.dy), b.s, b.s);
    }
    ctx.globalAlpha = 1.0;
  }
}
