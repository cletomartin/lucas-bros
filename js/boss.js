// JEFES (los profes). Cada profe tiene un patrón de ataque distinto:
//
//   Rodrigo  (tutor)        — lanza exámenes en abanico
//   Mari Paz (música)       — emite notas musicales que rebotan
//   César    (ed. física)   — embiste a toda velocidad atravesando la arena
//   Lucre    (veterana)     — invoca libros que caen del cielo
//   Emilio   (director)     — jefe final, combina varios ataques
//
// Todos heredan de Boss y reciben daño por boomerang (1) o pisotón (1).
// Tras cada golpe se ponen invulnerables ~1s y parpadean.

class Projectile {
  constructor({x, y, vx, vy, sprite, w=8, h=8, gravity=0, bouncy=false, life=240}) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.w = w; this.h = h;
    this.sprite = sprite;
    this.gravity = gravity;
    this.bouncy = bouncy;
    this.life = life;
    this.dead = false;
    this.spin = 0;
  }
  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  update(level) {
    this.life--; this.spin++;
    if (this.life <= 0) { this.dead = true; return; }
    this.vy += this.gravity;
    this.x += this.vx;
    if (level.collideAabb(this, 'x')) {
      if (this.bouncy) this.vx = -this.vx;
      else this.dead = true;
    }
    this.y += this.vy;
    if (level.collideAabb(this, 'y')) {
      if (this.bouncy) this.vy = -Math.abs(this.vy) * 0.8;
      else this.dead = true;
    }
  }
  draw(ctx, camX) {
    if (this.dead) return;
    const x = Math.round(this.x - camX);
    const y = Math.round(this.y);
    if (this.sprite) drawSprite(ctx, this.sprite, x, y, this.spin % 8 >= 4);
  }
}

// Pequeños sprites de proyectiles definidos aquí mismo (no en sprites.js)
// para tenerlos cerca del código de jefes.
const SPR_EXAM = [
  'KKKKKKKK',
  'KWWWWWWK',
  'KWKKKKWK',
  'KWWKKWWK',
  'KWKKKKWK',
  'KWWWWWWK',
  'KWKKKKWK',
  'KKKKKKKK',
];
const SPR_NOTE = [
  '..KKKK..',
  '.KKKKKK.',
  '.KK..KK.',
  '.KKKKKK.',
  '.K....K.',
  '.K....K.',
  'KK....K.',
  'KK......',
];
const SPR_BIG_BOOK = [
  'KKKKKKKKKKKK',
  'KrrrrrrrrrrK',
  'KrWWWWWWWWrK',
  'KrWmmmmmmWrK',
  'KrWmmmmmmWrK',
  'KrWWWWWWWWrK',
  'KrrrrrrrrrrK',
  'KKKKKKKKKKKK',
];

class Boss {
  constructor({x, y, sprite, name, hp=3, w=24, h=32}) {
    this.x = x; this.y = y;
    this.w = w; this.h = h;
    this.vx = 0; this.vy = 0;
    this.sprite = sprite;
    this.name = name;
    this.hp = hp;
    this.maxHp = hp;
    this.invuln = 0;
    this.dead = false;
    this.facing = -1;
    this.timer = 0;
    this.projectiles = [];
    this.victoryTimer = 0;
    // Modificadores aplicados desde game.js según la dificultad.
    // attackCDMul < 1 = ataques más rápidos (experto). > 1 = más lentos (fácil).
    // speedMul afecta a velocidades de patrulla / embestida.
    // shotsExtra suma proyectiles extra a los ataques en abanico.
    this.diffMode = 'hard';
    this.attackCDMul = 1.0;
    this.speedMul = 1.0;
    this.shotsExtra = 0;
  }

  // Llamado por game.js justo después de construir el boss. Ajusta HP y
  // los modificadores que cada subclase usará en su update().
  applyDifficulty(diff) {
    this.diffMode = diff;
    if (diff === 'easy') {
      this.attackCDMul = 1.6;
      this.speedMul = 0.8;
      this.shotsExtra = -1;  // un proyectil menos en abanicos
      // Vida más baja pero al menos 2.
      this.maxHp = Math.max(2, Math.round(this.maxHp * 0.7));
      this.hp = this.maxHp;
    } else if (diff === 'expert') {
      this.attackCDMul = 0.6;
      this.speedMul = 1.4;
      this.shotsExtra = 1;
      this.maxHp = this.maxHp + 1;
      this.hp = this.maxHp;
    }
  }

  // Devuelve el cooldown de ataque ajustado por dificultad. Mínimo 12.
  cd(base) { return Math.max(12, Math.round(base * this.attackCDMul)); }

  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  hit() {
    if (this.invuln > 0 || this.dead) return false;
    this.hp--;
    this.invuln = 60;
    if (this.hp <= 0) {
      this.dead = true;
      this.victoryTimer = 90;
    }
    return true;
  }

