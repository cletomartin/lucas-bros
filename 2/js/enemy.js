// Compañeros traviesos (enemigos estilo Goomba): caminan a izquierda o
// derecha, se dan la vuelta al chocar contra una pared o al borde de una
// plataforma. Si los pisas se quedan aplastados; si les das con el
// boomerang salen volando dando vueltas.
//
// En modo experto lanzan chupetes de vez en cuando.

class Enemy {
  constructor({ x, y, sprite, name, smart = true }) {
    this.x = x;
    this.y = y;
    this.w = 14;
    this.h = 14;
    this.vx = -0.42;
    this.vy = 0;
    this.sprite = sprite;
    this.name = name;
    this.smart = smart;
    this.dead = false;
    this.deathTimer = 0;
    this.deathKind = 'stomp';   // 'stomp' | 'knock'
    this.rot = 0;
    this.facing = -1;
    this.expert = false;
    this.shootTimer = 0;
    this.projectiles = [];
    this.slipping = 0;
    this.slipDir = 0;
    this.stunned = 0;
    this.walker = makeWalker(-1);
    this.walker.animT = Math.random() * 4;
    this.onGround = false;
    this.speed = 0.42;
  }

  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  stomp() {
    this.dead = true;
    this.deathKind = 'stomp';
    this.deathTimer = 24;
    this.vx = 0;
  }

  // Sale disparado hacia arriba dando vueltas y cae fuera de la pantalla.
  knockOff(dir) {
    this.dead = true;
    this.deathKind = 'knock';
    this.deathTimer = 120;
    this.vx = dir * 1.4;
    this.vy = -4;
  }

  slip(dir) {
    this.slipping = 60;
    this.slipDir = dir || (this.facing < 0 ? -1 : 1);
    this.smart = false;
  }

  stun(frames = 180) {
    if (this.stunned < frames) this.stunned = frames;
    this.vx = 0;
  }

  update(level) {
    for (const p of this.projectiles) p.update(level);
    this.projectiles = this.projectiles.filter(p => !p.dead);

    if (this.dead) {
      this.deathTimer--;
      if (this.deathKind === 'knock') {
        this.vy += 0.3;
        this.x += this.vx;
        this.y += this.vy;
        this.rot += 0.25 * Math.sign(this.vx || 1);
      }
      return;
    }

    if (this.stunned > 0) {
      this.stunned--;
      this.vy += 0.4;
      if (this.vy > 6) this.vy = 6;
      this.y += this.vy;
      if (level.collideAabb(this, 'y')) this.vy = 0;
      if (this.stunned === 0) this.vx = this.facing * this.speed;
      return;
    }

    this.vy += 0.4;
    if (this.vy > 6) this.vy = 6;

    if (this.slipping > 0) {
      this.slipping--;
      this.vx = this.slipDir * (this.slipping < 20 ? 0.3 : 2.0);
      this.facing = Math.sign(this.vx) || this.facing;
      if (this.slipping === 0) this.vx = this.facing * this.speed;
    }

    this.x += this.vx;
    if (level.collideAabb(this, 'x')) {
      this.vx = -this.vx;
      if (this.slipping > 0) this.slipDir = -this.slipDir;
      this.facing = Math.sign(this.vx) || this.facing;
    }

    this.y += this.vy;
    let onGround = false;
    if (level.collideAabb(this, 'y')) {
      if (this.vy > 0) onGround = true;
      this.vy = 0;
    }

    if (this.smart && onGround && this.slipping <= 0) {
      const aheadX = this.vx > 0 ? this.x + this.w + 1 : this.x - 1;
      const belowY = this.y + this.h + 1;
      if (!level.solidAt(aheadX, belowY)) this.vx = -this.vx;
    }

    if (this.expert) {
      this.shootTimer--;
      if (this.shootTimer <= 0) {
        this.shootTimer = 160 + Math.floor(Math.random() * 60);
        this.projectiles.push(new Projectile({
          x: this.x + this.w / 2, y: this.y,
          vx: this.facing * 1.4, vy: -1.0,
          sprite: Sprites.chupete, w: 6, h: 6,
          gravity: 0.18, bouncy: false, life: 180,
        }));
      }
    }

    if (this.y > level.heightPx + 32) {
      this.dead = true;
      this.deathKind = 'knock';
      this.deathTimer = 0;
    }

    this.onGround = onGround;
    stepWalker(this.walker, this.sprite, { vx: this.vx, onGround });
    this.facing = this.walker.facing;
  }

  get gone() { return this.dead && this.deathTimer <= 0 && this.projectiles.length === 0; }

  draw(ctx, camX, level) {
    for (const p of this.projectiles) p.draw(ctx, camX);
    if (this.dead && this.deathTimer <= 0) return;
    const sx = this.x - camX - 1;
    const sy = this.y + this.h - 16;
    if (this.dead && this.deathKind === 'stomp') {
      const k = Math.min(1, (24 - this.deathTimer) / 4);
      drawSprite(ctx, animFrame(this.sprite, 'hurt', 0), sx, sy, this.facing < 0, {
        scaleX: 1 + 0.4 * k, scaleY: 1 - 0.65 * k,
        alpha: this.deathTimer < 8 ? this.deathTimer / 8 : 1,
      });
      return;
    }
    if (this.dead) {
      drawSprite(ctx, animFrame(this.sprite, 'hurt', 0), sx, sy, this.facing < 0, { rot: this.rot });
      return;
    }
    drawGroundShadow(ctx, level, this.x + this.w / 2, this.y + this.h, 12, camX);
    let grid;
    if (this.stunned > 0) grid = animFrame(this.sprite, 'hurt', 0);
    else if (this.slipping > 0) grid = this.slipping < 20 ? animFrame(this.sprite, 'sit', 0) : animFrame(this.sprite, 'slip', Math.floor(this.slipping / 5));
    else grid = walkerFrame(this.walker, this.sprite, this.vy);
    const bob = this.stunned > 0 || this.slipping > 0 ? 0 : walkerBob(this.walker);
    const wob = this.stunned > 0 ? Math.sin(this.stunned * 0.3) * 0.12
      : (this.slipping >= 20 ? -this.facing * (0.2 + Math.sin(this.slipping * 0.45) * 0.2) : 0);
    drawSprite(ctx, grid, sx, sy + bob, this.facing < 0, wob ? { rot: wob } : null);
    if (this.stunned > 0) {
      // estrellitas girando sobre la cabeza
      for (let i = 0; i < 3; i++) {
        const a = this.stunned * 0.12 + i * (Math.PI * 2 / 3);
        ctx.fillStyle = i % 2 ? '#ffd860' : '#ffffff';
        ctx.fillRect(snap(this.x + this.w / 2 - camX + Math.cos(a) * 7), snap(this.y - 3 + Math.sin(a) * 2), 1.5, 1.5);
      }
    }
  }
}
