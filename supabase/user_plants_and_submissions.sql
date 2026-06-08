-- Supabase Dashboard → SQL Editor → Run
-- Личные растения пользователя и заявки на добавление в общий каталог

-- Личный дневник: растения, которые видит только автор
create table if not exists public.user_plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  scientific_name text,
  category_id bigint references public.plant_categories (id),
  description text,
  scientific_facts text,
  personal_notes text,
  watering_freq_days int not null default 3,
  maturation_days int not null default 60,
  planting_method text not null default 'direct',
  days_to_transplant int not null default 0,
  days_to_harvest int not null default 60,
  difficulty text default 'Легко',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Заявка на публикацию в общий каталог (модерация админом)
create table if not exists public.plant_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  admin_comment text,
  reviewed_at timestamptz,
  name text not null,
  scientific_name text,
  category_id bigint references public.plant_categories (id),
  description text,
  scientific_facts text,
  watering_freq_days int not null default 3,
  maturation_days int not null default 60,
  planting_method text not null default 'direct',
  days_to_transplant int not null default 0,
  days_to_harvest int not null default 60,
  difficulty text default 'Легко',
  image_url text,
  created_at timestamptz not null default now()
);

-- Связь журнала с личным растением (plant_id может быть null)
alter table public.garden_journal
  add column if not exists user_plant_id uuid references public.user_plants (id) on delete set null;

create index if not exists user_plants_user_id_idx on public.user_plants (user_id);
create index if not exists plant_submissions_user_status_idx on public.plant_submissions (user_id, status);
create index if not exists plant_submissions_pending_idx on public.plant_submissions (status) where status = 'pending';

alter table public.user_plants enable row level security;
alter table public.plant_submissions enable row level security;

-- user_plants: только свои записи
drop policy if exists user_plants_select_own on public.user_plants;
create policy user_plants_select_own on public.user_plants
  for select to authenticated using (user_id = auth.uid());

drop policy if exists user_plants_insert_own on public.user_plants;
create policy user_plants_insert_own on public.user_plants
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists user_plants_update_own on public.user_plants;
create policy user_plants_update_own on public.user_plants
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists user_plants_delete_own on public.user_plants;
create policy user_plants_delete_own on public.user_plants
  for delete to authenticated using (user_id = auth.uid());

-- plant_submissions: пользователь видит и создаёт свои
drop policy if exists plant_submissions_select_own on public.plant_submissions;
create policy plant_submissions_select_own on public.plant_submissions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists plant_submissions_insert_own on public.plant_submissions;
create policy plant_submissions_insert_own on public.plant_submissions
  for insert to authenticated with check (user_id = auth.uid());

-- Админ: та же функция is_admin(uuid), что и для layouts / plant_categories
drop policy if exists plant_submissions_admin_select on public.plant_submissions;
create policy plant_submissions_admin_select on public.plant_submissions
  for select to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists plant_submissions_admin_update on public.plant_submissions;
create policy plant_submissions_admin_update on public.plant_submissions
  for update to authenticated
  using (public.is_admin(auth.uid()));

grant select, insert, update, delete on public.user_plants to authenticated;
grant select, insert, update on public.plant_submissions to authenticated;
