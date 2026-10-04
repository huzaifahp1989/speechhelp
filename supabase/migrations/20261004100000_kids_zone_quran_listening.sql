;
create table if not exists public.kids_child_profiles (
  id uuid primary key default gen_random_uuid(),
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 2 and 30),
  avatar text check (avatar is null or avatar in ('moon', 'star', 'book', 'headphones', 'mosque', 'flower')),
  leaderboard_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists kids_child_profiles_parent_idx
  on public.kids_child_profiles (parent_user_id, created_at);

create table if not exists public.points_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  child_profile_id uuid not null references public.kids_child_profiles(id) on delete cascade,
  source text not null check (source in ('quran', 'kids_quiz', 'kids_game', 'kids_challenge', 'admin_adjustment')),
  activity_type text not null,
  points integer not null check (points <> 0),
  reference_id text,
  description text,
  created_at timestamptz not null default now()
);
create unique index if not exists points_transactions_reference_unique
  on public.points_transactions (source, activity_type, reference_id)
  where reference_id is not null;
create index if not exists points_transactions_child_created_idx
  on public.points_transactions (child_profile_id, created_at desc);

create table if not exists public.quran_listening_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  child_profile_id uuid not null references public.kids_child_profiles(id) on delete cascade,
  client_session_id uuid not null,
  started_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  ended_at timestamptz,
  is_playing boolean not null default false,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  verified_duration_seconds integer not null default 0 check (verified_duration_seconds >= 0),
  mode text not null check (mode in ('surah', 'juz', 'quran')),
  surah_number smallint check (surah_number between 1 and 114),
  juz_number smallint check (juz_number between 1 and 30),
  ayah_start smallint check (ayah_start > 0),
  ayah_end smallint check (ayah_end > 0),
  reciter_id text,
  reciter_name text,
  completion_percentage smallint not null default 0 check (completion_percentage between 0 and 100),
  points_awarded integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, client_session_id)
);
create unique index if not exists quran_listening_one_active_session_per_child
  on public.quran_listening_sessions (child_profile_id) where ended_at is null;
create index if not exists quran_listening_sessions_child_created_idx
  on public.quran_listening_sessions (child_profile_id, created_at desc);
create index if not exists quran_listening_sessions_user_created_idx
  on public.quran_listening_sessions (user_id, created_at desc);

