// Jugador (Lucas o Cleto). Movimiento estilo plataformas clásico:
//   - aceleración, fricción y DERRAPE al cambiar de sentido
//   - menos control en el aire (más realista)
//   - salto con altura variable (mantén saltar para subir más)
//   - caída algo más rápida que la subida (se siente más "pesado")
//   - coyote time y jump buffer (perdonan despistes)
//   - aplastar/estirar el sprite al aterrizar/saltar
//   - empujón hacia atrás al recibir daño

class Player {
  constructor({ x, y, sprite, name, index }) {
    this.x = x;
    this.y = y;
    this.w = 12;          // hitbox más estrecha que el sprite (16) — perdona errores
    this.h = 16;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.facing = 1;
    this.sprite = sprite;
    this.name = name;
    this.index = index;
    this.lives = 3;
    this.invuln = 0;
    this.paralyzed = 0;
    this.dead = false;
    this.boomerangs = [];
    this.jumpHoldFrames = 0;
    this.powerup = null;
    this.powerupTimer = 0;
    this.airJumpAvailable = false;
    this.coyoteFrames = 0;
    this.jumpBufferFrames = 0;
    this.spawnX = x;
    this.spawnY = y;
    this.lastSafeX = x;
    this.lastSafeY = y;
    this.slipping = 0;
    this.slipDir = 0;
    this.barriga = 0;
    this.pedos = [];
    // Animación
    this.animT = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.knockback = 0;     // frames sin control tras un golpe
    this.skidding = false;
    this.combo = 0;         // pisotones encadenados sin tocar el suelo
    this.hitsTaken = 0;     // golpes recibidos en el nivel (modo competitivo)
    // Eventos para que game.js lance partículas/sonidos
    this.events = [];
  }

  static BARRIGA_FULL = 4;

  // Física ajustada para un ritmo más tranquilo: todo va ~15% más lento
  // que antes pero los saltos llegan igual de alto y de lejos.
  static GRAVITY = 0.275;
  static FALL_GRAVITY = 0.33;
  static MAX_FALL = 6;
  static MOVE_ACCEL = 0.3;
  static AIR_ACCEL = 0.22;
  static SKID_DECEL = 0.55;
  static MOVE_MAX = 2.2;
  static FRICTION = 0.24;
  static JUMP_VELOCITY = -4.68;
  static JUMP_HOLD_BOOST = -0.145;
  static MAX_JUMP_HOLD = 23;
  static JUMP_DIRECTIONAL_KICK = 1.55;
  static COYOTE_FRAMES = 8;
  static JUMP_BUFFER_FRAMES = 10;

  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  hurt(fromX) {
    if (this.invuln > 0 || this.dead) return false;
    if (this.powerup === 'invincible') return false;
    this.lives--;
    this.hitsTaken++;
    this.invuln = 100;
    Audio8.hurt();
    if (this.lives <= 0) {
      this.dead = true;
      this.vx = 0;
      this.vy = 0;
    } else {
      const dir = fromX === undefined ? -this.facing : (this.x + this.w / 2 < fromX ? -1 : 1);
      this.vx = dir * 2;
      this.vy = -2.7;
      this.knockback = 16;
      this.onGround = false;
    }
    return true;
  }

  scold() {
    if (this.paralyzed > 0 || this.dead) return;
    if (this.powerup === 'invincible') return;
    this.paralyzed = 90;
    this.vx = 0;
    Audio8.scold();
  }

  // ¡Cáscara de plátano! Primero patina agitando los brazos (perdiendo
  // el equilibrio) y al final se cae de culo, mareado, antes de levantarse.
  static SLIP_FRAMES = 84;
  static SLIP_SIT_FRAMES = 30;   // los últimos frames: sentado en el suelo

  slip(dir) {
    if (this.dead) return;
    this.slipping = Player.SLIP_FRAMES;
    this.slipDir = dir || (this.facing < 0 ? -1 : 1);
    this.vy = Math.min(this.vy, -2.2);   // los pies se van por delante
    this.onGround = false;
    this.slipSpeed = Player.MOVE_MAX * 1.25;
    Audio8.slip();
  }

  get slipSitting() { return this.slipping > 0 && this.slipping <= Player.SLIP_SIT_FRAMES; }

  feed(n = 1) {
    this.barriga = Math.min(Player.BARRIGA_FULL, this.barriga + n);
    return this.barriga >= Player.BARRIGA_FULL;
  }