  // Subclases deben implementar attack(). Aquí solo gestiona timers,
  // invulnerabilidad, gravedad básica y proyectiles.
  baseUpdate(level) {
    if (this.dead) {
      this.victoryTimer--;
      return;
    }
    this.timer++;
    if (this.invuln > 0) this.invuln--;
    // gravedad básica si no está flotando (subclases pueden anularla)
    if (this.gravityOn !== false) {
      this.vy += 0.45;
      if (this.vy > 6) this.vy = 6;
      this.x += this.vx;
      if (level.collideAabb(this, 'x')) this.vx = -this.vx;
      this.y += this.vy;
      if (level.collideAabb(this, 'y')) this.vy = 0;
    }
    // proyectiles
    for (const p of this.projectiles) p.update(level);
    this.projectiles = this.projectiles.filter(p => !p.dead);
  }

  shoot(p) { this.projectiles.push(p); }

  draw(ctx, camX) {
    if (this.dead && this.victoryTimer <= 0) return;
    if (this.invuln > 0 && this.invuln % 6 < 3) {
      // parpadeo: no dibujar este frame
    } else {
      const sx = Math.round(this.x - camX);
      const sy = Math.round(this.y);
      drawSprite(ctx, this.sprite, sx, sy, this.facing > 0);
      drawName(ctx, this.name, sx + this.w / 2, sy - 12);
    }
    for (const p of this.projectiles) p.draw(ctx, camX);

    // Barra de vida del jefe (siempre visible)
    if (!this.dead) {
      const hbW = 60, hbH = 4;
      const hbX = Math.round(this.x - camX) + (this.w - hbW) / 2;
      const hbY = Math.round(this.y) - 8;
      ctx.fillStyle = '#000';
      ctx.fillRect(hbX - 1, hbY - 1, hbW + 2, hbH + 2);
      ctx.fillStyle = '#400';
      ctx.fillRect(hbX, hbY, hbW, hbH);
      ctx.fillStyle = '#f33';
      ctx.fillRect(hbX, hbY, Math.round(hbW * (this.hp / this.maxHp)), hbH);
    }
  }
}

// =============================================================
// JEFE 1 — RODRIGO (tutor): lanza exámenes en abanico
// =============================================================
class BossRodrigo extends Boss {
  constructor(x, y) {
    super({x, y, sprite: Sprites.rodrigo, name: 'Rodrigo', hp: 3});
  }
  update(level, players) {
    if (this.dead) { this.baseUpdate(level); return; }
    // Mira al jugador más cercano
    const target = nearestPlayer(this, players);
    if (target) this.facing = target.x > this.x ? 1 : -1;

    // Cada N frames lanza un abanico de exámenes (3 base, ±1 según dificultad).
    const cooldown = this.cd(90);
    if (this.timer % cooldown === Math.floor(cooldown * 0.66)) {
      const cx = this.x + this.w / 2;
      const cy = this.y + 8;
      const dir = this.facing;
      const angles = this.shotsExtra >= 1
        ? [-1.4, -0.6, 0.2, 1.0, 1.6]
        : (this.shotsExtra <= -1 ? [-0.8, 0.8] : [-1.2, 0, 1.2]);
      for (const dy of angles) {
        this.shoot(new Projectile({
          x: cx, y: cy,
          vx: dir * 1.6 * this.speedMul, vy: dy,
          sprite: SPR_EXAM, w: 8, h: 8, gravity: 0.05,
        }));
      }
    }
    this.baseUpdate(level);
  }
}

// =============================================================
// JEFE TERESA (profesora de infantil): peluches que caen suaves
// =============================================================
class BossTeresa extends Boss {
  constructor(x, y) {
    super({x, y, sprite: Sprites.teresa, name: 'Teresa', hp: 3});
    this.patrolFrom = x - 24;
    this.patrolTo = x + 24;
    this.vx = 0.4;
    this.gravityOn = true;
  }
  update(level, players) {
    if (this.dead) { this.baseUpdate(level); return; }
    const target = nearestPlayer(this, players);
    if (target) this.facing = target.x > this.x ? 1 : -1;

    // Patrulla suave de un lado a otro
    const v = 0.4 * this.speedMul;
    if (this.x < this.patrolFrom) this.vx = v;
    if (this.x > this.patrolTo)   this.vx = -v;

    // Lanza peluches que caen flotando y rebotan un poquito.
    const cooldown = this.cd(80);
    if (this.timer % cooldown === Math.floor(cooldown / 2)) {
      const cx = this.x + this.w / 2;
      const cy = this.y + 8;
      const dir = this.facing;
      this.shoot(new Projectile({
        x: cx, y: cy,
        vx: dir * 1.0 * this.speedMul, vy: -1.0,
        sprite: Sprites.peluche, w: 8, h: 8,
        gravity: 0.10, bouncy: true, life: 280,
      }));
      // En experto, sopla 2 peluches a la vez.
      if (this.shotsExtra >= 1) {
        this.shoot(new Projectile({
          x: cx, y: cy,
          vx: -dir * 0.8 * this.speedMul, vy: -1.4,
          sprite: Sprites.peluche, w: 8, h: 8,
          gravity: 0.10, bouncy: true, life: 280,
        }));
      }
    }
    this.baseUpdate(level);
  }
}

