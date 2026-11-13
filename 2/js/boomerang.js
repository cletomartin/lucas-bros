// Boomerang: vuela en horizontal, frena y vuelve hacia el dueño.
// Mientras viaja, daña a los enemigos que toca (puede dar a varios).
// Al volver al dueño desaparece y permite lanzar otro.

class Boomerang {
  constructor(owner, dir) {
    this.owner = owner;
    this.x = owner.x + (dir > 0 ? owner.w : -8);
    this.y = owner.y + 4;
    this.w = 8;
    this.h = 8;
    this.vx = dir * 3.4;
    this.dir = dir;
    this.state = 'going';
    this.life = 0;
    this.maxLife = 60;
    this.rot = 0;
    this.dead = false;
    this.trail = [];
    this.hitSet = new WeakSet();
  }

  update() {
    this.life++;
    this.rot += 0.45 * this.dir;
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 5) this.trail.shift();

    if (this.state === 'going') {
      this.x += this.vx;
      this.vx *= 0.955;
      // ligera curva hacia arriba, como un boomerang de verdad
      this.y -= 0.12;
      if (this.life > this.maxLife || Math.abs(this.vx) < 0.5) this.state = 'returning';
    } else {
      const cx = this.owner.x + this.owner.w / 2;
      const cy = this.owner.y + this.owner.h / 2;
      const dx = cx - (this.x + this.w / 2);
      const dy = cy - (this.y + this.h / 2);
      const len = Math.max(0.1, Math.hypot(dx, dy));
      const sp = Math.min(4.2, 2 + this.life * 0.02);
      this.x += (dx / len) * sp;
      this.y += (dy / len) * sp;
      if (len < 8 || this.owner.dead) this.dead = true;
    }
  }

  draw(ctx, camX) {
    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i];
      ctx.fillStyle = `rgba(255,200,120,${0.08 * (i + 1)})`;
      ctx.fillRect(snap(p.x - camX + 2), snap(p.y + 2), 4, 4);
    }
    drawSprite(ctx, Sprites.boomerang, this.x - camX, this.y, this.dir < 0, { rot: this.rot });
  }

  rect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}
