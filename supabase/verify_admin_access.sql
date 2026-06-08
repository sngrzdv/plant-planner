-- Диагностика: почему админка не может добавить категорию
-- Замените email на свой и выполните в SQL Editor

select
  p.id,
  p.email,
  p.role_id,
  public.is_admin(p.id) as is_admin_check
from public.profiles p
where p.email = 'ваш@email.com';

-- Политики на plant_categories (должна быть plant_categories_admin_write или аналог)
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'plant_categories';

-- Сигнатура is_admin (если admin_catalog_rls.sql падает с 42P13 — сравните с этим)
select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args,
  pg_get_function_result(p.oid) as result_type,
  pg_get_functiondef(p.oid) as full_definition
from pg_proc p
join pg_namespace n on p.pronamespace = n.oid
where n.nspname = 'public' and p.proname = 'is_admin';
