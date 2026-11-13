// Objetos que caen del cielo en los niveles BONUS.
//
//   cromo      +50     manzana  +100    donut   +150
//   bocadillo  +120 y barriga
//   estrella   +500 (rara)
//   bomba      ¡cuidado! -3 segundos y te deja atontado un momento
//
// Caen despacito balanceándose, se quedan un rato en el suelo
// (parpadean antes de desaparecer) y si coges varios seguidos sube el
// multiplicador de combo.

const BONUS_ITEMS = {
  cromo:     { sprite: () => Sprites.cromo,     pts: 50,  color: '#ffd860' },
  apple:     { sprite: () => Sprites.apple,     pts: 100, color: '#ff6060' },
  donut:     { sprite: () => Sprites.donut,     pts: 150, color: '#ff99cc' },
  bocadillo: { sprite: () => Sprites.bocadillo, pts: 120, color: '#ffaa44', food: true },
  star:      { sprite: () => Sprites.star,      pts: 500, color: '#fff080' },
  bomb:      { sprite: () => Sprites.bomb,      pts: 0,   color: '#ff5533', time: -3, bad: true },
};

class BonusItem {
  constructor(kind, x) {
    this.kind = kind;
    this.def = BONUS_ITEMS[kind];
    const { w, h } = gridSize(this.def.sprite());
    this.w = w; this.h = h;
    this.x = x;
    this.y = -12;
    this.vy = 0.4 + Math.random() * 0.4;
    this.t = Math.random() * 6;
    this.landed = false;
    this.life = 260;
    this.fuse = 70;
    this.dead = false;
    this.exploded = false;
  }

  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  update(level) {
    this.t += 0.1;
    if (this.landed) {
      if (this.def.bad) {
        if (--this.fuse <= 0) { this.exploded = true; this.dead = true; }
      } else if (--this.life <= 0) this.dead = true;
      return;
    }
    this.vy = Math.min(this.kind === 'bomb' ? 2.2 : 1.6, this.vy + 0.03);
    const sway = this.kind === 'bomb' ? 0 : Math.sin(this.t) * 0.35;
    this.x += sway;
    this.x = Math.max(2, Math.min(level.widthPx - this.w - 2, this.x));
    this.y += this.vy;
    if (level.collideAabb(this, 'y')) this.landed = true;
  }

  draw(ctx, camX, level) {
    if (this.dead) return;
    if (this.landed && !this.def.bad && this.life < 60 && Math.floor(this.life / 4) % 2 === 0) return;
    if (!this.landed) drawGroundShadow(ctx, level, this.x + this.w / 2, this.y + this.h, this.w, camX);
    const opts = {};
    if (this.kind === 'star') opts.rot = Math.sin(this.t * 2) * 0.3;
    if (this.def.bad && this.landed) {
      const k = 1 + Math.sin((70 - this.fuse) * 0.5) * 0.08 * (1 + (70 - this.fuse) / 30);
      opts.scaleX = k; opts.scaleY = k;
      opts.flash = this.fuse < 25 && this.fuse % 6 < 3;
    }
    if (!this.def.bad) {
      ctx.fillStyle = this.def.color + '33';
      ctx.beginPath(); ctx.arc(this.x + this.w / 2 - camX, this.y + this.h / 2, this.w * 0.8, 0, Math.PI * 2); ctx.fill();
    }
    drawSprite(ctx, this.def.sprite(), this.x - camX, this.y, false, opts);
    if (this.def.bad && Math.random() < 0.5) {
      ctx.fillStyle = Math.random() < 0.5 ? '#ffd040' : '#ff7030';
      ctx.fillRect(snap(this.x + 6 - camX + Math.random() * 2), snap(this.y - 1 - Math.random() * 2), 1, 1);
    }
  }
}
