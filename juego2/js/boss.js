// JEFES (los profes). Cada profe tiene un patrón de ataque distinto:
//
//   Juanjo   (tutor)        — exámenes en abanico + lápices + saltitos
//   Julio    (inglés)       — tazas de té en parábola y letras que rebotan
//   Mari Paz (música)       — notas musicales que rebotan
//   César    (ed. física)   — embiste a toda velocidad
//   Lucre    (la de Cleto)  — libros que caen del cielo
//   Emilio   (director)     — jefe final, combina varios ataques
//
// Todos heredan de Boss y reciben daño por boomerang o pisotón.
// Están "dormidos" hasta que llegas cerca (game.js los despierta).

class Projectile {
  constructor({ x, y, vx, vy, sprite, w = 8, h = 8, gravity = 0, bouncy = false, life = 240, spin = false }) {
    // Todos los proyectiles van a cámara un poco lenta (PROJECTILE_PACE):
    // misma trayectoria, pero da más tiempo a esquivarlos.
    const k = Projectile.PACE;
    this.x = x; this.y = y;
    this.vx = vx * k; this.vy = vy * k;
    this.w = w; this.h = h;
    this.sprite = sprite;
    this.gravity = gravity * k * k;
    this.bouncy = bouncy;
    this.life = Math.round(life / k);
    this.dead = false;
    this.t = 0;
    this.spin = spin;
  }
  static PACE = 0.82;
  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  update(level) {
    this.life--; this.t++;
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
    if (this.dead || !this.sprite) return;
    const alpha = this.life < 20 ? this.life / 20 : 1;
    const opts = { alpha };
    if (this.spin) opts.rot = this.t * 0.25;
    const flip = this.vx < 0 && !this.spin;
    const { w, h } = gridSize(this.sprite);
    drawSprite(ctx, this.sprite, this.x - camX + (this.w - w) / 2, this.y + (this.h - h) / 2, flip, opts);
  }
}

const SPR_EXAM = [
  'KKKKKKK.',
  'KWWWWWKK',
  'KWrrWWWK',
  'KWWWWWWK',
  'KWKKKKWK',
  'KWWWWWWK',
  'KWKKKWWK',
  'KKKKKKKK',
];
const SPR_NOTE = [
  '...KKKK.',
  '...KPPKK',
  '...KK.PK',
  '...K..KK',
  '.KKK....',
  'KPPPK...',
  'KPPPK...',
  '.KKK....',
];
const SPR_BIG_BOOK = [
  'KKKKKKKKKKKK',
  'KrrrrrrrrrrK',
  'KrWWWWWWWWrK',
  'KrWyyyyyyWrK',
  'KrWWWWWWWWrK',
  'KrrrrrrrrrrK',
  'KWWWWWWWWWWK',
  'KKKKKKKKKKKK',
];

class Boss {
  constructor({ x, y, sprite, name, role = '', hp = 3, w = 24, h = 32 }) {
    this.x = x; this.y = y;
    this.w = w; this.h = h;
    this.vx = 0; this.vy = 0;
    this.sprite = sprite;
    this.name = name;
    this.role = role;
    this.hp = hp;
    this.maxHp = hp;
    this.invuln = 0;
    this.dead = false;
    this.facing = -1;
    this.timer = 0;
    this.projectiles = [];
    this.victoryTimer = 0;
    this.awake = false;
    this.onGround = false;
    this.squash = 1;
    this.deathRot = 0;
    this.diffMode = 'hard';
    this.attackCDMul = 1.15;
    this.speedMul = 0.9;
    this.shotsExtra = 0;
    this.walker = makeWalker(-1);
    this.aimTimer = 0;   // frames girado hacia el jugador tras lanzar algo
  }

  applyDifficulty(diff) {
    this.diffMode = diff;
    if (diff === 'easy') {
      this.attackCDMul = 1.8;
      this.speedMul = 0.72;
      this.shotsExtra = -1;
      this.maxHp = Math.max(2, Math.round(this.maxHp * 0.7));
      this.hp = this.maxHp;
    } else if (diff === 'expert') {
      this.attackCDMul = 0.7;
      this.speedMul = 1.25;
      this.shotsExtra = 1;
      this.maxHp = this.maxHp + 1;
      this.hp = this.maxHp;
    }
  }

  cd(base) { return Math.max(12, Math.round(base * this.attackCDMul)); }

  rect() { return { x: this.x + 3, y: this.y + 2, w: this.w - 6, h: this.h - 2 }; }

  hit() {
    if (this.invuln > 0 || this.dead) return false;
    this.hp--;
    this.invuln = 60;
    this.squash = 0.75;
    if (this.hp <= 0) {
      this.dead = true;
      this.victoryTimer = 150;
      this.vy = -4;
      this.vx = -this.facing * 0.8;
    }
    return true;
  }

