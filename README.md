# Lucas Bros.

**¡A jugar!** → https://cletomartin.github.io/lucas-bros/

La portada tiene un menú para elegir juego, y dentro de cada uno el botón
**☰ Juegos** te devuelve al menú para cambiar de uno a otro.

| Carpeta    | Juego |
|------------|-------|
| `juego1/`  | **Lucas Bros. — La aventura del cole** (el primero) |
| `juego2/`  | **Lucas Bros. 2 — Los profes contraatacan** |

Para jugar sin internet: abre `index.html` en el navegador.

---

# Lucas Bros. 2 — Los profes contraatacan

Un juego de plataformas con estética de 16 bits, hecho con HTML5 + JavaScript.
Sin librerías externas. Todo el código está en `juego2/`.
(Con internet carga la tipografía Fredoka; sin internet usa una de sistema).

## Cómo jugar

| Acción           | Teclas            |
|------------------|-------------------|
| Mover            | ← → o A D         |
| Saltar           | ↑ o W (mantén para saltar más alto) |
| Boomerang        | ↓ o S             |
| Pedo             | E (con la barriga llena) |
| Pausa            | P                 |
| Empezar / seguir | Espacio o Enter   |
| Modo cabezón     | X (en el título)  |

En móvil aparecen botones táctiles.

- **Combos:** si pisas varios enemigos seguidos sin tocar el suelo, cada uno
  vale más (100, 200, 400, 800...). Mantén saltar al pisar para rebotar más alto.
- **Punto de control:** a mitad de cada nivel hay un banderín. Si pierdes,
  vuelves desde ahí.
- **Jefes:** están dormidos hasta que llegas. La meta tiene candado hasta
  que derrotas al profe.
- **Contrarreloj:** cada nivel tiene un *tiempo objetivo*. Al llegar a la
  meta ganas bonus por el tiempo que te sobre y +2000 si no te han dado.
  Hay 3 estrellas por nivel: llegar a la meta, coger todos los cromos y
  batir el tiempo objetivo. Se guarda tu récord de tiempo y de puntos de
  cada nivel: ¡a ver quién lo bate!
- **Sin atajos:** no hay portales, hay que recorrerse cada nivel entero.
  Los niveles van de más fácil a más difícil (en los últimos, los
  compañeros corren más y tiran chupetes).
- **Niveles bonus:** sin enemigos y contra reloj. Coge todo lo que cae del
  cielo antes de que se acabe el tiempo (no hay forma de alargarlo) y
  cuidado con las bombas, que te lo quitan.

## Personajes

- **Lucas** (camiseta azul) y **Cleto** (camiseta verde, pelo de punta).
- **Diego** — el hermano pequeño. Tira chupetes y cáscaras de plátano.
  Si lo tocas, se ríe y te regala un corazón.
- **Papá** y **Mamá** — gruñones: si te pillan, te regañan y te quedas quieto.

### Amigos del cole (power-ups de 10 segundos)
| Amigo    | Poder |
|----------|-------|
| Rafa     | Invencible |
| Matías   | Súper salto |
| Santiago | Dos boomerangs |
| Carlos   | Doble salto |
| Fran     | Imán de cromos |

### Padres de los amigos (te dan un regalo)
| Quién    | De quién            | Regalo |
|----------|---------------------|--------|
| Ángeles  | madre de Rafa       | +1 corazón |
| Pepe     | padre de Rafa       | ¡Choca esos cinco! +500 puntos |
| Rosa     | madre de Santiago   | Merienda (barriga +2) |
| Asun     | madre de Matías     | Acelerón (corres más) |

### Compañeros traviesos (enemigos)
Irene, Berta, Andreína, Adrián, Martín. Písalos o dales con el boomerang.

### Profes (jefes)
1. **Juanjo** (el tutor) — lápices, exámenes en abanico y saltos.
2. **Julio** (inglés) — tazas de té y banderas británicas.
3. **Mari Paz** (música) — notas musicales que rebotan.
4. **César** (ed. física) — embestidas (¡tiembla antes de embestir!).
5. **Lucre** (la profe de Cleto) — libros que caen del cielo.
6. **Emilio** (el director, jefe final) — combina ataques y se enfada.

Entre medias, dos niveles **bonus**.

## Estructura del código (en `juego2/`)

```
index.html        Página principal
css/style.css     Estilos
js/
  render.js       Pantalla en alta resolución, texto, colores, sombras
  chargen.js      Generador de personajes (muñecos con poses animadas)
  sprites.js      Personajes y objetos (colores, peinados, detalles)
  backdrops.js    Fondos con paralaje de cada nivel
  level.js        Motor de tiles, suelos, bloques, temas visuales
  levels.js       Diseño de los niveles
  player.js       Lucas / Cleto: movimiento, salto, daño
  enemy.js        Compañeros traviesos
  boss.js         Los profes y sus ataques
  bonus.js        Objetos de los niveles bonus
  diego.js        Hermano pequeño
  parents.js      Papá, Mamá y los padres de los amigos
  friend.js       Amigos y power-ups
  effects.js      Partículas, polvo, confeti, texto flotante
  music.js        Música 16 bits (melodía, bajo, arpegios, batería)
  audio.js        Efectos de sonido
  game.js         Pantallas, colisiones, cámara, HUD
  main.js         Bucle principal a 60 FPS
```

## Cómo modificar el juego (para Lucas y Cleto)

### Cambiar el aspecto de un personaje
Abre `js/sprites.js`. Todos los personajes se crean con `makeCharacter`,
pasándole letras de colores (mira la `PALETTE`) y un peinado
(`short`, `spiky`, `curly`, `long`, `ponytail`, `bob`, `bun`, `bald`...).
Por ejemplo, para que Lucas tenga camiseta roja cambia `shirt: 'b'` por
`shirt: 'r'` en `SPR_LUCAS`. Con `kind` eliges el cuerpo: niño, `adult`,
`toddler` (Diego) o `boss` (los profes).

El generador (`js/chargen.js`) monta cada personaje como un muñeco
(cabeza, pelo, ojos, brazos, piernas) a doble resolución y le pone
sombras, brillos y contorno. Cada fotograma de animación es una pose:
andar, saltar, caer, resbalar con un plátano, culetazo...

### Diseñar un nivel
Abre `js/levels.js`. Los niveles se construyen por tramos con `stage()`:
`S.ground(desde, hasta, alto)` pone suelo, los huecos son las columnas sin
suelo, `S.plat` pone plataformas, `S.wall` columnas de ladrillo y `S.put`
coloca personajes y objetos (arriba del archivo está la lista de letras).
Cada nivel tiene su tiempo objetivo (`par`), y puede tener compañeros más
rápidos (`enemySpeed`) o que disparan (`shooters`).

### Cambiar la música
En `js/music.js`, cada canción tiene una melodía (`lead`) escrita como
`'E5/2 G5/2 C6/4'` (nota/duración) y una lista de acordes (`chords`).
El bajo, los arpegios y la batería se generan solos a partir de los acordes.

### Ajustar la dificultad
- En `js/player.js`: `JUMP_VELOCITY`, `MOVE_MAX`, `GRAVITY`...
- En `js/boss.js`: la vida (`hp`) de cada profe y la frecuencia de sus ataques.
- En `js/levels.js`: el tiempo objetivo de cada nivel (`par`), la velocidad
  de los compañeros (`enemySpeed`) y la duración de los bonus (`duration`).
