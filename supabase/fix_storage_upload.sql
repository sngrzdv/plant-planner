-- Supabase Dashboard → SQL Editor → Run
-- Исправляет «Нет прав на загрузку» для plant-images и garden-photos.

-- Сброс ВСЕХ политик storage.objects (старые шаблоны часто требуют папку user_id/)
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
  loop
    execute format('drop policy if exists %I on storage.objects', pol.policyname);
  end loop;
end $$;

-- Бакеты: public read, без жёсткого MIME (иначе браузер шлёт application/octet-stream)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'plant-images',
  'plant-images',
  true,
  5242880,
  null
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'garden-photos',
  'garden-photos',
  true,
  5242880,
  null
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = null;

-- Удалить дубликаты имён (если цикл выше не сработал)
drop policy if exists plant_images_public_read on storage.objects;
drop policy if exists plant_images_auth_insert on storage.objects;
drop policy if exists plant_images_auth_update on storage.objects;
drop policy if exists plant_images_auth_delete on storage.objects;
drop policy if exists garden_photos_public_read on storage.objects;
drop policy if exists garden_photos_auth_insert on storage.objects;
drop policy if exists garden_photos_auth_update on storage.objects;
drop policy if exists garden_photos_auth_delete on storage.objects;

-- Чтение (публичные бакеты)
create policy plant_images_public_read on storage.objects
  for select to public
  using (bucket_id = 'plant-images');

create policy garden_photos_public_read on storage.objects
  for select to public
  using (bucket_id = 'garden-photos');

-- Загрузка / изменение / удаление — любой авторизованный пользователь
create policy plant_images_auth_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'plant-images');

create policy plant_images_auth_update on storage.objects
  for update to authenticated
  using (bucket_id = 'plant-images')
  with check (bucket_id = 'plant-images');

create policy plant_images_auth_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'plant-images');

create policy garden_photos_auth_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'garden-photos');

create policy garden_photos_auth_update on storage.objects
  for update to authenticated
  using (bucket_id = 'garden-photos')
  with check (bucket_id = 'garden-photos');

create policy garden_photos_auth_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'garden-photos');

-- Проверка (должно быть 8 политик с plant_ / garden_ в имени):
-- select policyname, cmd, roles from pg_policies
-- where schemaname = 'storage' and tablename = 'objects'
--   and policyname like '%plant%' or policyname like '%garden%'
-- order by policyname;
