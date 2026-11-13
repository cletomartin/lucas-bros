// Adultos que pasean por los niveles.
//
// PAPÁ y MAMÁ (gruñones): si te tocan te sueltan una regañina y te
// quedas paralizado un par de segundos. No quitan vida.
//
// Los PADRES DE LOS AMIGOS (simpáticos): la primera vez que los tocas
// te dan algo:
//   Ángeles (madre de Rafa)     -> +1 corazón
//   Pepe    (padre de Rafa)     -> ¡choca esos cinco! +500 puntos
//   Rosa    (madre de Santiago) -> merienda: barriga +2
//   Asun    (madre de Matías)   -> acelerón: corres más durante 8 s

const PHRASES_PAPA = [
  '¡A casa!', '¡Cuidado!', '¡Que te caes!', '¡Quieto!',
  '¿Otra vez?', '¡Sin tablet!', '¡Como se entere mamá!',
  '¿Te has lavado las manos?', '¡A merendar!',
];
const PHRASES_MAMA = [
  '¡A estudiar!', '¡A la cama!', '¡Sin gritar!', '¡Para ya!',
  '¡Por enésima vez!', '¿Cuántas veces te lo digo?',
  '¡Sin postre!', '¡Que no es no!', '¡Recoge eso!',
];

const PARENT_DEFS = {
  papa:    { name: 'Papá',    sprite: () => Sprites.papa,    grumpy: true },
  mama:    { name: 'Mamá',    sprite: () => Sprites.mama,    grumpy: true },
  angeles: { name: 'Ángeles', sprite: () => Sprites.angeles, gift: 'heart',  phrase: '¡Abrígate, cariño!' },
  pepe:    { name: 'Pepe',    sprite: () => Sprites.pepe,    gift: 'points', phrase: '¡Choca esos cinco!' },
  rosa:    { name: 'Rosa',    sprite: () => Sprites.rosa,    gift: 'food',   phrase: '¡Toma, merienda!' },
  asun:    { name: 'Asun',    sprite: () => Sprites.asun,    gift: 'speed',  phrase: '¡Corre, que llegas tarde!' },
};

class Parent {
  constructor({ x, y, type }) {
    this.x = x; this.y = y;
    this.w = 14; this.h = 22;
    this.y -= 6; // son más altos que un tile
    this.vx = -0.3;
    this.vy = 0;
    this.facing = -1;
    this.type = type;
    this.def = PARENT_DEFS[type] || PARENT_DEFS.papa;
    this.friendly = !this.def.grumpy;
    this.gave = false;
    this.dead = false;
    this.cooldown = 0;
    this.shoutTimer = 0;
    this.phrase = '';
    this.walker = makeWalker(-1);
    this.onGround = false;
  }

  get name() { return this.def.name; }

  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  shout(text) {
    if (this.cooldown > 0) return;
    const list = this.type === 'papa' ? PHRASES_PAPA : PHRASES_MAMA;
    this.phrase = text || list[Math.floor(Math.random() * list.length)];
    this.shoutTimer = 80;
    this.cooldown = 180;
    this.vx = 0;
  }

  update(level) {
    this.vy += 0.4;
    if (this.vy > 6) this.vy = 6;
    if (this.cooldown <= 0) {
      if (this.vx === 0) this.vx = (Math.random() < 0.5 ? -0.3 : 0.3);
    } else {
      this.cooldown--;
    }
    this.x += this.vx;
    if (level.collideAabb(this, 'x')) {
      this.vx = -this.vx;
      this.facing = Math.sign(this.vx) || this.facing;
    }
    this.y += this.vy;
    let onGround = false;
    if (level.collideAabb(this, 'y')) {
      if (this.vy > 0) onGround = true;
      this.vy = 0;
    }
    if (onGround && this.cooldown <= 0) {
      const aheadX = this.vx > 0 ? this.x + this.w + 1 : this.x - 1;
      if (!level.solidAt(aheadX, this.y + this.h + 1)) this.vx = -this.vx;
    }
    if (this.shoutTimer > 0) this.shoutTimer--;
    if (this.y > level.heightPx + 32) this.dead = true;
    this.onGround = onGround;
    stepWalker(this.walker, this.def.sprite(), { vx: this.vx, onGround });
    this.facing = this.walker.facing;
  }

  draw(ctx, camX, level) {
    if (this.dead) return;
    drawGroundShadow(ctx, level, this.x + this.w / 2, this.y + this.h, 13, camX);
    const sx = this.x - camX - 1;
    const sprite = this.def.sprite();
    const grid = walkerFrame(this.walker, sprite, this.vy);
    const sy = this.y + this.h - spriteH(grid) + walkerBob(this.walker);
    drawSprite(ctx, grid, sx, sy, this.facing < 0, this.shoutTimer > 0 ? { scaleY: 1 + Math.sin(this.shoutTimer * 0.6) * 0.03 } : null);
    drawName(ctx, this.def.name, this.x + this.w / 2 - camX, this.y - 3);

    if (this.friendly && !this.gave) {
      // corazoncito flotando: "¡ven, que te doy algo!"
      const bob = Math.sin(performance.now() / 200) * 1.5;
      drawHeart(ctx, snap(this.x + this.w / 2 - camX - 3), snap(this.y - 18 + bob), true);
    }

    if (this.shoutTimer > 0) {
      const txt = this.phrase;
      const w = textWidth(ctx, txt, 6) + 8;
      const bx = Math.max(2, Math.min(VIEW_W - w - 2, this.x + this.w / 2 - camX - w / 2));
      const by = this.y - 30;
      ctx.save();
      ctx.fillStyle = this.friendly ? '#e8fff0' : '#fff6d0';
      ctx.strokeStyle = '#1c1228';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, w, 11, 3); else ctx.rect(bx, by, w, 11);
      ctx.fill(); ctx.stroke();
      const tx = this.x + this.w / 2 - camX;
      ctx.beginPath(); ctx.moveTo(tx - 2, by + 11); ctx.lineTo(tx, by + 15); ctx.lineTo(tx + 2, by + 11); ctx.fill();
      ctx.restore();
      drawText(ctx, txt, bx + w / 2, by + 8, { size: 6, align: 'center', color: '#2a1a3a', outline: null });
    }
  }
}
