// Sintetizador de efectos 8-bit con Web Audio API.
// No carga archivos: todo se genera al vuelo con osciladores.
//
// Web Audio sólo arranca tras la primera interacción del usuario, así que
// ensure() se llama dentro de cualquier sonido y dejamos que el navegador
// lo active al primer click/tecla.

const Audio8 = {
  ctx: null,
  enabled: true,
  master: null,

  ensure() {
    if (this.ctx) {
      // En algunos navegadores el contexto arranca "suspended" hasta gesto.
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.4;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.enabled = false; }
  },

  // Beep básico con sweep opcional de frecuencia.
  beep({ freq = 440, dur = 0.1, type = 'square', sweepTo = null, vol = 0.18 } = {}) {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (sweepTo !== null) osc.frequency.linearRampToValueAtTime(sweepTo, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur);
  },

  // ---- efectos concretos del juego ----
  jump()      { this.beep({ freq: 380, sweepTo: 760, dur: 0.10, type: 'square',   vol: 0.15 }); },
  stomp()     { this.beep({ freq: 220, sweepTo: 80,  dur: 0.08, type: 'square',   vol: 0.18 }); },
  hurt()      { this.beep({ freq: 200, sweepTo: 50,  dur: 0.20, type: 'sawtooth', vol: 0.20 }); },
  boomerang() { this.beep({ freq: 660, sweepTo: 440, dur: 0.10, type: 'triangle', vol: 0.13 }); },
  bossHit()   {
    this.beep({ freq: 800, dur: 0.05, type: 'square', vol: 0.20 });
    setTimeout(() => this.beep({ freq: 200, sweepTo: 100, dur: 0.15, type: 'sawtooth', vol: 0.20 }), 50);
  },
  coin()      {
    this.beep({ freq: 988, dur: 0.04, type: 'square', vol: 0.14 });
    setTimeout(() => this.beep({ freq: 1318, dur: 0.10, type: 'square', vol: 0.14 }), 40);
  },
  friend()    {
    [659, 784, 988, 1318].forEach((f, i) =>
      setTimeout(() => this.beep({ freq: f, dur: 0.10, type: 'triangle', vol: 0.16 }), i * 60));
  },
  portal()    { this.beep({ freq: 110, sweepTo: 1760, dur: 0.5, type: 'sine', vol: 0.22 }); },
  victory()   {
    [523, 659, 784, 1046, 1318].forEach((f, i) =>
      setTimeout(() => this.beep({ freq: f, dur: 0.16, type: 'square', vol: 0.20 }), i * 90));
  },
  gameOver()  {
    [392, 330, 262, 196].forEach((f, i) =>
      setTimeout(() => this.beep({ freq: f, dur: 0.20, type: 'sawtooth', vol: 0.20 }), i * 130));
  },
  pause()     { this.beep({ freq: 440, dur: 0.05, type: 'square', vol: 0.10 }); },
  scold()     { this.beep({ freq: 130, dur: 0.30, type: 'sawtooth', vol: 0.18 }); },
  spring()    { this.beep({ freq: 220, sweepTo: 1320, dur: 0.20, type: 'square', vol: 0.18 }); },
  block()     {
    this.beep({ freq: 660, dur: 0.05, type: 'square', vol: 0.18 });
    setTimeout(() => this.beep({ freq: 990, dur: 0.06, type: 'square', vol: 0.16 }), 30);
  },
  // ¡Patapum! cuando alguien resbala con un plátano. Frecuencia que cae
  // en picado tipo dibujo animado.
  slip()      { this.beep({ freq: 880, sweepTo: 110, dur: 0.30, type: 'triangle', vol: 0.18 }); },
  // Pedo: tono grave "ronco" (onda cuadrada) que tartamudea gracias a
  // un LFO que abre y cierra el volumen, y que sube un poco al final.
  fart() {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dur = 0.6;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.linearRampToValueAtTime(70, t + dur * 0.6);
    osc.frequency.linearRampToValueAtTime(115, t + dur);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600;
    // tartamudeo
    const lfo = this.ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.setValueAtTime(22, t);
    lfo.frequency.linearRampToValueAtTime(34, t + dur);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.12;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.14, t);
    g.gain.linearRampToValueAtTime(0.16, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    lfo.connect(lfoGain).connect(g.gain);
    osc.connect(lp).connect(g).connect(this.master);
    osc.start(t); osc.stop(t + dur);
    lfo.start(t); lfo.stop(t + dur);
  },
  bonk()      { this.beep({ freq: 180, sweepTo: 120, dur: 0.06, type: 'square', vol: 0.10 }); },
  whistle()   {
    this.beep({ freq: 2200, dur: 0.12, type: 'sine', vol: 0.12 });
    setTimeout(() => this.beep({ freq: 2400, dur: 0.25, type: 'sine', vol: 0.12 }), 130);
  },
  checkpoint() {
    [784, 988, 1175, 1568].forEach((f, i) =>
      setTimeout(() => this.beep({ freq: f, dur: 0.12, type: 'triangle', vol: 0.16 }), i * 70));
  },
  tick()      { this.beep({ freq: 1200, dur: 0.03, type: 'square', vol: 0.08 }); },
  gift()      {
    [523, 784, 1046].forEach((f, i) =>
      setTimeout(() => this.beep({ freq: f, dur: 0.12, type: 'triangle', vol: 0.15 }), i * 80));
  },
  combo(n)    { this.beep({ freq: 440 * Math.pow(2, Math.min(n, 8) / 6), dur: 0.08, type: 'square', vol: 0.14 }); },
  boom()      { this.beep({ freq: 120, sweepTo: 30, dur: 0.35, type: 'sawtooth', vol: 0.22 }); },
  bossIntro() {
    [220, 208, 196, 185].forEach((f, i) =>
      setTimeout(() => this.beep({ freq: f, dur: 0.18, type: 'sawtooth', vol: 0.16 }), i * 160));
  },
  // Mordisco al recoger un bocadillo.
  eat() {
    this.beep({ freq: 320, sweepTo: 180, dur: 0.06, type: 'square', vol: 0.14 });
    setTimeout(() => this.beep({ freq: 220, sweepTo: 120, dur: 0.07, type: 'square', vol: 0.14 }), 60);
  },
};
