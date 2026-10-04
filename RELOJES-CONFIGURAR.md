# Relojes y anillos · cómo activarlos

La app ya sabe conectar **Fitbit, Oura, Whoop y Polar** (Configuración → Relojes y anillos). Cada marca
pide que tengas una «app de desarrollador» propia. Mientras no la tengas, en la app sale **«Pronto»**
y nada se rompe.

## Paso 1 · La base (una sola vez)
Supabase del CRM → SQL Editor → pega `entrenamientoecm/carga/migracion-relojes.sql` → Run.
Al final debe decir **«relojes listos»**.

## Paso 2 · Por cada marca que quieras activar
1. Crea la app de desarrollador:
   - Fitbit: dev.fitbit.com → Register an app (tipo «Server»)
   - Oura: cloud.ouraring.com/oauth/applications
   - Whoop: developer.whoop.com
   - Polar: admin.polaraccesslink.com
2. Donde pida **Redirect URL / Callback URL**, pon exactamente:
   `https://<tu dominio de la app>/api/relojes`
3. Copia el **Client ID** y el **Client Secret** a Vercel (proyecto de la app → Settings → Environment
   Variables) con estos nombres:
   - `FITBIT_CLIENT_ID` y `FITBIT_CLIENT_SECRET`
   - `OURA_CLIENT_ID` y `OURA_CLIENT_SECRET`
   - `WHOOP_CLIENT_ID` y `WHOOP_CLIENT_SECRET`
   - `POLAR_CLIENT_ID` y `POLAR_CLIENT_SECRET`
4. Opcional pero recomendado: `RELOJES_SECRET` con cualquier texto largo inventado (firma las conexiones).
5. Redeploy. La marca pasa de «Pronto» a «Conectar».

## Qué trae cada reloj (un renglón por día)
Pasos, minutos de sueño, pulso en reposo, calorías activas, HRV y recuperación (lo que cada marca
comparta). Se actualiza al abrir el Dash, como mucho cada 3 horas.

## Garmin y Apple Watch
- **Garmin** solo da acceso a su API después de aprobar una solicitud en su programa de desarrolladores
  (Garmin Connect Developer Program). Cuando la aprueben, se agrega igual que las demás.
- **Apple Watch** guarda todo en Apple Salud, que solo se puede leer desde una app instalada desde la
  App Store (no desde una app web como esta). Las salidas son una app nativa pequeña o un servicio
  intermediario de pago (por ejemplo Terra o Vital).