// =============================================================
// JEFE JUANJO (profesor de segundo): lanza lápices rectos rápidos
// =============================================================
class BossJuanjo extends Boss {
  constructor(x, y) {
    super({x, y, sprite: Sprites.juanjo, name: 'Juanjo', hp: 4});
    this.state = 'idle';
    this.stateTimer = 80;
  }
  update(level, players) {
    if (this.dead) { this.baseUpdate(level); return; }
    const target = nearestPlayer(this, players);
    if (target) this.facing = target.x > this.x ? 1 : -1;

    // Alterna entre quieto disparando y un mini-salto hacia el jugador.
    this.stateTimer--;
    if (this.state === 'idle') {
      this.vx = 0;
      const cooldown = this.cd(45);
      if (this.timer % cooldown === Math.floor(cooldown / 2)) {
        const cx = this.x + this.w / 2;
        const cy = this.y + 14;
        const dir = this.facing;
        this.shoot(new Projectile({
          x: cx, y: cy,
          vx: dir * 2.4 * this.speedMul, vy: 0,
          sprite: Sprites.lapiz, w: 8, h: 8, gravity: 0.0,
        }));
        // En experto añade un lápiz inclinado.
        if (this.shotsExtra >= 1) {
          this.shoot(new Projectile({
            x: cx, y: cy,
            vx: dir * 2.0 * this.speedMul, vy: -0.6,
            sprite: Sprites.lapiz, w: 8, h: 8, gravity: 0.05,
          }));
        }
      }
      if (this.stateTimer <= 0) {
        this.state = 'hop';
        this.stateTimer = 30;
        this.vy = -3.5 * this.speedMul;
        this.vx = this.facing * 1.4 * this.speedMul;
      }
    } else { // hop
      if (this.stateTimer <= 0 && this.vy === 0) {
        this.state = 'idle';
        this.stateTimer = Math.round(80 * this.attackCDMul);
        this.vx = 0;
      }
    }
    this.baseUpdate(level);
  }
}

// =============================================================
// JEFE 2 — MARI PAZ (música): notas musicales que rebotan
// =============================================================
class BossMariPaz extends Boss {
  constructor(x, y) {
    super({x, y, sprite: Sprites.mariPaz, name: 'Mari Paz', hp: 4});
    this.patrolFrom = x - 32;
    this.patrolTo = x + 32;
    this.vx = 0.5;
    this.gravityOn = true;
  }
  update(level, players) {
    if (this.dead) { this.baseUpdate(level); return; }
    const target = nearestPlayer(this, players);
    if (target) this.facing = target.x > this.x ? 1 : -1;

    // Patrulla — velocidad ajustada por dificultad.
    const v = 0.5 * this.speedMul;
    if (this.x < this.patrolFrom) this.vx = v;
    if (this.x > this.patrolTo)   this.vx = -v;

    // Cada N frames suelta una nota que rebota (en experto, 2 notas).
    const cooldown = this.cd(60);
    if (this.timer % cooldown === Math.floor(cooldown / 2)) {
      const cx = this.x + this.w / 2;
      const cy = this.y + 12;
      this.shoot(new Projectile({
        x: cx, y: cy,
        vx: this.facing * 1.2 * this.speedMul, vy: -1.5,
        sprite: SPR_NOTE, w: 8, h: 8, gravity: 0.18, bouncy: true, life: 300,
      }));
      if (this.shotsExtra >= 1) {
        this.shoot(new Projectile({
          x: cx, y: cy,
          vx: -this.facing * 1.0 * this.speedMul, vy: -2.0,
          sprite: SPR_NOTE, w: 8, h: 8, gravity: 0.18, bouncy: true, life: 300,
        }));
      }
    }
    this.baseUpdate(level);
  }
}

