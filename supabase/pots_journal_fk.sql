-- При удалении рассады: отвязать журнал и связанные записи (не блокировать DELETE).
-- Выполните в Supabase SQL Editor, если удаление рассады падает с garden_journal_pot_id_fkey.

alter table public.garden_journal
  drop constraint if exists garden_journal_pot_id_fkey;

alter table public.garden_journal
  add constraint garden_journal_pot_id_fkey
  foreign key (pot_id) references public.pots (id) on delete set null;

alter table public.reminders
  drop constraint if exists reminders_pot_id_fkey;

alter table public.reminders
  add constraint reminders_pot_id_fkey
  foreign key (pot_id) references public.pots (id) on delete set null;

alter table public.plants_on_beds
  drop constraint if exists plants_on_beds_source_pot_id_fkey;

alter table public.plants_on_beds
  add constraint plants_on_beds_source_pot_id_fkey
  foreign key (source_pot_id) references public.pots (id) on delete set null;