  // Mientras duerme sólo le afecta la gravedad.
  idleUpdate(level) {
    this.vy += 0.45;
    if (this.vy > 6) this.vy = 6;
    this.y += this.vy;
    if (level.collideAabb(this, 'y')) { this.vy = 0; this.onGround = true; }
  }

  baseUpdate(level) {
    this.squash += (1 - this.squash) * 0.15;
    for (const p of this.projectiles) p.update(level);
    this.projectiles = this.projectiles.filter(p => !p.dead);
    if (this.dead) {
      // derrotado: da un saltito, gira y se cae al suelo
      this.victoryTimer--;
      this.vy += 0.3;
      this.x += this.vx;
      this.y += this.vy;
      if (level.collideAabb(this, 'y')) { this.vy = 0; this.vx *= 0.8; }
      this.deathRot += (-this.facing * Math.PI / 2 - this.deathRot) * 0.1;
      return;
    }
    this.timer++;
    if (this.invuln > 0) this.invuln--;
    if (this.gravityOn !== false) {
      this.vy += 0.45;
      if (this.vy > 6) this.vy = 6;
      this.x += this.vx;
      if (level.collideAabb(this, 'x')) this.vx = -this.vx;
      const prevVy = this.vy;
      this.y += this.vy;
      const was = this.onGround;
      this.onGround = false;
      if (level.collideAabb(this, 'y')) {
        if (prevVy > 0) {
          this.onGround = true;
          if (!was && prevVy > 3) this.squash = 0.8;
        }
        this.vy = 0;
      }
    }
    // El cuerpo mira hacia donde anda; justo al lanzar algo se gira
    // hacia el jugador (this.facing es hacia dónde apunta).
    if (this.aimTimer > 0) this.aimTimer--;
    const aiming = this.aimTimer > 0;
    if (aiming) this.walker.facing = this.facing;
    stepWalker(this.walker, this.sprite, { vx: this.vx, onGround: this.onGround, lookAt: this.facing, lock: aiming });
  }

  shoot(p) { this.projectiles.push(p); this.aimTimer = Math.max(this.aimTimer, 20); }

  // Para que el gesto de "lanzar" se vea, estiramos un poco el sprite.
  windup() { this.squash = 1.15; this.aimTimer = 24; }

  draw(ctx, camX, level) {
    for (const p of this.projectiles) p.draw(ctx, camX);
    if (this.dead && this.victoryTimer <= 0) return;
    const contentH = gridContentHeight(this.sprite);
    const grid = this.dead ? animFrame(this.sprite, 'hurt', 0)
      : (this.awake ? walkerFrame(this.walker, this.sprite, this.vy) : this.sprite);
    const sx = this.x - camX;
    const sy = this.y + this.h - contentH + (this.dead ? 0 : walkerBob(this.walker));
    if (!this.dead) drawGroundShadow(ctx, level, this.x + this.w / 2, this.y + this.h, 22, camX);
    const flash = this.invuln > 50;
    const blink = this.invuln > 0 && this.invuln % 8 < 4;
    // respirar (sólo quieto)
    const breathe = this.walker.moving ? 0 : Math.sin(this.timer * 0.08) * 0.02;
    const rot = this.dead ? this.deathRot : 0;
    const sq = this.squash;
    drawSprite(ctx, grid, sx, sy, this.walker.facing < 0, {
      flash,
      alpha: this.dead ? Math.min(1, this.victoryTimer / 30) : (blink ? 0.6 : 1),
      scaleX: 2 - sq, scaleY: sq + breathe,
      rot,
    });
    if (!this.awake && !this.dead) {
      drawText(ctx, 'z', sx + this.w - 2, sy - 2 - (this.timer % 40) / 8, { size: 7, color: '#ffffff', alpha: 0.8 });
    }
  }
}

