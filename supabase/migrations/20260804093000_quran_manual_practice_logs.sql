-- Manual Hifz practice logs (students can self-log recitation minutes / what they recited without uploading a recording)
-- Note: intentionally text-first — "1st Para 1st Quarter", "Juz 3 page 22", "Surah Baqarah first 40 ayat" are free-form inputs.
create table if not exists public.quran_manual_practice_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  session_type text not null default 'recited' check (session_type in ('recited','memorized_new','tajweed_listening')),
  minutes integer not null check (minutes > 0 and minutes <= 1440),
  ayat_count integer,
  coverage_text text,
  notes text,
  tajweed_focus text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quran_manual_practice_logs_user_day_idx
  on public.quran_manual_practice_logs (user_id, day desc);

alter table public.quran_manual_practice_logs enable row level security;

drop policy if exists "student can manage own manual logs" on public.quran_manual_practice_logs;
create policy "student can manage own manual logs"
  on public.quran_manual_practice_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Track updated_at
drop trigger if exists set_timestamp on public.quran_manual_practice_logs;
create trigger set_timestamp
before update on public.quran_manual_practice_logs
for each row execute function public.handle_updated_at();
