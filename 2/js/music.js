// Música estilo 16 bits sintetizada con Web Audio API (sin archivos).
//
// Cada canción tiene:
//   - lead:   la melodía (onda de pulso con vibrato y eco)
//   - chords: un acorde por compás (o dos, separados por espacio)
//   - el bajo, los arpegios y el colchón de acordes se generan solos
//     a partir de los acordes, con el patrón de cada canción
//   - drums:  patrones de bombo (k), caja (s) y charles (h / o abierto)
//
// Notación de la melodía: 'E5/2' = nota Mi5 durante 2 semicorcheas.
// '-/4' = silencio de 4 semicorcheas. Cada compás suma 16.
//
// Se usa un secuenciador con "lookahead": cada 25 ms programamos las
// notas de los próximos 120 ms. Así se puede cambiar de canción al vuelo.

const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteToFreq(name) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(name);
  if (!m) return null;
  let n = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const midi = (parseInt(m[3], 10) + 1) * 12 + n;
  return 440 * Math.pow(2, (midi - 69) / 12);
}
function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

const CHORD_TYPES = {
  '': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 7, 10], 'm7': [0, 3, 7, 10],
  'maj7': [0, 4, 7, 11], 'sus4': [0, 5, 7], 'dim': [0, 3, 6], 'add9': [0, 4, 7, 14],
};
function parseChord(name) {
  const m = /^([A-G])([#b]?)(.*)$/.exec(name);
  const root = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return { root, iv: CHORD_TYPES[m[3]] || CHORD_TYPES[''] };
}

const SONGS = {
  title: {
    bpm: 128, swing: 0,
    lead: [
      'E5/2 G5/2 C6/4 B5/2 G5/2 E5/4', 'A5/2 G5/2 E5/2 C5/2 E5/4 -/4',
      'F5/2 A5/2 C6/4 A5/2 F5/2 A5/4', 'G5/6 F5/2 E5/2 D5/2 B4/4',
      'E5/2 G5/2 C6/4 D6/2 C6/2 B5/4', 'A5/4 E5/2 A5/2 C6/4 B5/2 A5/2',
      'A5/2 G5/2 F5/2 E5/2 D5/2 E5/2 F5/2 D5/2', 'C6/8 G5/4 -/4',
      'A5/4 C6/4 A5/2 G5/2 F5/4', 'G5/4 B5/4 D6/4 B5/4',
      'B5/2 A5/2 G5/2 E5/2 G5/4 B5/4', 'A5/6 G5/2 A5/2 B5/2 C6/4',
      'D6/4 C6/2 A5/2 F5/4 A5/4', 'G5/2 A5/2 B5/2 C6/2 D6/4 B5/4',
      'C6/4 G5/4 E5/4 G5/4', 'F5/2 E5/2 D5/2 F5/2 G5/4 B4/4',
    ],
    chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F G', 'C', 'F', 'G', 'Em', 'Am', 'Dm', 'G', 'C', 'G7'],
    bass: 'R.R.O.R.5.R.O.5.',
    arp: [0, 1, 2, 3], arpVol: 0.022,
    drums: { k: 'k.......k.k.....', s: '....s.......s...', h: 'h.h.h.h.h.h.h.ho' },
  },
  level: {
    bpm: 140, swing: 0.12,
    lead: [
      'C5/2 F5/2 A5/2 C6/3 A5/1 G5/2 F5/4', 'D5/2 F5/2 A5/2 D6/3 C6/1 A5/2 F5/4',
      'Bb4/2 D5/2 F5/2 Bb5/4 A5/2 G5/2 F5/2', 'G5/3 A5/1 G5/2 E5/2 C5/4 -/4',
      'A5/2 A5/2 -/1 A5/1 G5/2 F5/2 G5/2 A5/4', 'F5/2 F5/2 -/1 F5/1 E5/2 D5/2 E5/2 F5/4',
      'D5/2 F5/2 Bb5/4 C6/2 Bb5/2 A5/2 G5/2', 'F5/4 C6/4 F6/4 -/4',
      'D6/4 C6/2 Bb5/2 A5/4 F5/4', 'E5/4 G5/2 C6/2 E6/4 C6/4',
      'C6/2 A5/2 E5/2 A5/2 C6/4 E6/4', 'D6/6 C6/2 A5/4 F5/4',
      'G5/2 Bb5/2 D6/2 Bb5/2 G5/4 D5/4', 'E5/2 G5/2 C6/2 E6/2 D6/4 C6/4',
      'A5/4 F5/2 A5/2 C6/8', 'Bb5/2 A5/2 G5/2 E5/2 C5/4 -/4',
    ],
    chords: ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Bb C', 'F', 'Bb', 'C', 'Am', 'Dm', 'Gm', 'C', 'F', 'C7'],
    bass: 'R..R..O.R.5.O.R.',
    arp: [0, 2, 1, 2], arpVol: 0.018,
    drums: { k: 'k.....k...k.....', s: '....s.......s..s', h: 'h.hhh.hhh.hhh.ho' },
  },
  boss: {
    bpm: 152, swing: 0,
    lead: [
      'A4/2 A4/2 C5/2 A4/2 E5/2 A4/2 D5/2 C5/2', 'B4/2 C5/2 B4/2 A4/2 G#4/4 A4/4',
      'F5/2 E5/2 F5/2 A5/2 C6/4 A5/4', 'G5/2 F5/2 E5/2 D5/2 B4/4 D5/4',
      'A5/2 A4/2 A5/2 A4/2 G5/2 A4/2 F5/2 E5/2', 'E5/4 C5/4 A4/4 C5/4',
      'F5/3 G5/3 A5/2 C6/4 A5/4', 'G#5/4 B5/4 E6/4 -/4',
      'D5/2 F5/2 A5/4 D6/4 A5/4', 'C6/2 B5/2 A5/2 E5/2 A5/8',
      'F5/2 A5/2 D6/2 F6/2 E6/4 D6/4', 'E6/4 D6/2 C6/2 B5/4 G#5/4',
      'A5/2 C6/2 F6/4 E6/2 C6/2 A5/4', 'B5/2 D6/2 G6/4 F6/2 D6/2 B5/4',
      'C6/4 B5/2 A5/2 E5/4 C5/4', 'B4/2 C5/2 D5/2 E5/2 G#5/4 B5/4',
    ],
    chords: ['Am', 'Am', 'F', 'G', 'Am', 'Am', 'F', 'E7', 'Dm', 'Am', 'Dm', 'E7', 'F', 'G', 'Am', 'E7'],
    bass: 'R.R.R.R.O.O.R.5.',
    arp: [0, 1, 2, 1], arpVol: 0.02,
    drums: { k: 'k.k...k.k.k...k.', s: '....s.......s.s.', h: 'hhhhhhhhhhhhhhhh' },
  },
  bonus: {
    bpm: 164, swing: 0,
    lead: [
      'C5/1 E5/1 G5/1 C6/1 G5/1 E5/1 C5/2 -/2 E5/2 G5/4', 'F5/2 A5/2 C6/2 A5/2 F5/4 C5/4',
      'G5/2 B5/2 D6/2 B5/2 G5/4 D5/4', 'E5/2 G5/2 C6/4 G5/4 -/4',
      'A5/2 E5/2 C5/2 E5/2 A5/4 C6/4', 'A5/2 F5/2 C5/2 F5/2 A5/4 C6/4',
      'B5/2 D6/2 G6/4 F6/2 D6/2 B5/4', 'G5/4 F5/2 D5/2 B4/4 G4/4',
    ],
    chords: ['C', 'F', 'G', 'C', 'Am', 'F', 'G', 'G7'],
    bass: 'R.O.R.O.5.O.R.O.',
    arp: [0, 1, 2, 3], arpVol: 0.02,
    drums: { k: 'k...k...k...k...', s: '....s.......s...', h: '..h...h...h...o.' },
  },
};

// Pre-calcula los eventos de la melodía: paso -> {freq, dur}
function compileSong(song) {
  if (song._compiled) return song;
  const lead = new Map();
  let step = 0;
  song.lead.forEach((bar, bi) => {
    step = bi * 16;
    for (const tok of bar.split(/\s+/)) {
      const [n, d] = tok.split('/');
      const dur = parseInt(d, 10);
      if (n !== '-') lead.set(step, { freq: noteToFreq(n), dur });
      step += dur;
    }
  });
  song._lead = lead;
  song._bars = song.lead.length;
  song._chords = song.chords.map(c => c.split(' ').map(parseChord));
  song._compiled = true;
  return song;
}

const Music = {
  enabled: true,
  playing: false,
  current: null,
  bus: null,
  timer: null,
  step: 0,
  nextTime: 0,
  _waves: null,
  _noise: null,

  _setup() {
    const ctx = Audio8.ctx;
    if (!this._waves) {
      const pulse = (duty) => {
        const N = 32, re = new Float32Array(N), im = new Float32Array(N);
        for (let k = 1; k < N; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
        return ctx.createPeriodicWave(re, im);
      };
      this._waves = { p25: pulse(0.25), p12: pulse(0.125), p50: pulse(0.5) };
      const len = ctx.sampleRate * 0.5;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this._noise = buf;
    }
    // bus de música: compresor suave + eco para la melodía
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.85;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    this.bus.connect(comp).connect(Audio8.master);
    this.echo = ctx.createDelay(1);
    this.echo.delayTime.value = 0.21;
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    const wet = ctx.createGain(); wet.gain.value = 0.35;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    this.echo.connect(lp).connect(fb).connect(this.echo);
    lp.connect(wet).connect(this.bus);
    this._extra = [comp, fb, wet, lp];
  },

  play(key = 'title') {
    if (!this.enabled) return;
    if (!Audio8.ctx || Audio8.ctx.state !== 'running') return;
    if (this.playing && this.current === key) return;
    this.stop();
    this.song = compileSong(SONGS[key] || SONGS.title);
    this.current = key;
    this.playing = true;
    this._setup();
    this.step = 0;
    this.nextTime = Audio8.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this._tick(), 25);
  },

  stop() {
    this.playing = false;
    this.current = null;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.bus) {
      const old = this.bus;
      try {
        old.gain.setTargetAtTime(0, Audio8.ctx.currentTime, 0.03);
        setTimeout(() => { try { old.disconnect(); } catch (e) {} }, 200);
      } catch (e) {}
      this.bus = null;
    }
    if (this.echo) { const e = this.echo; setTimeout(() => { try { e.disconnect(); } catch (er) {} }, 200); this.echo = null; }
  },

  _tick() {
    const ctx = Audio8.ctx;
    if (!this.playing || !ctx) return;
    const s = this.song;
    const sixteenth = 60 / s.bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.12) {
      let t = this.nextTime;
      if (s.swing && this.step % 2 === 1) t += sixteenth * s.swing;
      this._scheduleStep(this.step, t, sixteenth);
      this.nextTime += sixteenth;
      this.step = (this.step + 1) % (s._bars * 16);
    }
  },

  _chordAt(step) {
    const s = this.song;
    const bar = Math.floor(step / 16);
    const parts = s._chords[bar];
    return parts.length === 1 ? parts[0] : parts[Math.floor((step % 16) / (16 / parts.length))];
  },

  _scheduleStep(step, t, sx) {
    const s = this.song;
    const pos = step % 16;
    const bar = Math.floor(step / 16);
    const chord = this._chordAt(step);

    // ---- melodía ----
    const ev = s._lead.get(step);
    if (ev) this._voice({ t, freq: ev.freq, dur: ev.dur * sx * 0.92, wave: this._waves.p25, vol: 0.075, vibrato: ev.dur >= 4, echo: true });

    // ---- segunda voz: la misma melodía una sexta por debajo, más suave ----
    if (ev && ev.dur >= 2 && bar % 8 >= 4) {
      this._voice({ t, freq: ev.freq * Math.pow(2, -8 / 12), dur: ev.dur * sx * 0.9, wave: this._waves.p12, vol: 0.025 });
    }

    // ---- arpegio ----
    if (s.arp) {
      const tones = chord.iv.length >= 4 ? chord.iv : [...chord.iv, 12];
      const deg = s.arp[pos % s.arp.length] % tones.length;
      const midi = 60 + chord.root + tones[deg] + (pos >= 8 ? 12 : 0);
      this._voice({ t, freq: midiToFreq(midi), dur: sx * 0.6, wave: this._waves.p12, vol: s.arpVol });
    }

    // ---- bajo ----
    const b = s.bass[pos];
    if (b && b !== '.') {
      const off = b === 'O' ? 12 : b === '5' ? 7 : 0;
      const midi = 36 + chord.root + off;
      this._bass(t, midiToFreq(midi), sx * 1.6);
    }

    // ---- colchón de acordes al principio de cada compás / medio compás ----
    const parts = s._chords[bar].length;
    if (pos === 0 || (parts === 2 && pos === 8)) {
      const len = (16 / parts) * sx;
      for (const iv of chord.iv.slice(0, 3)) this._pad(t, midiToFreq(60 + chord.root + iv), len);
    }

    // ---- batería (redoble al final de cada 8 compases) ----
    const fill = bar % 8 === 7;
    const d = s.drums;
    if (d.k[pos] === 'k') this._kick(t);
    const sn = fill ? '....s...s.s.ssss' : d.s;
    if (sn[pos] === 's') this._snare(t, fill && pos >= 12 ? 0.6 + (pos - 12) * 0.1 : 1);
    if (d.h[pos] === 'h') this._hat(t, 0.03, false);
    else if (d.h[pos] === 'o') this._hat(t, 0.15, true);
    if (pos === 0 && bar % 8 === 0) this._hat(t, 0.4, true); // platillo
  },

  _voice({ t, freq, dur, wave, vol, vibrato = false, echo = false }) {
    const ctx = Audio8.ctx;
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(wave);
    osc.frequency.setValueAtTime(freq, t);
    let lfo = null;
    if (vibrato) {
      lfo = ctx.createOscillator();
      lfo.frequency.value = 5.5;
      const lg = ctx.createGain();
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(freq * 0.012, t + Math.min(dur, 0.25));
      lfo.connect(lg).connect(osc.frequency);
      lfo.start(t); lfo.stop(t + dur + 0.05);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.setTargetAtTime(vol * 0.6, t + 0.02, 0.08);
    g.gain.setTargetAtTime(0, t + dur, 0.02);
    osc.connect(g).connect(this.bus);
    if (echo && this.echo) g.connect(this.echo);
    osc.start(t); osc.stop(t + dur + 0.1);
  },

  _bass(t, freq, dur) {
    const ctx = Audio8.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const sub = ctx.createOscillator();
    sub.type = 'triangle';
    sub.frequency.value = freq;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1400, t);
    f.frequency.exponentialRampToValueAtTime(260, t + 0.12);
    f.Q.value = 4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.006);
    g.gain.setTargetAtTime(0, t + dur * 0.7, 0.03);
    osc.connect(f); sub.connect(f);
    f.connect(g).connect(this.bus);
    osc.start(t); osc.stop(t + dur + 0.1);
    sub.start(t); sub.stop(t + dur + 0.1);
  },

  _pad(t, freq, dur) {
    const ctx = Audio8.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.016, t + 0.15);
    g.gain.setTargetAtTime(0, t + dur - 0.05, 0.06);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 1100;
    f.connect(g).connect(this.bus);
    for (const det of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = det;
      o.connect(f);
      o.start(t); o.stop(t + dur + 0.2);
    }
  },

  _kick(t) {
    const ctx = Audio8.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g).connect(this.bus);
    o.start(t); o.stop(t + 0.2);
  },

  _noiseHit(t, dur, vol, type, freq) {
    const ctx = Audio8.ctx;
    const n = ctx.createBufferSource();
    n.buffer = this._noise;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(f).connect(g).connect(this.bus);
    n.start(t, Math.random() * 0.3); n.stop(t + dur + 0.02);
  },

  _snare(t, k = 1) {
    this._noiseHit(t, 0.14, 0.11 * k, 'bandpass', 1800);
    const ctx = Audio8.ctx;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.06);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.07 * k, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g).connect(this.bus);
    o.start(t); o.stop(t + 0.1);
  },

  _hat(t, dur, open) {
    this._noiseHit(t, dur, open ? 0.035 : 0.03, 'highpass', 7000);
  },
};
