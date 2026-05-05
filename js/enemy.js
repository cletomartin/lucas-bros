// Enemigos compañeros del cole (estilo Goomba): caminan a izquierda
// o derecha, se dan la vuelta al chocar contra una pared o al borde
// de una plataforma (para no caer al vacío). Mueren al ser pisados o
// al recibir un boomerang.
//
// En modo experto algunos enemigos lanzan chupetes cada cierto tiempo,
// para que tengas que esquivarlos además de pisarlos.

class Enemy {
  constructor({x, y, sprite, name, smart=true}) {
    this.x = x;
    this.y = y;
    this.w = 14;
    this.h = 14;
    this.vx = -0.5;
    this.vy = 0;
    this.sprite = sprite;
    this.name = name;
    this.smart = smart; // si true, no se cae de las plataformas
    this.dead = false;
    this.deathTimer = 0;
    this.facing = -1;
    // Modo experto: lanza proyectiles cada cierto tiempo. Lo activa
    // game.js al cargar el nivel si la dificultad es 'expert'.
    this.expert = false;
    this.shootTimer = 0;
    this.projectiles = [];
    // Patinazo por cáscara de plátano: vx forzado, sin "smart", durante
    // unos frames. Se desactiva el frenado al borde para que se caigan.
    this.slipping = 0;
    this.slipDir = 0;
    // Aturdido por eructo: queda parado y mudo unos frames. Sigue
    // siendo pisable y vulnerable a boomerang.
    this.stunned = 0;
  }

  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  stomp() {
    this.dead = true;
    this.deathTimer = 18;
    this.vx = 0;
  }

  // Llamado por el game cuando un enemigo pisa una cáscara de plátano.
  // Le quitamos el "smart" para que pueda caerse de la plataforma — eso
  // es la mitad de la gracia.
  slip(dir) {
    this.slipping = 60;
    this.slipDir = dir || (this.facing < 0 ? -1 : 1);
    this.smart = false;
  }

  // Llamado por el game cuando le toca un eructo: queda inmóvil unos
  // segundos. Sigue vulnerable al pisotón / boomerang.
  stun(frames = 180) {
    if (this.stunned < frames) this.stunned = frames;
    this.vx = 0;
  }

  update(level) {
    if (this.dead) {
      this.deathTimer--;
      // Los proyectiles ya lanzados siguen viviendo un rato.
      for (const p of this.projectiles) p.update(level);
      this.projectiles = this.projectiles.filter(p => !p.dead);
      return;
    }

    if (this.stunned > 0) {
      this.stunned--;
      // Sólo aplicamos gravedad, nada más. Ni shoot, ni movimiento.
      this.vy += 0.4;
      if (this.vy > 6) this.vy = 6;
      this.y += this.vy;
      if (level.collideAabb(this, 'y')) this.vy = 0;
      return;
    }

    // Gravedad
    this.vy += 0.4;
    if (this.vy > 6) this.vy = 6;

    // Si estamos patinando, forzamos vx en una dirección — sin "smart".
    if (this.slipping > 0) {
      this.slipping--;
      this.vx = this.slipDir * 2.6;
      this.facing = Math.sign(this.vx) || this.facing;
    }

    // Movimiento horizontal con choque contra paredes
    this.x += this.vx;
    if (level.collideAabb(this, 'x')) {
      this.vx = -this.vx;
      if (this.slipping > 0) this.slipDir = -this.slipDir;
      this.facing = Math.sign(this.vx) || this.facing;
    }

    // Vertical
    this.y += this.vy;
    let onGround = false;
    if (level.collideAabb(this, 'y')) {
      if (this.vy > 0) onGround = true;
      this.vy = 0;
    }

    // "Smart": darse la vuelta si delante hay un precipicio.
    // Si está patinando lo desactivamos — que se caiga, es cómico.
    if (this.smart && onGround && this.slipping <= 0) {
      const aheadX = this.vx > 0 ? this.x + this.w + 1 : this.x - 1;
      const belowY = this.y + this.h + 1;
      if (!level.solidAt(aheadX, belowY)) {
        this.vx = -this.vx;
      }
    }

    // En modo experto cada ~180 frames lanza un chupete hacia delante.
    // Cada enemigo arranca con timer aleatorio para no disparar a la vez.
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
    for (const p of this.projectiles) p.update(level);
    this.projectiles = this.projectiles.filter(p => !p.dead);

    // Si caemos al vacío
    if (this.y > level.heightPx + 32) {
      this.dead = true;
      this.deathTimer = 0;
    }

    this.facing = Math.sign(this.vx) || this.facing;
  }

  draw(ctx, camX) {
    for (const p of this.projectiles) p.draw(ctx, camX);
    if (this.dead && this.deathTimer <= 0) return;
    const sx = Math.round(this.x - camX) - 1;
    const sy = Math.round(this.y);
    if (this.dead) {
      // efecto "aplastado": dibujamos el sprite achatado
      ctx.save();
      ctx.translate(sx, sy + 8);
      ctx.scale(1, 0.5);
      drawSprite(ctx, this.sprite, 0, 0, this.facing > 0);
      ctx.restore();
    } else {
      drawSprite(ctx, this.sprite, sx, sy, this.facing > 0);
      if (this.stunned > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '6px monospace';
        ctx.fillText('@_@', sx + 2, sy - 2);
      }
    }
  }
}
