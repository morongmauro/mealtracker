-- ════════════════════════════════════════════════════════════════════════
-- BITÁCORA DE ERRORES DE LA APP (lo que le falla al cliente en su teléfono)
-- ════════════════════════════════════════════════════════════════════════
-- Dónde: Supabase de la APP (el mismo donde está `user_data`) → SQL Editor
-- → pegar todo → Run. Se puede correr dos veces: la segunda no cambia nada.
--
-- Solo CREA una tabla nueva. No toca ninguna tabla existente, no borra nada.
-- La escribe la app (api/bitacora.js, con la service key) y la lee el CRM en
-- la ficha de cada cliente (api/coach-data.js?action=errores).
-- ════════════════════════════════════════════════════════════════════════
create table if not exists app_errores (
  id         bigserial primary key,
  creado_at  timestamptz not null default now(),
  name       text,          -- el cliente (su nombre en la app)
  user_id    uuid,          -- su cuenta en la nube, si la tiene
  tipo       text,          -- error · promesa · api · red · pantalla
  mensaje    text,
  detalle    text,          -- la pila del error, recortada
  pantalla   text,          -- dónde estaba (Dash, Entreno › Hoy, Comida › Chat…)
  url        text,
  ua         text,          -- el teléfono y navegador
  version    text           -- qué versión de la app corría
);
create index if not exists app_errores_user_idx on app_errores (user_id, creado_at desc);
create index if not exists app_errores_name_idx on app_errores (name, creado_at desc);
-- Solo la API (service key) lee y escribe: con RLS y sin políticas, la anon key no ve nada.
alter table app_errores enable row level security;
