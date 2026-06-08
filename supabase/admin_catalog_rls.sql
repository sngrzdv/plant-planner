-- Supabase Dashboard → SQL Editor → Run
-- БЕЗОПАСНЫЙ скрипт: НЕ удаляет is_admin(uuid) — у вас уже есть политики на ней.
-- Исправляет проверку админа (role_id = 2) и выдаёт права на таблицы.

grant usage on schema public to authenticated;

-- В БД функция уже с default у аргумента (часто auth.uid()). Без default — ошибка 42P13.
-- CREATE OR REPLACE не удаляет функцию и не ломает политики на is_admin(uuid).
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
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;

-- Права на справочники (политики plant_*_admin_write у вас уже могут существовать)
grant select, insert, update, delete on table public.plant_categories to authenticated;
grant select, insert, update, delete on table public.plants to authenticated;
grant select, insert, update, delete on table public.fertilizers to authenticated;
grant select, insert, update, delete on table public.plant_issues to authenticated;
grant select, update on table public.profiles to authenticated;

-- ========== Проверка: выполните после скрипта (подставьте свой email) ==========
-- select id, email, role_id from public.profiles where email = 'ваш@email.com';
-- select public.is_admin(id) as am_i_admin from public.profiles where email = 'ваш@email.com';

-- Если am_i_admin = false, назначьте админа:
-- update public.profiles set role_id = 2 where email = 'ваш@email.com';
