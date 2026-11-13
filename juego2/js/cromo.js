// Cromo coleccionable (la "moneda" del juego). Gira como una carta.
// Recogerlo da +50 puntos y suma al contador del nivel.
// Con el imán de Fran, vuela hacia el jugador.

class Cromo {
  constructor({ x, y }) {
    this.x = x; this.y = y;
    this.w = 8; this.h = 9;
    this.t = Math.random() * Math.PI * 2;
    this.dead = false;
    this.collected = false;
    this.flyTimer = 0;
    this.bobY = 0;
  }
  rect() { return { x: this.x, y: this.y + this.bobY, w: this.w, h: this.h }; }
  collect() {
    if (this.collected) return;
    this.collected = true;
    this.flyTimer = 18;
    Audio8.coin();
  }
  // Imán: se acerca al jugador si está cerca.
  attract(p) {
    if (this.collected) return;
    const dx = (p.x + p.w / 2) - (this.x + this.w / 2);
    const dy = (p.y + p.h / 2) - (this.y + this.h / 2);
    const d = Math.hypot(dx, dy);
    if (d < 80 && d > 1) {
      const sp = Math.min(4, 120 / d);
      this.x += (dx / d) * sp;
      this.y += (dy / d) * sp;
    }
  }
  update() {
    this.t += 0.08;
    this.bobY = Math.sin(this.t * 1.6) * 1.5;
    if (this.collected) {
      this.flyTimer--;
      this.y -= 1.8;
      if (this.flyTimer <= 0) this.dead = true;
    }
  }
  draw(ctx, camX) {
    if (this.dead) return;
    const x = this.x - camX;
    const y = this.y + this.bobY;
    const sx = this.collected ? 1 : Math.cos(this.t);
    const grid = sx >= 0 ? Sprites.cromo : Sprites.cromoBack;
    const scaleX = Math.max(0.15, Math.abs(sx));
    if (!this.collected) {
      // halo suave
      ctx.fillStyle = 'rgba(255,230,120,0.18)';
      ctx.beginPath(); ctx.arc(x + 4, y + 4.5, 7, 0, Math.PI * 2); ctx.fill();
    }
    drawSprite(ctx, grid, x, y, false, {
      scaleX, scaleY: 1,
      alpha: this.collected ? Math.max(0, this.flyTimer / 18) : 1,
    });
    // brillito
    if (!this.collected && Math.sin(this.t * 3) > 0.97) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(snap(x + 6), snap(y - 1), 1, 3); ctx.fillRect(snap(x + 5), snap(y), 3, 1);
    }
  }
}
