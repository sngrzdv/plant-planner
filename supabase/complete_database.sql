-- =============================================================================
-- Мой огород — ПОЛНЫЙ скрипт базы данных (PostgreSQL / Supabase)
-- Файл: supabase/complete_database.sql
-- =============================================================================
-- Содержит: таблицы, индексы, функции, триггеры, RLS, GRANT, Storage.
--
-- Таблицы:
--   roles, plant_categories, plants, plant_varieties, plant_companions,
--   fertilizers, plant_issues, profiles, layouts, beds, bed_elements,
--   pots, plants_on_beds, garden_journal, reminders, push_subscriptions,
--   user_plants, plant_submissions, plant_favorites
--
-- Storage buckets: garden-photos, plant-images, avatars
--
-- Как использовать (новый проект Supabase):
--   1. https://supabase.com → New project
--   2. SQL Editor → вставьте этот файл целиком → Run
--   3. Authentication → Providers → Email (включить)
--   4. В .env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
--   5. Зарегистрируйтесь в приложении, назначьте админа:
--        update public.profiles set role_id = 2 where email = 'ваш@email.com';
--
-- Для УЖЕ существующей БД используйте отдельные миграции из supabase/*.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Роли
-- -----------------------------------------------------------------------------
create table if not exists public.roles (
  id bigint generated always as identity primary key,
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

insert into public.roles (name, description)
values
  ('user', 'Обычный пользователь'),
  ('admin', 'Администратор каталога')
on conflict (name) do nothing;

-- -----------------------------------------------------------------------------
-- 2. Справочник растений
-- -----------------------------------------------------------------------------
create table if not exists public.plant_categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  icon text default '🌱',
  description text,
  is_system boolean default false,
  created_at timestamptz not null default now()
);

create table if not exists public.plants (
  id bigint generated always as identity primary key,
  name text not null,
  category_id bigint references public.plant_categories (id),
  scientific_name text,
  description text,
  scientific_facts text,
  watering_freq_days integer default 3,
  fertilizer_info text,
  maturation_days integer,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  external_id text,
  external_source text,
  days_to_transplant integer,
  days_to_harvest integer,
  sowing_depth double precision,
  plant_spacing integer,
  row_spacing integer,
  sun_requirement text,
  difficulty text,
  planting_method text default 'direct'
);

create table if not exists public.plant_varieties (
  id bigint generated always as identity primary key,
  plant_id bigint references public.plants (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.plant_companions (
  id bigint generated always as identity primary key,
  plant_id bigint references public.plants (id) on delete cascade,
  companion_id bigint references public.plants (id) on delete cascade,
  relationship text check (relationship in ('good', 'bad', 'neutral')),
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.fertilizers (
  id bigint generated always as identity primary key,
  plant_id bigint references public.plants (id) on delete cascade,
  name text not null,
  type text check (type in ('organic', 'mineral', 'complex')),
  application_stage text,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.plant_issues (
  id bigint generated always as identity primary key,
  plant_id bigint references public.plants (id) on delete cascade,
  name text not null,
  type text check (type in ('disease', 'pest', 'physiological')),
  symptoms text,
  treatment text,
  prevention text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 3. Профили
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role_id bigint default 1 references public.roles (id),
  notification_enabled boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  city text,
  is_blocked boolean default false,
  email_notifications_enabled boolean not null default false,
  lunar_enabled boolean not null default true,
  weather_alerts_enabled boolean not null default true,
  last_email_digest_sent_at timestamptz
);

-- -----------------------------------------------------------------------------
-- 4. Участки и грядки
-- -----------------------------------------------------------------------------
create table if not exists public.layouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Мой участок',
  description text,
  width integer not null default 10,
  height integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  location text,
  image_url text
);

create table if not exists public.beds (
  id uuid primary key default gen_random_uuid(),
  layout_id uuid references public.layouts (id) on delete cascade,
  name text not null default 'Новая грядка',
  pos_x integer not null,
  pos_y integer not null,
  width integer not null default 2,
  height integer not null default 2,
  color text default '#8B5A2B',
  soil_type text default 'Обычная',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  type text default 'rect' check (type in (
    'rect', 'circle', 'triangle', 'house', 'greenhouse',
    'tree', 'flowerbed', 'bush', 'path', 'pond'
  )),
  rotation integer default 0,
  soil_width integer default 500,
  soil_height integer default 400,
  plant_id bigint references public.plants (id)
);

create table if not exists public.bed_elements (
  id uuid primary key default gen_random_uuid(),
  bed_id uuid references public.beds (id) on delete cascade,
  type text check (type in ('row', 'plant_spot', 'path', 'border')),
  name text,
  pos_x integer default 0,
  pos_y integer default 0,
  width integer default 100,
  height integer default 30,
  color text default '#8B5A2B',
  plant_id bigint references public.plants (id),
  notes text,
  created_at timestamptz not null default now(),
  planted_year integer default extract(year from now())
);

-- -----------------------------------------------------------------------------
-- 5. Рассада, посадки, журнал, задачи
-- -----------------------------------------------------------------------------
create table if not exists public.pots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plant_id bigint references public.plants (id),
  custom_name text,
  sowing_date date default current_date,
  status text default 'growing' check (status in ('growing', 'transplanted', 'died')),
  transplanted_to_bed_id uuid references public.beds (id),
  transplanted_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plants_on_beds (
  id uuid primary key default gen_random_uuid(),
  bed_id uuid references public.beds (id) on delete cascade,
  plant_id bigint references public.plants (id),
  planted_date date default current_date,
  stage text default 'seedling' check (stage in ('seed', 'seedling', 'adult', 'harvesting', 'harvested')),
  source_type text check (source_type in ('pot', 'seed', 'seedling_direct')),
  source_pot_id uuid references public.pots (id),
  quantity integer default 1,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.garden_journal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plant_id bigint references public.plants (id),
  pot_id uuid references public.pots (id),
  action text,
  details text,
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text check (type in (
    'watering', 'fertilizing', 'transplant', 'lunar_planting',
    'lunar_watering', 'harvest', 'custom'
  )),
  title text not null,
  description text,
  plant_id bigint references public.plants (id),
  bed_id uuid references public.beds (id),
  pot_id uuid references public.pots (id),
  due_date date not null,
  due_time time,
  status text default 'pending' check (status in ('pending', 'completed', 'missed', 'cancelled')),
  priority text default 'normal' check (priority in ('low', 'normal', 'high')),
  source text check (source in ('lunar', 'science', 'user', 'system')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 6. Личные растения и заявки в каталог
-- -----------------------------------------------------------------------------
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

alter table public.garden_journal
  add column if not exists user_plant_id uuid references public.user_plants (id) on delete set null;

-- -----------------------------------------------------------------------------
-- 6b. Избранное в каталоге
-- -----------------------------------------------------------------------------
create table if not exists public.plant_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plant_id bigint not null references public.plants (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, plant_id)
);

-- -----------------------------------------------------------------------------
-- 7. Индексы
-- -----------------------------------------------------------------------------
create index if not exists idx_profiles_role_id on public.profiles (role_id);
create index if not exists idx_profiles_is_blocked on public.profiles (is_blocked);
create index if not exists idx_layouts_user_id on public.layouts (user_id);
create index if not exists idx_beds_layout_id on public.beds (layout_id);
create index if not exists idx_beds_plant_id on public.beds (plant_id);
create index if not exists idx_bed_elements_bed_id on public.bed_elements (bed_id);
create index if not exists idx_bed_elements_plant_id on public.bed_elements (plant_id);
create index if not exists idx_bed_elements_type on public.bed_elements (type);
create index if not exists idx_plants_on_beds_bed_id on public.plants_on_beds (bed_id);
create index if not exists idx_plants_on_beds_plant_id on public.plants_on_beds (plant_id);
create index if not exists idx_pots_user_id on public.pots (user_id);
create index if not exists idx_pots_user_status on public.pots (user_id, status);
create index if not exists idx_reminders_user_due_date on public.reminders (user_id, due_date);
create index if not exists idx_reminders_user_status on public.reminders (user_id, status);
create index if not exists idx_garden_journal_user_id on public.garden_journal (user_id);
create index if not exists idx_plants_category_id on public.plants (category_id);
create index if not exists idx_user_plants_user_id on public.user_plants (user_id);
create index if not exists idx_plant_submissions_user_status on public.plant_submissions (user_id, status);
create index if not exists idx_plant_submissions_pending on public.plant_submissions (status) where status = 'pending';
create index if not exists idx_plant_favorites_user on public.plant_favorites (user_id);
create index if not exists idx_plant_favorites_plant on public.plant_favorites (plant_id);

-- -----------------------------------------------------------------------------
-- 8. Функции и триггеры
-- -----------------------------------------------------------------------------
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

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    1
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.protect_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.is_admin(auth.uid()) then
    new.id := old.id;
    new.email := old.email;
    new.role_id := old.role_id;
    new.is_blocked := old.is_blocked;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_sensitive_fields on public.profiles;
create trigger protect_profile_sensitive_fields
  before update on public.profiles
  for each row execute function public.protect_profile_sensitive_fields();

-- -----------------------------------------------------------------------------
-- 9. RLS
-- -----------------------------------------------------------------------------
alter table public.roles enable row level security;
alter table public.profiles enable row level security;
alter table public.layouts enable row level security;
alter table public.beds enable row level security;
alter table public.bed_elements enable row level security;
alter table public.plants_on_beds enable row level security;
alter table public.pots enable row level security;
alter table public.reminders enable row level security;
alter table public.garden_journal enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.plants enable row level security;
alter table public.plant_categories enable row level security;
alter table public.plant_varieties enable row level security;
alter table public.plant_companions enable row level security;
alter table public.fertilizers enable row level security;
alter table public.plant_issues enable row level security;
alter table public.user_plants enable row level security;
alter table public.plant_submissions enable row level security;
alter table public.plant_favorites enable row level security;

-- profiles
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists profiles_insert_self_or_admin on public.profiles;
create policy profiles_insert_self_or_admin on public.profiles
  for insert to authenticated
  with check (
    public.is_admin(auth.uid())
    or (id = auth.uid() and coalesce(role_id, 1) = 1 and coalesce(is_blocked, false) = false)
  );

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin(auth.uid()))
  with check (id = auth.uid() or public.is_admin(auth.uid()));

-- roles
drop policy if exists roles_read_authenticated on public.roles;
create policy roles_read_authenticated on public.roles
  for select to authenticated using (true);

drop policy if exists roles_admin_write on public.roles;
create policy roles_admin_write on public.roles
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- layouts
drop policy if exists layouts_owner_all on public.layouts;
create policy layouts_owner_all on public.layouts
  for all to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));

-- beds (через layouts)
drop policy if exists beds_owner_all on public.beds;
create policy beds_owner_all on public.beds
  for all to authenticated
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.layouts l
      where l.id = beds.layout_id and l.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.layouts l
      where l.id = beds.layout_id and l.user_id = auth.uid()
    )
  );

-- bed_elements
drop policy if exists bed_elements_owner_all on public.bed_elements;
create policy bed_elements_owner_all on public.bed_elements
  for all to authenticated
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.beds b
      join public.layouts l on l.id = b.layout_id
      where b.id = bed_elements.bed_id and l.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.beds b
      join public.layouts l on l.id = b.layout_id
      where b.id = bed_elements.bed_id and l.user_id = auth.uid()
    )
  );

-- plants_on_beds
drop policy if exists plants_on_beds_owner_all on public.plants_on_beds;
create policy plants_on_beds_owner_all on public.plants_on_beds
  for all to authenticated
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.beds b
      join public.layouts l on l.id = b.layout_id
      where b.id = plants_on_beds.bed_id and l.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.beds b
      join public.layouts l on l.id = b.layout_id
      where b.id = plants_on_beds.bed_id and l.user_id = auth.uid()
    )
  );

-- user-owned tables
drop policy if exists pots_owner_all on public.pots;
create policy pots_owner_all on public.pots
  for all to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists reminders_owner_all on public.reminders;
create policy reminders_owner_all on public.reminders
  for all to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists garden_journal_owner_all on public.garden_journal;
create policy garden_journal_owner_all on public.garden_journal
  for all to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists push_subscriptions_owner_all on public.push_subscriptions;
create policy push_subscriptions_owner_all on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));

-- справочники: чтение всем, запись админу
drop policy if exists plants_read on public.plants;
create policy plants_read on public.plants
  for select to authenticated using (true);

drop policy if exists plants_admin_write on public.plants;
create policy plants_admin_write on public.plants
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists plant_categories_read on public.plant_categories;
create policy plant_categories_read on public.plant_categories
  for select to authenticated using (true);

drop policy if exists plant_categories_admin_write on public.plant_categories;
create policy plant_categories_admin_write on public.plant_categories
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists plant_varieties_read on public.plant_varieties;
create policy plant_varieties_read on public.plant_varieties
  for select to authenticated using (true);

drop policy if exists plant_varieties_admin_write on public.plant_varieties;
create policy plant_varieties_admin_write on public.plant_varieties
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists plant_companions_read on public.plant_companions;
create policy plant_companions_read on public.plant_companions
  for select to authenticated using (true);

drop policy if exists plant_companions_admin_write on public.plant_companions;
create policy plant_companions_admin_write on public.plant_companions
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists fertilizers_read on public.fertilizers;
create policy fertilizers_read on public.fertilizers
  for select to authenticated using (true);

drop policy if exists fertilizers_admin_write on public.fertilizers;
create policy fertilizers_admin_write on public.fertilizers
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists plant_issues_read on public.plant_issues;
create policy plant_issues_read on public.plant_issues
  for select to authenticated using (true);

drop policy if exists plant_issues_admin_write on public.plant_issues;
create policy plant_issues_admin_write on public.plant_issues
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- user_plants
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

-- plant_submissions
drop policy if exists plant_submissions_select_own on public.plant_submissions;
create policy plant_submissions_select_own on public.plant_submissions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists plant_submissions_insert_own on public.plant_submissions;
create policy plant_submissions_insert_own on public.plant_submissions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists plant_submissions_admin_select on public.plant_submissions;
create policy plant_submissions_admin_select on public.plant_submissions
  for select to authenticated using (public.is_admin(auth.uid()));

drop policy if exists plant_submissions_admin_update on public.plant_submissions;
create policy plant_submissions_admin_update on public.plant_submissions
  for update to authenticated using (public.is_admin(auth.uid()));

-- plant_favorites
drop policy if exists plant_favorites_select_own on public.plant_favorites;
create policy plant_favorites_select_own on public.plant_favorites
  for select to authenticated using (user_id = auth.uid());

drop policy if exists plant_favorites_insert_own on public.plant_favorites;
create policy plant_favorites_insert_own on public.plant_favorites
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists plant_favorites_delete_own on public.plant_favorites;
create policy plant_favorites_delete_own on public.plant_favorites
  for delete to authenticated using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 10. Права (GRANT)
-- -----------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select on table public.roles to authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.layouts to authenticated;
grant select, insert, update, delete on table public.beds to authenticated;
grant select, insert, update, delete on table public.bed_elements to authenticated;
grant select, insert, update, delete on table public.plants_on_beds to authenticated;
grant select, insert, update, delete on table public.pots to authenticated;
grant select, insert, update, delete on table public.reminders to authenticated;
grant select, insert, update, delete on table public.garden_journal to authenticated;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;
-- RLS ограничивает запись справочников только админом (is_admin)
grant select, insert, update, delete on table public.plants to authenticated;
grant select, insert, update, delete on table public.plant_categories to authenticated;
grant select, insert, update, delete on table public.plant_varieties to authenticated;
grant select, insert, update, delete on table public.plant_companions to authenticated;
grant select, insert, update, delete on table public.fertilizers to authenticated;
grant select, insert, update, delete on table public.plant_issues to authenticated;
grant select, insert, update, delete on table public.user_plants to authenticated;
grant select, insert, update on table public.plant_submissions to authenticated;
grant select, insert, delete on table public.plant_favorites to authenticated;

-- -----------------------------------------------------------------------------
-- 11. Storage (фото участков, растений, аватары)
-- allowed_mime_types = null — иначе браузер может слать application/octet-stream
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('garden-photos', 'garden-photos', true, 5242880, null)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('plant-images', 'plant-images', true, 5242880, null)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, null)
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = null;

drop policy if exists garden_photos_public_read on storage.objects;
create policy garden_photos_public_read on storage.objects
  for select to public using (bucket_id = 'garden-photos');

drop policy if exists garden_photos_auth_insert on storage.objects;
create policy garden_photos_auth_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'garden-photos');

drop policy if exists garden_photos_auth_update on storage.objects;
create policy garden_photos_auth_update on storage.objects
  for update to authenticated using (bucket_id = 'garden-photos');

drop policy if exists garden_photos_auth_delete on storage.objects;
create policy garden_photos_auth_delete on storage.objects
  for delete to authenticated using (bucket_id = 'garden-photos');

drop policy if exists plant_images_public_read on storage.objects;
create policy plant_images_public_read on storage.objects
  for select to public using (bucket_id = 'plant-images');

drop policy if exists plant_images_auth_insert on storage.objects;
create policy plant_images_auth_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'plant-images');

drop policy if exists plant_images_auth_update on storage.objects;
create policy plant_images_auth_update on storage.objects
  for update to authenticated using (bucket_id = 'plant-images');

drop policy if exists plant_images_auth_delete on storage.objects;
create policy plant_images_auth_delete on storage.objects
  for delete to authenticated using (bucket_id = 'plant-images');

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
  for select to public using (bucket_id = 'avatars');

drop policy if exists avatars_auth_insert on storage.objects;
create policy avatars_auth_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_auth_update on storage.objects;
create policy avatars_auth_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_auth_delete on storage.objects;
create policy avatars_auth_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- 12. Начальные категории (опционально)
-- -----------------------------------------------------------------------------
insert into public.plant_categories (name, icon, is_system)
values
  ('Овощи', '🥕', true),
  ('Зелень', '🥬', true),
  ('Ягоды', '🫐', true),
  ('Цветы', '🌸', true),
  ('Травы', '🌿', true)
on conflict (name) do nothing;

-- =============================================================================
-- После регистрации первого пользователя:
--   update public.profiles set role_id = 2 where email = 'ваш@email.com';
-- Проверка:
--   select email, role_id, public.is_admin(id) from public.profiles;
-- =============================================================================
