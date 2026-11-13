// Punto de entrada: arranca el juego cuando se carga la página.
// Configura el canvas en alta resolución (RENDER_SCALE veces la pantalla
// lógica de 256x240), inicializa el input, instancia Game y monta el
// bucle principal a 60 FPS con requestAnimationFrame.

(function () {
  const canvas = document.getElementById('game');
  canvas.width = VIEW_W * RENDER_SCALE;
  canvas.height = VIEW_H * RENDER_SCALE;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
  ctx.imageSmoothingEnabled = false;

  Input.init();
  Audio8.ensure();
  const game = new Game(ctx);
  window.game = game; // útil para depurar desde la consola del navegador

  let lastTime = 0;
  const FRAME_MS = 1000 / 60;
  let acc = 0;

  function loop(now) {
    const dt = Math.min(100, now - lastTime);
    lastTime = now;
    acc += dt;
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
  // Esperamos a la fuente (si hay internet) para que el texto salga bien
  // desde el primer frame; si tarda, arrancamos igualmente.
  const start = () => requestAnimationFrame((t) => { lastTime = t; loop(t); });
  if (document.fonts && document.fonts.load) {
    Promise.race([
      Promise.all([document.fonts.load('700 10px "Fredoka"'), document.fonts.load('500 10px "Fredoka"')]),
      new Promise(r => setTimeout(r, 1200)),
    ]).then(start, start);
  } else start();
})();
