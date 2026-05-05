// Cáscara de plátano. La suelta Diego cada cierto tiempo. Cae al suelo
// y se queda quieta. Si alguien (jugador o enemigo) la pisa, resbala
// unos frames sin control. Una sola pisada y la cáscara desaparece.

class BananaPeel {
  constructor({ x, y, vx = 0 }) {
    this.x = x;
    this.y = y;
    this.w = 8;
    this.h = 5;
    this.vx = vx;
    this.vy = -1.5;
    this.landed = false;
    this.life = 600;       // 10 segundos en el suelo
    this.dead = false;
    this.bobTimer = Math.random() * 6;
  }

  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  update(level) {
    if (this.dead) return;
    if (this.landed) {
      this.life--;
      this.bobTimer++;
      if (this.life <= 0) this.dead = true;
      return;
    }
    this.vy += 0.3;
    if (this.vy > 5) this.vy = 5;
    this.x += this.vx;
    if (level.collideAabb(this, 'x')) this.vx = 0;
    this.y += this.vy;
    if (level.collideAabb(this, 'y') && this.vy > 0) {
      this.landed = true;
      this.vx = 0;
      this.vy = 0;
    }
  }

  draw(ctx, camX) {
    if (this.dead) return;
    // Cuando está en el suelo parpadea suavemente los últimos 2 segundos
    // para avisar de que va a desaparecer.
    if (this.landed && this.life < 120 && (this.life >> 2) % 2 === 0) return;
    drawSprite(ctx, Sprites.banana, Math.round(this.x - camX), Math.round(this.y));
  }
}
