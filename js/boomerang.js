// Boomerang: vuela en horizontal, frena, y vuelve hacia el dueño.
// Mientras viaja, daña a enemigos al tocarlos.
//
// Estados:
//   'going'   — alejándose del jugador
//   'returning' — volviendo al jugador
//
// El boomerang hace 1 daño por contacto pero sigue vivo (puede dañar
// a varios enemigos antes de regresar). Al volver al dueño, desaparece
// y permite lanzar otro.

class Boomerang {
  constructor(owner, dir) {
    this.owner = owner;
    this.x = owner.x + (dir > 0 ? owner.w : -8);
    this.y = owner.y + 4;
    this.w = 8;
    this.h = 8;
    this.vx = dir * 3;
    this.dir = dir;
    this.state = 'going';
    this.life = 0;
    this.maxLife = 60;       // empieza a volver tras 60 frames
    this.spin = 0;
    this.dead = false;
    this.hitSet = new WeakSet(); // para no contar el mismo enemigo dos veces seguidas
  }

  update() {
    this.life++;
    this.spin = (this.spin + 1) % 8;

    if (this.state === 'going') {
      this.x += this.vx;
      // desaceleración progresiva
      this.vx *= 0.96;
      if (this.life > this.maxLife || Math.abs(this.vx) < 0.5) {
        this.state = 'returning';
      }
    } else {
      // vuelve hacia el dueño
      const cx = this.owner.x + this.owner.w / 2;
      const cy = this.owner.y + this.owner.h / 2;
      const myCx = this.x + this.w / 2;
      const myCy = this.y + this.h / 2;
      const dx = cx - myCx;
      const dy = cy - myCy;
      const len = Math.max(0.1, Math.hypot(dx, dy));
      this.x += (dx / len) * 3.5;
      this.y += (dy / len) * 3.5;
      if (len < 8) this.dead = true;
    }
  }

  draw(ctx, camX) {
    // Lo dibujamos como un cuadrado rosa que rota (cambiando el grid).
    // Para sencillez, alternamos color según spin para sensación de giro.
    const x = Math.round(this.x - camX);
    const y = Math.round(this.y);
    const flip = this.spin >= 4;
    drawSprite(ctx, Sprites.boomerang, x, y, flip);
  }

  rect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}
