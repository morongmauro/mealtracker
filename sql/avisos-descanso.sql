-- ════════════════════════════════════════════════════════════════════════
-- ALARMA DEL DESCANSO CON LA APP MINIMIZADA
-- ════════════════════════════════════════════════════════════════════════
-- Dónde: Supabase de la APP (el mismo donde están `user_data` y `push_subs`)
-- → SQL Editor → pegar todo → Run. Se puede correr dos veces: la segunda no
-- duplica nada.
--
-- Qué hace: cuando el cliente minimiza la app con un descanso corriendo, la
-- app deja aquí «avísale a las 10:42:30». Cada 10 segundos la base revisa si
-- hay alguno que ya toca y, SOLO si hay, llama a la app para que mande la
-- notificación al teléfono («Descanso listo»). Si el cliente vuelve antes o
-- salta el descanso, el aviso queda cancelado y no llega.
--
-- Solo CREA cosas nuevas (una tabla, una función y una tarea cada 10 s). No
-- toca ninguna tabla existente y no borra nada.
--
-- Antes de correrlo: Supabase → Database → Extensions → activa «pg_cron» y
-- «pg_net» (si ya están activas, no hagas nada).
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists avisos_descanso (
  id          text primary key,            -- lo pone la app (uno por descanso)
  name        text not null,               -- el cliente (su nombre en la app)
  cuando      timestamptz not null,        -- cuándo termina el descanso
  titulo      text,                        -- «Descanso listo» o «Tiempo cumplido»
  cuerpo      text,                        -- «A la siguiente serie.»
  cancelado   boolean not null default false,
  enviado_en  timestamptz,
  creado_at   timestamptz not null default now()
);
alter table avisos_descanso add column if not exists titulo text;
create index if not exists avisos_descanso_pendientes_idx on avisos_descanso (cuando) where enviado_en is null and not cancelado;
-- Solo la API (service key) lee y escribe: con RLS y sin políticas, la anon key no ve nada.
alter table avisos_descanso enable row level security;

-- Si hay algún aviso que ya toca, llama a la app para que lo mande.
create or replace function avisar_descansos() returns void
language plpgsql security definer as $fn$
begin
  if exists (select 1 from avisos_descanso
              where enviado_en is null and not cancelado
                and cuando <= now() + interval '3 seconds'
                and cuando >= now() - interval '3 minutes') then
    perform net.http_get('https://entrenaconmetodoapp.vercel.app/api/push-cron?descanso=enviar');
  end if;
end $fn$;

-- La tarea, cada 10 segundos (si ya existía, se reemplaza).
select cron.unschedule('avisos-descanso') where exists (select 1 from cron.job where jobname = 'avisos-descanso');
select cron.schedule('avisos-descanso', '10 seconds', 'select avisar_descansos()');

-- Para comprobar que quedó: debe salir una fila con «10 seconds».
select jobname, schedule, active from cron.job where jobname = 'avisos-descanso';
