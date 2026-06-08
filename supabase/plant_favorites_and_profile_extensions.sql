-- Supabase Dashboard → SQL Editor → Run
-- Избранное, email-уведомления, prefs садоводства, bucket для аватаров

-- -----------------------------------------------------------------------------
-- 1. Избранное (каталог)
-- -----------------------------------------------------------------------------
create table if not exists public.plant_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plant_id bigint not null references public.plants (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, plant_id)
);

create index if not exists idx_plant_favorites_user on public.plant_favorites (user_id);
create index if not exists idx_plant_favorites_plant on public.plant_favorites (plant_id);

alter table public.plant_favorites enable row level security;

drop policy if exists plant_favorites_select_own on public.plant_favorites;
create policy plant_favorites_select_own on public.plant_favorites
  for select to authenticated using (user_id = auth.uid());

drop policy if exists plant_favorites_insert_own on public.plant_favorites;
create policy plant_favorites_insert_own on public.plant_favorites
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists plant_favorites_delete_own on public.plant_favorites;
create policy plant_favorites_delete_own on public.plant_favorites
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, delete on public.plant_favorites to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Email-уведомления в профиле
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists email_notifications_enabled boolean not null default false;

alter table public.profiles
  add column if not exists lunar_enabled boolean not null default true;

alter table public.profiles
  add column if not exists weather_alerts_enabled boolean not null default true;

alter table public.profiles
  add column if not exists last_email_digest_sent_at timestamptz;

-- -----------------------------------------------------------------------------
-- 3. Storage: avatars (public read, write only own folder user_id/*)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, null)
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = null;

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
