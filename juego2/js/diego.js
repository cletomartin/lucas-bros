// DIEGO — hermano pequeño (2 años) que aparece en los niveles haciendo
// trastadas. NO es un enemigo: si lo tocas, se ríe, se va y te regala
// un corazón. Mientras tanto va tirando chupetes (sólo empujan un poco)
// y cáscaras de plátano (¡resbalan!).

class Diego {
  constructor({ x, y }) {
    this.x = x; this.y = y + 4;
    this.w = 12; this.h = 12;
    this.vx = -0.5;
    this.vy = 0;
    this.facing = -1;
    this.timer = 0;
    this.dead = false;
    this.gone = false;
    this.gigglesTimer = 0;
    this.chupetes = [];
    this.bananas = [];
    this.walker = makeWalker(-1);
  }

  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  giggle() {
    if (this.gone) return;
    this.gone = true;
    this.gigglesTimer = 60;
  }

  _updateItems(level) {
    for (const c of this.chupetes) c.update(level);
    this.chupetes = this.chupetes.filter(c => !c.dead);
    for (const b of this.bananas) b.update(level);
    this.bananas = this.bananas.filter(b => !b.dead);
  }

  update(level) {
    this.timer++;
    if (this.gone) {
      this.gigglesTimer--;
      if (this.gigglesTimer <= 0) this.dead = true;
      this._updateItems(level);
      return;
    }
    this.vy += 0.4;
    if (this.vy > 6) this.vy = 6;
    this.x += this.vx;
    if (level.collideAabb(this, 'x')) {
      this.vx = -this.vx;
      this.facing = Math.sign(this.vx);
    }
    this.y += this.vy;
    let onGround = false;
    if (level.collideAabb(this, 'y')) {
      if (this.vy > 0) onGround = true;
      this.vy = 0;
    }
    if (onGround) {
      const aheadX = this.vx > 0 ? this.x + this.w + 1 : this.x - 1;
      if (!level.solidAt(aheadX, this.y + this.h + 1)) this.vx = -this.vx;
      // saltitos de bebé
      if (this.timer % 70 === 0) this.vy = -2;
    }
    if (this.timer % 100 === 50) {
      this.chupetes.push(new Projectile({
        x: this.x + this.w / 2, y: this.y,
        vx: this.facing * 1.0, vy: -1.5,
        sprite: Sprites.chupete, w: 6, h: 6,
        gravity: 0.2, bouncy: true, life: 200, spin: true,
      }));
    }
    if (this.timer % 200 === 120) {
      this.bananas.push(new BananaPeel({ x: this.x + this.w / 2, y: this.y, vx: -this.facing * 0.6 }));
    }
    this._updateItems(level);
    if (this.y > level.heightPx + 32) this.dead = true;
    stepWalker(this.walker, Sprites.diego, { vx: this.vx, onGround });
    this.facing = this.walker.facing;
  }

  draw(ctx, camX, level) {
    for (const b of this.bananas) b.draw(ctx, camX);
    for (const c of this.chupetes) c.draw(ctx, camX);
    if (this.dead) return;
    const sx = this.x - camX;
    if (!this.gone) {
      drawGroundShadow(ctx, level, this.x + this.w / 2, this.y + this.h, 10, camX);
      // anda como un bebé: balanceándose de lado a lado con cada paso
      const waddle = this.walker.moving ? Math.sin(this.walker.animT * Math.PI / 2) * 0.1 : 0;
      const fr = walkerFrame(this.walker, Sprites.diego, this.vy);
      drawSprite(ctx, fr, sx, this.y + walkerBob(this.walker), this.facing < 0, { rot: waddle });
      drawName(ctx, 'Diego', this.x + this.w / 2 - camX, this.y - 3);
    } else {
      const a = Math.min(1, this.gigglesTimer / 20);
      drawSprite(ctx, animFrame(Sprites.diego, 'jump', 0), sx, this.y - (60 - this.gigglesTimer) * 0.3, this.facing < 0, { alpha: a });
      drawText(ctx, '¡ji ji ji!', this.x + this.w / 2 - camX, this.y - 6 - (60 - this.gigglesTimer) * 0.3,
        { size: 7, color: '#ffd0e0', align: 'center', alpha: a });
    }
  }
}
