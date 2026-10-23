-- ═══════════════════════════════════════════════════════════════════════
-- FOTOS DE PROGRESO · aceptar la pose «Otra»
-- ═══════════════════════════════════════════════════════════════════════
-- Dónde: Supabase del CRM → SQL Editor → pegar todo → Run. Se puede correr
-- dos veces. NO toca ni borra ninguna foto ni ninguna fila: solo cambia la
-- regla de la columna `pose` para que, además de frente / lado / espalda,
-- acepte 'otra' (la pestaña «Otra» de la app). Las fotos que ya existen
-- cumplen la regla nueva, así que no se modifica nada de lo guardado.
-- ═══════════════════════════════════════════════════════════════════════

do $$
declare r record;
begin
  -- La regla vieja (frente/lado/espalda) se reemplaza por la nueva solo si
  -- todavía no acepta 'otra'.
  for r in
    select conname from pg_constraint
    where conrelid = 'public.fotos_progreso'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%pose%' and pg_get_constraintdef(oid) not ilike '%otra%'
  loop
    execute format('alter table public.fotos_progreso drop constraint %I', r.conname);
  end loop;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.fotos_progreso'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%otra%'
  ) then
    alter table public.fotos_progreso
      add constraint fotos_progreso_pose_check check (pose in ('frente', 'lado', 'espalda', 'otra'));
  end if;
end $$;

-- Para comprobar: debe salir la regla con 'otra' incluida y el número de
-- fotos que ya tenías (igual que antes de correrlo).
select pg_get_constraintdef(oid) as regla_pose,
       (select count(*) from public.fotos_progreso) as fotos
from pg_constraint
where conrelid = 'public.fotos_progreso'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%pose%';
