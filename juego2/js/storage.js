// Persistencia simple en localStorage para mejor puntuación y total de cromos.

const Storage = {
  KEY: 'lucas_bros2_v1',

  load() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || { hiScore: 0, cromosTotal: 0, bigHead: false };
    } catch (e) {
      return { hiScore: 0, cromosTotal: 0, bigHead: false };
    }
  },

  save(data) {
    try { localStorage.setItem(this.KEY, JSON.stringify(data)); } catch (e) {}
  },

  // Devuelve true si la puntuación rompe el récord
  recordIfBetter(score, cromos = 0) {
    const data = this.load();
    let changed = false;
    if (score > data.hiScore) { data.hiScore = score; changed = true; }
    if (cromos > 0) data.cromosTotal = (data.cromosTotal || 0) + cromos;
    this.save(data);
    return changed;
  },

  // Récords por nivel: { time, score, stars }. Devuelve qué se ha batido.
  getLevel(idx) {
    const data = this.load();
    return (data.levels2 || {})[idx] || null;
  },
  levelRecord(idx, { time, score, stars }) {
    const data = this.load();
    data.levels2 = data.levels2 || {};
    const old = data.levels2[idx];
    const rec = old ? { ...old } : { time: Infinity, score: 0, stars: 0 };
    const newTime = !old || time < old.time;
    const newScore = !old || score > old.score;
    if (newTime) rec.time = time;
    if (newScore) rec.score = score;
    rec.stars = Math.max(rec.stars || 0, stars);
    data.levels2[idx] = rec;
    this.save(data);
    // la primera vez no se celebra como "récord"
    return { newTime: newTime && !!old, newScore: newScore && !!old, best: rec };
  },

  setBigHead(on) {
    const data = this.load();
    data.bigHead = !!on;
    this.save(data);
  },
};
