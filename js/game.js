// Estado global del juego: gestiona pantallas (título, selección de
// personaje, selección de dificultad, jugando, victoria, game over)
// y orquesta el update y draw de todas las entidades.

const STATES = {
  TITLE: 'title',
  CHAR_SELECT: 'charSelect',
  DIFF_SELECT: 'diffSelect',
  PLAYING: 'playing',
  PAUSED: 'paused',
  LEVEL_END: 'levelEnd',
  GAME_OVER: 'gameOver',
  VICTORY: 'victory',
};

// Definición de personajes seleccionables.
const CHARACTERS = [
  { id: 'lucas', name: 'Lucas', sprite: () => Sprites.lucas, blurb: 'Camiseta azul' },
  { id: 'cleto', name: 'Cleto', sprite: () => Sprites.cleto, blurb: 'Camiseta verde' },
];

// Niveles de dificultad. scoreMul afecta a todos los puntos sumados.
const DIFFICULTIES = [
  { id: 'easy',   name: 'Fácil',   scoreMul: 0.5, blurb: 'Más cromos, menos enemigos. Vale menos.' },
  { id: 'hard',   name: 'Difícil', scoreMul: 1.0, blurb: 'La aventura clásica.' },
  { id: 'expert', name: 'Experto', scoreMul: 2.0, blurb: 'Enemigos disparan, jefes furiosos. Doble pts.' },
];

class Game {
  constructor(ctx) {
    this.ctx = ctx;
    this.state = STATES.TITLE;
    this.currentLevelIdx = 0;
    this.level = null;
    this.players = [];
    this.enemies = [];
    this.diegos = [];
    this.parents = [];
    this.friends = [];
    this.cromos = [];
    this.bocadillos = [];
    this.portals = [];
    this.boss = null;
    this.flag = null;
    this.camX = 0;
    this.endTimer = 0;
    this.score = 0;
    this.cromosCollected = 0;
    this.cromosTotalLevel = 0;
    this.titleAnim = 0;
    // Contador de frames para parpadeos del HUD durante el juego.
    this.uiFrame = 0;
    // Selección actual en los menús del título.
    this.selectedChar = 0;  // índice en CHARACTERS
    this.selectedDiff = 1;  // índice en DIFFICULTIES (Difícil por defecto)
    this.scoreMul = DIFFICULTIES[this.selectedDiff].scoreMul;
    // Efectos visuales (partículas, texto flotante, confeti) que viven
    // por encima del mundo. Se llenan desde los handlers de colisión.
    this.effects = [];
    // Screen shake — sacude la cámara al recibir daño / pegar al jefe.
    this.shakeFrames = 0;
    this.shakeIntensity = 0;
    // Mejor puntuación cargada de localStorage
    const saved = Storage.load() || {};
    this.hiScore = saved.hiScore || 0;
    // Modo cabezón persistente: lo aplicamos al objeto Sprites para
    // que el render lo recoja inmediatamente en cualquier sprite.
    Sprites.bigHead = !!saved.bigHead;
  }

  shake(intensity, frames) {
    if (frames > this.shakeFrames) { this.shakeFrames = frames; this.shakeIntensity = intensity; }
  }
  pushEffect(e) { if (Array.isArray(e)) this.effects.push(...e); else this.effects.push(e); }

  // Suma puntos aplicando el multiplicador de dificultad y devuelve la
  // cantidad efectiva (para que el popup la muestre coherente).
  addScore(n) {
    const pts = Math.max(1, Math.round(n * this.scoreMul));
    this.score += pts;
    return pts;
  }

  difficulty() { return DIFFICULTIES[this.selectedDiff].id; }
  character() { return CHARACTERS[this.selectedChar]; }

  // ---------- ARRANQUE DE NIVEL ----------
  loadLevel(idx) {
    const data = LEVELS[idx];
    this.level = new Level(data);
    const spawns = this.level.extractSpawns();

    // En fácil reducimos el número de enemigos a la mitad para que
    // los niveles sean más asequibles para los más peques.
    let enemySpawns = spawns.enemies;
    if (this.difficulty() === 'easy') {
      enemySpawns = enemySpawns.filter((_, i) => i % 2 === 0);
    }

    // ---- jugador único: el personaje elegido en el título ----
    this.players = [];
    if (spawns.lucas || spawns.cleto) {
      const sp = spawns.lucas || spawns.cleto;
      const ch = this.character();
      this.players.push(new Player({
        x: sp.x, y: sp.y,
        sprite: ch.sprite(), name: ch.name, index: 0,
      }));
    }

    this.enemies = enemySpawns.map(s => {
      const e = new Enemy({ x: s.x, y: s.y, sprite: s.sprite, name: s.name });
      // En experto, los enemigos lanzan cosas. Escalonamos el primer
      // disparo para que no salgan todos a la vez.
      if (this.difficulty() === 'expert') {
        e.expert = true;
        e.shootTimer = 60 + Math.floor(Math.random() * 180);
      }
      return e;
    });

    // ---- NPCs únicos: máximo 1 por tipo en cada nivel ----
    this.diegos = spawns.diego.length > 0
      ? [new Diego({ x: spawns.diego[0].x, y: spawns.diego[0].y })]
      : [];
    const seenParent = new Set();
    this.parents = [];
    for (const s of spawns.parents) {
      if (seenParent.has(s.type)) continue;
      seenParent.add(s.type);
      this.parents.push(new Parent({ x: s.x, y: s.y, type: s.type }));
    }
    const seenFriend = new Set();
    this.friends = [];
    for (const s of spawns.friends) {
      if (seenFriend.has(s.kind)) continue;
      seenFriend.add(s.kind);
      this.friends.push(new Friend({ x: s.x, y: s.y, kind: s.kind }));
    }

    // ---- cromos ----
    this.cromos = spawns.cromos.map(s => new Cromo({ x: s.x + 4, y: s.y + 3 }));
    this.cromosCollected = 0;
    this.cromosTotalLevel = this.cromos.length;

    // ---- bocadillos ----
    this.bocadillos = (spawns.bocadillos || []).map(
      s => new Bocadillo({ x: s.x + 4, y: s.y + 5 })
    );

    // ---- portales: emparejamos por grupo ----
    this.portals = spawns.portals.map(s => new Portal({ x: s.x, y: s.y, group: s.group }));
    const byGroup = {};
    for (const p of this.portals) {
      (byGroup[p.group] = byGroup[p.group] || []).push(p);
    }
    for (const grp of Object.values(byGroup)) {
      if (grp.length === 2) {
        grp[0].partner = grp[1];
        grp[1].partner = grp[0];
      }
    }
    for (const portal of this.portals) {
      if (!this._portalHasGroundBelow(portal)) {
        console.warn(`Portal del grupo "${portal.group}" en (${portal.x}, ${portal.y}) no tiene suelo seguro debajo.`);
      }
    }

    if (spawns.boss && data.bossClass) {
      this.boss = new data.bossClass(spawns.boss.x, spawns.boss.y);
      // El boss se entera de la dificultad para ajustar HP y patrón.
      if (typeof this.boss.applyDifficulty === 'function') {
        this.boss.applyDifficulty(this.difficulty());
      }
    } else {
      this.boss = null;
    }

    this.flag = spawns.flag;
    this.camX = 0;
    this.endTimer = 0;
    this.currentLevelIdx = idx;
    this.effects = [];
    this.shakeFrames = 0;
  }

