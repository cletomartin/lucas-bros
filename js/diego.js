// DIEGO — hermano pequeño (2 años) que aparece a lo largo de los
// niveles haciendo trastadas. NO es un enemigo: si lo tocas, suelta
// una risa y desaparece dándote un corazón. Mientras está vivo,
// camina de un lado a otro y va lanzando chupetes que rebotan por
// el suelo. Los chupetes NO hacen daño, pero te empujan un poquito
// (¡sólo es para reírse!).

class Diego {
  constructor({x, y}) {
    this.x = x; this.y = y;
    this.w = 12; this.h = 12;
    this.vx = -0.6;
    this.vy = 0;
    this.facing = -1;
    this.timer = 0;
    this.dead = false;
    this.gone = false;       // tras tocarlo, deja un texto y se va
    this.gigglesTimer = 0;
    this.chupetes = [];
    // Cáscaras de plátano que ha tirado por el suelo. Se quedan vivas
    // aunque Diego ya se haya ido (game.js las pisa cuando alguien las toca).
    this.bananas = [];
  }

  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  giggle() {
    if (this.gone) return;
    this.gone = true;
    this.gigglesTimer = 60;
  }

  update(level) {
    this.timer++;

    if (this.gone) {
      this.gigglesTimer--;
      if (this.gigglesTimer <= 0) this.dead = true;
      // los chupetes y plátanos siguen vivos un rato
      for (const c of this.chupetes) c.update(level);
      this.chupetes = this.chupetes.filter(c => !c.dead);
      for (const b of this.bananas) b.update(level);
      this.bananas = this.bananas.filter(b => !b.dead);
      return;
    }

    // gravedad
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

    // borde de plataforma → se da la vuelta (no se cae)
    if (onGround) {
      const aheadX = this.vx > 0 ? this.x + this.w + 1 : this.x - 1;
      const belowY = this.y + this.h + 1;
      if (!level.solidAt(aheadX, belowY)) this.vx = -this.vx;
    }

    // cada 100 frames suelta un chupete
    if (this.timer % 100 === 50) {
      this.chupetes.push(new Projectile({
        x: this.x + this.w / 2, y: this.y,
        vx: this.facing * 1.0, vy: -1.5,
        sprite: Sprites.chupete, w: 6, h: 6,
        gravity: 0.2, bouncy: true, life: 200,
      }));
    }
    // cada 200 frames tira una cáscara de plátano hacia atrás (la
    // travesura clásica). Cae al suelo, se queda y hace patinar a
    // quien la pise (jugador o enemigo).
    if (this.timer % 200 === 120) {
      this.bananas.push(new BananaPeel({
        x: this.x + this.w / 2,
        y: this.y,
        vx: -this.facing * 0.6,
      }));
    }
    for (const c of this.chupetes) c.update(level);
    this.chupetes = this.chupetes.filter(c => !c.dead);
    for (const b of this.bananas) b.update(level);
    this.bananas = this.bananas.filter(b => !b.dead);

    // cae al vacío
    if (this.y > level.heightPx + 32) this.dead = true;

    this.facing = Math.sign(this.vx) || this.facing;
  }

  draw(ctx, camX) {
    if (this.dead) return;
    const sx = Math.round(this.x - camX);
    const sy = Math.round(this.y);
    if (!this.gone) {
      drawSprite(ctx, Sprites.diego, sx, sy, this.facing > 0);
      drawName(ctx, 'Diego', sx + 6, sy - 2);
    } else {
      // aparece un "ji ji ji" cuando le tocas
      ctx.fillStyle = '#ffffff';
      ctx.font = '6px monospace';
      ctx.fillText('ji ji ji!', sx - 4, sy - 2);
    }
    for (const c of this.chupetes) c.draw(ctx, camX);
    for (const b of this.bananas) b.draw(ctx, camX);
  }
}