  applyPowerup(kind, frames = 600) {
    this.powerup = kind;
    this.powerupTimer = frames;
    this.airJumpAvailable = false;
  }

  _land(prevVy) {
    if (prevVy > 2.1) {
      const k = Math.min(1, (prevVy - 2.1) / 3.4);
      this.scaleX = 1 + 0.25 * k;
      this.scaleY = 1 - 0.25 * k;
      this.events.push({ type: 'land', strength: k });
    }
    this.combo = 0;
  }

  update(ctrl, level) {
    if (this.dead) return;
    this.events.length = 0;

    // vuelve poco a poco a la escala normal
    this.scaleX += (1 - this.scaleX) * 0.22;
    this.scaleY += (1 - this.scaleY) * 0.22;

    if (this.paralyzed > 0) {
      this.paralyzed--;
      ctrl = {};
    }
    if (this.knockback > 0) {
      this.knockback--;
      ctrl = { jumpHeld: ctrl.jumpHeld };
    }

    // ---- horizontal ----
    const speedMul = this.powerup === 'speed' ? 1.45 : 1;
    const max = Player.MOVE_MAX * speedMul;
    const accel = (this.onGround ? Player.MOVE_ACCEL : Player.AIR_ACCEL) * speedMul;
    this.skidding = false;
    if (this.slipping > 0) {
      this.slipping--;
      if (this.slipping === Player.SLIP_SIT_FRAMES) {
        // ¡pumba! culetazo
        this.scaleX = 1.3; this.scaleY = 0.75;
        this.events.push({ type: 'slipThud' });
        Audio8.bonk();
      }
      if (this.slipSitting) this.slipSpeed *= 0.86;
      else this.slipSpeed *= 0.985;
      this.vx = this.slipDir * this.slipSpeed;
      this.facing = this.slipDir > 0 ? 1 : -1;
      ctrl = { jumpHeld: false };
      if (this.onGround && !this.slipSitting && this.slipping % 4 === 0) this.events.push({ type: 'slipSkid' });
    } else if (ctrl.left || ctrl.right) {
      const dir = ctrl.left ? -1 : 1;
      if (this.vx * dir < 0 && this.onGround) {
        // derrape: frenamos más fuerte que la aceleración normal
        this.vx += dir * Player.SKID_DECEL;
        if (Math.abs(this.vx) > 1.2) this.skidding = true;
      } else {
        this.vx += dir * accel;
      }
      this.facing = dir;
    } else if (this.knockback <= 0) {
      const fr = this.onGround ? Player.FRICTION : Player.FRICTION * 0.35;
      if (this.vx > 0) this.vx = Math.max(0, this.vx - fr);
      else if (this.vx < 0) this.vx = Math.min(0, this.vx + fr);
    }
    if (this.knockback <= 0) this.vx = Math.max(-max * 1.2, Math.min(max * 1.2, this.vx));

    // ---- salto con jump buffer + coyote time ----
    if (ctrl.jumpTap) this.jumpBufferFrames = Player.JUMP_BUFFER_FRAMES;
    if (this.onGround) {
      this.coyoteFrames = Player.COYOTE_FRAMES;
      if (this.powerup === 'doubleJump') this.airJumpAvailable = true;
    }
    const baseJumpV = this.powerup === 'superJump' ? Player.JUMP_VELOCITY * 1.35 : Player.JUMP_VELOCITY;

    if (this.jumpBufferFrames > 0 && this.coyoteFrames > 0) {
      this.vy = baseJumpV;
      this.onGround = false;
      this.jumpHoldFrames = 0;
      this.jumpBufferFrames = 0;
      this.coyoteFrames = 0;
      this.scaleX = 0.82; this.scaleY = 1.2;
      this.events.push({ type: 'jump' });
      Audio8.jump();
      if (ctrl.right && this.vx < Player.JUMP_DIRECTIONAL_KICK) this.vx = Player.JUMP_DIRECTIONAL_KICK;
      else if (ctrl.left && this.vx > -Player.JUMP_DIRECTIONAL_KICK) this.vx = -Player.JUMP_DIRECTIONAL_KICK;
    } else if (ctrl.jumpTap && this.powerup === 'doubleJump' && this.airJumpAvailable && !this.onGround) {
      this.vy = baseJumpV * 0.9;
      this.airJumpAvailable = false;
      this.jumpHoldFrames = 0;
      this.jumpBufferFrames = 0;
      this.scaleX = 0.85; this.scaleY = 1.15;
      this.events.push({ type: 'airjump' });
      Audio8.jump();
    }
    if (ctrl.jumpHeld && this.vy < 0 && this.jumpHoldFrames < Player.MAX_JUMP_HOLD) {
      this.vy += Player.JUMP_HOLD_BOOST;
      this.jumpHoldFrames++;
    }
    if (this.jumpBufferFrames > 0) this.jumpBufferFrames--;
    if (this.coyoteFrames > 0) this.coyoteFrames--;

    // ---- gravedad (más fuerte al caer; flotamos un pelín en el vértice) ----
    let g = this.vy > 0 ? Player.FALL_GRAVITY : Player.GRAVITY;
    if (ctrl.jumpHeld && Math.abs(this.vy) < 0.7) g *= 0.6;
    this.vy += g;
    if (this.vy > Player.MAX_FALL) this.vy = Player.MAX_FALL;

    // ---- colisión con tiles (eje X primero, luego Y) ----
    this.x += this.vx;
    if (level.collideAabb(this, 'x')) this.vx = 0;
    const prevVy = this.vy;
    const wasOnGround = this.onGround;
    this.y += this.vy;
    this.onGround = false;
    if (level.collideAabb(this, 'y')) {
      if (prevVy > 0) {
        const cx = this.x + this.w / 2;
        const tileBelow = level.tileAt(cx, this.y + this.h + 1);
        if (tileBelow === 't') {
          this.vy = ctrl.jumpHeld ? -7.65 : -6.8;
          this.jumpHoldFrames = Player.MAX_JUMP_HOLD;
          this.scaleX = 1.3; this.scaleY = 0.7;
          level.springAt(cx, this.y + this.h + 1);
          this.events.push({ type: 'spring' });
          Audio8.spring();
        } else {
          this.onGround = true;
          if (!wasOnGround) this._land(prevVy);
          this.vy = 0;
        }
      } else if (prevVy < 0) {
        const cx = this.x + this.w / 2;
        const ay = this.y - 1;
        const col = Math.floor(cx / TILE_SIZE);
        const row = Math.floor(ay / TILE_SIZE);
        if (level.tileAt(cx, ay) === '?') {
          level.popSurpriseBlock(col, row);
          Audio8.block();
        } else {
          this.events.push({ type: 'bonk', x: cx, y: ay + 1 });
          Audio8.bonk();
        }
        this.vy = 0.5;
      } else {
        this.vy = 0;
      }
    }

    if (this.onGround) {
      this.lastSafeX = this.x;
      this.lastSafeY = this.y;
    }

    // ---- caída al vacío ----
    if (this.y > level.heightPx + 32) {
      this.invuln = 0;
      this.hurt();
      this.knockback = 0;
      if (!this.dead) {
        this.x = this.lastSafeX;
        this.y = this.lastSafeY - 16;
        this.vx = 0;
        this.vy = 0;
        this.invuln = 90;
        this.events.push({ type: 'respawn' });
      }
    }

    // ---- boomerang ----
    const maxBoomerangs = this.powerup === 'doubleBoomerang' ? 2 : 1;
    if (ctrl.shootTap && this.boomerangs.length < maxBoomerangs) {
      this.boomerangs.push(new Boomerang(this, this.facing));
      Audio8.boomerang();
    }
    for (const b of this.boomerangs) b.update(level);
    this.boomerangs = this.boomerangs.filter(b => !b.dead);

    // ---- pedo (sale por detrás y te empuja un poco hacia delante) ----
    if (ctrl.pedoTap && this.barriga >= Player.BARRIGA_FULL) {
      const ex = this.facing > 0 ? this.x - 18 : this.x + this.w;
      this.pedos.push(new PedoCloud(ex, this.y + 4, -this.facing));
      this.barriga = 0;
      this.scaleX = 0.85; this.scaleY = 1.2;
      this.vx += this.facing * 1.6;
      if (this.onGround) { this.vy = -2.4; this.onGround = false; }
      Audio8.fart();
    }
    for (const e of this.pedos) e.update();
    this.pedos = this.pedos.filter(e => !e.dead);

    // ---- animación ----
    if (this.onGround) this.animT += Math.abs(this.vx) * strideOf(this.sprite);
    else this.animT = 0;
    if (this.onGround && (this.skidding || (Math.abs(this.vx) > 2.0 && Math.random() < 0.12))) {
      this.events.push({ type: this.skidding ? 'skid' : 'run' });
    }

    if (this.invuln > 0) this.invuln--;
    if (this.powerupTimer > 0) {
      this.powerupTimer--;
      if (this.powerupTimer <= 0) this.powerup = null;
    }
  }

