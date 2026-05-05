// Padres (Papá y Mamá): NPCs gruñones que aparecen por los niveles.
// No quitan vida, pero si tocan al jugador le sueltan una regañina
// que le deja paralizado un par de segundos.
//
// Para no encadenar regañinas, tras gritar se quedan en cooldown
// (no pueden volver a regañar hasta que pase un poquito).

const PHRASES_PAPA = [
  '¡A casa!', '¡Cuidado!', '¡Que te caes!', '¡Quieto!',
  '¡Otra vez?!', '¡Sin tablet!', '¡Como se entere mamá!',
  '¡Te has lavado las manos?', '¡A merendar!',
];
const PHRASES_MAMA = [
  '¡A estudiar!', '¡A la cama!', '¡Sin gritar!', '¡Para ya!',
  '¡Por enésima vez!', '¡Cuántas veces te lo digo?!',
  '¡Sin postre!', '¡Que no es no!', '¡Recoge eso!',
];

class Parent {
  constructor({x, y, type}) {
    this.x = x; this.y = y;
    this.w = 14; this.h = 22;
    this.vx = -0.3;     // se mueven más despacio que un crío
    this.vy = 0;
    this.facing = -1;
    this.type = type;   // 'papa' | 'mama'
    this.dead = false;
    this.cooldown = 0;
    this.shoutTimer = 0;
    this.phrase = '';
  }

  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  shout() {
    if (this.cooldown > 0) return;
    const list = this.type === 'papa' ? PHRASES_PAPA : PHRASES_MAMA;
    this.phrase = list[Math.floor(Math.random() * list.length)];
    this.shoutTimer = 60;
    this.cooldown = 180;     // 3 segundos
    this.vx = 0;             // se para a regañar
  }

  update(level) {
    // gravedad y movimiento
    this.vy += 0.4;
    if (this.vy > 6) this.vy = 6;

    if (this.cooldown <= 0) {
      // si no está regañando, anda
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

    // borde de plataforma → media vuelta
    if (onGround && this.cooldown <= 0) {
      const aheadX = this.vx > 0 ? this.x + this.w + 1 : this.x - 1;
      const belowY = this.y + this.h + 1;
      if (!level.solidAt(aheadX, belowY)) this.vx = -this.vx;
    }

    if (this.shoutTimer > 0) this.shoutTimer--;

    if (this.y > level.heightPx + 32) this.dead = true;

    this.facing = Math.sign(this.vx) || this.facing;
  }

  draw(ctx, camX) {
    if (this.dead) return;
    const sx = Math.round(this.x - camX) - 1;
    const sy = Math.round(this.y);
    const sprite = this.type === 'papa' ? Sprites.papa : Sprites.mama;
    drawSprite(ctx, sprite, sx, sy, this.facing > 0);
    drawName(ctx, this.type === 'papa' ? 'Papá' : 'Mamá', sx + 8, sy - 2);

    if (this.shoutTimer > 0) {
      // Vapor de cabreo: tres puntitos negros que se mueven encima.
      const phase = (60 - this.shoutTimer);
      ctx.fillStyle = '#222';
      for (let i = 0; i < 3; i++) {
        const px = sx + 2 + i * 4;
        const py = sy - 20 - ((phase + i * 6) % 8);
        ctx.fillRect(px, py, 2, 2);
      }
      // bocadillo amarillo con la regañina
      const txt = this.phrase;
      ctx.fillStyle = '#ffd860';
      const w = txt.length * 4 + 4;
      ctx.fillRect(sx - 4, sy - 14, w, 10);
      ctx.fillStyle = '#000';
      ctx.font = '6px monospace';
      ctx.fillText(txt, sx - 2, sy - 6);
    }
  }
}
