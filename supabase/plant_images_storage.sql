-- Supabase Dashboard → SQL Editor → Run
-- Bucket для фото растений (public read, upload для авторизованных)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'plant-images',
  'plant-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists plant_images_public_read on storage.objects;
create policy plant_images_public_read on storage.objects
  for select to public
  using (bucket_id = 'plant-images');

drop policy if exists plant_images_auth_insert on storage.objects;
create policy plant_images_auth_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'plant-images');

drop policy if exists plant_images_auth_update on storage.objects;
create policy plant_images_auth_update on storage.objects
  for update to authenticated
  using (bucket_id = 'plant-images');

drop policy if exists plant_images_auth_delete on storage.objects;
create policy plant_images_auth_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'plant-images');
