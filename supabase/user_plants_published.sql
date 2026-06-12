-- Публикация растений из заявок в личный дневник.
-- Выполните в Supabase SQL Editor после user_plants_extensions.sql.

alter table public.user_plants
  add column if not exists catalog_plant_id bigint references public.plants (id) on delete set null;

alter table public.user_plants
  add column if not exists published_at timestamptz;

alter table public.user_plants
  add column if not exists source_submission_id uuid references public.plant_submissions (id) on delete set null;

create unique index if not exists idx_user_plants_source_submission
  on public.user_plants (source_submission_id)
  where source_submission_id is not null;

create index if not exists idx_user_plants_catalog_plant
  on public.user_plants (catalog_plant_id)
  where catalog_plant_id is not null;

-- Админ может добавлять/обновлять записи дневника при одобрении заявок
drop policy if exists user_plants_admin_insert on public.user_plants;
create policy user_plants_admin_insert on public.user_plants
  for insert to authenticated
  with check (public.is_admin(auth.uid()));

drop policy if exists user_plants_admin_update on public.user_plants;
create policy user_plants_admin_update on public.user_plants
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists user_plants_admin_select on public.user_plants;
create policy user_plants_admin_select on public.user_plants
  for select to authenticated
  using (public.is_admin(auth.uid()));
