// Estado global del juego: gestiona pantallas (título, selección de
// personaje y dificultad, presentación de nivel, jugando, bonus, fin de
// nivel, game over, victoria) y orquesta el update y draw de todo.

const GAME_TITLE = 'Lucas Bros. 2';
const GAME_SUBTITLE = 'Los profes contraatacan';

const STATES = {
  TITLE: 'title',
  CHAR_SELECT: 'charSelect',
  DIFF_SELECT: 'diffSelect',
  INTRO: 'intro',
  PLAYING: 'playing',
  PAUSED: 'paused',
  LEVEL_END: 'levelEnd',
  GAME_OVER: 'gameOver',
  VICTORY: 'victory',
};

const CHARACTERS = [
  { id: 'lucas', name: 'Lucas', sprite: () => Sprites.lucas, blurb: 'El hermano mayor' },
  { id: 'cleto', name: 'Cleto', sprite: () => Sprites.cleto, blurb: 'El hermano mediano' },
];

const DIFFICULTIES = [
  { id: 'easy',   name: 'Fácil',   scoreMul: 0.5, color: '#7ee07e', blurb: 'Menos enemigos y profes más blandos.' },
  { id: 'hard',   name: 'Normal',  scoreMul: 1.0, color: '#ffd860', blurb: 'La aventura clásica.' },
  { id: 'expert', name: 'Experto', scoreMul: 2.0, color: '#ff6677', blurb: 'Enemigos que disparan y profes furiosos.' },
];

// Puntos por pisotones encadenados sin tocar el suelo.
const COMBO_POINTS = [100, 200, 400, 800, 1000, 2000, 4000];

