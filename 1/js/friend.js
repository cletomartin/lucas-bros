// AMIGOS (Rafa, Matías, Santiago, Jorge): NPCs aliados que aparecen
// repartidos por los niveles. Si Lucas o Cleto los tocan:
//   - se ponen contentos y desaparecen
//   - dan +1 corazón (hasta 6) y +500 puntos
//   - activan un power-up TEMPORAL (10 segundos) según quién sea
//
// Cada amigo solo aparece UNA vez por nivel.
//
// Power-ups:
//   Rafa     -> 'invincible'      Invencible (parpadeas)
//   Matías   -> 'superJump'       Salto reforzado
//   Santiago -> 'doubleBoomerang' Lanzas dos boomerangs a la vez
//   Jorge    -> 'doubleJump'      Doble salto en aire

const POWERUP_LABELS = {
  invincible:      '★ INVENCIBLE',
  superJump:       '↑ SÚPER SALTO',
  doubleBoomerang: 'X2 BOOMERANG',
  doubleJump:      '↑↑ DOBLE SALTO',
};

const FRIEND_DEFS = {
  rafa:     { sprite: () => Sprites.rafa,     name: 'Rafa',     powerup: 'invincible'      },
  matias:   { sprite: () => Sprites.matias,   name: 'Matías',   powerup: 'superJump'       },
  santiago: { sprite: () => Sprites.santiago, name: 'Santiago', powerup: 'doubleBoomerang' },
  jorge:    { sprite: () => Sprites.jorge,    name: 'Jorge',    powerup: 'doubleJump'      },
};

class Friend {
  constructor({ x, y, kind }) {
    this.x = x; this.y = y;
    this.w = 14; this.h = 16;
    this.vx = 0; this.vy = 0;
    this.kind = kind;
    this.def = FRIEND_DEFS[kind];
    this.facing = 1;
    this.dead = false;
    this.cheering = false;
    this.cheerTimer = 0;
    this.bobTimer = 0;
  }

  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  cheer() {
    if (this.cheering) return;
    this.cheering = true;
    this.cheerTimer = 60;
  }

  update(level) {
    this.bobTimer++;
    if (this.cheering) {
      this.cheerTimer--;
      if (this.cheerTimer <= 0) this.dead = true;
      return;
    }
    this.vy += 0.4;
    if (this.vy > 6) this.vy = 6;
    this.y += this.vy;
    if (level.collideAabb(this, 'y')) this.vy = 0;
  }

  draw(ctx, camX) {
    if (this.dead) return;
    const sx = Math.round(this.x - camX) - 1;
    const bob = Math.sin(this.bobTimer * 0.15) * 1;
    const sy = Math.round(this.y + bob);
    if (this.cheering) {
      ctx.fillStyle = '#ffd860';
      ctx.font = '8px monospace';
      ctx.fillText('¡Bien!', sx - 4, sy - 4);
    }
    drawSprite(ctx, this.def.sprite(), sx, sy, this.facing > 0);
    drawName(ctx, this.def.name, sx + 7, sy - 2);
  }

  get name() { return this.def.name; }
}
