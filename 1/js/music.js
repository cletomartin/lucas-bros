// Música chiptune para la pantalla de título.
//
// Sintetiza melodía (cuadrada) + bajo (triangular) usando Web Audio API y
// los va programando en bloques de 4 compases que se enganchan en bucle.
//
// Como Web Audio sólo arranca tras la primera interacción del usuario,
// la canción no suena hasta que pulses una tecla. En ese momento input.js
// llama a Audio8.ensure() y Music.play() ya tiene el contexto vivo.

const NOTE_FREQ = {
  'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00,
  'A2': 110.00, 'B2': 123.47,
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00,
  'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00,
  'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99,
  'A5': 880.00, 'B5': 987.77,
  'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51,
};

const Music = {
  enabled: true,
  playing: false,
  bpm: 138,
  voiceGain: null,
  stopFlag: false,
  loopTimer: null,

  // Tema de la pantalla de título: 4 compases en Do Mayor, alegre, en bucle.
  song: {
    // Melodía: cada [nota, duración_en_dieciseisavos]
    melody: [
      // compás 1
      ['C5', 2], ['E5', 2], ['G5', 2], ['C6', 2],
      ['G5', 2], ['E5', 2], ['C5', 4],
      // compás 2
      ['D5', 2], ['F5', 2], ['A5', 2], ['D6', 2],
      ['A5', 2], ['F5', 2], ['D5', 4],
      // compás 3
      ['G5', 2], ['F5', 2], ['E5', 2], ['D5', 2],
      ['C5', 2], ['D5', 2], ['E5', 4],
      // compás 4
      ['G5', 4], ['E5', 4], ['C5', 8],
    ],
    // Bajo: nota por negra (4 dieciseisavos)
    bass: [
      ['C3', 4], ['C3', 4], ['G3', 4], ['G3', 4],
      ['F3', 4], ['F3', 4], ['A3', 4], ['A3', 4],
      ['G3', 4], ['G3', 4], ['G3', 4], ['G3', 4],
      ['C3', 4], ['C3', 4], ['G3', 4], ['C3', 4],
    ],
  },

  play() {
    if (!this.enabled || this.playing) return;
    if (!Audio8.ctx || Audio8.ctx.state !== 'running') return;
    this.playing = true;
    this.stopFlag = false;
    // Creamos un voiceGain nuevo en cada play() (el anterior se desconectó
    // al hacer stop). Así garantizamos que las notas previas que pudieran
    // seguir programadas sobre un gain antiguo son inaudibles.
    this.voiceGain = Audio8.ctx.createGain();
    this.voiceGain.gain.value = 1;
    this.voiceGain.connect(Audio8.master);
    this._scheduleLoop();
  },

  stop() {
    this.stopFlag = true;
    this.playing = false;
    if (this.loopTimer) { clearTimeout(this.loopTimer); this.loopTimer = null; }
    // Desconectamos el voiceGain del master: el sonido se corta de
    // inmediato aunque haya osciladores programados para los próximos
    // segundos. Cualquier nota ya en marcha queda muda.
    if (this.voiceGain) {
      try { this.voiceGain.disconnect(); } catch (e) {}
      this.voiceGain = null;
    }
  },

  _scheduleLoop() {
    if (this.stopFlag) return;
    const ctx = Audio8.ctx;
    const sixteenth = 60 / this.bpm / 4;
    const startT = ctx.currentTime + 0.05;

    // melodía
    let t = startT;
    for (const [note, dur] of this.song.melody) {
      if (note !== 'rest') this._note(note, t, dur * sixteenth, 'square', 0.09);
      t += dur * sixteenth;
    }
    // bajo
    let tb = startT;
    for (const [note, dur] of this.song.bass) {
      if (note !== 'rest') this._note(note, tb, dur * sixteenth, 'triangle', 0.13);
      tb += dur * sixteenth;
    }

    const totalMs = (t - startT) * 1000;
    this.loopTimer = setTimeout(() => this._scheduleLoop(), totalMs - 80);
  },

  _note(name, time, dur, type, vol) {
    const ctx = Audio8.ctx;
    const freq = NOTE_FREQ[name];
    if (!freq) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    // envolvente ADSR muy básica
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(vol, time + 0.005);
    g.gain.linearRampToValueAtTime(vol * 0.4, time + Math.min(dur * 0.5, 0.12));
    g.gain.linearRampToValueAtTime(0, time + dur * 0.95);
    osc.connect(g).connect(this.voiceGain);
    osc.start(time);
    osc.stop(time + dur);
  },
};
