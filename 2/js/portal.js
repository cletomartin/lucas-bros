// Portal con activación intencional.
//
// Mecánica:
//   - Para activar el portal hay que estar PARADO dentro al menos 24
//     frames (~0.4 s). Si pasas corriendo no te teletransporta.
//   - Al teletransportar, el portal de destino "bloquea" al jugador
//     hasta que sale del hitbox. Así no hay bucles.
//
// Visualmente: un remolino de colores con anillo de progreso.

const PORTAL_READY_FRAMES = 24;

class Portal {
  constructor({ x, y, group }) {
    this.x = x; this.y = y;
    this.w = 16; this.h = 32;
    this.group = group;
    this.spin = 0;
    this.partner = null;
    this.playersInside = [];
    this.lockedPlayers = new Set();
    this.activationProgress = new Map();
  }

  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  update() {
    this.spin++;
    for (const p of [...this.lockedPlayers]) {
      const r = p.rect();
      const overlap = r.x < this.x + this.w && r.x + r.w > this.x && r.y < this.y + this.h && r.y + r.h > this.y;
      if (!overlap) this.lockedPlayers.delete(p);
    }
  }

  setPlayersInside(insideList) {
    this.playersInside = insideList;
    for (const p of insideList) {
      if (this.lockedPlayers.has(p)) continue;
      this.activationProgress.set(p, (this.activationProgress.get(p) || 0) + 1);
    }
    for (const p of [...this.activationProgress.keys()]) {
      if (!insideList.includes(p)) this.activationProgress.delete(p);
    }
  }

  readyPlayers() {
    const out = [];
    for (const p of this.playersInside) {
      if ((this.activationProgress.get(p) || 0) >= PORTAL_READY_FRAMES) out.push(p);
    }
    return out;
  }

  tryActivate(allPlayers) {
    if (!this.partner) return null;
    const aliveAll = allPlayers.filter(p => !p.dead);
    if (aliveAll.length === 0) return null;
    if (this.readyPlayers().length < aliveAll.length) return null;
    return aliveAll;
  }

  draw(ctx, camX, hint) {
    const cx = this.x + this.w / 2 - camX;
    const cy = this.y + this.h / 2;
    ctx.save();
    // halo
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 20);
    g.addColorStop(0, 'rgba(200,140,255,0.5)');
    g.addColorStop(1, 'rgba(200,140,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 20, cy - 22, 40, 44);
    // marco
    ctx.fillStyle = '#2a1848';
    ctx.beginPath(); ctx.ellipse(cx, cy, 9, 16, 0, 0, Math.PI * 2); ctx.fill();
    // remolino: anillos de colores que giran
    const cols = ['#ff66ff', '#9966ff', '#66ddff', '#ffaa44', '#ffff66'];
    for (let i = 0; i < 5; i++) {
      const k = 1 - i / 5;
      ctx.strokeStyle = cols[(i + Math.floor(this.spin / 5)) % cols.length];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const a0 = this.spin * 0.08 * (i % 2 ? 1 : -1) + i;
      ctx.ellipse(cx, cy, 8 * k, 15 * k, 0, a0, a0 + Math.PI * 1.3);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx, cy, 1.5 + Math.sin(this.spin * 0.2) * 0.5, 0, Math.PI * 2); ctx.fill();

    let maxProgress = 0;
    for (const v of this.activationProgress.values()) if (v > maxProgress) maxProgress = v;
    if (maxProgress > 0) {
      const pct = Math.min(1, maxProgress / PORTAL_READY_FRAMES);
      ctx.strokeStyle = '#ffd860';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 11, 18, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
      ctx.stroke();
    }
    ctx.restore();
    if (hint) drawText(ctx, 'Esperando ' + hint, cx, this.y - 4, { size: 6, align: 'center', color: '#ffd860' });
  }
}