// =============================================================
// JUANJO (tutor): exámenes en abanico, lápices rectos y saltos
// =============================================================
class BossJuanjo extends Boss {
  constructor(x, y) {
    super({ x, y, sprite: Sprites.juanjo, name: 'Juanjo', role: 'el tutor', hp: 3 });
    this.state = 'idle';
    this.stateTimer = 70;
    this.shotCount = 0;
  }
  update(level, players) {
    if (this.dead) { this.baseUpdate(level); return; }
    const target = nearestPlayer(this, players);
    if (target) this.facing = target.x > this.x ? 1 : -1;
    this.stateTimer--;
    if (this.state === 'idle') {
      this.vx *= 0.8;
      const cooldown = this.cd(50);
      if (this.timer % cooldown === Math.floor(cooldown / 2)) {
        this.windup();
        const cx = this.x + this.w / 2, cy = this.y + 12, dir = this.facing;
        this.shotCount++;
        if (this.shotCount % 3 === 0) {
          // abanico de exámenes
          const angles = this.shotsExtra >= 1 ? [-1.4, -0.6, 0.2, 1.0] : (this.shotsExtra <= -1 ? [-0.8, 0.6] : [-1.2, -0.2, 0.8]);
          for (const dy of angles) {
            this.shoot(new Projectile({ x: cx, y: cy, vx: dir * 1.6 * this.speedMul, vy: dy, sprite: SPR_EXAM, gravity: 0.05, spin: true }));
          }
        } else {
          this.shoot(new Projectile({ x: cx, y: cy, vx: dir * 2.4 * this.speedMul, vy: 0, sprite: Sprites.lapiz, w: 9, h: 7 }));
        }
      }
      if (this.stateTimer <= 0) {
        this.state = 'hop';
        this.stateTimer = 30;
        this.vy = -4 * this.speedMul;
        this.vx = this.facing * 1.4 * this.speedMul;
      }
    } else if (this.stateTimer <= 0 && this.onGround) {
      this.state = 'idle';
      this.stateTimer = Math.round(90 * this.attackCDMul);
    }
    this.baseUpdate(level);
  }
}

// =============================================================
// JULIO (inglés): tazas de té en parábola + banderas Union Jack
// =============================================================
class BossJulio extends Boss {
  constructor(x, y) {
    super({ x, y, sprite: Sprites.julio, name: 'Julio', role: 'el profe de inglés', hp: 4 });
    this.home = x;
    this.vx = 0.6;
  }
  update(level, players) {
    if (this.dead) { this.baseUpdate(level); return; }
    const target = nearestPlayer(this, players);
    if (target) this.facing = target.x > this.x ? 1 : -1;
    const v = 0.6 * this.speedMul;
    if (this.x < this.home - 40) this.vx = v;
    if (this.x > this.home + 30) this.vx = -v;
    const cooldown = this.cd(70);
    const phase = this.timer % cooldown;
    if (phase === Math.floor(cooldown / 2)) {
      this.windup();
      const cx = this.x + this.w / 2, cy = this.y + 6;
      // taza de té que apunta (más o menos) a donde estás
      const dist = target ? (target.x - cx) : this.facing * 80;
      const vx = Math.max(-2.2, Math.min(2.2, dist / 55)) * this.speedMul;
      this.shoot(new Projectile({ x: cx, y: cy, vx, vy: -4, sprite: Sprites.tea, gravity: 0.15, life: 200, spin: true }));
      if (this.shotsExtra >= 1) this.shoot(new Projectile({ x: cx, y: cy, vx: vx * 0.6, vy: -4.6, sprite: Sprites.tea, gravity: 0.15, life: 200, spin: true }));
    }
    if (phase === 0 && this.shotsExtra > -1) {
      const cx = this.x + this.w / 2, cy = this.y + 14;
      this.shoot(new Projectile({
        x: cx, y: cy, vx: this.facing * 1.3 * this.speedMul, vy: -2,
        sprite: Sprites.ukFlag, w: 10, h: 8, spin: true,
        gravity: 0.16, bouncy: true, life: 260,
      }));
    }
    this.baseUpdate(level);
  }
}

// =============================================================
// MARI PAZ (música): notas musicales que rebotan
// =============================================================
class BossMariPaz extends Boss {
  constructor(x, y) {
    super({ x, y, sprite: Sprites.mariPaz, name: 'Mari Paz', role: 'la profe de música', hp: 4 });
    this.patrolFrom = x - 32;
    this.patrolTo = x + 32;
    this.vx = 0.5;
  }
  update(level, players) {
    if (this.dead) { this.baseUpdate(level); return; }
    const target = nearestPlayer(this, players);
    if (target) this.facing = target.x > this.x ? 1 : -1;
    const v = 0.5 * this.speedMul;
    if (this.x < this.patrolFrom) this.vx = v;
    if (this.x > this.patrolTo) this.vx = -v;
    const cooldown = this.cd(60);
    if (this.timer % cooldown === Math.floor(cooldown / 2)) {
      this.windup();
      const cx = this.x + this.w / 2, cy = this.y + 12;
      this.shoot(new Projectile({ x: cx, y: cy, vx: this.facing * 1.2 * this.speedMul, vy: -1.5, sprite: SPR_NOTE, gravity: 0.18, bouncy: true, life: 300 }));
      if (this.shotsExtra >= 1) {
        this.shoot(new Projectile({ x: cx, y: cy, vx: -this.facing * 1.0 * this.speedMul, vy: -2.0, sprite: SPR_NOTE, gravity: 0.18, bouncy: true, life: 300 }));
      }
    }
    this.baseUpdate(level);
  }
}

