-- Удаление своего аккаунта из приложения (Профиль → Опасная зона).
-- Выполните в Supabase → SQL Editor → Run (один раз на проект).

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Необходима авторизация';
  end if;

  -- Каскад по FK удалит profiles, layouts, pots, reminders и т.д.
  delete from auth.users where id = uid;

  if not found then
    raise exception 'Пользователь не найден';
  end if;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

-- Обновить кэш API Supabase (иначе RPC может не находиться несколько минут)
notify pgrst, 'reload schema';

-- Проверка (должна вернуть одну строку):
-- select routine_name from information_schema.routines
-- where routine_schema = 'public' and routine_name = 'delete_own_account';
