# Lucas Bros. — La aventura del cole

Un juego de plataformas estilo Mario NES, hecho con HTML5 + JavaScript.
Sin librerías externas. Para jugar: abre `index.html` en el navegador.

## Cómo jugar

Cada jugador usa solo 4 teclas, todas juntas, en lados opuestos del teclado.

| Acción           | Jugador 1 (Lucas) | Jugador 2 (Cleto) |
|------------------|-------------------|-------------------|
| Mover izquierda  | ←                 | A                 |
| Mover derecha    | →                 | D                 |
| Saltar           | ↑                 | W                 |
| Boomerang        | ↓                 | S                 |
| Pausa            | P                 | P                 |
| Empezar / seguir | Espacio o Enter   | Espacio o Enter   |

En la pantalla de título: **1** = un jugador, **2** = dos jugadores.

Si pierdes todas las vidas, pulsa Espacio en la pantalla de "Game Over"
para reintentar el mismo nivel (la puntuación se conserva).

## Personajes

- **Lucas** — protagonista (azul), hermano mayor.
- **Cleto** — segundo jugador (verde), hermano mediano.
- **Diego** — hermano pequeño de 2 años. Aparece haciendo trastadas
  (¡tira chupetes!). Si lo tocas, se ríe y te regala un corazón.
- **Papá** y **Mamá** — NPCs gruñones. Si te tocan, te sueltan
  una regañina y te quedas paralizado un par de segundos. No quitan
  vida, sólo... vergüenza. Ojo con dónde están.

### Amigos del cole
Rafa, Matías, Santiago, Jorge — aparecen de momento sólo en sprites,
listos para ser usados como aliados (próxima iteración).

### Compañeros enemigos
Irene, Berta, Andreína, Adrián, Martín — los vas a encontrar por los
niveles. Píscalos pisándolos por arriba o lanzándoles el boomerang.

### Profes (jefes)
1. **Rodrigo** (tutor) — lanza exámenes en abanico.
2. **Mari Paz** (música) — notas musicales que rebotan.
3. **César** (ed. física) — embiste a toda velocidad.
4. **Lucre** (profe veterana) — invoca libros que caen del cielo.
5. **Emilio** (director, jefe final) — combina todos los ataques.

## Estructura del código

```
index.html        Página principal
css/style.css     Estilos (escalado pixel-art, sin antialiasing)
js/
  input.js        Teclado para 2 jugadores
  sprites.js      Pixel art de TODOS los personajes (editable a mano)
  player.js       Lucas / Cleto: movimiento, salto, daño
  boomerang.js    Boomerang que vuelve
  enemy.js        Compañeros (estilo Goomba)
  diego.js        Hermano pequeño NPC
  boss.js         Los 5 jefes con sus ataques
  level.js        Motor de tiles 16x16, cámara, colisión
  levels.js       Diseño de los 5 niveles
  game.js         Pantallas (título, juego, pausa, victoria)
  main.js         Bucle principal a 60 FPS
```

## Cómo modificar el juego (para Lucas)

### Cambiar el aspecto de un personaje
Abre `js/sprites.js`. Cada personaje es un grid de 16x16 letras.
Cambia las letras y el dibujo cambia (¡recarga el navegador!).
La paleta `PALETTE` arriba mapea cada letra a un color.

Ejemplo: para que Lucas tenga camiseta roja en lugar de azul, cambia
`shirt: 'b'` por `shirt: 'r'` en `SPR_LUCAS`.

### Diseñar un nivel
Abre `js/levels.js`. Cada nivel es una lista de filas de texto.
- `.` = aire
- `#` = suelo
- `=` = plataforma
- `b` = ladrillo
- `P` `C` = donde aparecen Lucas y Cleto
- `D` = donde aparece Diego
- `B` = donde aparece el jefe
- `F` = bandera de meta
- `a` `b` `c` `d` `e` = enemigos (lo que mapee `enemyTable`)

### Ajustar la dificultad
- En `js/player.js`: `JUMP_VELOCITY`, `MOVE_MAX`, `GRAVITY`...
- En `js/enemy.js`: velocidad de los enemigos.
- En `js/boss.js`: HP de los jefes y el `timer % N` de cada ataque.

## Ideas para añadir más adelante

- Aliados rescatables (Rafa, Matías, Santiago, Jorge) que den power-ups.
- Música chiptune (Web Audio API).
- Sonidos de salto, golpe, etc.
- Más mecánicas para Diego (mover plataformas, esconder enemigos…).
- Modo cooperativo con vidas compartidas.
