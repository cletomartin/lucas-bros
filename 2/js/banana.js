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
    this.life = 600;
    this.dead = false;
    this.rot = 0;
  }

  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  // Al pisarla sale volando hacia atrás dando vueltas.
  kick(dir) {
    this.kicked = true;
    this.landed = false;
    this.vx = -dir * 1.6;
    this.vy = -3.2;
    this.life = 70;
  }

  update(level) {
    if (this.dead) return;
    if (this.kicked) {
      this.rot += 0.45;
      this.vy += 0.2;
      this.x += this.vx;
      this.y += this.vy;
      if (--this.life <= 0) this.dead = true;
      return;
    }
    if (this.landed) {
      this.life--;
      if (this.life <= 0) this.dead = true;
      return;
    }
    this.rot += 0.3;
    this.vy += 0.3;
    if (this.vy > 5) this.vy = 5;
    this.x += this.vx;
    if (level.collideAabb(this, 'x')) this.vx = 0;
    this.y += this.vy;
    if (level.collideAabb(this, 'y') && this.vy > 0) {
      this.landed = true;
      this.rot = 0;
      this.vx = 0;
      this.vy = 0;
    }
    if (this.y > level.heightPx + 32) this.dead = true;
  }

  draw(ctx, camX) {
    if (this.dead) return;
    if (this.kicked) {
      drawSprite(ctx, Sprites.banana, this.x - camX, this.y, false, { rot: this.rot, alpha: Math.min(1, this.life / 15) });
      return;
    }
    if (this.landed && this.life < 120 && (this.life >> 2) % 2 === 0) return;
    drawSprite(ctx, Sprites.banana, this.x - camX, this.y, false, this.rot ? { rot: this.rot } : null);
  }
}
