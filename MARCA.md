# Entrena con Método · reglas de estilo de la app

Lo que hemos definido para la visual nueva (v2) de la app del cliente. Es la
referencia para cualquier pantalla, pieza o texto nuevo: si algo no cumple
esto, no es de la marca. La fuente de verdad en código es `src/theme.js`
(colores, sombras) y `src/v2-fuentes.js` (letra); este archivo explica el
criterio, no lo reemplaza.

## 1. Qué transmite

Método, calma, acompañamiento, premium. Habla como un coach que conoce a la
persona, no como una app de «beast mode». Nunca regaña, nunca presume.
Referentes: Apple Fitness (aros, tarjetas, jerarquía), Headspace (personaje
amable, tono), Nike Training (cabeceras con frase grande).

## 2. Color

| Uso | Color | Dónde |
|---|---|---|
| Grafito | `#1D1D1F` | Texto principal, botón primario, cabecera del Dash. Nunca negro puro. |
| Azul | `#3C7BD6` (tinta `#1E58A6`) | Dash: aro, títulos de tarjetas, barra. |
| Gris entreno | `#5F6670` (tinta `#454B54`) | Entrenamiento: sobrio, foco. |
| Verde | `#46965A` (tinta `#2A6A3A`) | Alimentación. |
| Naranja | `#EE8434` (tinta `#A24F0E`) | Aprendizaje. |
| Amarillo | `#F2C94C` | Acento del Dash: frase del coach sobre grafito, récords, recordatorios, confeti. |
| Fondo | `#F3F1EB` | El único fondo de la app. |
| Crema | `#F4F1EB` | Bloques internos y pastillas dentro de tarjetas blancas. |
| Crema oscura | `#EBE6DC` | Botones de fila («Profundiza»): un tono más oscuro que la crema para que se lean como botón. |
| Blanco | `#FFFFFF` | Tarjetas. |
| Gris texto | `#6B6B6B` / `#9A9A9A` | Secundario / terciario. |
| Aviso | `#B4541D` | «N sin hacer», lo que quedó atrás. Solo texto, nunca fondos rojos. |
| Macros | proteína `#D77A61`, carbos `#D4B581`, grasas `#6B7A8F` | Siempre los mismos en aros, barras y calendario. |

Reglas:
- Cada sección tiene **un** color. Su `base` pinta íconos, aros y marcas; su
  `ink` es la letra sobre blanco (contraste 4.5:1); su `tint` es el cristal
  teñido de la barra.
- El grafito es la acción primaria (Seguir, Enviar, Terminar). El color de la
  sección es identidad, no botón.
- Los aros **nunca cambian de color** por ir mal: avisan con texto.
- Solo tema claro. La app declara `color-scheme: only light`; un modo oscuro
  solo entra cuando esté diseñado con esta paleta.

## 3. Letra

- **Figtree** en toda la app (cargada como `ECM Sans` para texto y
  `ECM Display` para títulos). Sin otra familia.
- Títulos de pantalla: 22–36 px, peso 750–800, `letter-spacing -0.02 … -0.035em`,
  interlineado 1.02–1.1.
- Texto: 14–15.5 px, peso 500–600. Secundario 12.5–13 px.
- Etiquetas pequeñas en mayúsculas: 11–12 px, peso 800, `letter-spacing 0.06em`
  («MARTES 29», solo en el Dash; «HOY · 1 de 4»).
- Números grandes: peso 800, `tabular-nums`, separador de miles con punto y
  decimales con coma (`toLocaleString('es-CO')`): 2.443, 82,4 kg.

## 4. Formas, sombras y capas

- Radios: tarjetas 20–24 px, hojas (sheets) 28 px arriba, botones 14 px,
  pastillas y botones redondos 999.
- Sombra de tarjeta: `0 1px 2px rgba(40,40,30,.04), 0 6px 16px rgba(60,60,40,.06)`.
  No inventar otras sombras inline.
- Sin bordes sólidos para marcar estado. Lo hecho se pinta con relleno y
  chulo, no con borde (un ejercicio hecho va en ámbar sin borde).
- Las secciones de una pantalla se separan con el título y el espacio, sin
  líneas (ni grises ni de color): 18 px arriba del título, 12 px hasta su
  tarjeta.
- Cristal (barra de secciones, botones redondos): fondo blanco al 78–88 %,
  `backdrop-filter: blur(16px)`, borde claro arriba. Sin sombras pesadas.
- Los botones redondos de atajo miden 42 px de círculo con ícono de 19 px y la
  palabra debajo en 11 px. Van juntos, no repartidos por todo el ancho.

## 5. Componentes de marca

- **Aro de la marca** (`AnilloMarca`): trazo redondeado sobre riel suave y el
  punto blanco en la punta, como el ícono. Se llena una vez al aparecer (~1 s,
  sin rebote). Todos los aros grandes son este. Cada aro se **explica al
  tocarlo** (qué mide y de qué se compone).
