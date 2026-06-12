-- Расширения для дневника, посадок и справочников админки.
-- Выполните в Supabase SQL Editor.

alter table public.pots
  add column if not exists user_plant_id uuid references public.user_plants (id) on delete set null;

alter table public.bed_elements
  add column if not exists user_plant_id uuid references public.user_plants (id) on delete set null;

alter table public.plants_on_beds
  add column if not exists user_plant_id uuid references public.user_plants (id) on delete set null;

alter table public.fertilizers
  alter column plant_id drop not null;

alter table public.fertilizers
  add column if not exists source_id bigint references public.fertilizers (id) on delete set null;

alter table public.plant_issues
  alter column plant_id drop not null;

alter table public.plant_issues
  add column if not exists source_id bigint references public.plant_issues (id) on delete set null;
