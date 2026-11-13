// Jugador (Lucas o Cleto). Movimiento estilo Mario:
//   - aceleración y fricción horizontal
//   - salto con altura variable (mantén Z para saltar más alto)
//   - gravedad
//   - colisión con tiles del nivel (AABB con resolución por ejes)
//   - puede pisar enemigos (rebote)
//   - puede lanzar boomerang
//   - parpadea tras recibir daño (invulnerabilidad temporal)

class Player {
  constructor({x, y, sprite, name, index}) {
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
    this.index = index;   // 0 = P1, 1 = P2
    this.lives = 3;
    this.invuln = 0;      // frames restantes de invulnerabilidad
    this.paralyzed = 0;   // frames que estamos paralizados (regañina)
    this.dead = false;
    this.boomerangs = [];   // hasta 1 normalmente, 2 con power-up
    this.jumpHoldFrames = 0;
    // Power-ups (amigos)
    this.powerup = null;    // string identificador o null
    this.powerupTimer = 0;
    // Doble salto (sólo cuenta cuando tienes el power-up de Jorge)
    this.airJumpAvailable = false;
    // Coyote time: aún puedes saltar durante N frames después de salir
    // del suelo (perdona despistes y "huecos" en la colisión).
    this.coyoteFrames = 0;
    // Jump buffer: si pulsas saltar justo antes de tocar el suelo,
    // se guarda durante N frames y salta en cuanto aterrice.
    this.jumpBufferFrames = 0;
    this.spawnX = x;
    this.spawnY = y;
    // Última posición segura (sobre suelo). Se actualiza cada frame que
    // estás apoyado, y es donde reapareces si caes al vacío. Así, en
    // 2 jugadores, el que cae no vuelve al inicio del nivel y la cámara
    // no se descompone separando a los dos personajes.
    this.lastSafeX = x;
    this.lastSafeY = y;
    // Patinazo por cáscara de plátano: vx forzado, sin input horizontal,
    // durante unos frames.
    this.slipping = 0;
    this.slipDir = 0;
    // Barriga: sube cada vez que recoges un bocadillo (Q). Al llegar a
    // BARRIGA_FULL, puedes pulsar E para soltar un eructo aturdidor.
    this.barriga = 0;
    this.eructos = [];
  }

  static BARRIGA_FULL = 4;

  // Cinemática estilo Mario clásico:
  //  - Tap rápido (sueltas Z enseguida): salto bajo ~2 tiles.
  //  - Mantener Z: salto alto ~3.4 tiles.
  // El truco: cuando mantienes Z, la gravedad se ATENÚA (JUMP_HOLD_BOOST
  // contrarresta parte de la gravedad) durante hasta `maxJumpHold` frames.
  static GRAVITY = 0.38;
  static MAX_FALL = 7;
  static MOVE_ACCEL = 0.55;
  static MOVE_MAX = 2.6;
  static FRICTION = 0.5;
  static JUMP_VELOCITY = -5.5;
  static JUMP_HOLD_BOOST = -0.20;
  static MAX_JUMP_HOLD = 20;
  // Cuando saltas con dirección apretada, empujamos vx al menos a este valor
  // para que el salto en diagonal se note inmediatamente.
  static JUMP_DIRECTIONAL_KICK = 1.8;
  // Frames de tolerancia (a 60 FPS) para coyote time y jump buffer.
  static COYOTE_FRAMES = 6;
  static JUMP_BUFFER_FRAMES = 8;

  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  hurt() {
    if (this.invuln > 0 || this.dead) return;
    if (this.powerup === 'invincible') return;  // power-up de Rafa
    this.lives--;
    this.invuln = 90; // 1.5s
    Audio8.hurt();
    if (this.lives <= 0) {
      // Última vida: queda K.O. en el sitio (no se dibuja, no se mueve).
      // Esperará a que el otro jugador termine el nivel o también muera.
      this.dead = true;
      this.vx = 0;
      this.vy = 0;
    } else {
      this.vy = -3; // rebote leve sólo en daño no mortal
    }
  }

