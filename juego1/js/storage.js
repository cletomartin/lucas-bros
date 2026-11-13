// Persistencia simple en localStorage para mejor puntuación y total de cromos.

const Storage = {
  KEY: 'lucas_bros_v1',

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

  setBigHead(on) {
    const data = this.load();
    data.bigHead = !!on;
    this.save(data);
  },
};
