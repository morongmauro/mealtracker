# El módulo de entrenamiento del cliente

Qué cambia, qué SQL correr y qué mirar para saber que quedó.

---

## 1. Primero el SQL

**Supabase del CRM → SQL Editor.** Es el único Supabase que hay: el módulo de
entrenamiento vive en la misma base que los clientes.

En este orden:

```
1-eventos.sql        (si no lo corriste aún)
2-actividades.sql
3-videos.sql         (opcional, ver §5)
```

El orden importa: la tabla `actividades` apunta a `eventos` con una clave
foránea de verdad. Si los inviertes, el segundo archivo te lo dice con todas
las letras en vez de soltar un error de Postgres.

Los tres son idempotentes: correrlos dos veces no rompe nada.

**No hace falta ninguna variable de entorno nueva.** El módulo vive dentro de
la app, así que llama a `/api/training` de su propio dominio: no hay CORS que
configurar ni un segundo despliegue que mantener.

---

## 2. Dónde vive la app del cliente

En **este** repo: `src/Entrenamiento.jsx` y los `src/Entreno*.jsx`.

El repo `entrenamientoecm` tiene una versión anterior de las mismas pantallas
que **nunca se llegó a enganchar** — `openTraining()` monta este componente,
no un iframe hacia allá. De ese repo solo se mantienen el modelo de datos, las
migraciones y los scripts de carga. Está avisado en su README.

---

## 3. Quién lo ve

Tres candados independientes, todos activos:

**1. La lista de la beta.** En `api/_clients.js`:

```js
export const TRAINING_PARA_TODOS = false;
export const TRAINING_BETA = ['Mauro Morón'];
```

Nadie más tiene siquiera la pestaña **Entrena**. No es que vean algo vacío: el
botón no existe para ellos. Para abrirlo a alguien, añade su nombre a la
lista; para abrirlo a todos, pon `TRAINING_PARA_TODOS = true`.

**2. La fase tiene que estar activa Y enviada.** Las 10 fases importadas de
Trainerize están en `borrador`, así que nadie ha visto nada.

**3. El candado que faltaba.** `api/training.js` filtraba por
`estado = 'activa'` pero no por `visible_cliente`, así que el botón "enviar al
cliente" del CRM era decorativo: bastaba marcar una fase como activa —que es
lo natural mientras la armas— para publicarla sin querer. Ya no. También al
abrir una rutina por su id directamente, no solo en el listado.

---

## 4. Qué ve el cliente

Cuatro secciones arriba (abajo las taparía la barra ovalada de la app).

**Hoy.** Lo que ya había: la fase, la rutina de hoy en oliva y la semana.
Debajo, en gris, lo complementario del día y el botón para registrarlo.

**Mes.** El calendario. La rutina de fuerza es un bloque con su nombre; el
cardio, los deportes y lo que le programaste son **puntos de color sin
texto**. Al tocar un día se abre con el detalle y el botón para registrar.

**Rutinas.** El plan completo, para mirarlo, con los músculos de cada día.

**Resumen.** Su semana: entrenamiento y alimentación en una pantalla. Sin
semáforos ni notas — los números y ya.

### La jerarquía, que es la regla de todo esto

La rutina de fuerza manda en las cuatro. Lo complementario se ve, se toca y se
registra, pero no compite: el cliente abre esto para saber qué le toca
entrenar, y si la natación del martes grita tanto como el Push del lunes,
entra a marcar la natación y se le olvida el Push.

### Entrenar

El flujo de siempre —empezar, marcar peso y reps, terminar, RPE, temporizador
de descanso— no se tocó, porque ya estaba bien.

Lo que cambia: cada ejercicio lleva ahora la **miniatura del video**, y un
botón **Características** que abre la ficha en una hoja aparte. Antes el video
se desplegaba en medio de la lista; con diez ejercicios el teléfono se
arrastraba.

La ficha trae el video, la prescripción de hoy, tu nota, cómo se hace, el
**dibujo del cuerpo con los músculos** que trabaja, las características
plegadas y lo que levantó la última vez.

### Cardio y deportes

Se registran desde tres sitios, y eso es a propósito:

- **al terminar la fuerza** — "¿hiciste cardio al terminar?", que es el único
  momento en que la persona lo tiene en la mano;
- **desde Hoy** — el botón de siempre;
- **tocando cualquier día del mes** — para lo que se olvidó marcar.

Puede marcar en otro día sin ir a ningún sitio especial: la gente no nada
siempre el martes. **No se puede registrar en el futuro** — descuadraría la
adherencia de una semana que no ha pasado.

Tú le programas los deportes desde el CRM (**+ Evento** en el calendario) y él
marca lo que de verdad hizo. Son dos tablas distintas a propósito: si la
natación programada contara como hecha, la adherencia mentiría.

Todo lo que registre aparece en **CRM → Composición → Actividad**, con los
minutos por semana y qué hace.

---

## 5. Los videos

`3-videos.sql` le pone video a los **20 ejercicios que más se repiten** en las
rutinas de tus 10 clientes (entre 42 y 139 series cada uno).

**Míralos antes de enviar las fases.** Los busqué en YouTube por el nombre de
cada ejercicio, pero **no puedo ver video**: los elegí por el título y por el
canal. Tu nombre va en esa app.

Para revisarlos: CRM → Entrenamiento → Galería → botón 👁 **Ficha**. El video
sale ahí mismo y se cambia en el editor en diez segundos. El propio SQL los
lista al final con el enlace de cada uno.

El archivo **nunca pisa un video que ya esté puesto**: solo rellena los que
están vacíos.

Quedan 132 ejercicios de esas rutinas sin video (y 2.063 en la galería
completa). Se puede seguir por tandas.

---

## 6. Comprobar que quedó

1. Entra a tu app como **Mauro Morón** → pestaña **Entrena**. Deben verse las
   cuatro secciones arriba.
2. **Mes**: toca cualquier día pasado → **+ Registrar cardio o deporte** →
   guarda algo.
3. CRM → **Composición** → pestaña **Actividad**: abajo del todo tiene que
   salir lo que acabas de registrar.
4. Entra a una rutina: cada ejercicio debe llevar miniatura y el botón
   **Características**.

Si el paso 3 dice que falta una migración, es el punto 1 de este archivo.