create table if not exists public.quran_surah_completions (
  child_profile_id uuid not null references public.kids_child_profiles(id) on delete cascade,
  surah_number smallint not null check (surah_number between 1 and 114),
  session_id uuid not null unique references public.quran_listening_sessions(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (child_profile_id, surah_number)
);
create table if not exists public.quran_juz_completions (
  child_profile_id uuid not null references public.kids_child_profiles(id) on delete cascade,
  juz_number smallint not null check (juz_number between 1 and 30),
  session_id uuid not null unique references public.quran_listening_sessions(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (child_profile_id, juz_number)
);

create table if not exists public.quran_listening_daily (
  child_profile_id uuid not null references public.kids_child_profiles(id) on delete cascade,
  day date not null,
  total_seconds integer not null default 0 check (total_seconds >= 0),
  listening_minutes integer generated always as (total_seconds / 60) stored,
  points integer not null default 0 check (points >= 0),
  minute_points integer not null default 0 check (minute_points >= 0),
  awarded_listening_minutes integer not null default 0 check (awarded_listening_minutes >= 0),
  surahs_started integer not null default 0,
  surahs_completed integer not null default 0,
  juz_completed integer not null default 0,
  reciters_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (child_profile_id, day)
);
create index if not exists quran_listening_daily_day_idx
  on public.quran_listening_daily (day desc, child_profile_id);
create table if not exists public.quran_listening_weekly (
  child_profile_id uuid not null references public.kids_child_profiles(id) on delete cascade,
  week_start date not null,
  total_seconds integer not null default 0 check (total_seconds >= 0),
  listening_minutes integer generated always as (total_seconds / 60) stored,
  points integer not null default 0 check (points >= 0),
  surahs_completed integer not null default 0,
  juz_completed integer not null default 0,
  reciters_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (child_profile_id, week_start)
);
create index if not exists quran_listening_weekly_start_idx
  on public.quran_listening_weekly (week_start desc, child_profile_id);

create table if not exists public.quran_reciter_activity (
  child_profile_id uuid not null references public.kids_child_profiles(id) on delete cascade,
  reciter_id text not null,
  reciter_name text not null,
  total_seconds integer not null default 0 check (total_seconds >= 0),
  sessions integer not null default 0,
  first_listened_at timestamptz not null default now(),
  last_listened_at timestamptz not null default now(),
  primary key (child_profile_id, reciter_id)
);
create table if not exists public.quran_reciter_bonus_awards (
  child_profile_id uuid not null references public.kids_child_profiles(id) on delete cascade,
  reciter_id text not null,
  points integer not null default 0,
  awarded_at timestamptz not null default now(),
  primary key (child_profile_id, reciter_id)
);

create table if not exists public.kids_zone_settings (
  singleton boolean primary key default true check (singleton),
  points_per_listening_minute integer not null default 1 check (points_per_listening_minute between 0 and 100),
  daily_point_cap integer not null default 120 check (daily_point_cap between 0 and 10000),
  daily_streak_minutes integer not null default 10 check (daily_streak_minutes between 1 and 1440),
  daily_listening_goal_minutes integer not null default 60 check (daily_listening_goal_minutes between 1 and 1440),
  surah_completion_points integer not null default 10 check (surah_completion_points between 0 and 10000),
  juz_completion_points integer not null default 25 check (juz_completion_points between 0 and 10000),
  reciter_bonus_points integer not null default 5 check (reciter_bonus_points between 0 and 10000),
  min_listening_seconds integer not null default 60 check (min_listening_seconds between 1 and 3600),
  weekly_listening_target_minutes integer not null default 150 check (weekly_listening_target_minutes between 1 and 10000),
  weekly_challenge_reward_points integer not null default 100 check (weekly_challenge_reward_points between 0 and 10000),
  daily_listening_10_minute_reward_points integer not null default 10 check (daily_listening_10_minute_reward_points between 0 and 10000),
  daily_listening_30_minute_reward_points integer not null default 30 check (daily_listening_30_minute_reward_points between 0 and 10000),
  daily_surah_completion_reward_points integer not null default 10 check (daily_surah_completion_reward_points between 0 and 10000),
  streak_reward_points integer not null default 10 check (streak_reward_points between 0 and 10000),
  badge_reward_points integer not null default 0 check (badge_reward_points between 0 and 10000),
  updated_at timestamptz not null default now()
);
insert into public.kids_zone_settings (singleton) values (true)
on conflict (singleton) do nothing;

create table if not exists public.kids_achievement_definitions (
  code text primary key,
  title text not null,
  description text not null,
  icon text not null,
  threshold integer not null check (threshold > 0),
  metric text not null check (metric in ('minutes', 'surahs', 'juz', 'reciters', 'streak', 'global_points')),
  points integer not null default 0 check (points >= 0)
);
insert into public.kids_achievement_definitions (code, title, description, icon, threshold, metric)
values
  ('quran-first-listen', 'First Listen', 'Listen to the Qur’an for the first time.', 'headphones', 1, 'minutes'),
  ('quran-10-minutes', '10 Minutes', 'Listen for 10 verified minutes.', 'headphones', 10, 'minutes'),
  ('quran-100-minutes', '100 Minutes', 'Listen for 100 verified minutes.', 'headphones', 100, 'minutes'),
  ('quran-first-surah', 'First Surah', 'Complete a Surah.', 'book-open', 1, 'surahs'),
  ('quran-first-juz', 'First Juz', 'Complete a Juz.', 'book-open', 1, 'juz'),
  ('quran-5-reciters', '5 Reciters', 'Listen to five different reciters.', 'mic', 5, 'reciters'),
  ('quran-7-day-streak', '7 Day Streak', 'Listen on seven days in a row.', 'flame', 7, 'streak'),
  ('quran-30-day-streak', '30 Day Streak', 'Listen on thirty days in a row.', 'flame', 30, 'streak'),
  ('kids-1000-points', '1,000 Points', 'Earn 1,000 Kids Zone points.', 'trophy', 1000, 'global_points'),
  ('kids-5000-points', '5,000 Points', 'Earn 5,000 Kids Zone points.', 'trophy', 5000, 'global_points')
on conflict (code) do nothing;
create table if not exists public.kids_child_achievements (
  child_profile_id uuid not null references public.kids_child_profiles(id) on delete cascade,
  achievement_code text not null references public.kids_achievement_definitions(code) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (child_profile_id, achievement_code)
);
create table if not exists public.kids_streak_bonus_awards (
  child_profile_id uuid not null references public.kids_child_profiles(id) on delete cascade,
  streak_days integer not null check (streak_days in (7, 30)),
  points integer not null default 0 check (points >= 0),
  awarded_at timestamptz not null default now(),
  primary key (child_profile_id, streak_days)
);
create table if not exists public.kids_challenges (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('daily', 'weekly')),
  title text not null,
  description text not null,
  metric text not null check (metric in ('minutes', 'listening_days', 'surahs_completed', 'reciters')),
  target integer not null check (target > 0),
  reward_points integer not null check (reward_points >= 0),
  starts_on date not null,
  ends_on date not null,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create unique index if not exists kids_challenges_period_unique
  on public.kids_challenges (scope, starts_on, title);
create table if not exists public.kids_challenge_progress (
  child_profile_id uuid not null references public.kids_child_profiles(id) on delete cascade,
  challenge_id uuid not null references public.kids_challenges(id) on delete cascade,
  progress integer not null default 0 check (progress >= 0),
  completed_at timestamptz,
  primary key (child_profile_id, challenge_id)
);

alter table public.kids_child_profiles enable row level security;
alter table public.points_transactions enable row level security;
alter table public.quran_listening_sessions enable row level security;
alter table public.quran_surah_completions enable row level security;
alter table public.quran_juz_completions enable row level security;
alter table public.quran_listening_daily enable row level security;
alter table public.quran_listening_weekly enable row level security;
alter table public.quran_reciter_activity enable row level security;
alter table public.quran_reciter_bonus_awards enable row level security;
alter table public.kids_zone_settings enable row level security;
alter table public.kids_achievement_definitions enable row level security;
alter table public.kids_child_achievements enable row level security;
alter table public.kids_streak_bonus_awards enable row level security;
alter table public.kids_challenges enable row level security;
alter table public.kids_challenge_progress enable row level security;

drop policy if exists kids_child_profiles_select_own on public.kids_child_profiles;
create policy kids_child_profiles_select_own on public.kids_child_profiles
  for select to authenticated using (auth.uid() = parent_user_id or public.is_site_admin());
drop policy if exists kids_child_profiles_insert_own on public.kids_child_profiles;
create policy kids_child_profiles_insert_own on public.kids_child_profiles
  for insert to authenticated with check (auth.uid() = parent_user_id);
drop policy if exists kids_child_profiles_update_own on public.kids_child_profiles;
create policy kids_child_profiles_update_own on public.kids_child_profiles
  for update to authenticated using (auth.uid() = parent_user_id)
  with check (auth.uid() = parent_user_id);
drop policy if exists kids_child_profiles_delete_own on public.kids_child_profiles;
create policy kids_child_profiles_delete_own on public.kids_child_profiles
  for delete to authenticated using (auth.uid() = parent_user_id);
drop policy if exists points_transactions_select_own on public.points_transactions;
create policy points_transactions_select_own on public.points_transactions
  for select to authenticated using (auth.uid() = user_id or public.is_site_admin());
drop policy if exists quran_listening_sessions_select_own on public.quran_listening_sessions;
create policy quran_listening_sessions_select_own on public.quran_listening_sessions
  for select to authenticated using (auth.uid() = user_id or public.is_site_admin());
drop policy if exists quran_surah_completions_select_own on public.quran_surah_completions;
create policy quran_surah_completions_select_own on public.quran_surah_completions
  for select to authenticated using (public.is_site_admin() or exists (
    select 1 from public.kids_child_profiles p where p.id = child_profile_id and p.parent_user_id = auth.uid()));
drop policy if exists quran_juz_completions_select_own on public.quran_juz_completions;
create policy quran_juz_completions_select_own on public.quran_juz_completions
  for select to authenticated using (public.is_site_admin() or exists (
    select 1 from public.kids_child_profiles p where p.id = child_profile_id and p.parent_user_id = auth.uid()));
drop policy if exists quran_listening_daily_select_own on public.quran_listening_daily;
create policy quran_listening_daily_select_own on public.quran_listening_daily
  for select to authenticated using (public.is_site_admin() or exists (
    select 1 from public.kids_child_profiles p where p.id = child_profile_id and p.parent_user_id = auth.uid()));
drop policy if exists quran_listening_weekly_select_own on public.quran_listening_weekly;
create policy quran_listening_weekly_select_own on public.quran_listening_weekly
  for select to authenticated using (public.is_site_admin() or exists (
    select 1 from public.kids_child_profiles p where p.id = child_profile_id and p.parent_user_id = auth.uid()));
drop policy if exists quran_reciter_activity_select_own on public.quran_reciter_activity;
create policy quran_reciter_activity_select_own on public.quran_reciter_activity
  for select to authenticated using (public.is_site_admin() or exists (
    select 1 from public.kids_child_profiles p where p.id = child_profile_id and p.parent_user_id = auth.uid()));
drop policy if exists quran_reciter_bonus_awards_select_own on public.quran_reciter_bonus_awards;
create policy quran_reciter_bonus_awards_select_own on public.quran_reciter_bonus_awards
  for select to authenticated using (exists (
    select 1 from public.kids_child_profiles p where p.id = child_profile_id and p.parent_user_id = auth.uid()));
drop policy if exists kids_zone_settings_select_authenticated on public.kids_zone_settings;
create policy kids_zone_settings_select_authenticated on public.kids_zone_settings for select to authenticated using (true);
drop policy if exists kids_zone_settings_admin_update on public.kids_zone_settings;
create policy kids_zone_settings_admin_update on public.kids_zone_settings
  for update to authenticated using (public.is_site_admin()) with check (public.is_site_admin());
drop policy if exists kids_achievement_definitions_select_authenticated on public.kids_achievement_definitions;
create policy kids_achievement_definitions_select_authenticated on public.kids_achievement_definitions
  for select to authenticated using (true);
drop policy if exists kids_achievement_definitions_admin_update on public.kids_achievement_definitions;
create policy kids_achievement_definitions_admin_update on public.kids_achievement_definitions
  for update to authenticated using (public.is_site_admin()) with check (public.is_site_admin());
drop policy if exists kids_child_achievements_select_own on public.kids_child_achievements;
create policy kids_child_achievements_select_own on public.kids_child_achievements
  for select to authenticated using (public.is_site_admin() or exists (
    select 1 from public.kids_child_profiles p where p.id = child_profile_id and p.parent_user_id = auth.uid()));
drop policy if exists kids_streak_bonus_awards_select_own on public.kids_streak_bonus_awards;
create policy kids_streak_bonus_awards_select_own on public.kids_streak_bonus_awards
  for select to authenticated using (exists (
    select 1 from public.kids_child_profiles p where p.id = child_profile_id and p.parent_user_id = auth.uid()));
drop policy if exists kids_challenges_select_authenticated on public.kids_challenges;
create policy kids_challenges_select_authenticated on public.kids_challenges
  for select to authenticated using ((active and current_date between starts_on and ends_on) or public.is_site_admin());
drop policy if exists kids_challenges_admin_write on public.kids_challenges;
create policy kids_challenges_admin_write on public.kids_challenges
  for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());
drop policy if exists kids_challenge_progress_select_own on public.kids_challenge_progress;
create policy kids_challenge_progress_select_own on public.kids_challenge_progress
  for select to authenticated using (public.is_site_admin() or exists (
    select 1 from public.kids_child_profiles p where p.id = child_profile_id and p.parent_user_id = auth.uid()));

create or replace function public.ensure_current_kids_challenges()
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_week date := date_trunc('week', current_date)::date;
  v_settings public.kids_zone_settings%rowtype;
begin
  select * into v_settings from public.kids_zone_settings where singleton;
  insert into public.kids_challenges (scope, title, description, metric, target, reward_points, starts_on, ends_on)
  values
    ('daily', 'Listen for 10 minutes', 'Listen to verified Quran audio for 10 minutes today.', 'minutes', 10, v_settings.daily_listening_10_minute_reward_points, current_date, current_date),
    ('daily', 'Listen for 30 minutes', 'Listen to verified Quran audio for 30 minutes today.', 'minutes', 30, v_settings.daily_listening_30_minute_reward_points, current_date, current_date),
    ('daily', 'Complete one Surah', 'Finish listening to one complete Surah today.', 'surahs_completed', 1, v_settings.daily_surah_completion_reward_points, current_date, current_date),
    ('weekly', 'Weekly Quran listening challenge', 'Listen for ' || v_settings.weekly_listening_target_minutes || ' minutes this week.', 'minutes', v_settings.weekly_listening_target_minutes, v_settings.weekly_challenge_reward_points, v_week, v_week + 6)
  on conflict (scope, starts_on, title) do update
    set description = excluded.description, target = excluded.target, reward_points = excluded.reward_points;
end;
$$;

create or replace function public.start_quran_listening_session(
  p_child_profile_id uuid, p_client_session_id uuid, p_mode text,
  p_surah_number integer, p_juz_number integer, p_ayah_start integer,
  p_ayah_end integer, p_reciter_id text, p_reciter_name text
)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if not exists (select 1 from public.kids_child_profiles where id = p_child_profile_id and parent_user_id = v_user) then
    raise exception 'Child profile not found' using errcode = '42501';
  end if;
  if p_client_session_id is null or p_mode not in ('surah', 'juz', 'quran')
    or (p_surah_number is not null and p_surah_number not between 1 and 114)
    or (p_juz_number is not null and p_juz_number not between 1 and 30)
    or (p_mode = 'juz' and p_juz_number is null)
    or (p_mode <> 'juz' and p_surah_number is null)
    or (p_ayah_start is not null and p_ayah_start < 1)
    or (p_ayah_end is not null and p_ayah_end < 1)
    or (p_ayah_start is not null and p_ayah_end is not null and p_ayah_end < p_ayah_start) then
    raise exception 'Invalid listening session' using errcode = '22023';
  end if;
  select id into v_id from public.quran_listening_sessions
    where user_id = v_user and client_session_id = p_client_session_id;
  if v_id is not null then return v_id; end if;
  update public.quran_listening_sessions set ended_at = now(), is_playing = false
    where child_profile_id = p_child_profile_id and ended_at is null
      and last_heartbeat_at < now() - interval '2 minutes';
  insert into public.quran_listening_sessions (
    user_id, child_profile_id, client_session_id, is_playing, mode, surah_number,
    juz_number, ayah_start, ayah_end, reciter_id, reciter_name
  ) values (
    v_user, p_child_profile_id, p_client_session_id, true, p_mode, p_surah_number,
    p_juz_number, p_ayah_start, p_ayah_end, nullif(btrim(p_reciter_id), ''),
    nullif(btrim(p_reciter_name), '')
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.heartbeat_quran_listening_session(p_session_id uuid, p_is_playing boolean)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_s public.quran_listening_sessions%rowtype;
  v_d public.quran_listening_daily%rowtype;
  v_cfg public.kids_zone_settings%rowtype;
  v_now timestamptz := clock_timestamp();
  v_day date := current_date;
  v_week date := date_trunc('week', current_date)::date;
  v_delta integer := 0;
  v_points integer := 0;
  v_minutes integer := 0;
  v_award integer := 0;
  v_reciter_points integer := 0;
  v_streak integer := 0;
  v_ch record;
  v_progress integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  select * into v_s from public.quran_listening_sessions
    where id = p_session_id and user_id = auth.uid() for update;
  if not found or v_s.ended_at is not null then
    raise exception 'Listening session is no longer active' using errcode = 'P0002';
  end if;
  if v_s.is_playing then
    v_delta := greatest(0, least(30, floor(extract(epoch from (v_now - v_s.last_heartbeat_at)))::integer));
  end if;
  update public.quran_listening_sessions set
    duration_seconds = duration_seconds + v_delta,
    verified_duration_seconds = verified_duration_seconds + v_delta,
    last_heartbeat_at = v_now, is_playing = coalesce(p_is_playing, false)
    where id = p_session_id returning * into v_s;
  insert into public.quran_listening_daily (child_profile_id, day, total_seconds)
    values (v_s.child_profile_id, v_day, v_delta)
    on conflict (child_profile_id, day) do update
      set total_seconds = public.quran_listening_daily.total_seconds + excluded.total_seconds,
          updated_at = v_now returning * into v_d;
  select * into v_cfg from public.kids_zone_settings where singleton;

  if v_s.verified_duration_seconds >= v_cfg.min_listening_seconds
    and v_cfg.points_per_listening_minute > 0 then
    v_minutes := greatest(0, v_d.listening_minutes - v_d.awarded_listening_minutes);
    v_points := least(v_minutes * v_cfg.points_per_listening_minute,
      greatest(0, v_cfg.daily_point_cap - v_d.minute_points));
    v_award := least(v_minutes, ceil(v_points::numeric / v_cfg.points_per_listening_minute)::integer);
  end if;
  if v_points > 0 then
    insert into public.points_transactions (user_id, child_profile_id, source, activity_type, points, reference_id, description)
    values (v_s.user_id, v_s.child_profile_id, 'quran', 'listening_minutes', v_points,
      v_s.child_profile_id::text || ':' || v_day || ':' || v_d.listening_minutes, 'Verified Quran audio listening')
    on conflict (source, activity_type, reference_id) where reference_id is not null do nothing;
    update public.quran_listening_daily set points = points + v_points, minute_points = minute_points + v_points,
      awarded_listening_minutes = awarded_listening_minutes + v_award, updated_at = v_now
      where child_profile_id = v_s.child_profile_id and day = v_day returning * into v_d;
    update public.quran_listening_sessions set points_awarded = points_awarded + v_points where id = p_session_id;
  end if;

  if v_s.reciter_id is not null and v_delta > 0 then
    insert into public.quran_reciter_activity (child_profile_id, reciter_id, reciter_name, total_seconds, sessions, last_listened_at)
    values (v_s.child_profile_id, v_s.reciter_id, coalesce(v_s.reciter_name, 'Reciter'), v_delta,
      case when v_s.verified_duration_seconds <= 30 then 1 else 0 end, v_now)
    on conflict (child_profile_id, reciter_id) do update
      set total_seconds = public.quran_reciter_activity.total_seconds + excluded.total_seconds,
          sessions = public.quran_reciter_activity.sessions + excluded.sessions,
          reciter_name = excluded.reciter_name, last_listened_at = v_now;
    insert into public.quran_reciter_bonus_awards (child_profile_id, reciter_id, points)
      select v_s.child_profile_id, v_s.reciter_id, v_cfg.reciter_bonus_points
      where (select total_seconds from public.quran_reciter_activity
        where child_profile_id = v_s.child_profile_id and reciter_id = v_s.reciter_id) >= v_cfg.min_listening_seconds
      on conflict (child_profile_id, reciter_id) do nothing returning points into v_reciter_points;
    if found and v_reciter_points > 0 then
      insert into public.points_transactions (user_id, child_profile_id, source, activity_type, points, reference_id, description)
      values (v_s.user_id, v_s.child_profile_id, 'quran', 'new_reciter_bonus', v_reciter_points,
        v_s.child_profile_id::text || ':reciter:' || v_s.reciter_id, 'First listen with ' || coalesce(v_s.reciter_name, 'a new reciter'))
      on conflict (source, activity_type, reference_id) where reference_id is not null do nothing;
      update public.quran_listening_daily set points = points + v_reciter_points
        where child_profile_id = v_s.child_profile_id and day = v_day;
      update public.quran_listening_sessions set points_awarded = points_awarded + v_reciter_points where id = p_session_id;
    end if;
  end if;

  insert into public.quran_listening_weekly (child_profile_id, week_start, total_seconds, points)
  values (v_s.child_profile_id, v_week, v_delta, v_points + v_reciter_points)
  on conflict (child_profile_id, week_start) do update
    set total_seconds = public.quran_listening_weekly.total_seconds + excluded.total_seconds,
        points = public.quran_listening_weekly.points + excluded.points, updated_at = v_now;
  update public.quran_listening_daily set reciters_count = (
    select count(*) from public.quran_reciter_activity where child_profile_id = v_s.child_profile_id
  ) where child_profile_id = v_s.child_profile_id and day = v_day returning * into v_d;

  perform public.ensure_current_kids_challenges();
  for v_ch in select * from public.kids_challenges where active and current_date between starts_on and ends_on and metric = 'minutes'
  loop
    if v_ch.scope = 'daily' then v_progress := v_d.listening_minutes;
    else select listening_minutes into v_progress from public.quran_listening_weekly
      where child_profile_id = v_s.child_profile_id and week_start = v_week; end if;
    insert into public.kids_challenge_progress (child_profile_id, challenge_id, progress)
      values (v_s.child_profile_id, v_ch.id, coalesce(v_progress, 0))
      on conflict (child_profile_id, challenge_id) do update
        set progress = greatest(public.kids_challenge_progress.progress, excluded.progress);
    if v_progress >= v_ch.target then
      update public.kids_challenge_progress set completed_at = coalesce(completed_at, v_now)
        where child_profile_id = v_s.child_profile_id and challenge_id = v_ch.id and completed_at is null;
      if found and v_ch.reward_points > 0 then
        insert into public.points_transactions (user_id, child_profile_id, source, activity_type, points, reference_id, description)
        values (v_s.user_id, v_s.child_profile_id, 'quran', 'challenge_reward', v_ch.reward_points,
          v_s.child_profile_id::text || ':' || v_ch.id, v_ch.title)
        on conflict (source, activity_type, reference_id) where reference_id is not null do nothing;
        update public.quran_listening_daily set points = points + v_ch.reward_points where child_profile_id = v_s.child_profile_id and day = v_day;
        update public.quran_listening_weekly set points = points + v_ch.reward_points where child_profile_id = v_s.child_profile_id and week_start = v_week;
      end if;
    end if;
  end loop;

  select count(*)::integer into v_streak from (
    select day, v_day - row_number() over (order by day desc)::integer + 1 as expected
    from public.quran_listening_daily where child_profile_id = v_s.child_profile_id
      and listening_minutes >= v_cfg.daily_streak_minutes and day <= v_day
  ) streaks where day = expected;
  if v_streak in (7, 30) then
    insert into public.kids_streak_bonus_awards (child_profile_id, streak_days, points)
      values (v_s.child_profile_id, v_streak, v_cfg.streak_reward_points) on conflict do nothing;
    if found and v_cfg.streak_reward_points > 0 then
      insert into public.points_transactions (user_id, child_profile_id, source, activity_type, points, reference_id, description)
      values (v_s.user_id, v_s.child_profile_id, 'quran', 'streak_reward', v_cfg.streak_reward_points,
        v_s.child_profile_id::text || ':streak:' || v_streak, v_streak || '-day Quran listening streak')
      on conflict (source, activity_type, reference_id) where reference_id is not null do nothing;
      update public.quran_listening_daily set points = points + v_cfg.streak_reward_points where child_profile_id = v_s.child_profile_id and day = v_day;
      update public.quran_listening_weekly set points = points + v_cfg.streak_reward_points where child_profile_id = v_s.child_profile_id and week_start = v_week;
    end if;
  end if;

  insert into public.kids_child_achievements (child_profile_id, achievement_code)
  select v_s.child_profile_id, code from public.kids_achievement_definitions
  where (metric = 'minutes' and v_d.listening_minutes >= threshold)
     or (metric = 'reciters' and v_d.reciters_count >= threshold)
  on conflict do nothing;
  return jsonb_build_object('secondsAdded', v_delta, 'pointsAwarded', v_points + v_reciter_points);
end;
$$;

create or replace function public.end_quran_listening_session(p_session_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  update public.quran_listening_sessions set ended_at = clock_timestamp(), is_playing = false,
    last_heartbeat_at = clock_timestamp()
    where id = p_session_id and user_id = auth.uid() and ended_at is null;
  if not found then raise exception 'Listening session is no longer active' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.complete_quran_surah(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_s public.quran_listening_sessions%rowtype;
  v_cfg public.kids_zone_settings%rowtype;
  v_at timestamptz;
begin
  select * into v_s from public.quran_listening_sessions where id = p_session_id and user_id = auth.uid() for update;
  if not found or v_s.ended_at is null or v_s.mode not in ('surah', 'quran') or v_s.surah_number is null then
    raise exception 'Completed Surah session not found' using errcode = '42501';
  end if;
  select * into v_cfg from public.kids_zone_settings where singleton;
  if v_s.verified_duration_seconds < v_cfg.min_listening_seconds then
    raise exception 'Listening session is too short' using errcode = '22023';
  end if;
  insert into public.quran_surah_completions (child_profile_id, surah_number, session_id, completed_at)
    values (v_s.child_profile_id, v_s.surah_number, v_s.id, v_s.ended_at)
    on conflict (child_profile_id, surah_number) do nothing returning completed_at into v_at;
  if not found then return jsonb_build_object('completed', false, 'pointsAwarded', 0); end if;
  update public.quran_listening_sessions set completion_percentage = 100,
    points_awarded = points_awarded + v_cfg.surah_completion_points where id = v_s.id;
  insert into public.quran_listening_daily (child_profile_id, day, surahs_completed, points)
    values (v_s.child_profile_id, v_at::date, 1, v_cfg.surah_completion_points)
    on conflict (child_profile_id, day) do update set
      surahs_completed = public.quran_listening_daily.surahs_completed + 1,
      points = public.quran_listening_daily.points + excluded.points;
  insert into public.quran_listening_weekly (child_profile_id, week_start, surahs_completed, points)
    values (v_s.child_profile_id, date_trunc('week', v_at)::date, 1, v_cfg.surah_completion_points)
    on conflict (child_profile_id, week_start) do update set
      surahs_completed = public.quran_listening_weekly.surahs_completed + 1,
      points = public.quran_listening_weekly.points + excluded.points;
  if v_cfg.surah_completion_points > 0 then
    insert into public.points_transactions (user_id, child_profile_id, source, activity_type, points, reference_id, description)
    values (v_s.user_id, v_s.child_profile_id, 'quran', 'surah_completion', v_cfg.surah_completion_points,
      v_s.child_profile_id::text || ':surah:' || v_s.surah_number, 'First verified completion of Surah ' || v_s.surah_number)
    on conflict (source, activity_type, reference_id) where reference_id is not null do nothing;
  end if;
  insert into public.kids_child_achievements (child_profile_id, achievement_code)
  values (v_s.child_profile_id, 'quran-first-surah') on conflict do nothing;
  return jsonb_build_object('completed', true, 'pointsAwarded', v_cfg.surah_completion_points);
end;
$$;

create or replace function public.complete_quran_juz(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_s public.quran_listening_sessions%rowtype;
  v_cfg public.kids_zone_settings%rowtype;
  v_at timestamptz;
begin
  select * into v_s from public.quran_listening_sessions where id = p_session_id and user_id = auth.uid() for update;
  if not found or v_s.ended_at is null or v_s.mode <> 'juz' or v_s.juz_number is null then
    raise exception 'Completed Juz session not found' using errcode = '42501';
  end if;
  select * into v_cfg from public.kids_zone_settings where singleton;
  if v_s.verified_duration_seconds < v_cfg.min_listening_seconds then
    raise exception 'Listening session is too short' using errcode = '22023';
  end if;
  insert into public.quran_juz_completions (child_profile_id, juz_number, session_id, completed_at)
    values (v_s.child_profile_id, v_s.juz_number, v_s.id, v_s.ended_at)
    on conflict (child_profile_id, juz_number) do nothing returning completed_at into v_at;
  if not found then return jsonb_build_object('completed', false, 'pointsAwarded', 0); end if;
  update public.quran_listening_sessions set completion_percentage = 100,
    points_awarded = points_awarded + v_cfg.juz_completion_points where id = v_s.id;
  insert into public.quran_listening_daily (child_profile_id, day, juz_completed, points)
    values (v_s.child_profile_id, v_at::date, 1, v_cfg.juz_completion_points)
    on conflict (child_profile_id, day) do update set
      juz_completed = public.quran_listening_daily.juz_completed + 1,
      points = public.quran_listening_daily.points + excluded.points;
  insert into public.quran_listening_weekly (child_profile_id, week_start, juz_completed, points)
    values (v_s.child_profile_id, date_trunc('week', v_at)::date, 1, v_cfg.juz_completion_points)
    on conflict (child_profile_id, week_start) do update set
      juz_completed = public.quran_listening_weekly.juz_completed + 1,
      points = public.quran_listening_weekly.points + excluded.points;
  if v_cfg.juz_completion_points > 0 then
    insert into public.points_transactions (user_id, child_profile_id, source, activity_type, points, reference_id, description)
    values (v_s.user_id, v_s.child_profile_id, 'quran', 'juz_completion', v_cfg.juz_completion_points,
      v_s.child_profile_id::text || ':juz:' || v_s.juz_number, 'First verified completion of Juz ' || v_s.juz_number)
    on conflict (source, activity_type, reference_id) where reference_id is not null do nothing;
  end if;
  insert into public.kids_child_achievements (child_profile_id, achievement_code)
  values (v_s.child_profile_id, 'quran-first-juz') on conflict do nothing;
  return jsonb_build_object('completed', true, 'pointsAwarded', v_cfg.juz_completion_points);
end;
$$;

create or replace function public.kids_global_leaderboard(p_limit integer default 20)
returns table (nickname text, avatar text, total_points bigint)
language sql stable security definer set search_path = public
as $$
  select p.nickname, p.avatar, coalesce(sum(t.points), 0)::bigint as total_points
  from public.kids_child_profiles p left join public.points_transactions t on t.child_profile_id = p.id
  where p.leaderboard_enabled group by p.id, p.nickname, p.avatar
  order by total_points desc, p.nickname limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

create or replace function public.quran_listening_leaderboard(p_period text default 'weekly', p_limit integer default 20)
returns table (nickname text, avatar text, listening_minutes bigint, quran_points bigint, surahs_completed bigint)
language plpgsql stable security definer set search_path = public
as $$
begin
  if p_period not in ('weekly', 'monthly', 'all_time') then
    raise exception 'Unsupported leaderboard period' using errcode = '22023';
  end if;
  return query
  select p.nickname, p.avatar, coalesce(sum(d.listening_minutes), 0)::bigint,
    coalesce(sum(d.points), 0)::bigint, coalesce(sum(d.surahs_completed), 0)::bigint
  from public.kids_child_profiles p left join public.quran_listening_daily d
    on d.child_profile_id = p.id and (
      p_period = 'all_time'
      or (p_period = 'weekly' and d.day >= current_date - 6)
      or (p_period = 'monthly' and d.day >= date_trunc('month', current_date)::date))
  where p.leaderboard_enabled group by p.id, p.nickname, p.avatar
  having coalesce(sum(d.listening_minutes), 0) > 0
  order by sum(d.listening_minutes) desc nulls last, p.nickname
  limit greatest(1, least(coalesce(p_limit, 20), 100));
end;
$$;

create or replace function public.quran_recent_listening_activity(p_limit integer default 30)
returns table (
  nickname text, avatar text, listening_minutes integer, reciter_name text,
  surah_number smallint, juz_number smallint, started_at timestamptz, completion_percentage smallint
)
language sql stable security definer set search_path = public
as $$
  select p.nickname, p.avatar, (s.verified_duration_seconds / 60)::integer,
    s.reciter_name, s.surah_number, s.juz_number, s.created_at, s.completion_percentage
  from public.quran_listening_sessions s
  join public.kids_child_profiles p on p.id = s.child_profile_id
  cross join public.kids_zone_settings cfg
  where p.leaderboard_enabled and s.verified_duration_seconds >= cfg.min_listening_seconds
    and s.created_at >= now() - interval '30 days'
  order by s.created_at desc limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

create or replace function public.kids_child_dashboard(p_child_profile_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  v_today public.quran_listening_daily%rowtype;
  v_result jsonb;
  v_streak integer;
  v_minutes integer;
begin
  if auth.uid() is null or not exists (
    select 1 from public.kids_child_profiles where id = p_child_profile_id and parent_user_id = auth.uid()
  ) then raise exception 'Child profile not found' using errcode = '42501'; end if;
  select coalesce(sum(listening_minutes), 0)::integer into v_minutes
    from public.quran_listening_daily where child_profile_id = p_child_profile_id;
  select count(*)::integer into v_streak from (
    select day, current_date - row_number() over (order by day desc)::integer + 1 as expected
    from public.quran_listening_daily where child_profile_id = p_child_profile_id
      and listening_minutes >= (select daily_streak_minutes from public.kids_zone_settings where singleton)
      and day <= current_date
  ) s where day = expected;
  select * into v_today from public.quran_listening_daily where child_profile_id = p_child_profile_id and day = current_date;
  select jsonb_build_object(
    'totalPoints', coalesce((select sum(points) from public.points_transactions where child_profile_id = p_child_profile_id), 0),
    'quranPoints', coalesce((select sum(points) from public.points_transactions where child_profile_id = p_child_profile_id and source = 'quran'), 0),
    'todayMinutes', coalesce(v_today.listening_minutes, 0),
    'todayPoints', coalesce(v_today.points, 0),
    'todayGoal', coalesce((select daily_listening_goal_minutes from public.kids_zone_settings where singleton), 60),
    'weekMinutes', coalesce((select sum(listening_minutes) from public.quran_listening_daily where child_profile_id = p_child_profile_id and day >= current_date - 6), 0),
    'weekPoints', coalesce((select sum(points) from public.quran_listening_daily where child_profile_id = p_child_profile_id and day >= current_date - 6), 0),
    'monthMinutes', coalesce((select sum(listening_minutes) from public.quran_listening_daily where child_profile_id = p_child_profile_id and day >= date_trunc('month', current_date)::date), 0),
    'surahsCompleted', (select count(*) from public.quran_surah_completions where child_profile_id = p_child_profile_id),
    'juzCompleted', (select count(*) from public.quran_juz_completions where child_profile_id = p_child_profile_id),
    'completedSurahs', coalesce((select jsonb_agg(surah_number order by surah_number) from public.quran_surah_completions where child_profile_id = p_child_profile_id), '[]'::jsonb),
    'completedJuz', coalesce((select jsonb_agg(juz_number order by juz_number) from public.quran_juz_completions where child_profile_id = p_child_profile_id), '[]'::jsonb),
    'recitersCount', (select count(*) from public.quran_reciter_activity where child_profile_id = p_child_profile_id),
    'reciters', coalesce((select jsonb_agg(jsonb_build_object('reciterId', reciter_id, 'name', reciter_name, 'minutes', total_seconds / 60, 'sessions', sessions) order by total_seconds desc) from public.quran_reciter_activity where child_profile_id = p_child_profile_id), '[]'::jsonb),
    'badges', coalesce((select jsonb_agg(jsonb_build_object('code', d.code, 'title', d.title, 'description', d.description, 'icon', d.icon, 'awardedAt', a.awarded_at) order by a.awarded_at desc) from public.kids_child_achievements a join public.kids_achievement_definitions d on d.code = a.achievement_code where a.child_profile_id = p_child_profile_id), '[]'::jsonb),
    'currentStreak', v_streak,
    'streakGoalMinutes', coalesce((select daily_streak_minutes from public.kids_zone_settings where singleton), 10)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.kids_zone_admin_analytics(p_child_profile_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  v_today jsonb; v_week jsonb; v_month jsonb; v_top jsonb; v_reciters jsonb; v_surahs jsonb; v_child jsonb := null;
begin
  if auth.uid() is null or not public.is_site_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  select jsonb_build_object('listeners', count(*) filter (where total_seconds > 0),
    'minutes', coalesce(sum(listening_minutes),0), 'points', coalesce(sum(points),0),
    'sessions', (select count(*) from public.quran_listening_sessions where created_at::date = current_date))
    into v_today from public.quran_listening_daily where day = current_date;
  select jsonb_build_object('activeChildren', count(distinct child_profile_id) filter (where total_seconds > 0),
    'minutes', coalesce(sum(listening_minutes),0), 'points', coalesce(sum(points),0),
    'sessions', (select count(*) from public.quran_listening_sessions where created_at >= date_trunc('week', current_date)))
    into v_week from public.quran_listening_daily where day >= date_trunc('week', current_date)::date;
  select jsonb_build_object('activeChildren', count(distinct child_profile_id) filter (where total_seconds > 0),
    'minutes', coalesce(sum(listening_minutes),0), 'points', coalesce(sum(points),0),
    'sessions', (select count(*) from public.quran_listening_sessions where created_at >= date_trunc('month', current_date)))
    into v_month from public.quran_listening_daily where day >= date_trunc('month', current_date)::date;
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_top from (
    select jsonb_build_object('nickname', p.nickname, 'minutes', sum(d.listening_minutes), 'points', sum(d.points)) x
    from public.kids_child_profiles p join public.quran_listening_daily d on d.child_profile_id = p.id
    where p.leaderboard_enabled and d.day >= current_date - 6
    group by p.id, p.nickname order by sum(d.listening_minutes) desc limit 10) q;
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_reciters from (
    select jsonb_build_object('name', reciter_name, 'minutes', sum(total_seconds)/60, 'sessions', sum(sessions)) x
    from public.quran_reciter_activity group by reciter_name order by sum(total_seconds) desc limit 10) q;
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_surahs from (
    select jsonb_build_object('surahNumber', surah_number, 'minutes', sum(verified_duration_seconds)/60) x
    from public.quran_listening_sessions where surah_number is not null
    group by surah_number order by sum(verified_duration_seconds) desc limit 10) q;
  if p_child_profile_id is not null then
    select jsonb_build_object('nickname', p.nickname, 'totalMinutes', coalesce(sum(d.listening_minutes),0),
      'quranPoints', coalesce((select sum(points) from public.points_transactions where child_profile_id = p.id and source = 'quran'),0),
      'streak', 0, 'reciters', (select count(*) from public.quran_reciter_activity where child_profile_id = p.id),
      'surahsCompleted', (select count(*) from public.quran_surah_completions where child_profile_id = p.id),
      'juzCompleted', (select count(*) from public.quran_juz_completions where child_profile_id = p.id),
      'history', coalesce((select jsonb_agg(jsonb_build_object('date', s.created_at::date, 'surahNumber', s.surah_number,
        'juzNumber', s.juz_number, 'reciterName', s.reciter_name, 'minutes', s.verified_duration_seconds/60,
        'completionPercentage', s.completion_percentage, 'points', s.points_awarded) order by s.created_at desc)
        from public.quran_listening_sessions s where s.child_profile_id = p.id), '[]'::jsonb))
      into v_child from public.kids_child_profiles p left join public.quran_listening_daily d on d.child_profile_id = p.id
      where p.id = p_child_profile_id group by p.id, p.nickname;
  end if;
  return jsonb_build_object('today', coalesce(v_today,'{}'::jsonb), 'week', coalesce(v_week,'{}'::jsonb),
    'month', coalesce(v_month,'{}'::jsonb), 'topListeners', v_top, 'popularReciters', v_reciters,
    'popularSurahs', v_surahs, 'child', v_child);
end;
$$;

revoke all on function public.ensure_current_kids_challenges() from public;
revoke all on function public.start_quran_listening_session(uuid,uuid,text,integer,integer,integer,integer,text,text) from public;
revoke all on function public.heartbeat_quran_listening_session(uuid,boolean) from public;
revoke all on function public.end_quran_listening_session(uuid) from public;
revoke all on function public.complete_quran_surah(uuid) from public;
revoke all on function public.complete_quran_juz(uuid) from public;
revoke all on function public.kids_global_leaderboard(integer) from public;
revoke all on function public.quran_listening_leaderboard(text,integer) from public;
revoke all on function public.quran_recent_listening_activity(integer) from public;
revoke all on function public.kids_child_dashboard(uuid) from public;
revoke all on function public.kids_zone_admin_analytics(uuid) from public;
grant execute on function public.ensure_current_kids_challenges() to authenticated;
grant execute on function public.start_quran_listening_session(uuid,uuid,text,integer,integer,integer,integer,text,text) to authenticated;
grant execute on function public.heartbeat_quran_listening_session(uuid,boolean) to authenticated;
grant execute on function public.end_quran_listening_session(uuid) to authenticated;
grant execute on function public.complete_quran_surah(uuid) to authenticated;
grant execute on function public.complete_quran_juz(uuid) to authenticated;
grant execute on function public.kids_global_leaderboard(integer) to authenticated, anon;
grant execute on function public.quran_listening_leaderboard(text,integer) to authenticated, anon;
grant execute on function public.quran_recent_listening_activity(integer) to authenticated, anon;
grant execute on function public.kids_child_dashboard(uuid) to authenticated;
grant execute on function public.kids_zone_admin_analytics(uuid) to authenticated;

grant select, insert, update, delete on public.kids_child_profiles to authenticated;
grant select on public.points_transactions to authenticated;
grant select on public.quran_listening_sessions to authenticated;
grant select on public.quran_surah_completions, public.quran_juz_completions to authenticated;
grant select on public.quran_listening_daily, public.quran_listening_weekly to authenticated;
grant select on public.quran_reciter_activity, public.quran_reciter_bonus_awards to authenticated;
grant select, update on public.kids_zone_settings to authenticated;
grant select, update on public.kids_achievement_definitions to authenticated;
grant select on public.kids_child_achievements, public.kids_streak_bonus_awards to authenticated;
grant select, insert, update, delete on public.kids_challenges to authenticated;
grant select on public.kids_challenge_progress to authenticated;

notify pgrst, 'reload schema';