// 83.4 s -> "1:23"
function fmtTime(secs) {
  const s = Math.max(0, Math.floor(secs));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
function starStr(n) { return '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n)); }

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
    this.bonusItems = [];
    this.boss = null;
    this.flag = null;
    this.camX = 0;
    this.camLook = 0;
    this.endTimer = 0;
    this.score = 0;
    this.levelStartScore = 0;
    this.cromosCollected = 0;
    this.cromosTotalLevel = 0;
    this.titleAnim = 0;
    this.uiFrame = 0;
    this.selectedChar = 0;
    this.selectedDiff = 1;
    this.scoreMul = DIFFICULTIES[this.selectedDiff].scoreMul;
    this.effects = [];
    this.shakeFrames = 0;
    this.shakeIntensity = 0;
    this.hitStop = 0;
    this.flashFrames = 0;
    this.bossBanner = 0;
    this.checkpoint = null;
    this.checkpointReached = false;
    this.bonus = null;
    const saved = Storage.load() || {};
    this.hiScore = saved.hiScore || 0;
    Sprites.bigHead = !!saved.bigHead;
    // Suelo decorativo para la pantalla de título
    this.titleLevel = new Level({
      theme: 'patio', title: '',
      tiles: [...Array(11).fill('.'.repeat(32)), ...Array(4).fill('#'.repeat(32))],
    });
  }

  shake(intensity, frames) {
    if (frames > this.shakeFrames) { this.shakeFrames = frames; this.shakeIntensity = intensity; }
  }
  pushEffect(e) { if (Array.isArray(e)) this.effects.push(...e); else this.effects.push(e); }

  addScore(n) {
    const pts = Math.max(1, Math.round(n * this.scoreMul));
    this.score += pts;
    return pts;
  }

  difficulty() { return DIFFICULTIES[this.selectedDiff].id; }
  character() { return CHARACTERS[this.selectedChar]; }
  levelData() { return LEVELS[this.currentLevelIdx]; }
  isBonus() { return !!(this.level && this.levelData().bonus); }

  // Número "humano" del nivel (los bonus no cuentan).
  levelNumber(idx) {
    let n = 0;
    for (let i = 0; i <= idx; i++) if (!LEVELS[i].bonus) n++;
    return n;
  }

  // ---------- ARRANQUE DE NIVEL ----------
  loadLevel(idx, { retry = false } = {}) {
    const data = LEVELS[idx];
    const carryBarriga = (!retry && this.players[0] && !this.players[0].dead) ? this.players[0].barriga : 0;
    const carryLives = (!retry && this.players[0] && !this.players[0].dead) ? this.players[0].lives : 3;
    if (!retry) this.checkpointReached = false;
    this.level = new Level(data);
    const spawns = this.level.extractSpawns();

    let enemySpawns = spawns.enemies;
    if (this.difficulty() === 'easy') enemySpawns = enemySpawns.filter((_, i) => i % 2 === 0);

    this.players = [];
    const sp = spawns.lucas || spawns.cleto;
    if (sp) {
      const ch = this.character();
      const p = new Player({ x: sp.x + 2, y: sp.y, sprite: ch.sprite(), name: ch.name, index: 0 });
      p.barriga = carryBarriga;
      p.lives = Math.max(3, carryLives);
      this.players.push(p);
    }

    this.enemies = enemySpawns.map(s => {
      const e = new Enemy({ x: s.x, y: s.y, sprite: s.sprite, name: s.name });
      // los niveles avanzados tienen compañeros más rápidos / que disparan
      if (data.enemySpeed) { e.speed = data.enemySpeed; e.vx = -data.enemySpeed; }
      if (data.shooters && this.difficulty() !== 'easy') {
        e.expert = true;
        e.shootTimer = 90 + Math.floor(Math.random() * 180);
      }
      if (this.difficulty() === 'expert') {
        e.expert = true;
        e.shootTimer = 60 + Math.floor(Math.random() * 180);
        e.speed = 0.55; e.vx = -0.55;
      }
      return e;
    });

    this.diegos = spawns.diego.length > 0 ? [new Diego({ x: spawns.diego[0].x, y: spawns.diego[0].y })] : [];
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

    this.cromos = spawns.cromos.map(s => new Cromo({ x: s.x + 4, y: s.y + 3 }));
    this.cromosCollected = 0;
    this.cromosTotalLevel = this.cromos.length;
    this.bocadillos = (spawns.bocadillos || []).map(s => new Bocadillo({ x: s.x + 3, y: s.y + 5 }));

    this.portals = spawns.portals.map(s => new Portal({ x: s.x, y: s.y, group: s.group }));
    const byGroup = {};
    for (const p of this.portals) (byGroup[p.group] = byGroup[p.group] || []).push(p);
    for (const grp of Object.values(byGroup)) {
      if (grp.length === 2) { grp[0].partner = grp[1]; grp[1].partner = grp[0]; }
    }

    if (spawns.boss && data.bossClass) {
      this.boss = new data.bossClass(spawns.boss.x, spawns.boss.y);
      this.boss.y = spawns.boss.y + 16 - this.boss.h;
      if (typeof this.boss.applyDifficulty === 'function') this.boss.applyDifficulty(this.difficulty());
    } else {
      this.boss = null;
    }
    this.level.flagLocked = !!this.boss;

    this.flag = spawns.flag;
    this.checkpoint = data.bonus ? null : this.level.findCheckpoint(this.boss ? this.boss.x : null);
    if (retry && this.checkpointReached && this.checkpoint && this.players[0]) {
      const p = this.players[0];
      p.x = this.checkpoint.x + 2; p.y = this.checkpoint.y;
      p.lastSafeX = p.x; p.lastSafeY = p.y;
    }

    this.bonusItems = [];
    this.bonus = data.bonus ? {
      timeLeft: data.duration * 60, countdown: 150, spawnTimer: 0, elapsed: 0,
      caught: 0, combo: 0, comboTimer: 0, best: 0, points: 0, lastSec: -1,
    } : null;

    this.currentLevelIdx = idx;
    this.levelStartScore = this.score;
    // modo competitivo: cronómetro del nivel y resultados al terminar
    this.levelFrames = 0;
    this.results = null;
    this.effects = [];
    this.shakeFrames = 0;
    this.hitStop = 0;
    this.bossBanner = 0;
    this.uiFrame = 0;
    this.updateCamera(true);
  }

  startNewGame() {
    this.score = 0;
    this.scoreMul = DIFFICULTIES[this.selectedDiff].scoreMul;
    this.players = [];
    this.loadLevel(0);
    this.goIntro();
  }

  goIntro() {
    this.state = STATES.INTRO;
    this.endTimer = 170;
    Music.stop();
  }

  // ---------- BUCLE PRINCIPAL ----------
  update() {
    switch (this.state) {
      case STATES.TITLE:       this.updateTitle();      break;
      case STATES.CHAR_SELECT: this.updateCharSelect(); break;
      case STATES.DIFF_SELECT: this.updateDiffSelect(); break;
      case STATES.INTRO:       this.updateIntro();      break;
      case STATES.PLAYING:     this.updatePlaying();    break;
      case STATES.PAUSED:      this.updatePaused();     break;
      case STATES.LEVEL_END:   this.updateLevelEnd();   break;
      case STATES.GAME_OVER:   this.updateGameOver();   break;
      case STATES.VICTORY:     this.updateVictory();    break;
    }
  }

  draw() {
    const c = this.ctx;
    c.fillStyle = '#000';
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    switch (this.state) {
      case STATES.TITLE:       this.drawTitle();      break;
      case STATES.CHAR_SELECT: this.drawCharSelect(); break;
      case STATES.DIFF_SELECT: this.drawDiffSelect(); break;
      case STATES.INTRO:       this.drawIntro();      break;
      case STATES.PLAYING:
      case STATES.PAUSED:
      case STATES.LEVEL_END:   this.drawWorld();      break;
      case STATES.GAME_OVER:   this.drawGameOver();   break;
      case STATES.VICTORY:     this.drawVictory();    break;
    }
    if (this.state === STATES.PAUSED) this.drawPauseOverlay();
  }

  // =====================================================================
  // MENÚS
  // =====================================================================

  // Fondo animado compartido por los menús: el patio del cole desplazándose.
  drawMenuBackdrop(speed = 0.6, dim = 0) {
    const c = this.ctx;
    const t = this.titleAnim;
    const camX = t * speed;
    const L = this.titleLevel;
    L.time = t;
    L.backdrop.draw(c, camX, t);
    const W = L.tileCanvas.width;
    let off = camX % W;
    for (let x = -off; x < VIEW_W; x += W) c.drawImage(L.tileCanvas, snap(x), 0);
    if (dim) { c.fillStyle = `rgba(16,8,40,${dim})`; c.fillRect(0, 0, VIEW_W, VIEW_H); }
  }

  drawLogo(cx, y, t) {
    const c = this.ctx;
    const bounce = Math.sin(t * 0.06) * 2;
    c.save();
    c.translate(cx, y + bounce);
    // "LUCAS BROS." con relleno degradado y contorno grueso
    setFont(c, 30, 700);
    c.textAlign = 'center';
    c.lineJoin = 'round';
    const txt = 'LUCAS BROS.';
    c.fillStyle = 'rgba(30,10,60,0.45)';
    c.fillText(txt, 2, 3);
    c.lineWidth = 7; c.strokeStyle = '#2a1248'; c.strokeText(txt, 0, 0);
    c.lineWidth = 3; c.strokeStyle = '#ffffff'; c.strokeText(txt, 0, 0);
    const g = c.createLinearGradient(0, -24, 0, 2);
    g.addColorStop(0, '#fff3a0'); g.addColorStop(0.5, '#ffc838'); g.addColorStop(1, '#f07818');
    c.fillStyle = g;
    c.fillText(txt, 0, 0);
    // brillo
    c.globalAlpha = 0.5;
    c.fillStyle = '#ffffff';
    c.fillRect(-90, -19, 180, 1);
    c.globalAlpha = 1;
    // "2" en una estrella roja
    c.save();
    c.translate(100, -26);
    c.rotate(0.18 + Math.sin(t * 0.08) * 0.08);
    c.fillStyle = '#2a1248';
    this._starPath(c, 0, 0, 17, 10, 7); c.fill();
    c.fillStyle = '#ff3a5a';
    this._starPath(c, 0, 0, 15, 8.5, 7); c.fill();
    setFont(c, 18, 700);
    c.lineWidth = 3; c.strokeStyle = '#2a1248'; c.strokeText('2', 0, 6.5);
    c.fillStyle = '#ffffff'; c.fillText('2', 0, 6.5);
    c.restore();
    // cinta con el subtítulo
    const sw = 168, sy = 8;
    c.fillStyle = '#a01838';
    c.beginPath(); c.moveTo(-sw / 2 - 10, sy + 2); c.lineTo(-sw / 2, sy + 2); c.lineTo(-sw / 2, sy + 14); c.lineTo(-sw / 2 - 10, sy + 14); c.lineTo(-sw / 2 - 6, sy + 8); c.fill();
    c.beginPath(); c.moveTo(sw / 2 + 10, sy + 2); c.lineTo(sw / 2, sy + 2); c.lineTo(sw / 2, sy + 14); c.lineTo(sw / 2 + 10, sy + 14); c.lineTo(sw / 2 + 6, sy + 8); c.fill();
    c.fillStyle = '#e02848';
    c.fillRect(-sw / 2, sy, sw, 13);
    c.fillStyle = '#ff6080'; c.fillRect(-sw / 2, sy, sw, 1);
    c.restore();
    drawText(c, GAME_SUBTITLE.toUpperCase(), cx, y + bounce + sy + 10, { size: 8, align: 'center', color: '#ffffff', outline: '#5a0820', outlineWidth: 2 });
  }

  _starPath(c, x, y, R, r, n) {
    c.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (Math.PI * i) / n - Math.PI / 2;
      const rr = i % 2 ? r : R;
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
  }

  updateTitle() {
    this.titleAnim++;
    Music.play('title');
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
    const SCROLL = 0.8;            // lo que avanza el fondo cada frame
    this.drawMenuBackdrop(SCROLL);

    // Todos andan hacia la derecha a la velocidad del fondo: los pasos
    // van acompasados con el suelo (misma zancada que en el juego).
    const walkIn = (sp, x, phase) => {
      const animT = t * walkAnimStep(SCROLL, sp) + phase;
      const fr = animFrame(sp, 'walk', animT);
      const bob = Math.floor(animT) % 2 === 1 ? -1 : 0;
      drawSprite(c, fr, x, 176 - gridContentHeight(fr) + bob, false);
    };
    // los profes persiguen a Lucas y Cleto
    const profs = [Sprites.emilio, Sprites.lucre, Sprites.cesar, Sprites.mariPaz, Sprites.julio, Sprites.juanjo];
    for (let i = 0; i < profs.length; i++) walkIn(profs[i], -6 + i * 19, i * 1.3);
    const kids = [Sprites.lucas, Sprites.cleto];
    for (let i = 0; i < 2; i++) walkIn(kids[i], 150 + i * 22, i * 2);
    // Diego cerrando la marcha con su chupete
    walkIn(Sprites.diego, 214, 1);

    this.drawLogo(VIEW_W / 2, 58, t);

    drawPanel(c, 58, 190, 140, 24, { fill: 'rgba(20,10,50,0.8)', border: 'rgba(255,216,96,0.8)' });
    if (t % 60 < 42) drawText(c, 'Pulsa Espacio o Enter', VIEW_W / 2, 205, { size: 8, align: 'center', color: '#ffffff' });
    drawText(c, 'para empezar', VIEW_W / 2, 212, { size: 5, align: 'center', color: '#c8c0e8', outline: null });

    if (!Music.playing && t % 60 < 40) {
      drawText(c, '(haz clic en la página para oír la música)', VIEW_W / 2, 186, { size: 5, align: 'center', color: '#ffffff' });
    }
    drawText(c, 'RÉCORD ' + String(this.hiScore).padStart(6, '0'), 6, 233, { size: 6, color: '#ffd860' });
    drawText(c, 'X = Modo cabezón: ' + (Sprites.bigHead ? 'SÍ' : 'NO'), VIEW_W - 6, 233,
      { size: 6, align: 'right', color: Sprites.bigHead ? '#ff88cc' : '#ffffff' });
  }

  updateCharSelect() {
    this.titleAnim++;
    Music.play('title');
    if (Input.leftTap())  { this.selectedChar = (this.selectedChar - 1 + CHARACTERS.length) % CHARACTERS.length; Audio8.coin(); }
    if (Input.rightTap()) { this.selectedChar = (this.selectedChar + 1) % CHARACTERS.length; Audio8.coin(); }
    if (Input.startTap()) { Audio8.friend(); this.titleAnim = 0; this.state = STATES.DIFF_SELECT; }
  }

  drawCharSelect() {
    const c = this.ctx;
    const t = this.titleAnim;
    this.drawMenuBackdrop(0.3, 0.45);
    drawText(c, 'ELIGE PERSONAJE', VIEW_W / 2, 30, { size: 14, align: 'center', color: '#ffd860', shadow: true });

    for (let i = 0; i < CHARACTERS.length; i++) {
      const ch = CHARACTERS[i];
      const cx = VIEW_W / 2 + (i === 0 ? -56 : 56);
      const sel = i === this.selectedChar;
      drawPanel(c, cx - 44, 46, 88, 128, {
        fill: sel ? 'rgba(60,30,120,0.88)' : 'rgba(20,12,40,0.7)',
        border: sel ? '#ffd860' : 'rgba(255,255,255,0.2)', borderWidth: sel ? 2 : 1, radius: 6,
      });
      // foco de luz
      if (sel) {
        const g = c.createRadialGradient(cx, 130, 4, cx, 130, 44);
        g.addColorStop(0, 'rgba(255,230,140,0.35)'); g.addColorStop(1, 'rgba(255,230,140,0)');
        c.fillStyle = g; c.fillRect(cx - 44, 70, 88, 90);
      }
      const fr = sel ? animFrame(ch.sprite(), Math.floor(t / 40) % 3 === 2 ? 'jump' : 'walk', t * 0.18) : animFrame(ch.sprite(), 'idle', t);
      const g0 = ch.sprite();
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.beginPath(); c.ellipse(cx, 140, 18, 3, 0, 0, Math.PI * 2); c.fill();
      drawSprite(c, fr, cx - 8, 140 - spriteH(fr) + (spriteH(fr) - spriteH(g0)), false, { scaleX: 3, scaleY: 3 });
      drawText(c, ch.name, cx, 158, { size: 11, align: 'center', color: sel ? '#ffd860' : '#b0a8c8' });
      drawText(c, ch.blurb, cx, 168, { size: 6, align: 'center', color: sel ? '#ffffff' : '#8880a0', outline: null });
    }
    if (t % 60 < 42) drawText(c, '◀  ▶  para elegir', VIEW_W / 2, 196, { size: 8, align: 'center' });
    drawText(c, 'Espacio / Enter para confirmar', VIEW_W / 2, 212, { size: 7, align: 'center', color: '#c8c0e8' });
  }

  updateDiffSelect() {
    this.titleAnim++;
    Music.play('title');
    if (Input.leftTap())  { this.selectedDiff = (this.selectedDiff - 1 + DIFFICULTIES.length) % DIFFICULTIES.length; Audio8.coin(); }
    if (Input.rightTap()) { this.selectedDiff = (this.selectedDiff + 1) % DIFFICULTIES.length; Audio8.coin(); }
    if (Input.startTap()) { Audio8.coin(); this.startNewGame(); }
  }

  drawDiffSelect() {
    const c = this.ctx;
    const t = this.titleAnim;
    this.drawMenuBackdrop(0.3, 0.5);
    drawText(c, 'ELIGE DIFICULTAD', VIEW_W / 2, 30, { size: 14, align: 'center', color: '#ffd860', shadow: true });
    const icons = [Sprites.diego, Sprites.juanjo, Sprites.emilio];
    for (let i = 0; i < DIFFICULTIES.length; i++) {
      const d = DIFFICULTIES[i];
      const cx = VIEW_W / 2 + (i - 1) * 76;
      const sel = i === this.selectedDiff;
      const lift = sel ? Math.sin(t * 0.15) * 2 - 3 : 0;
      drawPanel(c, cx - 34, 48 + lift, 68, 96, {
        fill: sel ? 'rgba(40,20,80,0.9)' : 'rgba(20,12,40,0.7)',
        border: sel ? d.color : 'rgba(255,255,255,0.2)', borderWidth: sel ? 2 : 1, radius: 6,
      });
      const ic = icons[i];
      const h = gridContentHeight(ic);
      drawSprite(c, ic, cx - gridSize(ic).w / 2, 104 + lift - h, false, { alpha: sel ? 1 : 0.6 });
      drawText(c, d.name, cx, 120 + lift, { size: 10, align: 'center', color: sel ? d.color : '#a098b8' });
      drawText(c, '×' + d.scoreMul + ' puntos', cx, 134 + lift, { size: 6, align: 'center', color: sel ? '#ffffff' : '#807898', outline: null });
    }
    drawText(c, DIFFICULTIES[this.selectedDiff].blurb, VIEW_W / 2, 164, { size: 7, align: 'center', color: '#ffffff' });
    if (t % 60 < 42) drawText(c, '◀  ▶  para elegir', VIEW_W / 2, 196, { size: 8, align: 'center' });
    drawText(c, 'Espacio / Enter para empezar', VIEW_W / 2, 212, { size: 7, align: 'center', color: '#c8c0e8' });
  }

  // ---------- PRESENTACIÓN DE NIVEL ----------
  updateIntro() {
    this.endTimer--;
    this.titleAnim++;
    if (this.endTimer <= 0 || (this.endTimer < 140 && Input.startTap())) {
      this.state = STATES.PLAYING;
    }
  }

  drawIntro() {
    const c = this.ctx;
    const data = this.levelData();
    const t = 170 - this.endTimer;
    // nivel de fondo, oscurecido
    this.level.drawBackground(c, this.camX);
    this.level.drawTiles(c, this.camX);
    c.fillStyle = 'rgba(14,6,34,0.78)';
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    const slide = Math.max(0, 1 - t / 18);
    const ease = slide * slide;
    if (data.bonus) {
      drawText(c, '¡NIVEL BONUS!', VIEW_W / 2 - ease * 200, 70, { size: 20, align: 'center', color: '#ffd860', shadow: true });
      const parts = data.title.split('—');
      drawText(c, (parts[1] || data.title).trim(), VIEW_W / 2 + ease * 200, 92, { size: 10, align: 'center', color: '#ffffff' });
      const items = ['cromo', 'apple', 'donut', 'bocadillo', 'star'];
      items.forEach((k, i) => {
        const sp = BONUS_ITEMS[k].sprite();
        const x = VIEW_W / 2 - 64 + i * 32;
        drawSprite(c, sp, x - gridSize(sp).w / 2, 112 + Math.sin(t * 0.1 + i) * 2);
      });
      drawSprite(c, Sprites.bomb, VIEW_W / 2 - 4, 140);
      drawText(c, 'Coge todo lo que caiga antes de que se acabe el tiempo.', VIEW_W / 2, 166, { size: 6, align: 'center' });
      drawText(c, '¡Cuidado con las bombas!', VIEW_W / 2, 178, { size: 7, align: 'center', color: '#ff7766' });
      drawText(c, 'El tiempo no se puede alargar: ¡date prisa!', VIEW_W / 2, 190, { size: 6, align: 'center', color: '#88ddff' });
    } else {
      const n = this.levelNumber(this.currentLevelIdx);
      drawText(c, 'NIVEL ' + n, VIEW_W / 2 - ease * 200, 56, { size: 22, align: 'center', color: '#ffd860', shadow: true });
      const parts = data.title.split('—');
      drawText(c, (parts[1] || data.title).trim(), VIEW_W / 2 + ease * 200, 76, { size: 11, align: 'center', color: '#ffffff' });
      if (this.boss) {
        const sp = this.boss.sprite;
        const h = gridContentHeight(sp);
        const bx = VIEW_W / 2 + 40, by = 156;
        c.fillStyle = 'rgba(255,60,90,0.18)';
        c.beginPath(); c.arc(bx, by - 26, 34, 0, Math.PI * 2); c.fill();
        drawSprite(c, sp, bx - 12, by - h * 1.6 + (h * 0.6), false, { scaleX: 1.6, scaleY: 1.6 });
        drawText(c, 'JEFE', bx, 168, { size: 6, align: 'center', color: '#ff8899' });
        drawText(c, this.boss.name, bx, 180, { size: 10, align: 'center', color: '#ffffff' });
        drawText(c, this.boss.role, bx, 190, { size: 6, align: 'center', color: '#c8c0e8', outline: null });
      }
      const p = this.players[0];
      if (p) {
        const px = VIEW_W / 2 - 56;
        const fr = animFrame(p.sprite, 'idle', t);
        drawSprite(c, fr, px - 8, 150 - spriteH(fr) * 2 + spriteH(fr), false, { scaleX: 2, scaleY: 2 });
        drawText(c, p.name, px, 168, { size: 10, align: 'center' });
        for (let i = 0; i < p.lives; i++) drawHeart(c, px - p.lives * 4.5 + i * 9, 174, true);
      }
      drawText(c, 'VS', VIEW_W / 2 - 8, 140, { size: 14, align: 'center', color: '#ff5577' });
      // reto del nivel
      const rec = Storage.getLevel(this.currentLevelIdx);
      drawText(c, 'Tiempo objetivo: ' + fmtTime(data.par || 120), VIEW_W / 2, 96, { size: 7, align: 'center', color: '#88ff88' });
      if (rec) {
        drawText(c, 'Tu récord: ' + fmtTime(rec.time) + '   ' + rec.score + ' pts   ' + starStr(rec.stars),
          VIEW_W / 2, 107, { size: 6, align: 'center', color: '#ffd860' });
      }
    }
    if (this.endTimer < 140 && t % 40 < 28) drawText(c, 'Espacio para empezar', VIEW_W / 2, 220, { size: 6, align: 'center', color: '#c8c0e8' });
  }

  // =====================================================================
  // JUGANDO
  // =====================================================================
  updatePlaying() {
    this.uiFrame++;
    if (!this.bonus) this.levelFrames++;
    if (Input.pauseTap()) { Audio8.pause(); this.state = STATES.PAUSED; return; }

    for (const fx of this.effects) fx.update();
    this.effects = this.effects.filter(fx => !fx.dead);
    if (this.shakeFrames > 0) this.shakeFrames--;
    if (this.flashFrames > 0) this.flashFrames--;
    if (this.bossBanner > 0) this.bossBanner--;

    // Congelación breve al golpear (da "peso" a los golpes)
    if (this.hitStop > 0) { this.hitStop--; return; }

    if (this.isBonus()) Music.play('bonus');
    else if (this.boss && this.boss.awake && !this.boss.dead) Music.play('boss');
    else Music.play('level');

    this.level.updateAmbient(this.camX);

    // En el bonus, la cuenta atrás inicial congela al jugador.
    const frozen = this.bonus && this.bonus.countdown > 0;
    for (const p of this.players) {
      if (p.dead) continue;
      p.update(frozen ? {} : Input.forPlayer(p.index), this.level);
      this.handlePlayerEvents(p);
    }

    for (const e of this.enemies) e.update(this.level);
    this.enemies = this.enemies.filter(e => !e.gone);
    for (const d of this.diegos) d.update(this.level);
    for (const par of this.parents) par.update(this.level);
    for (const f of this.friends) f.update(this.level, this.players);
    for (const cromo of this.cromos) cromo.update();
    for (const boc of this.bocadillos) boc.update();
    for (const portal of this.portals) portal.update();

    if (this.boss) {
      if (!this.boss.awake && !this.boss.dead) {
        this.boss.idleUpdate(this.level);
        const p = this.players.find(pp => !pp.dead);
        if (p && Math.abs((p.x + p.w / 2) - (this.boss.x + this.boss.w / 2)) < 170) this.wakeBoss();
      } else {
        this.boss.update(this.level, this.players);
      }
    }

    if (this.bonus) this.updateBonus();

    this.handlePlayerEnemyCollisions();
    this.handleEnemyProjectileHits();
    this.handlePlayerDiegoCollisions();
    this.handlePlayerParentCollisions();
    this.handlePlayerFriendCollisions();
    this.handleCromoCollection();
    this.handleBocadilloCollection();
    this.handleBananaCollisions();
    this.handlePedoEnemyHits();
    this.handleBoomerangHits();
    this.handleProjectilePlayerHits();
    this.handlePlayerBossCollision();
    this.handlePortalLogic();
    this.handleSurpriseBlockPops();
    this.handleCheckpoint();

    this.cromos = this.cromos.filter(c => !c.dead);
    this.bocadillos = this.bocadillos.filter(b => !b.dead);

    this.updateCamera();

    if (this.flag && this.playerReachedFlag()) {
      this.state = STATES.LEVEL_END;
      this.endTimer = 100;
      this.computeLevelResults();
      Music.stop();
      Audio8.victory();
      this.pushEffect(Effects.confetti(VIEW_W, 30));
    }

    if (this.players.length && this.players.every(p => p.dead)) {
      this.state = STATES.GAME_OVER;
      this.endTimer = 90;
      Music.stop();
      Audio8.gameOver();
      if (this.score > this.hiScore) { this.hiScore = this.score; Storage.recordIfBetter(this.score); }
    }
  }

  wakeBoss() {
    const b = this.boss;
    b.awake = true;
    b.timer = 0;
    this.bossBanner = 150;
    Audio8.bossIntro();
    this.shake(2, 20);
    this.pushEffect(Effects.text(b.x + b.w / 2, b.y - 8, '¡¡¿QUÉ HACÉIS AQUÍ?!!', '#ff8899', 80, 7));
  }

  // Partículas y efectos a partir de lo que ha "pasado" al jugador.
  handlePlayerEvents(p) {
    const dustCol = this.level.theme.ground === 'grass' ? '#e8dcc0' : '#ffffff';
    const fx = p.x + p.w / 2, fy = p.y + p.h;
    for (const ev of p.events) {
      if (ev.type === 'land') this.pushEffect(Effects.dust(fx, fy, dustCol, 3 + Math.round(ev.strength * 6)));
      else if (ev.type === 'jump') this.pushEffect(Effects.dust(fx, fy, dustCol, 3));
      else if (ev.type === 'skid') { if (this.uiFrame % 3 === 0) this.pushEffect(Effects.dust(fx + p.facing * 4, fy, dustCol, 1, -p.facing)); }
      else if (ev.type === 'run') this.pushEffect(Effects.dust(fx - p.facing * 4, fy, dustCol, 1, -p.facing));
      else if (ev.type === 'spring') { this.pushEffect(Effects.ring(fx, fy, '#ffffff', 16)); this.pushEffect(Effects.dust(fx, fy, dustCol, 6)); }
      else if (ev.type === 'airjump') this.pushEffect(Effects.ring(fx, fy, '#88ff88', 10));
      else if (ev.type === 'bonk') this.pushEffect(Effects.debris(ev.x, ev.y, '#ffffff'));
      else if (ev.type === 'slipSkid') this.pushEffect(Effects.dust(fx - p.facing * 3, fy, '#ffe080', 1, -p.facing));
      else if (ev.type === 'slipThud') { this.pushEffect(Effects.dust(fx, fy, dustCol, 7)); this.pushEffect(Effects.text(fx, p.y - 8, '¡PUMBA!', '#ffaa66', 36)); this.shake(2, 8); }
      else if (ev.type === 'respawn') { this.pushEffect(Effects.text(fx, p.y - 6, '¡Uy!', '#ffaa66', 40)); this.shake(3, 10); }
    }
  }

  playerReachedFlag() {
    if (this.boss && !this.boss.dead) return false;
    const r = { x: this.flag.x, y: this.flag.y - 48, w: 16, h: 64 };
    return this.players.some(p => !p.dead && rectsOverlap(p.rect(), r));
  }

  // ---------- MODO COMPETITIVO ----------
  // Al llegar a la meta: bonus por tiempo y por no recibir daño, hasta 3
  // estrellas (meta / todos los cromos / batir el tiempo objetivo) y
  // récords por nivel (mejor tiempo y mejor puntuación).
  computeLevelResults() {
    const data = this.levelData();
    const p = this.players[0];
    const secs = this.levelFrames / 60;
    const par = data.par || 120;
    const underPar = secs <= par;
    const timeBonus = underPar ? this.addScore(Math.round((par - secs) * 50)) : 0;
    const noHit = p && p.hitsTaken === 0;
    const noHitBonus = noHit ? this.addScore(2000) : 0;
    const allCromos = this.cromosCollected >= this.cromosTotalLevel;
    const stars = 1 + (allCromos ? 1 : 0) + (underPar ? 1 : 0);
    const levelScore = this.score - this.levelStartScore;
    const rec = Storage.levelRecord(this.currentLevelIdx, { time: secs, score: levelScore, stars });
    this.results = { secs, par, underPar, timeBonus, noHit, noHitBonus, allCromos, stars, levelScore, ...rec };
  }

  updateCamera(snapNow = false) {
    const alive = this.players.filter(p => !p.dead);
    if (alive.length === 0 || !this.level) return;
    const p = alive[0];
    const lookTarget = p.facing * 28 + p.vx * 6;
    this.camLook += (lookTarget - this.camLook) * (snapNow ? 1 : 0.04);
    let target = p.x + p.w / 2 + this.camLook - VIEW_W / 2;
    target = Math.max(0, Math.min(this.level.widthPx - VIEW_W, target));
    if (snapNow) this.camX = target;
    else this.camX += (target - this.camX) * 0.12;
    this.camX = Math.max(0, Math.min(Math.max(0, this.level.widthPx - VIEW_W), this.camX));
  }

  hurtPlayer(p, fromX, msg = '¡AY!') {
    if (!p.hurt(fromX)) return;
    this.shake(4, 14);
    this.hitStop = 4;
    if (!p.dead) this.pushEffect(Effects.text(p.x + p.w / 2, p.y - 4, msg, '#ff6666', 34));
    this.pushEffect(Effects.burst(p.x + p.w / 2, p.y + p.h / 2, '#ff8888', 6));
  }

  // ---------- COLISIONES ----------
  handlePlayerEnemyCollisions() {
    const ctrl = Input.forPlayer(0);
    for (const p of this.players) {
      if (p.dead) continue;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (!rectsOverlap(p.rect(), e.rect())) continue;
        const playerBottom = p.y + p.h;
        if (p.vy > 0 && playerBottom - p.vy <= e.y + 5) {
          e.stomp();
          p.vy = ctrl.jumpHeld ? -6.2 : -4;
          p.jumpHoldFrames = Player.MAX_JUMP_HOLD;
          p.scaleX = 1.2; p.scaleY = 0.85;
          const pts = this.addScore(COMBO_POINTS[Math.min(p.combo, COMBO_POINTS.length - 1)]);
          p.combo++;
          this.hitStop = 3;
          Audio8.stomp();
          if (p.combo > 1) {
            Audio8.combo(p.combo);
            this.pushEffect(Effects.text(e.x + e.w / 2, e.y - 12, '¡COMBO ×' + p.combo + '!', '#88ffff', 45, 8));
          }
          this.pushEffect(Effects.burst(e.x + e.w / 2, e.y + e.h, '#ffffff', 8));
          this.pushEffect(Effects.scorePopup(e.x + e.w / 2, e.y, pts));
        } else if (p.powerup === 'invincible') {
          e.knockOff(p.x < e.x ? 1 : -1);
          const pts = this.addScore(100);
          Audio8.stomp();
          this.pushEffect(Effects.burst(e.x + e.w / 2, e.y + e.h / 2, '#ffd860', 10));
          this.pushEffect(Effects.scorePopup(e.x + e.w / 2, e.y, pts));
        } else if (e.stunned > 0) {
          continue;
        } else if (p.invuln <= 0) {
          this.hurtPlayer(p, e.x + e.w / 2);
        }
      }
    }
  }

  handleEnemyProjectileHits() {
    for (const e of this.enemies) {
      for (const proj of e.projectiles) {
        if (proj.dead) continue;
        for (const p of this.players) {
          if (p.dead || p.invuln > 0 || p.powerup === 'invincible') continue;
          if (rectsOverlap(p.rect(), proj.rect())) { this.hurtPlayer(p, proj.x); proj.dead = true; }
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
          if (p.lives < 6) p.lives++;
          const pts = this.addScore(200);
          Audio8.gift();
          this.pushEffect(Effects.burst(d.x + d.w / 2, d.y + d.h / 2, '#ffaacc', 10));
          this.pushEffect(Effects.text(d.x + d.w / 2, d.y - 14, '+1 ♥', '#ff88aa', 50, 8));
          this.pushEffect(Effects.scorePopup(d.x, d.y, pts));
        }
        for (const c of d.chupetes) {
          if (c.dead) continue;
          if (rectsOverlap(p.rect(), c.rect())) {
            c.vx = -c.vx; c.vy = -2;
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
          this.flashFrames = 6;
          this.pushEffect(Effects.confetti(VIEW_W, 16));
          this.pushEffect(Effects.ring(f.x + f.w / 2, f.y + 8, '#ffd860', 24));
          this.pushEffect(Effects.scorePopup(f.x + f.w / 2, f.y - 4, pts));
          this.pushEffect(Effects.text(f.x + f.w / 2, f.y - 16, '¡' + f.def.name.toUpperCase() + '!', '#ffd860', 50, 9));
          this.pushEffect(Effects.text(p.x + p.w / 2, p.y - 26, POWERUP_LABELS[f.def.powerup], '#88ffff', 70, 7));
        }
      }
    }
  }

  handlePlayerParentCollisions() {
    for (const p of this.players) {
      if (p.dead) continue;
      for (const par of this.parents) {
        if (par.dead || !rectsOverlap(p.rect(), par.rect())) continue;
        if (!par.friendly) {
          if (p.paralyzed > 0 || par.cooldown > 0) continue;
          par.shout();
          p.scold();
          this.shake(2, 10);
          continue;
        }
        if (par.gave) {
          if (par.cooldown <= 0) par.shout(['¡Hola!', '¿Has visto a los chicos?', '¡Ánimo!'][Math.floor(Math.random() * 3)]);
          continue;
        }
        // Padres de los amigos: un regalo cada uno
        par.gave = true;
        par.cooldown = 0;
        par.shout(par.def.phrase);
        Audio8.gift();
        const cx = par.x + par.w / 2, cy = par.y - 8;
        this.pushEffect(Effects.burst(cx, cy + 10, '#88ff88', 10));
        const g = par.def.gift;
        if (g === 'heart') {
          p.lives = Math.min(6, p.lives + 1);
          this.pushEffect(Effects.text(cx, cy - 16, '+1 ♥', '#ff88aa', 60, 9));
        } else if (g === 'points') {
          const pts = this.addScore(500);
          this.pushEffect(Effects.scorePopup(cx, cy - 16, pts));
        } else if (g === 'food') {
          const full = p.feed(2);
          this.pushEffect(Effects.text(cx, cy - 16, full ? '¡PEDO LISTO! (E)' : '+2 BARRIGA', '#ffd860', 60, 8));
        } else if (g === 'speed') {
          p.applyPowerup('speed', 480);
          this.pushEffect(Effects.text(cx, cy - 16, POWERUP_LABELS.speed, '#88ffff', 60, 8));
        }
      }
    }
  }

  handleCromoCollection() {
    for (const p of this.players) {
      if (p.dead) continue;
      for (const c of this.cromos) {
        if (c.collected) continue;
        if (p.powerup === 'magnet') c.attract(p);
        if (rectsOverlap(p.rect(), c.rect())) {
          c.collect();
          const pts = this.addScore(50);
          this.cromosCollected++;
          this.pushEffect(Effects.star(c.x + c.w / 2, c.y + c.h / 2, '#ffd860'));
          this.pushEffect(Effects.scorePopup(c.x + c.w / 2, c.y - 2, pts));
          if (this.cromosCollected === this.cromosTotalLevel && this.cromosTotalLevel > 0) {
            for (const pp of this.players) if (!pp.dead) pp.lives = Math.min(6, pp.lives + 1);
            this.addScore(1000);
            Audio8.victory();
            this.pushEffect(Effects.confetti(VIEW_W, 24));
            this.pushEffect(Effects.text(p.x + p.w / 2, p.y - 16, '¡TODOS LOS CROMOS!', '#ffd860', 80, 9));
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
          this.pushEffect(Effects.scorePopup(boc.x + 5, boc.y - 2, pts));
          if (full) this.pushEffect(Effects.text(p.x + p.w / 2, p.y - 16, '¡PEDO LISTO! (E)', '#88ff88', 60, 8));
          else this.pushEffect(Effects.text(boc.x + 5, boc.y - 10, '¡ÑAM!', '#ffd860', 30));
        }
      }
    }
  }

  handleBananaCollisions() {
    for (const d of this.diegos) {
      for (const banana of d.bananas) {
        if (banana.dead || !banana.landed) continue;
        for (const p of this.players) {
          if (p.dead || p.invuln > 0 || p.slipping > 0) continue;
          if (rectsOverlap(p.rect(), banana.rect())) {
            const dir = p.facing >= 0 ? 1 : -1;
            p.slip(dir);
            banana.kick(dir);
            this.pushEffect(Effects.text(p.x + p.w / 2, p.y - 12, '¡UAAAH!', '#ffd860', 50));
            this.pushEffect(Effects.dust(p.x + p.w / 2, p.y + p.h, '#ffe080', 6));
            break;
          }
        }
        if (banana.dead) continue;
        for (const e of this.enemies) {
          if (e.dead || e.slipping > 0) continue;
          if (rectsOverlap(e.rect(), banana.rect())) {
            e.slip(e.facing >= 0 ? 1 : -1);
            banana.kick(e.facing >= 0 ? 1 : -1);
            this.pushEffect(Effects.text(e.x + e.w / 2, e.y - 8, '¡UPS!', '#ffaa44', 28));
            break;
          }
        }
      }
    }
  }

  handlePedoEnemyHits() {
    for (const p of this.players) {
      for (const cloud of p.pedos) {
        if (cloud.dead) continue;
        const r = cloud.rect();
        for (const e of this.enemies) {
          if (e.dead || cloud.hitSet.has(e)) continue;
          if (rectsOverlap(r, e.rect())) {
            cloud.hitSet.add(e);
            e.stun(180);
            this.pushEffect(Effects.text(e.x + e.w / 2, e.y - 6, '¡PUAJ!', '#88ff88', 30));
          }
        }
        if (this.boss && !this.boss.dead && !cloud.hitBoss && rectsOverlap(r, this.boss.rect())) {
          cloud.hitBoss = true;
          this.pushEffect(Effects.text(this.boss.x + this.boss.w / 2, this.boss.y - 6, '¡QUÉ ASCO!', '#88ff88', 50));
        }
      }
    }
  }

  damageBoss(fromAbove) {
    const b = this.boss;
    if (!b.hit()) return false;
    const pts = this.addScore(300);
    Audio8.bossHit();
    this.shake(5, 14);
    this.hitStop = 7;
    this.pushEffect(Effects.burst(b.x + b.w / 2, b.y + (fromAbove ? 0 : 12), '#ff5566', 14));
    this.pushEffect(Effects.scorePopup(b.x + b.w / 2, b.y, pts));
    if (b.dead) {
      this.hitStop = 14;
      this.flashFrames = 10;
      this.level.flagLocked = false;
      Audio8.victory();
      this.pushEffect(Effects.confetti(VIEW_W, 36));
      this.pushEffect(Effects.text(b.x + b.w / 2, b.y - 16, '¡' + b.name.toUpperCase() + ' DERROTADO!', '#ffd860', 100, 10));
      if (this.flag) this.pushEffect(Effects.text(this.flag.x + 8, this.flag.y - 56, '¡META ABIERTA!', '#88ff88', 140, 8));
    }
    return true;
  }

  handleBoomerangHits() {
    for (const p of this.players) {
      for (const b of p.boomerangs) {
        for (const e of this.enemies) {
          if (e.dead || b.hitSet.has(e)) continue;
          if (rectsOverlap(b.rect(), e.rect())) {
            b.hitSet.add(e);
            e.knockOff(b.x < e.x ? 1 : -1);
            const pts = this.addScore(100);
            Audio8.stomp();
            this.hitStop = 2;
            this.pushEffect(Effects.burst(e.x + e.w / 2, e.y + e.h / 2, '#ffaa66', 8));
            this.pushEffect(Effects.scorePopup(e.x + e.w / 2, e.y, pts));
          }
        }
        if (this.boss && !this.boss.dead && this.boss.awake && !b.hitSet.has(this.boss) && rectsOverlap(b.rect(), this.boss.rect())) {
          if (this.damageBoss(false)) b.hitSet.add(this.boss);
        }
      }
    }
  }

  handleProjectilePlayerHits() {
    if (!this.boss) return;
    for (const p of this.players) {
      if (p.dead || p.invuln > 0 || p.powerup === 'invincible') continue;
      for (const proj of this.boss.projectiles) {
        if (proj.dead) continue;
        if (rectsOverlap(p.rect(), proj.rect())) { this.hurtPlayer(p, proj.x + proj.w / 2); proj.dead = true; }
      }
    }
  }

  handlePlayerBossCollision() {
    const b = this.boss;
    if (!b || b.dead) return;
    for (const p of this.players) {
      if (p.dead || p.invuln > 0) continue;
      if (!rectsOverlap(p.rect(), b.rect())) continue;
      if (!b.awake) this.wakeBoss();
      if (p.vy > 0 && p.y + p.h - p.vy <= b.y + 8) {
        if (this.damageBoss(true)) {
          p.vy = -5;
          p.jumpHoldFrames = Player.MAX_JUMP_HOLD;
          p.vx = (p.x + p.w / 2 < b.x + b.w / 2 ? -1.8 : 1.8);
        } else {
          p.vy = -3;
        }
      } else if (p.powerup === 'invincible') {
        this.damageBoss(false);
      } else {
        this.hurtPlayer(p, b.x + b.w / 2, '¡AUCH!');
      }
    }
  }

  _portalHasGroundBelow(portal) {
    const cx = portal.x + portal.w / 2;
    for (let dy = portal.h; dy <= portal.h + 80; dy += 16) if (this.level.solidAt(cx, portal.y + dy)) return true;
    return false;
  }

  _safeTeleportX(portal) {
    if (this._portalHasGroundBelow(portal)) return portal.x;
    for (let off = 16; off <= 48; off += 16) {
      if (this._portalHasGroundBelow({ ...portal, x: portal.x + off })) return portal.x + off;
      if (this._portalHasGroundBelow({ ...portal, x: portal.x - off })) return portal.x - off;
    }
    return portal.x;
  }

  handleSurpriseBlockPops() {
    if (this.level.poppedBlocks.length === 0) return;
    for (const pop of this.level.poppedBlocks) {
      const cx = pop.col * 16 + 8;
      const cy = pop.row * 16;
      if (Math.random() < 0.75) {
        const cr = new Cromo({ x: pop.col * 16 + 4, y: (pop.row - 1) * 16 + 4 });
        this.cromos.push(cr);
        this.cromosTotalLevel++;
        Audio8.coin();
        this.pushEffect(Effects.star(cx, cy - 4, '#ffd860'));
      } else {
        for (const p of this.players) if (!p.dead && p.lives < 6) p.lives++;
        this.addScore(200);
        Audio8.friend();
        this.pushEffect(Effects.burst(cx, cy - 4, '#ff66aa', 12));
        this.pushEffect(Effects.text(cx, cy - 10, '+1 ♥', '#ff88aa', 50, 9));
      }
    }
    this.level.poppedBlocks = [];
  }

  handlePortalLogic() {
    if (this.portals.length === 0) return;
    for (const portal of this.portals) {
      const inside = this.players.filter(p => !p.dead && rectsOverlap(p.rect(), portal.rect()));
      portal.setPlayersInside(inside);
    }
    for (const portal of this.portals) {
      const teleporters = portal.tryActivate(this.players);
      if (teleporters && portal.partner) {
        Audio8.portal();
        this.flashFrames = 8;
        const safeX = this._safeTeleportX(portal.partner);
        for (const p of teleporters) {
          this.pushEffect(Effects.ring(p.x + p.w / 2, p.y + 8, '#cc88ff', 20));
          p.x = safeX + 2;
          p.y = portal.partner.y + 8;
          p.vx = 0; p.vy = 0;
          p.invuln = 30;
          portal.partner.lockedPlayers.add(p);
          this.pushEffect(Effects.ring(p.x + p.w / 2, p.y + 8, '#cc88ff', 20));
        }
        portal.activationProgress.clear();
        this.updateCamera(true);
      }
    }
  }

  handleCheckpoint() {
    if (!this.checkpoint || this.checkpointReached) return;
    const p = this.players.find(pp => !pp.dead);
    if (p && p.x >= this.checkpoint.x) {
      this.checkpointReached = true;
      Audio8.checkpoint();
      this.pushEffect(Effects.burst(this.checkpoint.x + 8, this.checkpoint.y, '#88ff88', 14));
      this.pushEffect(Effects.text(this.checkpoint.x + 8, this.checkpoint.y - 24, '¡PUNTO DE CONTROL!', '#88ff88', 90, 8));
    }
  }

  // ---------- BONUS ----------
  updateBonus() {
    const B = this.bonus;
    const data = this.levelData();
    if (B.countdown > 0) {
      if (B.countdown % 50 === 0) Audio8.tick();
      B.countdown--;
      if (B.countdown === 0) Audio8.whistle();
      return;
    }
    B.elapsed++;
    B.timeLeft--;
    const sec = Math.ceil(B.timeLeft / 60);
    if (sec <= 5 && sec !== B.lastSec && sec > 0) Audio8.tick();
    B.lastSec = sec;
    if (B.comboTimer > 0) B.comboTimer--; else B.combo = 0;

    // cada vez cae más deprisa
    B.spawnTimer--;
    if (B.spawnTimer <= 0) {
      B.spawnTimer = Math.max(14, 44 - Math.floor(B.elapsed / 60));
      const kind = data.items[Math.floor(Math.random() * data.items.length)];
      this.bonusItems.push(new BonusItem(kind, 8 + Math.random() * (this.level.widthPx - 24)));
    }
    for (const it of this.bonusItems) {
      it.update(this.level);
      if (it.exploded) this.explodeBomb(it);
    }
    const p = this.players[0];
    if (p && !p.dead) {
      for (const it of this.bonusItems) {
        if (it.dead || !rectsOverlap(p.rect(), it.rect())) continue;
        it.dead = true;
        if (it.def.bad) { this.explodeBomb(it, true); continue; }
        B.caught++;
        B.combo++;
        B.comboTimer = 70;
        B.best = Math.max(B.best, B.combo);
        const mul = 1 + Math.floor((B.combo - 1) / 4);
        const cx = it.x + it.w / 2, cy = it.y;
        if (it.def.time) {
          B.timeLeft += it.def.time * 60;
          Audio8.checkpoint();
          this.pushEffect(Effects.text(cx, cy - 6, '+' + it.def.time + ' s', '#88ddff', 50, 9));
        }
        if (it.def.food) p.feed(1);
        if (it.def.pts) {
          const pts = this.addScore(it.def.pts * mul);
          B.points += pts;
          if (it.kind === 'star') { Audio8.friend(); this.flashFrames = 4; } else Audio8.coin();
          this.pushEffect(Effects.scorePopup(cx, cy, pts));
          if (mul > 1) this.pushEffect(Effects.text(cx, cy - 10, '×' + mul, '#88ffff', 30, 7));
        }
        this.pushEffect(Effects.star(cx, cy + it.h / 2, it.def.color));
      }
    }
    this.bonusItems = this.bonusItems.filter(it => !it.dead);

    if (B.timeLeft <= 0) {
      this.state = STATES.LEVEL_END;
      this.endTimer = 100;
      Music.stop();
      Audio8.whistle();
      setTimeout(() => Audio8.victory(), 400);
      this.pushEffect(Effects.confetti(VIEW_W, 30));
    }
  }

  explodeBomb(it, touched = false) {
    const B = this.bonus;
    const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
    Audio8.boom();
    this.shake(5, 16);
    this.pushEffect(Effects.burst(cx, cy, '#ff8833', 16));
    this.pushEffect(Effects.dust(cx, cy + 4, '#888888', 8));
    this.pushEffect(Effects.ring(cx, cy, '#ffdd66', 24));
    const p = this.players[0];
    const near = p && Math.hypot(p.x + p.w / 2 - cx, p.y + p.h / 2 - cy) < 26;
    if (touched || near) {
      B.timeLeft = Math.max(0, B.timeLeft - 180);
      B.combo = 0;
      p.paralyzed = 40;
      p.vy = -3;
      this.pushEffect(Effects.text(cx, cy - 12, '¡BUM! -3 s', '#ff6644', 50, 9));
    }
  }

  // ---------- DIBUJO MUNDO ----------
  drawWorld() {
    const c = this.ctx;
    const camX = snap(this.camX);
    c.save();
    if (this.shakeFrames > 0) {
      const k = this.shakeIntensity * (this.shakeFrames / 14);
      c.translate(snap((Math.random() - 0.5) * k), snap((Math.random() - 0.5) * k));
    }
    const L = this.level;
    L.drawBackground(c, camX);
    L.drawTiles(c, camX);
    this.drawCheckpoint(camX);

    for (const portal of this.portals) portal.draw(c, camX, null);
    for (const cromo of this.cromos) cromo.draw(c, camX);
    for (const boc of this.bocadillos) boc.draw(c, camX);
    for (const it of this.bonusItems) it.draw(c, camX, L);

    for (const par of this.parents) par.draw(c, camX, L);
    for (const f of this.friends) f.draw(c, camX, L);
    for (const e of this.enemies) e.draw(c, camX, L);
    for (const d of this.diegos) d.draw(c, camX, L);
    if (this.boss) this.boss.draw(c, camX, L);
    for (const p of this.players) p.draw(c, camX, L);

    for (const fx of this.effects) fx.draw(c, camX);

    L.drawForeground(c, camX);
    c.restore();

    drawVignette(c, L.backdrop.vignette);
    if (this.flashFrames > 0) {
      c.fillStyle = `rgba(255,255,255,${this.flashFrames / 14})`;
      c.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    this.drawHud();
    if (this.bossBanner > 0) this.drawBossBanner();
    if (this.bonus && this.bonus.countdown > 0) this.drawBonusCountdown();
    if (this.state === STATES.LEVEL_END) this.drawLevelEnd();
  }

  drawCheckpoint(camX) {
    const cp = this.checkpoint;
    if (!cp) return;
    const c = this.ctx;
    const x = cp.x + 6 - camX, base = cp.y + 16;
    if (x < -20 || x > VIEW_W + 20) return;
    c.fillStyle = '#6a6a78'; c.fillRect(snap(x), base - 30, 2, 30);
    c.fillStyle = '#a0a0b0'; c.fillRect(snap(x), base - 30, 1, 30);
    const on = this.checkpointReached;
    const col = on ? '#50d060' : '#9090a0';
    for (let i = 0; i < 12; i++) {
      const wave = on ? Math.round(Math.sin(this.uiFrame * 0.15 - i * 0.5) * 1.2 * (i / 12)) : 0;
      const h = 8 - Math.floor(i / 2);
      c.fillStyle = col;
      c.fillRect(snap(x + 2 + i), base - 30 + wave + (8 - h) / 2, 1, h);
    }
    c.fillStyle = '#4a4a58'; c.fillRect(snap(x - 3), base - 2, 8, 2);
  }

  drawHud() {
    const c = this.ctx;
    // franja superior con degradado para que se lea
    const g = c.createLinearGradient(0, 0, 0, 26);
    g.addColorStop(0, 'rgba(10,4,24,0.6)');
    g.addColorStop(1, 'rgba(10,4,24,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, VIEW_W, 26);

    const p = this.players[0];
    if (p) {
      drawText(c, p.name.toUpperCase(), 5, 10, { size: 7, color: p.dead ? '#888888' : '#ffffff' });
      const nameW = textWidth(c, p.name.toUpperCase(), 7);
      if (p.dead) {
        drawText(c, 'K.O.', 10 + nameW, 10, { size: 7, color: '#ff5555' });
      } else {
        for (let i = 0; i < Math.max(3, p.lives); i++) drawHeart(c, 9 + nameW + i * 8, 4, i < p.lives);
        // barriga
        const full = p.barriga >= Player.BARRIGA_FULL;
        const blink = full && this.uiFrame % 30 < 15;
        for (let i = 0; i < Player.BARRIGA_FULL; i++) {
          drawSprite(c, Sprites.bocadillo, 5 + i * 11, 14, false, { alpha: i < p.barriga ? 1 : 0.22 });
        }
        if (full) drawText(c, 'E: ¡PEDO!', 52, 20, { size: 6, color: blink ? '#88ff88' : '#ffffff' });
        // power-up con barra de tiempo
        if (p.powerup) {
          const label = POWERUP_LABELS[p.powerup] || p.powerup;
          const px = 92;
          drawText(c, label, px, 10, { size: 6, color: '#88ffff' });
          const total = p.powerup === 'speed' ? 480 : 600;
          c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(px, 13, 44, 3);
          c.fillStyle = p.powerupTimer < 120 && this.uiFrame % 10 < 5 ? '#ffffff' : '#88ffff';
          c.fillRect(px, 13, 44 * (p.powerupTimer / total), 3);
        }
      }
    }

    if (this.bonus) {
      const B = this.bonus;
      const sec = Math.max(0, Math.ceil(B.timeLeft / 60));
      const low = sec <= 10;
      const pulse = low && B.timeLeft % 60 > 40 ? 1.15 : 1;
      drawText(c, String(sec), VIEW_W / 2 + 18, 18, { size: 14 * pulse, align: 'center', color: low ? '#ff6666' : '#ffffff' });
      drawSprite(c, Sprites.clock, VIEW_W / 2 + 2, 6);
      if (B.combo >= 2) drawText(c, 'COMBO ' + B.combo, VIEW_W / 2 + 18, 28, { size: 6, align: 'center', color: '#88ffff' });
    } else {
      drawSprite(c, Sprites.cromo, 168, 3);
      drawText(c, this.cromosCollected + '/' + this.cromosTotalLevel, 180, 10, { size: 7, color: '#ffd860' });
    }
    drawText(c, String(this.score).padStart(6, '0'), VIEW_W - 5, 10, { size: 8, align: 'right', color: '#ffffff' });
    if (!this.bonus && this.levelData().par) {
      // cronómetro: verde mientras vas por debajo del tiempo objetivo
      const secs = this.levelFrames / 60;
      const ok = secs <= this.levelData().par;
      drawText(c, '⏱ ' + fmtTime(secs), VIEW_W - 5, 20, { size: 7, align: 'right', color: ok ? '#88ff88' : '#ff9988' });
    }

    // título del nivel durante los primeros segundos
    if (this.uiFrame < 200) {
      const a = Math.min(1, (200 - this.uiFrame) / 30);
      drawText(c, this.level.title, 6, 232, { size: 7, color: '#ffffff', alpha: a });
      drawText(c, DIFFICULTIES[this.selectedDiff].name, VIEW_W - 6, 232, { size: 6, align: 'right', color: DIFFICULTIES[this.selectedDiff].color, alpha: a });
    }

    // barra de vida del jefe
    const b = this.boss;
    if (b && b.awake && !b.dead) {
      const w = 120, x = (VIEW_W - w) / 2, y = 226;
      drawPanel(c, x - 4, y - 11, w + 8, 20, { fill: 'rgba(20,8,30,0.75)', border: 'rgba(255,120,140,0.6)', radius: 3 });
      drawText(c, b.name.toUpperCase(), x, y - 2, { size: 6, color: '#ffffff' });
      drawText(c, b.role, x + w, y - 2, { size: 5, align: 'right', color: '#c8c0e8', outline: null });
      c.fillStyle = '#3a1020'; c.fillRect(x, y, w, 5);
      const seg = w / b.maxHp;
      for (let i = 0; i < b.hp; i++) {
        c.fillStyle = b.invuln > 50 ? '#ffffff' : (b.hp <= b.maxHp / 3 ? '#ff4040' : '#ff6688');
        c.fillRect(x + i * seg + 0.5, y + 0.5, seg - 1, 4);
        c.fillStyle = 'rgba(255,255,255,0.35)';
        c.fillRect(x + i * seg + 0.5, y + 0.5, seg - 1, 1);
      }
    }
  }

  drawBossBanner() {
    const c = this.ctx;
    const b = this.boss;
    const t = 150 - this.bossBanner;
    const inK = Math.min(1, t / 12), outK = Math.min(1, this.bossBanner / 15);
    const k = Math.min(inK, outK);
    const y = 92;
    c.save();
    c.globalAlpha = k;
    c.fillStyle = 'rgba(20,0,20,0.75)';
    c.fillRect(0, y - 22 * k, VIEW_W, 44 * k);
    c.fillStyle = '#ff3355';
    c.fillRect(0, y - 22 * k, VIEW_W, 1.5); c.fillRect(0, y + 22 * k - 1.5, VIEW_W, 1.5);
    c.restore();
    const slide = (1 - inK) * 120;
    drawText(c, '¡CUIDADO!', VIEW_W / 2 - slide, y - 6, { size: 7, align: 'center', color: '#ff8899', alpha: k });
    drawText(c, b.name.toUpperCase(), VIEW_W / 2 + slide, y + 9, { size: 16, align: 'center', color: '#ffffff', alpha: k });
    drawText(c, b.role, VIEW_W / 2, y + 18, { size: 6, align: 'center', color: '#ffd860', alpha: k, outline: null });
  }

  drawBonusCountdown() {
    const B = this.bonus;
    const n = Math.ceil(B.countdown / 50) - 1;
    const frac = (B.countdown % 50) / 50;
    const txt = n > 0 ? String(n) : '¡YA!';
    drawText(this.ctx, txt, VIEW_W / 2, 110, { size: 28 + frac * 14, align: 'center', color: n > 0 ? '#ffffff' : '#88ff88', alpha: Math.min(1, frac * 3 + 0.2), shadow: true });
  }

  drawLevelEnd() {
    const c = this.ctx;
    const t = 100 - this.endTimer;
    const k = Math.min(1, t / 15);
    const w = 176, h = this.results ? 124 : 92;
    const x = (VIEW_W - w) / 2, y = (this.results ? 56 : 72) + (1 - k) * 30;
    c.save(); c.globalAlpha = k;
    drawPanel(c, x, y, w, h, { fill: 'rgba(20,10,50,0.9)', border: '#ffd860', borderWidth: 1.5, radius: 6 });
    c.restore();
    const last = this.currentLevelIdx + 1 >= LEVELS.length;
    const B = this.bonus;
    const head = B ? '¡SE ACABÓ EL TIEMPO!' : (last ? '¡HAS VENCIDO A EMILIO!' : '¡NIVEL SUPERADO!');
    drawText(c, head, VIEW_W / 2, y + 18, { size: 10, align: 'center', color: '#ffd860', alpha: k });
    if (B) {
      drawText(c, 'Cosas cogidas: ' + B.caught, VIEW_W / 2, y + 36, { size: 7, align: 'center', alpha: k });
      drawText(c, 'Mejor combo: ' + B.best, VIEW_W / 2, y + 48, { size: 7, align: 'center', alpha: k });
      drawText(c, 'Puntos bonus: ' + B.points, VIEW_W / 2, y + 60, { size: 8, align: 'center', color: '#88ffff', alpha: k });
    } else if (this.results) {
      const R = this.results;
      // estrellas que van apareciendo una a una
      for (let i = 0; i < 3; i++) {
        const on = i < R.stars;
        const show = t > 18 + i * 10;
        if (!show) continue;
        const pop = Math.min(1, (t - 18 - i * 10) / 6);
        drawText(c, '★', VIEW_W / 2 - 20 + i * 20, y + 40, { size: 16 * (0.6 + 0.4 * pop), align: 'center', color: on ? '#ffd860' : '#4a4060', alpha: k });
      }
      const L = (label, val, yy, col = '#ffffff') => {
        drawText(c, label, x + 14, yy, { size: 6, alpha: k, color: '#c8c0e8' });
        drawText(c, val, x + w - 14, yy, { size: 6, align: 'right', alpha: k, color: col });
      };
      L('Tiempo (objetivo ' + fmtTime(R.par) + ')', fmtTime(R.secs) + (R.newTime ? '  ¡RÉCORD!' : ''), y + 54, R.underPar ? '#88ff88' : '#ff9988');
      L('Bonus de tiempo', '+' + R.timeBonus, y + 64);
      L('Sin recibir daño', R.noHit ? '+' + R.noHitBonus : '—', y + 74);
      L('Cromos', this.cromosCollected + ' / ' + this.cromosTotalLevel, y + 84, R.allCromos ? '#ffd860' : '#ffffff');
      L('Puntos del nivel', String(R.levelScore) + (R.newScore ? '  ¡RÉCORD!' : ''), y + 96, '#88ffff');
      if (R.newScore || R.newTime) {
        const pulse = 1 + Math.sin(this.uiFrame * 0.2) * 0.06;
        drawText(c, '¡NUEVO RÉCORD!', VIEW_W / 2, y - 6, { size: 10 * pulse, align: 'center', color: '#ff88cc', alpha: k, shadow: true });
      }
    }
    if (this.endTimer <= 0 && this.uiFrame % 40 < 28) {
      drawText(c, 'Pulsa Espacio para seguir', VIEW_W / 2, y + h - 6, { size: 6, align: 'center', color: '#ffffff' });
    }
  }

  // ---------- PAUSA ----------
  updatePaused() {
    if (Input.pauseTap() || Input.startTap()) { Audio8.pause(); this.state = STATES.PLAYING; }
  }
  drawPauseOverlay() {
    const c = this.ctx;
    c.fillStyle = 'rgba(10,4,30,0.65)';
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    drawPanel(c, 48, 56, 160, 124, { radius: 6, border: 'rgba(255,216,96,0.7)' });
    drawText(c, 'PAUSA', VIEW_W / 2, 80, { size: 16, align: 'center', color: '#ffd860' });
    const lines = [
      ['Mover', '← →  /  A D'], ['Saltar', '↑  /  W'], ['Boomerang', '↓  /  S'],
      ['Pedo', 'E (barriga llena)'], ['Seguir', 'P  o  Espacio'],
    ];
    lines.forEach(([a, b], i) => {
      drawText(c, a, 62, 102 + i * 14, { size: 7, color: '#c8c0e8', outline: null });
      drawText(c, b, 194, 102 + i * 14, { size: 7, align: 'right', color: '#ffffff', outline: null });
    });
  }

  // ---------- FIN DE NIVEL ----------
  updateLevelEnd() {
    this.uiFrame++;
    if (this.endTimer > 0) this.endTimer--;
    if (this.endTimer % 6 === 0 && this.endTimer > 0) this.pushEffect(Effects.confetti(VIEW_W, 3));
    for (const fx of this.effects) fx.update();
    this.effects = this.effects.filter(fx => !fx.dead);
    this.level.updateAmbient(this.camX);
    if (this.endTimer <= 0 && Input.startTap()) {
      const next = this.currentLevelIdx + 1;
      if (next >= LEVELS.length) {
        if (this.score > this.hiScore) { this.hiScore = this.score; Storage.recordIfBetter(this.score); }
        this.titleAnim = 0;
        this.state = STATES.VICTORY;
      } else {
        this.loadLevel(next);
        this.goIntro();
      }
    }
  }

  // ---------- GAME OVER ----------
  updateGameOver() {
    this.titleAnim++;
    if (this.endTimer > 0) this.endTimer--;
    if (this.endTimer <= 0 && Input.startTap()) {
      this.loadLevel(this.currentLevelIdx, { retry: true });
      this.goIntro();
    }
  }
  drawGameOver() {
    const c = this.ctx;
    const t = this.titleAnim;
    const g = c.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#1a0820'); g.addColorStop(1, '#3a0c28');
    c.fillStyle = g; c.fillRect(0, 0, VIEW_W, VIEW_H);
    drawText(c, 'GAME OVER', VIEW_W / 2, 80, { size: 24, align: 'center', color: '#ff4466', shadow: true });
    const sp = this.character().sprite();
    drawSprite(c, animFrame(sp, 'hurt', 0), VIEW_W / 2 - 8, 104, false, { scaleX: 2, scaleY: 2, rot: Math.sin(t * 0.05) * 0.1 });
    if (this.boss) {
      drawText(c, '¡' + this.boss.name + ' te ha puesto deberes!', VIEW_W / 2, 140, { size: 7, align: 'center', color: '#ffd0d8' });
    }
    drawText(c, this.checkpointReached ? 'Seguirás desde el punto de control' : 'Volverás al principio del nivel', VIEW_W / 2, 158, { size: 6, align: 'center', color: '#c8c0e8', outline: null });
    if (this.endTimer <= 0 && t % 40 < 28) drawText(c, 'Pulsa Espacio para reintentar', VIEW_W / 2, 178, { size: 8, align: 'center' });
    drawText(c, 'Puntos: ' + this.score + '     Récord: ' + this.hiScore, VIEW_W / 2, 210, { size: 7, align: 'center', color: '#ffd860' });
  }

  // ---------- VICTORIA ----------
  updateVictory() {
    this.titleAnim++;
    Music.play('title');
    if (this.titleAnim % 8 === 0) this.pushEffect(Effects.confetti(VIEW_W, 3));
    for (const fx of this.effects) fx.update();
    this.effects = this.effects.filter(fx => !fx.dead);
    if (this.titleAnim > 60 && Input.startTap()) { this.titleAnim = 0; this.state = STATES.TITLE; }
  }
  drawVictory() {
    const c = this.ctx;
    const t = this.titleAnim;
    this.drawMenuBackdrop(0.4, 0.25);
    const crew = [Sprites.rafa, Sprites.matias, this.character().sprite(), Sprites.santiago, Sprites.carlos, Sprites.fran];
    crew.forEach((sp, i) => {
      const jump = Math.max(0, Math.sin(t * 0.12 + i * 1.1)) * 10;
      const fr = animFrame(sp, jump > 1 ? 'jump' : 'idle', t);
      drawSprite(c, fr, 60 + i * 24, 176 - spriteH(fr) - jump, i >= 3);
    });
    drawSprite(c, Sprites.diego, 30, 164 - Math.abs(Math.sin(t * 0.2)) * 5);
    drawText(c, '¡ENHORABUENA!', VIEW_W / 2, 50, { size: 20, align: 'center', color: '#ffd860', shadow: true });
    drawText(c, 'Los profes se rinden: ¡hoy no hay deberes!', VIEW_W / 2, 70, { size: 7, align: 'center' });
    drawPanel(c, 64, 84, 128, 40, { radius: 5 });
    drawText(c, 'Puntuación: ' + this.score, VIEW_W / 2, 100, { size: 8, align: 'center' });
    drawText(c, 'Récord: ' + this.hiScore, VIEW_W / 2, 114, { size: 7, align: 'center', color: '#ffd860' });
    for (const fx of this.effects) fx.draw(c, 0);
    if (t > 60 && t % 40 < 28) drawText(c, 'Pulsa Espacio para volver al título', VIEW_W / 2, 210, { size: 7, align: 'center' });
  }
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}
