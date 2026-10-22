-- ═══════════════════════════════════════════════════════════════════════
-- FOTOS DE PROGRESO · tabla + carpeta privada de fotos
-- ═══════════════════════════════════════════════════════════════════════
-- Dónde: Supabase del CRM → SQL Editor → pegar todo → Run. Se puede correr
-- dos veces. Solo CREA cosas nuevas: una tabla, una carpeta (bucket) de
-- fotos PRIVADA y los permisos para que el coach las vea desde el CRM. No
-- toca ninguna tabla existente y no borra nada.
--
-- Privacidad: el bucket es privado (nadie abre una foto por URL). La app y
-- el CRM piden enlaces firmados que caducan en 5 minutos. Cada cliente
-- guarda en su propia carpeta (<cliente_id>/...).
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists fotos_progreso (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users,      -- el coach (dueño en el CRM)
  cliente_id  text not null,
  fecha       date not null,
  pose        text not null default 'frente' check (pose in ('frente', 'lado', 'espalda')),
  ruta        text not null,                    -- <cliente_id>/<archivo> dentro del bucket
  peso_kg     numeric,
  nota        text,
  created_at  timestamptz not null default now()
);
create index if not exists fotos_progreso_cliente_idx on fotos_progreso (cliente_id, fecha desc);
alter table fotos_progreso enable row level security;

-- El coach ve (y puede borrar) las fotos de sus clientes desde el CRM. La
-- app del cliente entra por la API con la llave del servidor, no por aquí.
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'fotos_progreso' and policyname = 'own fotos_progreso') then
    create policy "own fotos_progreso" on fotos_progreso for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- La carpeta de fotos, PRIVADA (public = false). Si ya existe, no se toca.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progreso', 'progreso', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

-- El coach, entrado al CRM, puede pedir enlaces firmados de esas fotos.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'coach lee progreso') then
    create policy "coach lee progreso" on storage.objects for select to authenticated using (bucket_id = 'progreso');
  end if;
end $$;

-- Para comprobar: la tabla existe (0 fotos al principio) y el bucket es privado.
select (select count(*) from fotos_progreso) as fotos,
       (select public from storage.buckets where id = 'progreso') as bucket_publico;
