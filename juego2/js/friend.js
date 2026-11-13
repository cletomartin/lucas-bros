// AMIGOS (Rafa, Matías, Santiago, Carlos, Fran): aliados repartidos por
// los niveles. Si Lucas o Cleto los tocan:
//   - se ponen contentos y se van
//   - dan +1 corazón (hasta 6) y +500 puntos
//   - activan un power-up TEMPORAL (10 segundos) según quién sea
//
// Power-ups:
//   Rafa     -> 'invincible'      Invencible
//   Matías   -> 'superJump'       Salto reforzado
//   Santiago -> 'doubleBoomerang' Lanzas dos boomerangs a la vez
//   Carlos   -> 'doubleJump'      Doble salto en el aire
//   Fran     -> 'magnet'          Imán: los cromos vuelan hacia ti

const POWERUP_LABELS = {
  invincible:      '★ INVENCIBLE',
  superJump:       '↑ SÚPER SALTO',
  doubleBoomerang: '×2 BOOMERANG',
  doubleJump:      '↑↑ DOBLE SALTO',
  magnet:          '◎ IMÁN',
  speed:           '» ACELERÓN',
};

const FRIEND_DEFS = {
  rafa:     { sprite: () => Sprites.rafa,     name: 'Rafa',     powerup: 'invincible'      },
  matias:   { sprite: () => Sprites.matias,   name: 'Matías',   powerup: 'superJump'       },
  santiago: { sprite: () => Sprites.santiago, name: 'Santiago', powerup: 'doubleBoomerang' },
  carlos:   { sprite: () => Sprites.carlos,   name: 'Carlos',   powerup: 'doubleJump'      },
  fran:     { sprite: () => Sprites.fran,     name: 'Fran',     powerup: 'magnet'          },
};

class Friend {
  constructor({ x, y, kind }) {
    this.x = x; this.y = y;
    this.w = 14; this.h = 16;
    this.vx = 0; this.vy = 0;
    this.kind = kind;
    this.def = FRIEND_DEFS[kind] || FRIEND_DEFS.rafa;
    this.facing = -1;
    this.dead = false;
    this.cheering = false;
    this.cheerTimer = 0;
    this.t = Math.random() * 100;
    this.walker = makeWalker(-1);
  }

  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  cheer() {
    if (this.cheering) return;
    this.cheering = true;
    this.cheerTimer = 50;
    this.vy = -3.5;
  }

  update(level, players) {
    this.t++;
    let lookAt = 0;
    if (players) {
      const p = players.find(pp => !pp.dead);
      if (p && !this.cheering) lookAt = p.x - this.x;
    }
    this.vy += this.cheering ? 0.2 : 0.4;
    if (this.vy > 6) this.vy = 6;
    this.y += this.vy;
    let onGround = false;
    if (!this.cheering && level.collideAabb(this, 'y')) {
      onGround = this.vy >= 0;
      // saltitos de "¡eh, aquí!"
      this.vy = (this.t % 90 < 2) ? -2.2 : 0;
    }
    stepWalker(this.walker, this.def.sprite(), { vx: 0, onGround, lookAt });
    this.facing = this.walker.facing;
    if (this.cheering) {
      this.cheerTimer--;
      if (this.cheerTimer <= 0) this.dead = true;
    }
  }

  draw(ctx, camX, level) {
    if (this.dead) return;
    const sx = this.x - camX - 1;
    if (!this.cheering) drawGroundShadow(ctx, level, this.x + this.w / 2, this.y + this.h, 12, camX);
    const grid = this.cheering ? animFrame(this.def.sprite(), 'jump', 0) : walkerFrame(this.walker, this.def.sprite(), this.vy);
    const alpha = this.cheering ? Math.min(1, this.cheerTimer / 20) : 1;
    drawSprite(ctx, grid, sx, this.y + this.h - spriteH(grid), this.facing < 0, { alpha });
    if (this.cheering) {
      drawText(ctx, '¡Bien!', this.x + this.w / 2 - camX, this.y - 4, { size: 8, color: '#ffd860', align: 'center', alpha });
    } else {
      drawName(ctx, this.def.name, this.x + this.w / 2 - camX, this.y - 3);
      // "!" saltarín para que se vea que es un amigo
      const bob = Math.sin(this.t * 0.12) * 1.5;
      drawText(ctx, '!', this.x + this.w / 2 - camX, this.y - 11 + bob, { size: 8, color: '#88ff88', align: 'center' });
    }
  }

  get name() { return this.def.name; }
}
