-- Supabase Dashboard → SQL Editor → Run
-- Полный сброс политик и права на таблицу reminders

grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.reminders to authenticated;

alter table public.reminders enable row level security;

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'reminders'
  loop
    execute format('drop policy if exists %I on public.reminders', pol.policyname);
  end loop;
end $$;

create policy reminders_select_own on public.reminders
  for select to authenticated
  using (user_id = auth.uid());

create policy reminders_insert_own on public.reminders
  for insert to authenticated
  with check (user_id = auth.uid());

create policy reminders_update_own on public.reminders
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy reminders_delete_own on public.reminders
  for delete to authenticated
  using (user_id = auth.uid());

-- Индекс ускоряет загрузку списка задач
create index if not exists reminders_user_due_date_idx
  on public.reminders (user_id, due_date);