  startNewGame() {
    this.score = 0;
    this.scoreMul = DIFFICULTIES[this.selectedDiff].scoreMul;
    this.loadLevel(0);
    this.state = STATES.PLAYING;
  }

  // ---------- BUCLE PRINCIPAL ----------
  update() {
    switch (this.state) {
      case STATES.TITLE:       this.updateTitle();        break;
      case STATES.CHAR_SELECT: this.updateCharSelect();   break;
      case STATES.DIFF_SELECT: this.updateDiffSelect();   break;
      case STATES.PLAYING:     this.updatePlaying();      break;
      case STATES.PAUSED:      this.updatePaused();       break;
      case STATES.LEVEL_END:   this.updateLevelEnd();     break;
      case STATES.GAME_OVER:   this.updateGameOver();     break;
      case STATES.VICTORY:     this.updateVictory();      break;
    }
  }

  draw() {
    const c = this.ctx;
    c.fillStyle = '#000';
    c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    switch (this.state) {
      case STATES.TITLE:       this.drawTitle();        break;
      case STATES.CHAR_SELECT: this.drawCharSelect();   break;
      case STATES.DIFF_SELECT: this.drawDiffSelect();   break;
      case STATES.PLAYING:
      case STATES.PAUSED:
      case STATES.LEVEL_END:   this.drawWorld();        break;
      case STATES.GAME_OVER:   this.drawGameOver();     break;
      case STATES.VICTORY:     this.drawVictory();      break;
    }
    if (this.state === STATES.PAUSED) this.drawPauseOverlay();
  }

  // ---------- TÍTULO ----------
  updateTitle() {
    this.titleAnim++;
    Music.play();
    if (Input.cabezonTap()) {
      Sprites.bigHead = !Sprites.bigHead;
      Storage.setBigHead(Sprites.bigHead);
      Audio8.coin();
    }
    if (Input.startTap()) {
      Audio8.coin();
      this.titleAnim = 0;
      this.state = STATES.CHAR_SELECT;
    }
  }

