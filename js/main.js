// Punto de entrada: arranca el juego cuando se carga la página.
// Configura el canvas, inicializa el input, instancia Game y
// monta el bucle principal a 60 FPS con requestAnimationFrame.

(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  Input.init();
  // Intentamos arrancar el contexto de audio nada más cargar la página.
  // Algunos navegadores (sobre todo en file:// o tras visitas previas) lo
  // permiten sin gesto del usuario. En el resto, el primer click/tecla
  // del usuario ya lo activa (ver listeners en input.js).
  Audio8.ensure();
  const game = new Game(ctx);

  let lastTime = 0;
  const FRAME_MS = 1000 / 60;
  let acc = 0;

  function loop(now) {
    const dt = now - lastTime;
    lastTime = now;
    acc += dt;
    // Hacemos hasta 4 updates por frame del navegador para no quedarnos cortos.
    let updates = 0;
    while (acc >= FRAME_MS && updates < 4) {
      Input.beginFrame();
      game.update();
      acc -= FRAME_MS;
      updates++;
    }
    game.draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame((t) => { lastTime = t; loop(t); });
})();
