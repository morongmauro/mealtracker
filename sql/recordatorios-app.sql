-- ════════════════════════════════════════════════════════════════════════
-- LOS RECORDATORIOS QUE LE SALEN A CADA CLIENTE EN SU APP
-- ════════════════════════════════════════════════════════════════════════
-- Dónde: Supabase de la APP (el mismo donde está `user_data`) → SQL Editor
-- → pegar todo → Run. Se puede correr dos veces: la segunda no cambia nada.
--
-- Solo CREA una tabla nueva. No toca ninguna tabla existente, no borra nada.
-- La escribe la app (api/recordatorios, con la service key) cada vez que
-- cambia lo que le muestra el Dash, y la lee el CRM en Seguimiento
-- (api/coach-data.js?action=recordatorios): qué le sale, desde cuándo,
-- cuántos días le apareció en pantalla, si lo tocó y si lo hizo.
-- ════════════════════════════════════════════════════════════════════════
create table if not exists app_recordatorios (
  id            bigserial primary key,
  clave         text not null,      -- su cuenta (user_id) o «n:<nombre>» si aún no tiene
  name          text,
  user_id       uuid,
  rec_id        text not null,      -- qué recordatorio (los de «Hoy» llevan la fecha: hoy-rutina@2026-10-24)
  tipo          text,               -- hoy · coach · app
  texto         text,
  primera_vez   timestamptz not null default now(),
  ultima_vez    timestamptz not null default now(),
  ultimo_dia    date,               -- último día que estuvo en su lista
  dias_lista    int not null default 1,   -- días distintos que estuvo en su lista
  dias_pantalla int not null default 0,   -- días distintos que le apareció en pantalla (no escondido en «Ver todo»)
  ultimo_pantalla date,
  toques        int not null default 0,   -- veces que lo tocó
  ultimo_toque  timestamptz,
  hecho_en      timestamptz,        -- cuando lo marcó o lo hizo
  unique (clave, rec_id)
);
create index if not exists app_recordatorios_clave_idx on app_recordatorios (clave, ultima_vez desc);
-- Solo la API (service key) lee y escribe: con RLS y sin políticas, la anon key no ve nada.
alter table app_recordatorios enable row level security;
