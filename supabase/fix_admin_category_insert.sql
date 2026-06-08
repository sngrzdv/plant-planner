-- Supabase Dashboard → SQL Editor → Run
-- Исправляет «Доступ запрещён» при добавлении категории админом.
-- Безопасно: не удаляет is_admin(uuid), только обновляет функцию и политики.

grant usage on schema public to authenticated;

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = check_user_id
      and p.role_id = 2
      and coalesce(p.is_blocked, false) = false
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;

-- Права на таблицу (без GRANT RLS всё равно вернёт 42501)
grant select, insert, update, delete on table public.plant_categories to authenticated;
grant select, insert, update, delete on table public.plants to authenticated;
grant select, insert, update, delete on table public.fertilizers to authenticated;
grant select, insert, update, delete on table public.plant_issues to authenticated;
grant select, insert, update, delete on table public.plant_varieties to authenticated;
grant select, insert, update, delete on table public.plant_companions to authenticated;

alter table public.plant_categories enable row level security;

drop policy if exists plant_categories_read on public.plant_categories;
create policy plant_categories_read on public.plant_categories
  for select to authenticated
  using (true);

drop policy if exists plant_categories_admin_write on public.plant_categories;
create policy plant_categories_admin_write on public.plant_categories
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Проверка (подставьте email admin@gmail.com):
-- select id, email, role_id, is_blocked, public.is_admin(id) from public.profiles where email = 'admin@gmail.com';