  respawn() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.vx = this.vy = 0;
    this.invuln = 60;
    this.dead = false;
  }

  scold() {
    // Regañina de papá/mamá: paraliza ~90 frames pero no quita vida.
    if (this.paralyzed > 0 || this.dead) return;
    if (this.powerup === 'invincible') return;
    this.paralyzed = 90;
    this.vx = 0;
    Audio8.scold();
  }

  slip(dir) {
    if (this.dead) return;
    this.slipping = 50;
    this.slipDir = dir || (this.facing < 0 ? -1 : 1);
    Audio8.slip();
  }

  feed() {
    // Recoger un bocadillo. Devuelve true si la barriga está llena
    // tras el mordisco.
    if (this.barriga < Player.BARRIGA_FULL) this.barriga++;
    return this.barriga >= Player.BARRIGA_FULL;
  }

  applyPowerup(kind) {
    this.powerup = kind;
    this.powerupTimer = 600; // 10 segundos a 60 FPS
    this.airJumpAvailable = false;
  }

  update(ctrl, level) {
    if (this.dead) return;

    // Si está paralizado: solo aplicamos gravedad y no procesamos input.
    if (this.paralyzed > 0) {
      this.paralyzed--;
      this.vx = 0;
      this.vy += Player.GRAVITY;
      if (this.vy > Player.MAX_FALL) this.vy = Player.MAX_FALL;
      this.x += this.vx;
      level.collideAabb(this, 'x');
      this.y += this.vy;
      this.onGround = false;
      if (level.collideAabb(this, 'y')) {
        if (this.vy > 0) this.onGround = true;
        this.vy = 0;
      }
      if (this.invuln > 0) this.invuln--;
      return;
    }

    // ---- horizontal ----
    if (this.slipping > 0) {
      // Patinazo: el input horizontal se ignora, deslizamos a tope en
      // la dirección del patinazo. Aún puedes saltar (es la única salida).
      this.slipping--;
      this.vx = this.slipDir * Player.MOVE_MAX * 1.15;
      this.facing = this.slipDir > 0 ? 1 : -1;
    } else if (ctrl.left) {
      this.vx -= Player.MOVE_ACCEL;
      this.facing = -1;
    } else if (ctrl.right) {
      this.vx += Player.MOVE_ACCEL;
      this.facing = 1;
    } else {
      // fricción
      if (this.vx > 0) this.vx = Math.max(0, this.vx - Player.FRICTION);
      else if (this.vx < 0) this.vx = Math.min(0, this.vx + Player.FRICTION);
    }
    this.vx = Math.max(-Player.MOVE_MAX * 1.2, Math.min(Player.MOVE_MAX * 1.2, this.vx));

    // ---- salto con jump buffer + coyote time ----
    // Si pulsas saltar, abrimos una "ventana" de unos frames durante la
    // que el salto está pendiente de ejecutarse. Y si acabas de salir
    // del suelo, mantenemos otra ventana donde aún se considera "en suelo".
    if (ctrl.jumpTap) this.jumpBufferFrames = Player.JUMP_BUFFER_FRAMES;
    if (this.onGround) {
      this.coyoteFrames = Player.COYOTE_FRAMES;
      // Al tocar suelo, recargamos el "air jump" si tenemos doble salto.
      if (this.powerup === 'doubleJump') this.airJumpAvailable = true;
    }

    const baseJumpV = this.powerup === 'superJump'
      ? Player.JUMP_VELOCITY * 1.35  // power-up de Matías
      : Player.JUMP_VELOCITY;

    if (this.jumpBufferFrames > 0 && this.coyoteFrames > 0) {
      // Salto normal desde suelo (con coyote time).
      this.vy = baseJumpV;
      this.onGround = false;
      this.jumpHoldFrames = 0;
      this.jumpBufferFrames = 0;
      this.coyoteFrames = 0;
      Audio8.jump();
      if (ctrl.right && this.vx < Player.JUMP_DIRECTIONAL_KICK) {
        this.vx = Player.JUMP_DIRECTIONAL_KICK;
      } else if (ctrl.left && this.vx > -Player.JUMP_DIRECTIONAL_KICK) {
        this.vx = -Player.JUMP_DIRECTIONAL_KICK;
      }
    } else if (ctrl.jumpTap && this.powerup === 'doubleJump' && this.airJumpAvailable && !this.onGround) {
      // Doble salto en aire (power-up de Jorge): un único impulso extra.
      this.vy = baseJumpV * 0.9;
      this.airJumpAvailable = false;
      this.jumpHoldFrames = 0;
      this.jumpBufferFrames = 0;
      Audio8.jump();
    }
    if (ctrl.jumpHeld && this.vy < 0 && this.jumpHoldFrames < Player.MAX_JUMP_HOLD) {
      this.vy += Player.JUMP_HOLD_BOOST;
      this.jumpHoldFrames++;
    }
    if (this.jumpBufferFrames > 0) this.jumpBufferFrames--;
    if (this.coyoteFrames > 0) this.coyoteFrames--;

    // ---- gravedad ----
    this.vy += Player.GRAVITY;
    if (this.vy > Player.MAX_FALL) this.vy = Player.MAX_FALL;

    // ---- colisión con tiles (eje X primero, luego Y) ----
    this.x += this.vx;
    if (level.collideAabb(this, 'x')) { this.vx = 0; }
    const prevVy = this.vy;
    this.y += this.vy;
    this.onGround = false;
    if (level.collideAabb(this, 'y')) {
      if (prevVy > 0) {
        // aterrizamos: ¿es trampolín?
        const cx = this.x + this.w / 2;
        const tileBelow = level.tileAt(cx, this.y + this.h + 1);
        if (tileBelow === 't') {
          this.vy = -8;
          this.jumpHoldFrames = 0;
          Audio8.spring();
        } else {
          this.onGround = true;
          this.vy = 0;
        }
      } else if (prevVy < 0) {
        // chocamos con la cabeza: ¿hay un bloque sorpresa?
        const cx = this.x + this.w / 2;
        const ay = this.y - 1;
        if (level.tileAt(cx, ay) === '?') {
          const col = Math.floor(cx / TILE_SIZE);
          const row = Math.floor(ay / TILE_SIZE);
          level.popSurpriseBlock(col, row);
          Audio8.block();
        }
        this.vy = 0;
      } else {
        this.vy = 0;
      }
    }

    // Recordamos la última posición segura mientras estamos apoyados.
    if (this.onGround) {
      this.lastSafeX = this.x;
      this.lastSafeY = this.y;
    }

    // ---- caída al vacío ----
    if (this.y > level.heightPx + 32) {
      this.hurt();
      if (!this.dead) {
        // Reaparecer en el último sitio seguro (no al spawn) para que
        // en 2 jugadores la cámara no se "abra" entre ambos.
        this.x = this.lastSafeX;
        this.y = this.lastSafeY - 16;
        this.vx = 0;
        this.vy = 0;
        this.invuln = 60;
      }
    }

    // ---- boomerang ----
    const maxBoomerangs = this.powerup === 'doubleBoomerang' ? 2 : 1;
    if (ctrl.shootTap && this.boomerangs.length < maxBoomerangs) {
      this.boomerangs.push(new Boomerang(this, this.facing));
      Audio8.boomerang();
    }
    for (const b of this.boomerangs) b.update();
    this.boomerangs = this.boomerangs.filter(b => !b.dead);

    // ---- eructo ----
    // Si la barriga está llena y el jugador pulsa E, soltamos una nube
    // de eructo en la dirección a la que mira y vaciamos la barriga.
    if (ctrl.eructTap && this.barriga >= Player.BARRIGA_FULL) {
      const ex = this.facing > 0 ? this.x + this.w : this.x - 18;
      const ey = this.y + 4;
      this.eructos.push(new EructoCloud(ex, ey, this.facing));
      this.barriga = 0;
      Audio8.burp();
    }
    for (const e of this.eructos) e.update();
    this.eructos = this.eructos.filter(e => !e.dead);

    if (this.invuln > 0) this.invuln--;
    if (this.powerupTimer > 0) {
      this.powerupTimer--;
      if (this.powerupTimer <= 0) this.powerup = null;
    }
  }

  draw(ctx, camX) {
    // si está fuera de combate, no dibujamos nada (el HUD ya muestra "K.O.")
    if (this.dead) return;
    // parpadeo en invulnerabilidad: se ve 1 frame de cada 2
    if (this.invuln > 0 && (this.invuln % 6 < 3)) {
      // skip
    } else {
      const sx = Math.round(this.x - camX) - 2; // sprite 16 vs hitbox 12 -> centrar
      const sy = Math.round(this.y);
      // Aura del power-up (parpadeo de color alrededor)
      if (this.powerup) {
        const auraColors = {
          invincible: '#ffd860',
          superJump: '#66ddff',
          doubleBoomerang: '#ff66ff',
          doubleJump: '#88ff88',
        };
        const c = auraColors[this.powerup] || '#ffffff';
        if (this.powerupTimer % 6 < 3 || this.powerupTimer > 120) {
          ctx.fillStyle = c;
          ctx.fillRect(sx - 1, sy - 1, 1, 18);
          ctx.fillRect(sx + 14, sy - 1, 1, 18);
          ctx.fillRect(sx, sy - 2, 14, 1);
        }
      }
      drawSprite(ctx, this.sprite, sx, sy, this.facing < 0);
      if (this.paralyzed > 0) {
        ctx.fillStyle = '#ffd860';
        ctx.font = '8px monospace';
        ctx.fillText('!?', sx + 4, sy - 2);
      }
    }
    for (const b of this.boomerangs) b.draw(ctx, camX);
    for (const e of this.eructos) e.draw(ctx, camX);
  }
}