- **Blob de la marca** (`Blob.jsx`): un cuadrado de lados y esquinas curvos
  (superelipse), siempre girado 12° para que el giro se note, con una sombra
  suave de su propio color. Blanco detrás del ícono en la entrada; del color
  de la sección en las cabeceras. Es la pieza de color de cada pantalla.
- **Cabecera de «Hoy»**: banda delgada del color de la sección, manchas
  difuminadas, la frase del coach en dos tiempos (lo que pasa, en grafito;
  lo que diría el coach, en el color de la sección) y, a la derecha, el blob
  de la sección con el aro en blanco encima (riel blanco al 30 %, el punto de
  la punta del color de la sección), el objeto de la sección a tres tonos y
  el número en blanco adentro del aro, y el pie en gris debajo del blob.
- **Píldora de arriba**: solo el nombre de la sección, en mayúsculas sobre
  grafito. Se encoge al bajar y vuelve al subir.
- **Barra de secciones**: cuatro secciones; la abierta se despliega de lado y
  muestra sus opciones; las otras quedan en su ícono con su palabra corta.
- **Hojas (sheets)**: suben desde abajo, asa gris, título en 17 px, fondo
  blanco; el fondo de atrás no se mueve.
- **Botones de fila** («Profundiza», «Ver todo»): crema oscura, texto
  grafito 15 px peso 650, flecha en el color de la sección.

## 6. Íconos e ilustración

- Íconos **Phosphor**. De línea (`regular`) para listas e información;
  rellenos (`fill`) solo dentro de botones redondos y chips de estado.
  Un ícono informativo nunca lleva círculo de fondo: parecería un botón.
- Sin emojis en la visual nueva. Los estados se dicen con ícono o texto.
- **Un solo personaje**: la kettlebell. Blanca o en el color de la sección,
  redonda, asa con cuernos, brazos y piernas en línea negra por detrás del
  cuerpo. **Sin cara en las cabeceras; con cara solo en celebraciones**
  (ojos cerrados en arco y sonrisa ancha, estilo Headspace). Nunca se le
  despegan los brazos: se animan desde el hombro.
- Objetos de cabecera: kettlebell (entreno), aguacate (comida), libro
  (aprende), brújula (Dash). Dentro del aro van **a tres tonos**: blanco en la
  luz, gris en los medios y un tono claro de la sección en la sombra, sin
  sombra de piso (`<tema>-tres.webp`, generados a partir de los originales a
  color, que no se tocan). Mismo tamaño y posición en todas.

## 7. La voz del coach (textos)

- Dos tiempos: **qué pasa** + **qué diría el coach**. «Hoy toca Pierna.» /
  «La semana se gana aquí.»
- Frases cortas, con punto final, sin signos de exclamación en serie, sin
  mayúsculas de grito. Rotan por día y el mismo día dicen siempre lo mismo.
- Sin género gramatical: «hoy descansas», no «descansa tranquilo».
- Tú, nunca usted. Primera persona del coach cuando aplica («Te lo dejé yo»).
- Se celebra solo lo real: una rutina hecha con series, una meta cumplida.
  Pasarse no es fiesta: se dice claro y sin castigo.
- **Sin deuda**: nada le dice al cliente «vas mal» por lo que todavía no
  tocaba. Los aros son progreso de la semana («1/3», «2/7») y el pie dice
  «Semana · al día» o «Semana · N sin hacer». La deuda solo aparece cuando es
  real.
- Un mensaje por hecho: no se confirma lo mismo tres veces. Deshacer es
  discreto; el aviso legal es una línea.
- Las explicaciones largas salen **una vez** (primera vez) y luego se acortan.
- Nombres de ejercicios: el inglés grande y en grafito, el español chico y
  gris debajo. Nunca se menciona de dónde vienen las rutinas ni otras apps.

## 8. Movimiento

- Corto y con sentido: aros que se llenan, números que suben contando, pop en
  lo recién marcado, confeti breve con los colores de la marca al terminar.
- Curva `cubic-bezier(.2,.8,.2,1)`, 250–450 ms. Nada rebota.
- Todo respeta «reducir movimiento» del teléfono: sin animación, resultado
  final directo.
- Las celebraciones grandes (hoja con la kettlebell) se reservan para
  terminar un entreno o cumplir la meta del día; lo cotidiano se confirma en
  pequeño.

## 9. Jerarquía de cada pantalla

1. Qué hacer ahora (una acción clara: «Empezar la rutina», «Ir al chat»).
2. Cómo voy (el aro y una línea).
3. Lo demás, debajo o bajo «Ver todo».
Se lee en 3 segundos, con prisa, en el gimnasio o en la cocina.

## 10. Lo que no se hace

- Colores fuera de la paleta, degradados «de plantilla», negro puro.
- Más de un color de sección en la misma pantalla (salvo el Dash, que resume).
- Bordes sólidos para marcar «hecho», círculos detrás de íconos informativos.
- Porcentajes sin explicación, números que digan «vas mal» antes de tiempo.
- Texto que suene a regaño, a legal o a marketing.
- Emojis, signos de exclamación encadenados, mayúsculas sostenidas en frases.
- Cambios visuales sin pasar la suite `pruebas/visual-v2.mjs` (390 y 375 px).
