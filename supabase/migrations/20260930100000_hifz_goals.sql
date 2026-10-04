create table if not exists public.hifz_goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goal_id text not null,
  goal_type text not null default 'full_quran' check (goal_type in ('full_quran', 'surah', 'juz', 'selected_ayahs', 'revision')),
  target_juz smallint check (target_juz between 1 and 30),
  start_surah smallint not null check (start_surah between 1 and 114),
  start_ayah smallint not null check (start_ayah > 0),
  end_surah smallint check (end_surah between 1 and 114),
  end_ayah smallint check (end_ayah > 0),
  daily_ayah_target smallint not null check (daily_ayah_target between 1 and 100),
  daily_minutes smallint not null default 20 check (daily_minutes between 1 and 1440),
  study_days smallint[] not null default array[1, 2, 3, 4, 5, 6]::smallint[]
    check (cardinality(study_days) between 1 and 7 and study_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  target_date date,
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  plan jsonb not null check (jsonb_typeof(plan) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((end_surah is null) = (end_ayah is null)),
  check (goal_type <> 'juz' or (target_juz is not null and end_surah is not null and end_ayah is not null))
);

alter table public.hifz_goals enable row level security;

drop policy if exists "users can manage own hifz goal" on public.hifz_goals;
create policy "users can manage own hifz goal"
  on public.hifz_goals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists set_timestamp on public.hifz_goals;
create trigger set_timestamp
before update on public.hifz_goals
for each row execute function public.handle_updated_at();