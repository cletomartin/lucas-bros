// Gestión del teclado para 1 jugador.
//
// Controles del jugador (mismo esquema soportando flechas y WASD):
//   ← → / A D    mover
//   ↑ / W        saltar
//   ↓ / S        boomerang
//
// Sistema:
//   Enter / Espacio = empezar / continuar
//   P               = pausa
//   ← / →           = navegar menús del título

const Input = {
  down: {},
  pressed: {},
  _justPressed: {},

  init() {
    window.addEventListener('keydown', (e) => {
      if (!this.down[e.code]) this._justPressed[e.code] = true;
      this.down[e.code] = true;
      // Despierta el contexto de audio en cuanto haya cualquier tecla.
      if (typeof Audio8 !== 'undefined') Audio8.ensure();
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => { this.down[e.code] = false; });
    // También escuchamos clicks/touch para que la música arranque
    // aunque el usuario no haya pulsado todavía ninguna tecla.
    const wakeAudio = () => {
      if (typeof Audio8 !== 'undefined') Audio8.ensure();
    };
    window.addEventListener('pointerdown', wakeAudio);
    window.addEventListener('click', wakeAudio);
    window.addEventListener('touchstart', wakeAudio, { passive: true });

    this._initTouchButtons();
  },

  // Botones táctiles: cada botón tiene un atributo data-key con un código
  // de tecla virtual (ArrowLeft, KeyE, Space, etc). Tocarlo simula un
  // keydown; soltarlo (o cancelar el touch) simula un keyup. Soporta
  // multi-touch porque cada botón es un elemento independiente.
  _initTouchButtons() {
    const buttons = document.querySelectorAll('[data-key]');
    if (!buttons.length) return;
    const press = (btn) => {
      const code = btn.dataset.key;
      if (!code) return;
      if (!this.down[code]) this._justPressed[code] = true;
      this.down[code] = true;
      btn.classList.add('pressed');
      if (typeof Audio8 !== 'undefined') Audio8.ensure();
    };
    const release = (btn) => {
      const code = btn.dataset.key;
      if (!code) return;
      this.down[code] = false;
      btn.classList.remove('pressed');
    };
    for (const btn of buttons) {
      // Evitamos el "click fantasma" + scroll/zoom del navegador móvil.
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); press(btn); }, { passive: false });
      btn.addEventListener('touchend',   (e) => { e.preventDefault(); release(btn); }, { passive: false });
      btn.addEventListener('touchcancel',(e) => { e.preventDefault(); release(btn); }, { passive: false });
      // Versión ratón (útil para probar en escritorio o en tablets con
      // lápiz/teclado externo).
      btn.addEventListener('mousedown',  (e) => { e.preventDefault(); press(btn); });
      btn.addEventListener('mouseup',    (e) => { e.preventDefault(); release(btn); });
      btn.addEventListener('mouseleave', () => { release(btn); });
      // Algunos botones (Pausa, Start) son una pulsación instantánea: si
      // el usuario suelta el dedo fuera del botón también lo damos por
      // soltado en el siguiente frame.
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  },

  beginFrame() {
    this.pressed = this._justPressed;
    this._justPressed = {};
  },

  // Devuelve un objeto con el estado de los controles del jugador. Se
  // mantiene la firma `forPlayer(idx)` para que el resto del código no
  // cambie, pero ahora siempre hay un único jugador.
  forPlayer(_idx) {
    return {
      left:      !!(this.down['ArrowLeft']  || this.down['KeyA']),
      right:     !!(this.down['ArrowRight'] || this.down['KeyD']),
      jumpHeld:  !!(this.down['ArrowUp']    || this.down['KeyW']),
      jumpTap:   !!(this.pressed['ArrowUp'] || this.pressed['KeyW']),
      shootTap:  !!(this.pressed['ArrowDown'] || this.pressed['KeyS']),
      eructTap:  !!this.pressed['KeyE'],
    };
  },

  pauseTap() { return !!this.pressed['KeyP']; },
  startTap() { return !!(this.pressed['Enter'] || this.pressed['Space']); },
  // Navegación en menús del título.
  leftTap()  { return !!(this.pressed['ArrowLeft']  || this.pressed['KeyA']); },
  rightTap() { return !!(this.pressed['ArrowRight'] || this.pressed['KeyD']); },
  // Toggle de Modo Cabezón en la pantalla de título.
  cabezonTap() { return !!this.pressed['KeyX']; },
};