  drawTitle() {
    const c = this.ctx;
    const t = this.titleAnim;

    // ---- Cielo en gradiente con tono pulsante ----
    const W = c.canvas.width, H = c.canvas.height;
    for (let y = 0; y < H; y++) {
      const f = y / H;
      const r = Math.round(120 + 60 * (1 - f) + Math.sin(t * 0.02) * 10);
      const g = Math.round(180 + 30 * (1 - f));
      const b = Math.round(255 - 90 * f);
      c.fillStyle = `rgb(${r},${g},${b})`;
      c.fillRect(0, y, W, 1);
    }

    // ---- Nubes que se mueven ----
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 64 - t * 0.4) % 320 + 320) % 320 - 32;
      const cy = 18 + (i % 3) * 14;
      c.fillRect(cx + 4, cy, 16, 8);
      c.fillRect(cx, cy + 2, 24, 4);
      c.fillRect(cx + 8, cy - 2, 8, 4);
    }

    // ---- Logo grande con sombra y rebote ----
    const bounce = Math.sin(t * 0.08) * 3;
    c.font = 'bold 28px monospace';
    c.fillStyle = '#000';
    c.fillText('LUCAS', 26, 60 + bounce);
    c.fillStyle = '#ffd860';
    c.fillText('LUCAS', 24, 58 + bounce);

    c.fillStyle = '#000';
    c.fillText('BROS.', 138, 60 + bounce);
    c.fillStyle = '#ff6688';
    c.fillText('BROS.', 136, 58 + bounce);

    // ---- Subtítulo ----
    c.fillStyle = '#000';
    c.font = '8px monospace';
    c.fillText('La aventura del cole', 70, 78);

    // ---- Lucas y Cleto saltando alternativamente ----
    const lucasY = 92 - Math.max(0, Math.sin(t * 0.12) * 8);
    const cletoY = 92 - Math.max(0, Math.sin(t * 0.12 + Math.PI) * 8);
    drawSprite(c, Sprites.lucas, 96, lucasY);
    drawSprite(c, Sprites.cleto, 144, cletoY);

    // ---- Fila de amigos haciendo "ola" ----
    const friends = [Sprites.rafa, Sprites.matias, Sprites.santiago, Sprites.jorge];
    for (let i = 0; i < friends.length; i++) {
      const x = 56 + i * 36;
      const y = 130 + Math.sin(t * 0.1 + i * 0.6) * 3;
      drawSprite(c, friends[i], x, y);
    }

    // ---- Diego haciendo trastadas ----
    const diegoX = 12 + ((t * 0.5) % (W + 24));
    drawSprite(c, Sprites.diego, diegoX, 154);

    // ---- Caja del menú con borde pulsante ----
    const pulse = (Math.sin(t * 0.12) + 1) * 0.5;
    const borderColor = `rgb(${Math.round(255 * pulse)},${Math.round(220)},${Math.round(80)})`;
    c.fillStyle = '#000';
    c.fillRect(48, 174, 160, 32);
    c.fillStyle = borderColor;
    c.fillRect(48, 174, 160, 1);
    c.fillRect(48, 205, 160, 1);
    c.fillRect(48, 174, 1, 32);
    c.fillRect(207, 174, 1, 32);

    c.fillStyle = '#fff';
    c.font = '10px monospace';
    if (this.titleAnim % 60 < 40) {
      c.fillText('Pulsa Espacio o Enter', 60, 188);
    }
    c.fillText('para empezar', 86, 200);

    if (!Music.playing && (this.titleAnim % 60 < 40)) {
      c.fillStyle = '#000';
      c.font = '6px monospace';
      c.fillText('(click en la página para la música)', 56, 168);
    }

    c.fillStyle = '#ffd860';
    c.font = '6px monospace';
    c.fillText('TOP ' + String(this.hiScore).padStart(6, '0'), 4, 232);
    c.fillStyle = '#000';
    c.fillText('Hecho con Lucas y Cleto', 130, 232);

    // Toggle de Modo Cabezón en la pantalla de título.
    c.fillStyle = Sprites.bigHead ? '#ff66aa' : '#000';
    c.font = '6px monospace';
    c.fillText('X = Cabezón ' + (Sprites.bigHead ? 'ON' : 'OFF'), 4, 222);
  }

  // ---------- SELECCIÓN DE PERSONAJE ----------
  updateCharSelect() {
    this.titleAnim++;
    Music.play();
    if (Input.leftTap()) {
      this.selectedChar = (this.selectedChar - 1 + CHARACTERS.length) % CHARACTERS.length;
      Audio8.coin();
    }
    if (Input.rightTap()) {
      this.selectedChar = (this.selectedChar + 1) % CHARACTERS.length;
      Audio8.coin();
    }
    if (Input.startTap()) {
      Audio8.friend();
      this.titleAnim = 0;
      this.state = STATES.DIFF_SELECT;
    }
  }

  drawCharSelect() {
    const c = this.ctx;
    const t = this.titleAnim;
    const W = c.canvas.width, H = c.canvas.height;
    // fondo morado pastel con estrellas
    c.fillStyle = '#3c2860';
    c.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) {
      const sx = (i * 41 + t * 0.3) % W;
      const sy = (i * 17) % H;
      c.fillStyle = (i + (t / 8 | 0)) % 2 ? '#ffd860' : '#fff';
      c.fillRect(sx, sy, 1, 1);
    }

    c.fillStyle = '#ffd860';
    c.font = '14px monospace';
    c.fillText('ELIGE PERSONAJE', 36, 36);

    // Dos personajes grandes uno al lado del otro.
    const slotW = 96;
    const baseX = (W - slotW * CHARACTERS.length) / 2;
    for (let i = 0; i < CHARACTERS.length; i++) {
      const ch = CHARACTERS[i];
      const cx = baseX + slotW * i + slotW / 2;
      const sel = i === this.selectedChar;
      // Caja resaltada
      c.fillStyle = sel ? '#ffd860' : '#222';
      c.fillRect(cx - 36, 54, 72, 110);
      c.fillStyle = sel ? '#3c2860' : '#444';
      c.fillRect(cx - 34, 56, 68, 106);
      // Sprite con rebote si está seleccionado
      const bounce = sel ? Math.sin(t * 0.18) * 3 : 0;
      drawSprite(c, ch.sprite(), cx - 8, 78 + bounce);
      // Nombre
      c.font = '10px monospace';
      c.fillStyle = sel ? '#ffd860' : '#aaa';
      const nameW = c.measureText(ch.name).width;
      c.fillText(ch.name, Math.round(cx - nameW / 2), 130);
      c.font = '6px monospace';
      c.fillStyle = sel ? '#fff' : '#888';
      const blurbW = c.measureText(ch.blurb).width;
      c.fillText(ch.blurb, Math.round(cx - blurbW / 2), 150);
    }

    // Indicaciones
    c.fillStyle = '#fff';
    c.font = '8px monospace';
    if (t % 60 < 40) c.fillText('← →  para elegir', 72, 196);
    c.fillText('Espacio / Enter para confirmar', 28, 212);
  }

  // ---------- SELECCIÓN DE DIFICULTAD ----------
  updateDiffSelect() {
    this.titleAnim++;
    Music.play();
    if (Input.leftTap()) {
      this.selectedDiff = (this.selectedDiff - 1 + DIFFICULTIES.length) % DIFFICULTIES.length;
      Audio8.coin();
    }
    if (Input.rightTap()) {
      this.selectedDiff = (this.selectedDiff + 1) % DIFFICULTIES.length;
      Audio8.coin();
    }
    if (Input.startTap()) {
      Audio8.coin();
      Music.stop();
      this.startNewGame();
    }
  }

  drawDiffSelect() {
    const c = this.ctx;
    const t = this.titleAnim;
    const W = c.canvas.width, H = c.canvas.height;
    c.fillStyle = '#202848';
    c.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) {
      const sx = (i * 53 + t * 0.4) % W;
      const sy = (i * 23) % H;
      c.fillStyle = (i + (t / 8 | 0)) % 2 ? '#88ddff' : '#fff';
      c.fillRect(sx, sy, 1, 1);
    }

    c.fillStyle = '#ffd860';
    c.font = '14px monospace';
    c.fillText('ELIGE DIFICULTAD', 32, 36);

    // Sprite del personaje elegido a la izquierda como recordatorio.
    const ch = this.character();
    drawSprite(c, ch.sprite(), 16, 54);
    c.font = '6px monospace';
    c.fillStyle = '#aaa';
    c.fillText(ch.name, 16, 80);

    // Tres tarjetas
    const colors = ['#88dd88', '#ffd860', '#ff6677'];
    const slotW = 64;
    const baseX = (W - slotW * DIFFICULTIES.length) / 2;
    for (let i = 0; i < DIFFICULTIES.length; i++) {
      const d = DIFFICULTIES[i];
      const cx = baseX + slotW * i + slotW / 2;
      const sel = i === this.selectedDiff;
      const boxY = 60;
      c.fillStyle = sel ? colors[i] : '#222';
      c.fillRect(cx - 28, boxY, 56, 60);
      c.fillStyle = sel ? '#000' : '#444';
      c.fillRect(cx - 26, boxY + 2, 52, 56);

      const bounce = sel ? Math.sin(t * 0.18) * 2 : 0;
      c.font = '10px monospace';
      c.fillStyle = sel ? colors[i] : '#aaa';
      const nameW = c.measureText(d.name).width;
      c.fillText(d.name, Math.round(cx - nameW / 2), boxY + 22 + bounce);
      c.font = '6px monospace';
      c.fillStyle = sel ? '#fff' : '#666';
      const mulText = 'x' + d.scoreMul + ' pts';
      const mulW = c.measureText(mulText).width;
      c.fillText(mulText, Math.round(cx - mulW / 2), boxY + 38);
    }

    // Descripción del seleccionado
    c.fillStyle = '#fff';
    c.font = '7px monospace';
    const blurb = DIFFICULTIES[this.selectedDiff].blurb;
    const blurbW = c.measureText(blurb).width;
    c.fillText(blurb, Math.round((W - blurbW) / 2), 144);

    c.fillStyle = '#fff';
    c.font = '8px monospace';
    if (t % 60 < 40) c.fillText('← →  para elegir', 72, 196);
    c.fillText('Espacio / Enter para empezar', 32, 212);
  }

  // ---------- JUGANDO ----------
  updatePlaying() {
    this.uiFrame++;
    if (Input.pauseTap()) {
      Audio8.pause();
      this.state = STATES.PAUSED;
      return;
    }

    for (const p of this.players) {
      if (p.dead) continue;
      const ctrl = Input.forPlayer(p.index);
      p.update(ctrl, this.level);
    }

    for (const e of this.enemies) e.update(this.level);
    for (const d of this.diegos) d.update(this.level);
    for (const par of this.parents) par.update(this.level);
    for (const f of this.friends) f.update(this.level);
    for (const cromo of this.cromos) cromo.update();
    for (const boc of this.bocadillos) boc.update();
    for (const portal of this.portals) portal.update();

    // Efectos visuales
    for (const fx of this.effects) fx.update();
    this.effects = this.effects.filter(fx => !fx.dead);
    if (this.shakeFrames > 0) this.shakeFrames--;

    if (this.boss) this.boss.update(this.level, this.players);

    // ---- COLISIONES ----
    this.handlePlayerEnemyCollisions();
    this.handleEnemyProjectileHits();
    this.handlePlayerDiegoCollisions();
    this.handlePlayerParentCollisions();
    this.handlePlayerFriendCollisions();
    this.handleCromoCollection();
    this.handleBocadilloCollection();
    this.handleBananaCollisions();
    this.handleEructoEnemyHits();
    this.handleBoomerangHits();
    this.handleProjectilePlayerHits();
    this.handlePlayerBossCollision();
    this.handlePortalLogic();
    this.handleSurpriseBlockPops();

    // limpiar cromos / bocadillos recogidos
    this.cromos = this.cromos.filter(c => !c.dead);
    this.bocadillos = this.bocadillos.filter(b => !b.dead);

    this.updateCamera();

    if (this.flag && this.allPlayersReachedFlag()) {
      this.state = STATES.LEVEL_END;
      this.endTimer = 90;
      Audio8.victory();
    }

    if (this.players.every(p => p.dead)) {
      this.state = STATES.GAME_OVER;
      this.endTimer = 120;
      Audio8.gameOver();
      if (this.score > this.hiScore) {
        this.hiScore = this.score;
        Storage.recordIfBetter(this.score);
      }
    }
  }

  allPlayersReachedFlag() {
    if (!this.flag) return false;
    if (this.boss && !this.boss.dead) return false;
    for (const p of this.players) {
      if (p.dead) continue;
      if (rectsOverlap(p.rect(), { x: this.flag.x, y: this.flag.y, w: 16, h: 32 })) {
        return true;
      }
    }
    return false;
  }

  updateCamera() {
    if (this.players.length === 0) return;
    const alive = this.players.filter(p => !p.dead);
    if (alive.length === 0) return;
    const avgX = alive.reduce((s, p) => s + p.x + p.w / 2, 0) / alive.length;
    let camX = avgX - this.ctx.canvas.width / 2;
    camX = Math.max(0, Math.min(this.level.widthPx - this.ctx.canvas.width, camX));
    this.camX = camX;
  }

  handlePlayerEnemyCollisions() {
    for (const p of this.players) {
      if (p.dead || p.invuln > 0) continue;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (!rectsOverlap(p.rect(), e.rect())) continue;
        const playerBottom = p.y + p.h;
        const enemyTop = e.y;
        if (p.vy > 0 && playerBottom - p.vy <= enemyTop + 4) {
          e.stomp();
          p.vy = -3;
          const pts = this.addScore(100);
          Audio8.stomp();
          this.pushEffect(Effects.burst(e.x + e.w/2, e.y + e.h/2, '#ff6666', 8));
          this.pushEffect(Effects.scorePopup(e.x + e.w/2, e.y, pts));
        } else if (p.powerup === 'invincible') {
          e.stomp();
          const pts = this.addScore(100);
          Audio8.stomp();
          this.pushEffect(Effects.burst(e.x + e.w/2, e.y + e.h/2, '#ffd860', 10));
          this.pushEffect(Effects.scorePopup(e.x + e.w/2, e.y, pts));
        } else if (e.stunned > 0) {
          // Aturdido por un eructo: no hace daño tocarlo de lado.
          continue;
        } else {
          p.hurt();
          if (!p.dead) {
            p.x += (p.x < e.x) ? -8 : 8;
            this.shake(3, 10);
            this.pushEffect(Effects.text(p.x + p.w/2, p.y - 4, '¡AY!', '#ff5555', 30));
          }
        }
      }
    }
  }

  // En modo experto, los enemigos lanzan chupetes; aquí comprobamos si
  // alguno alcanza al jugador.
  handleEnemyProjectileHits() {
    for (const e of this.enemies) {
      if (!e.projectiles || e.projectiles.length === 0) continue;
      for (const proj of e.projectiles) {
        if (proj.dead) continue;
        for (const p of this.players) {
          if (p.dead || p.invuln > 0) continue;
          if (p.powerup === 'invincible') continue;
          if (rectsOverlap(p.rect(), proj.rect())) {
            p.hurt();
            proj.dead = true;
          }
        }
      }
    }
  }

  handlePlayerDiegoCollisions() {
    for (const p of this.players) {
      if (p.dead) continue;
      for (const d of this.diegos) {
        if (d.dead || d.gone) continue;
        if (rectsOverlap(p.rect(), d.rect())) {
          d.giggle();
          if (p.lives < 5) p.lives++;
          const pts = this.addScore(200);
          Audio8.coin();
          this.pushEffect(Effects.burst(d.x + d.w/2, d.y + d.h/2, '#ffaa44', 6));
          this.pushEffect(Effects.scorePopup(d.x, d.y, pts));
        }
        for (const c of d.chupetes) {
          if (c.dead) continue;
          if (rectsOverlap(p.rect(), c.rect())) {
            c.vx = -c.vx;
            c.vy = -2;
            p.vx += (p.x < c.x) ? -1 : 1;
          }
        }
      }
    }
  }

  handlePlayerFriendCollisions() {
    for (const p of this.players) {
      if (p.dead) continue;
      for (const f of this.friends) {
        if (f.dead || f.cheering) continue;
        if (rectsOverlap(p.rect(), f.rect())) {
          f.cheer();
          p.lives = Math.min(6, p.lives + 1);
          p.applyPowerup(f.def.powerup);
          const pts = this.addScore(500);
          Audio8.friend();
          this.pushEffect(Effects.confetti(this.ctx.canvas.width, 14));
          this.pushEffect(Effects.scorePopup(f.x, f.y - 4, pts));
          this.pushEffect(Effects.text(f.x + f.w/2, f.y - 14, '¡' + f.def.name.toUpperCase() + '!', '#ffd860', 50));
        }
      }
    }
  }

  handlePlayerParentCollisions() {
    for (const p of this.players) {
      if (p.dead || p.paralyzed > 0) continue;
      for (const par of this.parents) {
        if (par.dead) continue;
        if (rectsOverlap(p.rect(), par.rect()) && par.cooldown <= 0) {
          par.shout();
          p.scold();
        }
      }
    }
  }

  handleCromoCollection() {
    for (const p of this.players) {
      if (p.dead) continue;
      for (const c of this.cromos) {
        if (c.collected) continue;
        if (rectsOverlap(p.rect(), c.rect())) {
          c.collect();
          const pts = this.addScore(50);
          this.cromosCollected++;
          this.pushEffect(Effects.star(c.x + c.w/2, c.y + c.h/2, '#ffd860'));
          this.pushEffect(Effects.scorePopup(c.x, c.y - 2, pts));
          if (this.cromosCollected === this.cromosTotalLevel && this.cromosTotalLevel > 0) {
            for (const pp of this.players) if (!pp.dead) pp.lives = Math.min(6, pp.lives + 1);
            this.addScore(1000);
            Audio8.victory();
            this.pushEffect(Effects.confetti(this.ctx.canvas.width, 24));
            this.pushEffect(Effects.text(p.x, p.y - 16, '¡TODOS LOS CROMOS!', '#ffd860', 70));
          }
        }
      }
    }
  }

  handleBocadilloCollection() {
    for (const p of this.players) {
      if (p.dead) continue;
      for (const boc of this.bocadillos) {
        if (boc.collected) continue;
        if (rectsOverlap(p.rect(), boc.rect())) {
          const full = p.feed();
          boc.collect();
          const pts = this.addScore(75);
          this.pushEffect(Effects.scorePopup(boc.x, boc.y - 2, pts));
          if (full) {
            this.pushEffect(Effects.text(p.x + p.w/2, p.y - 16, '¡A ERUCTAR! (E)', '#88ff88', 50));
          } else {
            this.pushEffect(Effects.text(boc.x, boc.y - 8, '¡ÑAM!', '#ffd860', 25));
          }
        }
      }
    }
  }

  // Cáscaras de plátano: el jugador y los enemigos resbalan al pisarlas.
  // Las bananas viven dentro de cada Diego.
  handleBananaCollisions() {
    for (const d of this.diegos) {
      if (!d.bananas || d.bananas.length === 0) continue;
      for (const banana of d.bananas) {
        if (banana.dead || !banana.landed) continue;
        for (const p of this.players) {
          if (p.dead || p.invuln > 0) continue;
          if (p.slipping > 0) continue;
          if (rectsOverlap(p.rect(), banana.rect())) {
            const dir = (p.facing >= 0) ? 1 : -1;
            p.slip(dir);
            banana.dead = true;
            this.pushEffect(Effects.text(p.x + p.w/2, p.y - 12, '¡UPS!', '#ffd860', 32));
            this.pushEffect(Effects.dust(p.x + p.w/2, p.y + p.h, '#ffd860'));
            break;
          }
        }
        if (banana.dead) continue;
        for (const e of this.enemies) {
          if (e.dead || e.slipping > 0) continue;
          if (rectsOverlap(e.rect(), banana.rect())) {
            const dir = (e.facing >= 0) ? 1 : -1;
            e.slip(dir);
            banana.dead = true;
            this.pushEffect(Effects.text(e.x + e.w/2, e.y - 8, '¡UPS!', '#ffaa44', 28));
            this.pushEffect(Effects.dust(e.x + e.w/2, e.y + e.h, '#ffd860'));
            break;
          }
        }
      }
    }
  }

  // Eructo: la nube aturde a los enemigos que toca y empuja un poco al jefe.
  handleEructoEnemyHits() {
    for (const p of this.players) {
      if (!p.eructos || p.eructos.length === 0) continue;
      for (const cloud of p.eructos) {
        if (cloud.dead) continue;
        const r = cloud.rect();
        for (const e of this.enemies) {
          if (e.dead || cloud.hitSet.has(e)) continue;
          if (rectsOverlap(r, e.rect())) {
            cloud.hitSet.add(e);
            e.stun(180);
            this.pushEffect(Effects.text(e.x + e.w/2, e.y - 6, '¡PUAJ!', '#88ff88', 30));
          }
        }
        if (this.boss && !this.boss.dead && !cloud.hitBoss && rectsOverlap(r, this.boss.rect())) {
          cloud.hitBoss = true;
          // No le quitamos vida al jefe, sólo le hacemos un poco la pirula.
          this.pushEffect(Effects.text(this.boss.x + this.boss.w/2, this.boss.y - 6, '¡QUÉ ASCO!', '#88ff88', 50));
        }
      }
    }
  }

  handleBoomerangHits() {
    for (const p of this.players) {
      for (const b of p.boomerangs) {
        for (const e of this.enemies) {
          if (e.dead) continue;
          if (rectsOverlap(b.rect(), e.rect())) {
            if (!b.hitSet.has(e)) {
              b.hitSet.add(e);
              e.stomp();
              const pts = this.addScore(100);
              Audio8.stomp();
              this.pushEffect(Effects.burst(e.x + e.w/2, e.y + e.h/2, '#ff8888', 6));
              this.pushEffect(Effects.scorePopup(e.x, e.y, pts));
            }
          }
        }
        if (this.boss && !this.boss.dead) {
          if (rectsOverlap(b.rect(), this.boss.rect()) && !b.hitSet.has(this.boss)) {
            if (this.boss.hit()) {
              b.hitSet.add(this.boss);
              const pts = this.addScore(300);
              Audio8.bossHit();
              this.shake(4, 12);
              this.pushEffect(Effects.burst(this.boss.x + this.boss.w/2, this.boss.y + 8, '#ff3333', 14));
              this.pushEffect(Effects.scorePopup(this.boss.x + this.boss.w/2, this.boss.y, pts));
              if (this.boss.dead) {
                this.pushEffect(Effects.confetti(this.ctx.canvas.width, 30));
                this.pushEffect(Effects.text(this.boss.x, this.boss.y - 16, '¡' + this.boss.name.toUpperCase() + ' DERROTADO!', '#ffd860', 90));
              }
            }
          }
        }
      }
    }
  }

  handleProjectilePlayerHits() {
    if (!this.boss) return;
    for (const p of this.players) {
      if (p.dead || p.invuln > 0) continue;
      if (p.powerup === 'invincible') continue;
      for (const proj of this.boss.projectiles) {
        if (proj.dead) continue;
        if (rectsOverlap(p.rect(), proj.rect())) {
          p.hurt();
          proj.dead = true;
        }
      }
    }
  }

  handlePlayerBossCollision() {
    if (!this.boss || this.boss.dead) return;
    for (const p of this.players) {
      if (p.dead || p.invuln > 0) continue;
      if (!rectsOverlap(p.rect(), this.boss.rect())) continue;
      const playerBottom = p.y + p.h;
      const bossTop = this.boss.y;
      if (p.vy > 0 && playerBottom - p.vy <= bossTop + 4) {
        if (this.boss.hit()) {
          p.vy = -4;
          const pts = this.addScore(300);
          Audio8.bossHit();
          this.shake(4, 12);
          this.pushEffect(Effects.burst(this.boss.x + this.boss.w/2, this.boss.y, '#ff3333', 14));
          this.pushEffect(Effects.scorePopup(this.boss.x + this.boss.w/2, this.boss.y, pts));
          if (this.boss.dead) {
            this.pushEffect(Effects.confetti(this.ctx.canvas.width, 30));
            this.pushEffect(Effects.text(this.boss.x, this.boss.y - 16, '¡' + this.boss.name.toUpperCase() + ' DERROTADO!', '#ffd860', 90));
          }
        }
      } else if (p.powerup === 'invincible') {
        if (this.boss.hit()) { this.addScore(300); Audio8.bossHit(); this.shake(3, 8); }
      } else {
        p.hurt();
        if (!p.dead) {
          p.x += (p.x < this.boss.x) ? -10 : 10;
          this.shake(4, 12);
        }
      }
    }
  }

  // ¿Hay tierra firme dentro de los próximos ~5 tiles bajo el portal?
  _portalHasGroundBelow(portal) {
    const cx = portal.x + portal.w / 2;
    for (let dy = portal.h; dy <= portal.h + 80; dy += 16) {
      if (this.level.solidAt(cx, portal.y + dy)) return true;
    }
    return false;
  }

  _safeTeleportX(portal) {
    if (this._portalHasGroundBelow(portal)) return portal.x;
    for (let off = 16; off <= 48; off += 16) {
      const right = { ...portal, x: portal.x + off };
      const left  = { ...portal, x: portal.x - off };
      if (this._portalHasGroundBelow(right)) return right.x;
      if (this._portalHasGroundBelow(left))  return left.x;
    }
    return portal.x;
  }

  // ---- BLOQUES SORPRESA ----
  handleSurpriseBlockPops() {
    if (!this.level.poppedBlocks || this.level.poppedBlocks.length === 0) return;
    for (const pop of this.level.poppedBlocks) {
      const x = pop.col * 16 + 4;
      const yAbove = (pop.row - 1) * 16 + 4;
      const cx = pop.col * 16 + 8;
      const cy = pop.row * 16 + 8;
      if (Math.random() < 0.75) {
        this.cromos.push(new Cromo({ x, y: yAbove }));
        this.cromosTotalLevel++;
        Audio8.coin();
        this.pushEffect(Effects.star(cx, cy, '#ffd860'));
      } else {
        for (const p of this.players) {
          if (!p.dead && p.lives < 6) p.lives++;
        }
        this.addScore(200);
        Audio8.friend();
        this.pushEffect(Effects.burst(cx, cy, '#ff66aa', 12));
        this.pushEffect(Effects.text(cx, cy - 8, '+CORAZÓN', '#ff66aa', 40));
      }
    }
    this.level.poppedBlocks = [];
  }

  // ---- PORTALES ----
  handlePortalLogic() {
    if (this.portals.length === 0) return;
    for (const portal of this.portals) {
      const inside = [];
      for (const p of this.players) {
        if (p.dead) continue;
        if (rectsOverlap(p.rect(), portal.rect())) inside.push(p);
      }
      portal.setPlayersInside(inside);
    }
    for (const portal of this.portals) {
      const teleporters = portal.tryActivate(this.players);
      if (teleporters && portal.partner) {
        Audio8.portal();
        const safeX = this._safeTeleportX(portal.partner);
        for (const p of teleporters) {
          p.x = safeX;
          p.y = portal.partner.y + 8;
          p.vx = 0; p.vy = 0;
          p.invuln = 30;
          portal.partner.lockedPlayers.add(p);
        }
        portal.activationProgress.clear();
      }
    }
  }

  // ---------- DIBUJO MUNDO ----------
  drawWorld() {
    const c = this.ctx;
    let sx = 0, sy = 0;
    if (this.shakeFrames > 0) {
      sx = (Math.random() - 0.5) * this.shakeIntensity;
      sy = (Math.random() - 0.5) * this.shakeIntensity;
      c.save();
      c.translate(Math.round(sx), Math.round(sy));
    }

    this.level.draw(c, this.camX);

    for (const portal of this.portals) {
      const aliveAll = this.players.filter(p => !p.dead).length;
      let hint = null;
      if (portal.playersInside.length > 0 && portal.playersInside.length < aliveAll) {
        const inside = new Set(portal.playersInside);
        const missing = this.players.filter(p => !p.dead && !inside.has(p)).map(p => p.name).join(' y ');
        hint = missing;
      }
      portal.draw(c, this.camX, hint);
    }
    for (const cromo of this.cromos) cromo.draw(c, this.camX);
    for (const boc of this.bocadillos) boc.draw(c, this.camX);

    for (const e of this.enemies) e.draw(c, this.camX);
    for (const d of this.diegos) d.draw(c, this.camX);
    for (const par of this.parents) par.draw(c, this.camX);
    for (const f of this.friends) f.draw(c, this.camX);
    if (this.boss) this.boss.draw(c, this.camX);
    for (const p of this.players) p.draw(c, this.camX);

    for (const fx of this.effects) fx.draw(c, this.camX);

    if (this.shakeFrames > 0) c.restore();

    this.drawHud();

    if (this.state === STATES.LEVEL_END) {
      c.fillStyle = '#000';
      c.fillRect(50, 90, 156, 70);
      c.fillStyle = '#fff';
      c.font = '8px monospace';
      const msg = this.currentLevelIdx + 1 < LEVELS.length
        ? '¡Nivel superado!'
        : '¡Has vencido a Emilio!';
      c.fillText(msg, 80, 110);
      c.fillText('Cromos: ' + this.cromosCollected + ' / ' + this.cromosTotalLevel, 80, 124);
      c.fillText('Pulsa Espacio para seguir', 56, 144);
    }
  }

  drawHud() {
    const c = this.ctx;
    c.fillStyle = '#000';
    c.fillRect(0, 0, c.canvas.width, 14);
    c.fillStyle = '#fff';
    c.font = '8px monospace';

    let x = 4;
    for (const p of this.players) {
      c.fillStyle = p.dead ? '#888' : '#fff';
      c.fillText(p.name, x, 9);
      x += 32;
      if (p.dead) {
        c.fillStyle = '#f33';
        c.fillText('K.O.', x, 9);
        x += 28;
      } else {
        for (let i = 0; i < p.lives; i++) {
          c.fillStyle = '#f33';
          c.fillRect(x, 4, 6, 6);
          x += 8;
        }
      }
      if (!p.dead && p.powerup) {
        const seconds = Math.ceil(p.powerupTimer / 60);
        c.fillStyle = '#ffd860';
        c.fillText((POWERUP_LABELS[p.powerup] || p.powerup) + ' ' + seconds + 's', x, 9);
        x += 96;
      }
      // Barriga: 4 cuadraditos amarillos. Cuando está llena pulsa con
      // un parpadeo verde para avisar de que puede eructar.
      if (!p.dead) {
        const full = p.barriga >= Player.BARRIGA_FULL;
        const blink = full && (this.uiFrame % 20 < 10);
        for (let i = 0; i < Player.BARRIGA_FULL; i++) {
          if (i < p.barriga) {
            c.fillStyle = blink ? '#88ff88' : '#ffd860';
          } else {
            c.fillStyle = '#444';
          }
          c.fillRect(x + i * 4, 4, 3, 6);
        }
        x += Player.BARRIGA_FULL * 4 + 4;
      }
      x += 4;
    }
    c.fillStyle = '#ffd860';
    c.fillText('★' + this.cromosCollected + '/' + this.cromosTotalLevel, 158, 9);
    c.fillStyle = '#fff';
    c.fillText('Pts ' + this.score, 198, 9);
    // Indicador de dificultad y título del nivel.
    const diffName = DIFFICULTIES[this.selectedDiff].name;
    c.fillStyle = '#ffd860';
    c.fillText('[' + diffName + ']', 4, 232);
    c.fillStyle = '#fff';
    c.fillText(this.level.title, 60, 232);
  }

  // ---------- PAUSA ----------
  updatePaused() {
    if (Input.pauseTap()) { Audio8.pause(); this.state = STATES.PLAYING; }
  }
  drawPauseOverlay() {
    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    c.fillStyle = '#fff';
    c.font = '12px monospace';
    c.fillText('PAUSA', 108, 120);
  }

  // ---------- FIN DE NIVEL ----------
  updateLevelEnd() {
    this.endTimer--;
    if (this.endTimer % 5 === 0) {
      this.pushEffect(Effects.confetti(this.ctx.canvas.width, 4));
    }
    for (const fx of this.effects) fx.update();
    this.effects = this.effects.filter(fx => !fx.dead);
    if (this.endTimer <= 0 && Input.startTap()) {
      const next = this.currentLevelIdx + 1;
      if (next >= LEVELS.length) {
        if (this.score > this.hiScore) {
          this.hiScore = this.score;
          Storage.recordIfBetter(this.score);
        }
        this.state = STATES.VICTORY;
      } else {
        this.loadLevel(next);
        this.state = STATES.PLAYING;
      }
    }
  }

  // ---------- GAME OVER ----------
  updateGameOver() {
    this.endTimer--;
    if (this.endTimer <= 0 && Input.startTap()) {
      this.loadLevel(this.currentLevelIdx);
      this.state = STATES.PLAYING;
    }
  }
  drawGameOver() {
    const c = this.ctx;
    c.fillStyle = '#000';
    c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    c.fillStyle = '#f33';
    c.font = '16px monospace';
    c.fillText('GAME OVER', 80, 110);
    c.fillStyle = '#fff';
    c.font = '8px monospace';
    c.fillText('Pulsa Espacio para reintentar el nivel', 32, 140);
    if (this.score > 0) {
      c.fillStyle = '#ffd860';
      c.fillText('Puntuación: ' + this.score, 76, 160);
      c.fillText('Mejor: ' + this.hiScore, 90, 172);
    }
  }

  // ---------- VICTORIA ----------
  updateVictory() {
    this.titleAnim++;
    if (Input.startTap()) this.state = STATES.TITLE;
  }
  drawVictory() {
    const c = this.ctx;
    const t = this.titleAnim;
    c.fillStyle = '#202040';
    c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    for (let i = 0; i < 30; i++) {
      const sx = (i * 41 + t * 0.3) % 256;
      const sy = (i * 17 + t * 0.5) % 240;
      c.fillStyle = (i + (t / 8 | 0)) % 2 ? '#ffd860' : '#fff';
      c.fillRect(sx, sy, 1, 1);
    }
    c.fillStyle = '#ffd860';
    c.font = '14px monospace';
    c.fillText('¡ENHORABUENA!', 64, 80);
    c.fillStyle = '#fff';
    c.font = '8px monospace';
    c.fillText('Habéis vencido a Emilio', 56, 110);
    c.fillText('y salvado el cole.', 70, 124);
    c.fillText('Puntuación: ' + this.score, 80, 150);
    c.fillStyle = '#ffd860';
    c.fillText('Mejor: ' + this.hiScore, 90, 162);
    c.fillStyle = '#fff';
    c.fillText('Pulsa Espacio para volver', 56, 200);
    drawSprite(c, this.character().sprite(), 120, 170);
  }
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}
