-- Supabase Dashboard → SQL Editor → Run
-- Починить image_url после бага с двойным /supabase в URL

update public.plants
set image_url = regexp_replace(image_url, '/supabase/supabase/', '/supabase/', 'g')
where image_url like '%/supabase/supabase/%';

update public.layouts
set image_url = regexp_replace(image_url, '/supabase/supabase/', '/supabase/', 'g')
where image_url like '%/supabase/supabase/%';

update public.user_plants
set image_url = regexp_replace(image_url, '/supabase/supabase/', '/supabase/', 'g')
where image_url like '%/supabase/supabase/%';

-- Привести proxy-URL к каноническому supabase.co (подставьте свой project ref при необходимости)
update public.plants
set image_url = regexp_replace(
  image_url,
  '^https://[^/]+/supabase(/storage/v1/object/public/.+)$',
  'https://ecpupjrfqitnqkcwcrqa.supabase.co\1'
)
where image_url like '%/supabase/storage/v1/object/public/%'
  and image_url not like '%supabase.co/storage%';

update public.layouts
set image_url = regexp_replace(
  image_url,
  '^https://[^/]+/supabase(/storage/v1/object/public/.+)$',
  'https://ecpupjrfqitnqkcwcrqa.supabase.co\1'
)
where image_url like '%/supabase/storage/v1/object/public/%'
  and image_url not like '%supabase.co/storage%';
