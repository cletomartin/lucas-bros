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
