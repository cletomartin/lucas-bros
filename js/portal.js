// Portal con sincronización 2P y activación intencional.
//
// Mecánica:
//   - Para activar el portal hay que estar PARADO dentro al menos 24
//     frames (~0.4 s). Si pasas corriendo no te teletransporta.
//   - En 2 jugadores, los dos vivos tienen que cumplir esa condición
//     en el MISMO portal. Mientras tanto se ve "Esperando <nombre>".
//   - Al teletransportar, el portal de destino "bloquea" al jugador
//     hasta que sale del hitbox. Así no hay bucles si alguien queda
//     dentro del portal de destino.
//
// Visualmente: rectángulos concéntricos rotando colores + barra de
// progreso de activación bajo el portal.

const PORTAL_READY_FRAMES = 24;

class Portal {
  constructor({ x, y, group }) {
    this.x = x; this.y = y;
    this.w = 16; this.h = 32;
    this.group = group;
    this.spin = 0;
    this.partner = null;
    this.playersInside = [];
    this.lockedPlayers = new Set();    // recién teletransportados aquí
    this.activationProgress = new Map(); // jugador → frames "pisando"
  }

  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  update() {
    this.spin++;
    // Liberar bloqueos a los jugadores que ya hayan salido del hitbox
    for (const p of [...this.lockedPlayers]) {
      const r = p.rect();
      const overlap =
        r.x < this.x + this.w && r.x + r.w > this.x &&
        r.y < this.y + this.h && r.y + r.h > this.y;
      if (!overlap) this.lockedPlayers.delete(p);
    }
  }

  setPlayersInside(insideList) {
    this.playersInside = insideList;
    // Sumar progreso de los que están dentro y no bloqueados.
    for (const p of insideList) {
      if (this.lockedPlayers.has(p)) continue;
      this.activationProgress.set(p, (this.activationProgress.get(p) || 0) + 1);
    }
    // Limpiar progreso de los que ya no están dentro.
    for (const p of [...this.activationProgress.keys()]) {
      if (!insideList.includes(p)) this.activationProgress.delete(p);
    }
  }

  // Devuelve la lista de jugadores que llevan suficientes frames pisando.
  readyPlayers() {
    const out = [];
    for (const p of this.playersInside) {
      if ((this.activationProgress.get(p) || 0) >= PORTAL_READY_FRAMES) out.push(p);
    }
    return out;
  }

  // Si todos los jugadores vivos están "ready", devuelve la lista para
  // teletransportar. game.js se encarga del teleport y de marcar el lock.
  tryActivate(allPlayers) {
    if (!this.partner) return null;
    const aliveAll = allPlayers.filter(p => !p.dead);
    if (aliveAll.length === 0) return null;
    const ready = this.readyPlayers();
    if (ready.length < aliveAll.length) return null;
    return aliveAll;
  }

  draw(ctx, camX, hint) {
    const x = Math.round(this.x - camX);
    const y = Math.round(this.y);

    // Marco
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y, this.w, this.h);

    const palette = ['#ff66ff', '#9966ff', '#66ddff', '#ffaa44', '#ffff66'];
    const phase = (this.spin / 4) | 0;
    for (let r = 1; r < 5; r++) {
      const c = palette[(phase + r) % palette.length];
      ctx.fillStyle = c;
      const w = this.w - r * 2;
      const h = this.h - r * 4;
      if (w > 0 && h > 0) ctx.fillRect(x + r, y + r * 2, w, h);
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 6, y + 14, 4, 4);

    // Barra de progreso de activación
    let maxProgress = 0;
    for (const v of this.activationProgress.values()) {
      if (v > maxProgress) maxProgress = v;
    }
    if (maxProgress > 0) {
      const pct = Math.min(1, maxProgress / PORTAL_READY_FRAMES);
      ctx.fillStyle = '#000';
      ctx.fillRect(x - 1, y + this.h + 1, this.w + 2, 4);
      ctx.fillStyle = '#ffd860';
      ctx.fillRect(x, y + this.h + 2, Math.round(this.w * pct), 2);
    }

    if (hint) {
      ctx.fillStyle = '#ffd860';
      ctx.font = '6px monospace';
      ctx.fillText('Esperando ' + hint, x - 16, y - 4);
    }
  }
}
