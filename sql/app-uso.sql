-- ════════════════════════════════════════════════════════════════════════
-- QUÉ ABRE CADA CLIENTE EN SU APP, DÍA POR DÍA
-- ════════════════════════════════════════════════════════════════════════
-- Dónde: Supabase de la APP (el mismo donde está `user_data`) → SQL Editor
-- → pegar todo → Run. Se puede correr dos veces: la segunda no cambia nada.
--
-- Solo CREA una tabla nueva. No toca ninguna tabla existente, no borra nada.
-- La escribe la app (api/uso, con la service key): una fila por cliente y
-- por día con las secciones que abrió (Dash, Entreno, Comida, Recetas,
-- Aprende, Comunidad, Chat) y las recetas que abrió. La lee el CRM en
-- Enganche (api/coach-data.js?action=uso).
-- ════════════════════════════════════════════════════════════════════════
create table if not exists app_uso (
  id         bigserial primary key,
  clave      text not null,                    -- su cuenta (user_id) o «n:<nombre>» si aún no tiene
  name       text,
  user_id    uuid,
  fecha      date not null,                    -- el día en su teléfono
  secciones  jsonb not null default '{}',      -- { "entreno": 1, "recetas": 1, … } lo que abrió ese día
  recetas    jsonb not null default '[]',      -- nombres de las recetas que abrió ese día
  primera    timestamptz not null default now(),
  ultima     timestamptz not null default now(),
  unique (clave, fecha)
);
create index if not exists app_uso_fecha_idx on app_uso (fecha desc);
-- Solo la API (service key) lee y escribe: con RLS y sin políticas, la anon key no ve nada.
alter table app_uso enable row level security;