// =============================================================
// CÉSAR (ed. física): embestidas a toda velocidad
// =============================================================
class BossCesar extends Boss {
  constructor(x, y) {
    super({ x, y, sprite: Sprites.cesar, name: 'César', role: 'el profe de gimnasia', hp: 4 });
    this.state = 'idle';
    this.stateTimer = 60;
  }
  update(level, players) {
    if (this.dead) { this.baseUpdate(level); return; }
    const target = nearestPlayer(this, players);
    this.stateTimer--;
    if (this.state === 'idle') {
      if (target) this.facing = target.x > this.x ? 1 : -1;
      this.vx *= 0.7;
      // tiembla justo antes de embestir (aviso para el jugador)
      if (this.stateTimer < 20) this.x += (this.stateTimer % 4 < 2 ? 0.5 : -0.5);
      if (this.stateTimer <= 0) {
        this.state = 'charge';
        this.stateTimer = Math.round(90 * this.attackCDMul);
        this.vx = this.facing * 3.2 * this.speedMul;
        Audio8.whistle();
      }
    } else {
      if (Math.abs(this.vx) < 0.5 || this.stateTimer <= 0) {
        this.state = 'idle';
        this.stateTimer = Math.round(60 * this.attackCDMul);
      }
    }
    this.baseUpdate(level);
  }
}

// =============================================================
// LUCRE (la profe de Cleto): libros caen del cielo
// =============================================================
class BossLucre extends Boss {
  constructor(x, y) {
    super({ x, y, sprite: Sprites.lucre, name: 'Lucre', role: 'la profe de Cleto', hp: 5 });
  }
  update(level, players) {
    if (this.dead) { this.baseUpdate(level); return; }
    const target = nearestPlayer(this, players);
    if (target) this.facing = target.x > this.x ? 1 : -1;
    const cooldown = this.cd(50);
    if (this.timer % cooldown === Math.floor(cooldown / 2) && target) {
      this.windup();
      // el libro cae justo donde estás... ¡muévete!
      this.shoot(new Projectile({ x: target.x - 2 + target.vx * 10, y: -10, vx: 0, vy: 0, sprite: SPR_BIG_BOOK, w: 12, h: 8, gravity: 0.22 * this.speedMul, life: 400 }));
      if (this.shotsExtra >= 1) {
        this.shoot(new Projectile({ x: target.x + 16, y: -24, vx: 0, vy: 0, sprite: SPR_BIG_BOOK, w: 12, h: 8, gravity: 0.22 * this.speedMul, life: 400 }));
      }
    }
    this.baseUpdate(level);
  }
}

// =============================================================
// EMILIO (director, jefe final): combina ataques + salta
// =============================================================
class BossEmilio extends Boss {
  constructor(x, y) {
    super({ x, y, sprite: Sprites.emilio, name: 'Emilio', role: 'el director', hp: 10 });
    this.jumpTimer = 60;
  }
  update(level, players) {
    if (this.dead) { this.baseUpdate(level); return; }
    const target = nearestPlayer(this, players);
    if (target) this.facing = target.x > this.x ? 1 : -1;
    const enraged = this.hp <= this.maxHp / 2;
    const jumpCD = this.cd(enraged ? 50 : 80);
    const shootCD = this.cd(enraged ? 45 : 70);

    this.jumpTimer--;
    if (this.jumpTimer <= 0 && this.onGround) {
      this.vy = (enraged ? -5.2 : -4.5) * this.speedMul;
      this.vx = this.facing * (enraged ? 2.0 : 1.5) * this.speedMul;
      this.jumpTimer = jumpCD;
    }
    if (this.timer % shootCD === Math.floor(shootCD / 2)) {
      this.windup();
      const cx = this.x + this.w / 2, cy = this.y + 8, dir = this.facing;
      let angles = enraged ? [-1.5, 0, 1.5] : [-1, 1];
      if (this.shotsExtra >= 1) angles = [...angles, enraged ? 2.2 : -1.8];
      if (this.shotsExtra <= -1 && angles.length > 1) angles = [angles[0]];
      for (const dy of angles) {
        const sprite = Math.random() < 0.5 ? SPR_EXAM : SPR_NOTE;
        this.shoot(new Projectile({ x: cx, y: cy, vx: dir * 1.8 * this.speedMul, vy: dy, sprite, gravity: 0.08, spin: sprite === SPR_EXAM }));
      }
    }
    if (this.onGround) this.vx *= 0.85;
    this.baseUpdate(level);
  }
}

function nearestPlayer(boss, players) {
  let best = null, bestD = Infinity;
  for (const p of players) {
    if (!p || p.dead) continue;
    const d = Math.abs((p.x + p.w / 2) - (boss.x + boss.w / 2));
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}