// =============================================================
// JEFE 3 — CÉSAR (ed. física): embestidas a toda velocidad
// =============================================================
class BossCesar extends Boss {
  constructor(x, y) {
    super({x, y, sprite: Sprites.cesar, name: 'César', hp: 4});
    this.state = 'idle';
    this.stateTimer = 60;
  }
  update(level, players) {
    if (this.dead) { this.baseUpdate(level); return; }
    const target = nearestPlayer(this, players);
    if (target) this.facing = target.x > this.x ? 1 : -1;

    this.stateTimer--;
    if (this.state === 'idle') {
      this.vx = 0;
      if (this.stateTimer <= 0) {
        this.state = 'charge';
        this.stateTimer = Math.round(90 * this.attackCDMul);
        this.vx = this.facing * 3.2 * this.speedMul;
      }
    } else { // charge
      // si choca con pared (vx==0 tras colisión), parar
      if (this.vx === 0) {
        this.state = 'idle';
        this.stateTimer = Math.round(60 * this.attackCDMul);
      }
      if (this.stateTimer <= 0) {
        this.state = 'idle';
        this.stateTimer = Math.round(60 * this.attackCDMul);
        this.vx = 0;
      }
    }
    this.baseUpdate(level);
  }
}

// =============================================================
// JEFE 4 — LUCRE (veterana): libros caen del cielo
// =============================================================
class BossLucre extends Boss {
  constructor(x, y) {
    super({x, y, sprite: Sprites.lucre, name: 'Lucre', hp: 5});
  }
  update(level, players) {
    if (this.dead) { this.baseUpdate(level); return; }
    const target = nearestPlayer(this, players);
    if (target) this.facing = target.x > this.x ? 1 : -1;

    // Cada N frames suelta un libro encima de un jugador. En experto,
    // suelta dos seguidos para hacer presión.
    const cooldown = this.cd(50);
    if (this.timer % cooldown === Math.floor(cooldown / 2) && players.length > 0) {
      const p = players[Math.floor(Math.random() * players.length)];
      this.shoot(new Projectile({
        x: p.x - 2, y: 8,
        vx: 0, vy: 0,
        sprite: SPR_BIG_BOOK, w: 12, h: 8, gravity: 0.25 * this.speedMul, life: 400,
      }));
      if (this.shotsExtra >= 1) {
        this.shoot(new Projectile({
          x: p.x + 12, y: 8,
          vx: 0, vy: 0,
          sprite: SPR_BIG_BOOK, w: 12, h: 8, gravity: 0.25 * this.speedMul, life: 400,
        }));
      }
    }
    this.baseUpdate(level);
  }
}

// =============================================================
// JEFE 5 — EMILIO (director, jefe final): combina ataques + salta
// =============================================================
class BossEmilio extends Boss {
  constructor(x, y) {
    super({x, y, sprite: Sprites.emilio, name: 'Emilio', hp: 10});
    this.jumpTimer = 0;
  }
  update(level, players) {
    if (this.dead) { this.baseUpdate(level); return; }
    const target = nearestPlayer(this, players);
    if (target) this.facing = target.x > this.x ? 1 : -1;

    // Fase de furia: cuando le quedan menos de la mitad, salta más rápido
    // y dispara más a menudo.
    const enraged = this.hp <= this.maxHp / 2;
    const jumpCD  = this.cd(enraged ? 50 : 80);
    const shootCD = this.cd(enraged ? 45 : 70);

    this.jumpTimer--;
    if (this.jumpTimer <= 0 && this.vy === 0) {
      this.vy = (enraged ? -5.2 : -4.5) * this.speedMul;
      this.vx = this.facing * (enraged ? 2.0 : 1.5) * this.speedMul;
      this.jumpTimer = jumpCD;
    }

    if (this.timer % shootCD === Math.floor(shootCD / 2)) {
      const cx = this.x + this.w / 2;
      const cy = this.y + 8;
      const dir = this.facing;
      // Abanico: 2 base, 3 si enrabietado, +1 más en experto
      let angles = enraged ? [-1.5, 0, 1.5] : [-1, 1];
      if (this.shotsExtra >= 1) angles = [...angles, enraged ? 2.2 : -1.8];
      if (this.shotsExtra <= -1 && angles.length > 1) angles = [angles[0]];
      for (const dy of angles) {
        const sprite = Math.random() < 0.5 ? SPR_EXAM : SPR_NOTE;
        this.shoot(new Projectile({
          x: cx, y: cy, vx: dir * 1.8 * this.speedMul, vy: dy,
          sprite, w: 8, h: 8, gravity: 0.08,
        }));
      }
    }

    if (this.vy === 0) this.vx *= 0.85;
    this.baseUpdate(level);
  }
}

// Devuelve el jugador vivo más cercano al boss.
function nearestPlayer(boss, players) {
  let best = null, bestD = Infinity;
  for (const p of players) {
    if (!p || p.dead) continue;
    const d = Math.abs((p.x + p.w/2) - (boss.x + boss.w/2));
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}
