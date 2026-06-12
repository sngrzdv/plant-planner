-- Статус «В работе» для заявок на модерации.
-- Выполните в Supabase SQL Editor.

alter table public.plant_submissions
  drop constraint if exists plant_submissions_status_check;

alter table public.plant_submissions
  add constraint plant_submissions_status_check
  check (status in ('pending', 'in_review', 'approved', 'rejected'));

notify pgrst, 'reload schema';