  frame() {
    if (this.slipping > 0) {
      if (this.slipSitting) return animFrame(this.sprite, 'sit', 0);
      return animFrame(this.sprite, 'slip', Math.floor(this.slipping / 5));
    }
    if (this.paralyzed > 0 || this.knockback > 0) return animFrame(this.sprite, 'hurt', 0);
    if (!this.onGround) return animFrame(this.sprite, this.vy < 0 ? 'jump' : 'fall', 0);
    if (Math.abs(this.vx) > 0.25) return animFrame(this.sprite, 'walk', this.animT);
    return animFrame(this.sprite, 'idle', performance.now() / 16.6 + this.index * 50);
  }

  draw(ctx, camX, level) {
    if (this.dead) return;
    drawGroundShadow(ctx, level, this.x + this.w / 2, this.y + this.h, 12, camX);

    const grid = this.frame();
    const gh = spriteH(grid);
    const sx = this.x - camX - 2;
    let sy = this.y + this.h - gh;
    // rebote de la carrera (fotogramas de "paso" un píxel más arriba)
    if (this.onGround && Math.abs(this.vx) > 0.25 && Math.floor(this.animT) % 2 === 1) sy -= 1;

    // Aura del power-up
    if (this.powerup) {
      const auraColors = { invincible: '#ffd860', superJump: '#66ddff', doubleBoomerang: '#ff66ff', doubleJump: '#88ff88', magnet: '#ff8844', speed: '#ffffff' };
      const c = auraColors[this.powerup] || '#ffffff';
      if (this.powerupTimer > 120 || this.powerupTimer % 8 < 4) {
        const pulse = Math.sin(performance.now() / 120) * 0.15 + 0.35;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.ellipse(this.x + this.w / 2 - camX, this.y + this.h / 2, 11, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (this.powerup === 'invincible' && Math.random() < 0.4) {
        ctx.fillStyle = ['#ffd860', '#ff66ff', '#66ddff'][Math.floor(Math.random() * 3)];
        ctx.fillRect(snap(this.x - camX + Math.random() * 14 - 1), snap(this.y + Math.random() * 16), 1, 1);
      }
    }

    // parpadeo tras golpe (semitransparente en lugar de desaparecer del todo)
    const blinking = this.invuln > 0 && (this.invuln % 8 < 4);
    // resbalón: se inclina hacia atrás y se tambalea
    let rot = 0;
    if (this.slipping > 0 && !this.slipSitting) {
      const t = Player.SLIP_FRAMES - this.slipping;
      rot = -this.facing * (0.22 + Math.sin(t * 0.45) * 0.22);
    }
    drawSprite(ctx, grid, sx, sy, this.facing < 0, {
      rot,
      scaleX: this.scaleX, scaleY: this.scaleY,
      alpha: blinking ? 0.35 : 1,
      flash: this.knockback > 12,
    });

    if (this.slipping > 0) {
      const cx = this.x + this.w / 2 - camX;
      if (this.slipSitting) {
        // pajaritos / estrellas dando vueltas
        for (let i = 0; i < 3; i++) {
          const a = this.slipping * 0.2 + i * (Math.PI * 2 / 3);
          ctx.fillStyle = i % 2 ? '#ffd860' : '#ffffff';
          ctx.fillRect(snap(cx + Math.cos(a) * 7 - 0.75), snap(this.y - 1 + Math.sin(a) * 2), 1.5, 1.5);
        }
      } else {
        // gotas de sudor saltando
        const t = Player.SLIP_FRAMES - this.slipping;
        ctx.fillStyle = '#9fe0ff';
        for (let i = 0; i < 2; i++) {
          const k = ((t + i * 9) % 18) / 18;
          const side = i ? 1 : -1;
          ctx.fillRect(snap(cx + side * (5 + k * 4)), snap(this.y - 2 - Math.sin(k * Math.PI) * 4), 1, 1.5);
        }
      }
    }
    if (this.paralyzed > 0) {
      drawText(ctx, '!?', this.x + this.w / 2 - camX, this.y - 4 - Math.sin(this.paralyzed * 0.3) * 1.5,
        { size: 8, color: '#ffd860', align: 'center' });
    }
    for (const b of this.boomerangs) b.draw(ctx, camX);
    for (const e of this.pedos) e.draw(ctx, camX);
  }
}
