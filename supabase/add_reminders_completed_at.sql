-- Supabase Dashboard → SQL Editor → Run
-- Добавляет completed_at, если таблица reminders создана без этого поля

alter table public.reminders
  add column if not exists completed_at timestamptz;
