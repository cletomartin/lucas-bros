// Cromo coleccionable (estilo moneda de Mario, pero con cara de personaje).
// Recogerlo da +50 puntos, suma al contador del nivel y suena un tilín.

class Cromo {
  constructor({ x, y }) {
    this.x = x; this.y = y;
    this.w = 8; this.h = 10;
    this.bobTimer = Math.random() * Math.PI * 2; // empieza con fase aleatoria
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
  update() {
    this.bobTimer += 0.15;
    this.bobY = Math.sin(this.bobTimer) * 2;
    if (this.collected) {
      this.flyTimer--;
      this.y -= 1.8;
      if (this.flyTimer <= 0) this.dead = true;
    }
  }
  draw(ctx, camX) {
    if (this.dead) return;
    const x = Math.round(this.x - camX);
    const y = Math.round(this.y + this.bobY);
    if (this.collected) {
      ctx.globalAlpha = Math.max(0, this.flyTimer / 18);
      drawSprite(ctx, Sprites.cromo, x, y);
      ctx.globalAlpha = 1.0;
    } else {
      drawSprite(ctx, Sprites.cromo, x, y);
    }
  }
}
