// Bocadillo de jamón y queso: coleccionable que llena la "barriga".
// Con la barriga al máximo (4/4), Lucas / Cleto puede soltar un eructo
// monumental que aturde a los enemigos cercanos (ver eructo.js).
//
// En el grid del nivel se representa con el caracter 'Q'.

class Bocadillo {
  constructor({ x, y }) {
    this.x = x; this.y = y;
    this.w = 8; this.h = 6;
    this.bobTimer = Math.random() * Math.PI * 2;
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
    this.bobTimer += 0.13;
    this.bobY = Math.sin(this.bobTimer) * 1.5;
    if (this.collected) {
      this.flyTimer--;
      this.y -= 1.6;
      if (this.flyTimer <= 0) this.dead = true;
    }
  }

  draw(ctx, camX) {
    if (this.dead) return;
    const x = Math.round(this.x - camX);
    const y = Math.round(this.y + this.bobY);
    if (this.collected) ctx.globalAlpha = Math.max(0, this.flyTimer / 18);
    drawSprite(ctx, Sprites.bocadillo, x, y);
    if (this.collected) ctx.globalAlpha = 1.0;
  }
}
