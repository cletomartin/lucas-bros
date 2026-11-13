// Bocadillo de jamón y queso: llena la "barriga".
// Con la barriga al máximo (4/4) puedes tirarte un pedo monumental (E)
// que aturde a los enemigos (ver pedo.js).
//
// En el grid del nivel se representa con el carácter 'Q'.

class Bocadillo {
  constructor({ x, y }) {
    this.x = x; this.y = y;
    this.w = 10; this.h = 6;
    this.t = Math.random() * Math.PI * 2;
    this.bobY = 0;
    this.dead = false;
    this.collected = false;
    this.flyTimer = 0;
  }

  rect() { return { x: this.x, y: this.y + this.bobY, w: this.w, h: this.h }; }

  collect() {
    if (this.collected) return;
    this.collected = true;
    this.flyTimer = 18;
    Audio8.eat();
  }

  update() {
    this.t += 0.1;
    this.bobY = Math.sin(this.t) * 1.5;
    if (this.collected) {
      this.flyTimer--;
      this.y -= 1.2;
      if (this.flyTimer <= 0) this.dead = true;
    }
  }

  draw(ctx, camX) {
    if (this.dead) return;
    const x = this.x - camX;
    const y = this.y + this.bobY;
    if (!this.collected) {
      // vapor de recién hecho
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 2; i++) {
        const k = (this.t * 4 + i * 6) % 12;
        ctx.fillRect(snap(x + 3 + i * 4 + Math.sin(k) * 0.8), snap(y - 2 - k * 0.5), 1, 1);
      }
    }
    const k = this.collected ? 1 + (18 - this.flyTimer) / 18 : 1;
    drawSprite(ctx, Sprites.bocadillo, x, y, false, {
      scaleX: k, scaleY: k,
      alpha: this.collected ? Math.max(0, this.flyTimer / 18) : 1,
    });
  }
}
