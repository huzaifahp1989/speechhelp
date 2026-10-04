;
revoke all on function public.kids_global_leaderboard(integer) from public;
revoke all on function public.quran_listening_leaderboard(text,integer) from public;
revoke all on function public.start_quran_listening_session(uuid,uuid,text,integer,integer,integer,integer,text,text) from public;
revoke all on function public.heartbeat_quran_listening_session(uuid,boolean) from public;

create or replace function public.kids_global_leaderboard(p_limit integer default 20)
returns table (nickname text, avatar text, total_points bigint)
language sql stable security definer set search_path = public
as $$
  select p.nickname, p.avatar, coalesce(sum(t.points), 0)::bigint as total_points
  from public.kids_child_profiles p left join public.points_transactions t on t.child_profile_id = p.id
  where p.leaderboard_enabled group by p.id, p.nickname, p.avatar
  order by total_points desc, p.created_at asc, p.nickname
  limit greatest(1, least(coalesce(p_limit, 20), 100));
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
  having coalesce(sum(d.listening_minutes), 0) >= 0
  order by coalesce(sum(d.listening_minutes), 0) desc nulls last,
           coalesce(sum(d.points), 0) desc nulls last,
           p.created_at asc, p.nickname
  limit greatest(1, least(coalesce(p_limit, 20), 100));
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
  v_reciter_id text;
  v_reciter_name text;
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

  v_reciter_id := case when btrim(coalesce(p_reciter_id, '')) = '' then 'reciter:default' else btrim(p_reciter_id) end;
  v_reciter_name := case when btrim(coalesce(p_reciter_name, '')) = '' then 'Qur’an reciter' else btrim(p_reciter_name) end;

  select id into v_id from public.quran_listening_sessions
    where user_id = v_user and client_session_id = p_client_session_id;
  if v_id is not null then return v_id; end if;

  -- Reuse the child's existing open session (if any) instead of inserting a
  -- second one, which would always violate the one-active-session-per-child
  -- unique index (seen as a 409 "Another listening session is active"
  -- error whenever a reload/track switch left a session open with a recent
  -- heartbeat). This also covers the stale-session case that previously
  -- required waiting 2 minutes before a new session could start.
  select id into v_id from public.quran_listening_sessions
    where child_profile_id = p_child_profile_id and ended_at is null
    for update;
  if v_id is not null then
    update public.quran_listening_sessions set
      client_session_id = p_client_session_id, is_playing = true, mode = p_mode,
      surah_number = p_surah_number, juz_number = p_juz_number,
      ayah_start = p_ayah_start, ayah_end = p_ayah_end,
      reciter_id = v_reciter_id, reciter_name = v_reciter_name,
      last_heartbeat_at = now()
      where id = v_id;
    return v_id;
  end if;

  insert into public.quran_listening_sessions (
    user_id, child_profile_id, client_session_id, is_playing, mode, surah_number,
    juz_number, ayah_start, ayah_end, reciter_id, reciter_name
  ) values (
    v_user, p_child_profile_id, p_client_session_id, true, p_mode, p_surah_number,
    p_juz_number, p_ayah_start, p_ayah_end, v_reciter_id, v_reciter_name
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
  v_reciter_id text;
  v_reciter_name text;
  v_total_points bigint := 0;
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

  v_reciter_id := coalesce(
    case when btrim(v_s.reciter_id) = '' then null else btrim(v_s.reciter_id) end,
    'reciter:default'
  );
  v_reciter_name := coalesce(
    case when btrim(v_s.reciter_name) = '' then null else btrim(v_s.reciter_name) end,
    'Qur’an reciter'
  );

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

  if v_delta > 0 then
    insert into public.quran_reciter_activity (child_profile_id, reciter_id, reciter_name, total_seconds, sessions, last_listened_at)
    values (v_s.child_profile_id, v_reciter_id, v_reciter_name, v_delta,
      case when v_s.verified_duration_seconds <= 30 then 1 else 0 end, v_now)
    on conflict (child_profile_id, reciter_id) do update
      set total_seconds = public.quran_reciter_activity.total_seconds + excluded.total_seconds,
          sessions = public.quran_reciter_activity.sessions + excluded.sessions,
          reciter_name = excluded.reciter_name, last_listened_at = v_now;
    insert into public.quran_reciter_bonus_awards (child_profile_id, reciter_id, points)
      select v_s.child_profile_id, v_reciter_id, v_cfg.reciter_bonus_points
      where (select total_seconds from public.quran_reciter_activity
        where child_profile_id = v_s.child_profile_id and reciter_id = v_reciter_id) >= v_cfg.min_listening_seconds
      on conflict (child_profile_id, reciter_id) do nothing returning points into v_reciter_points;
    v_reciter_points := coalesce(v_reciter_points, 0);
    if found and v_reciter_points > 0 then
      insert into public.points_transactions (user_id, child_profile_id, source, activity_type, points, reference_id, description)
      values (v_s.user_id, v_s.child_profile_id, 'quran', 'new_reciter_bonus', v_reciter_points,
        v_s.child_profile_id::text || ':reciter:' || v_reciter_id, 'First listen with ' || v_reciter_name)
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

  select coalesce(sum(points), 0) into v_total_points
    from public.points_transactions where child_profile_id = v_s.child_profile_id;

  insert into public.kids_child_achievements (child_profile_id, achievement_code)
  select v_s.child_profile_id, code from public.kids_achievement_definitions
  where (metric = 'minutes' and v_d.listening_minutes >= threshold)
     or (metric = 'reciters' and v_d.reciters_count >= threshold)
     or (metric = 'streak' and v_streak >= threshold)
     or (metric = 'global_points' and v_total_points >= threshold)
  on conflict do nothing;
  return jsonb_build_object('secondsAdded', v_delta, 'pointsAwarded', v_points + v_reciter_points);
end;
$$;

grant execute on function public.kids_global_leaderboard(integer) to authenticated, anon;
grant execute on function public.quran_listening_leaderboard(text,integer) to authenticated, anon;
grant execute on function public.start_quran_listening_session(uuid,uuid,text,integer,integer,integer,integer,text,text) to authenticated;
grant execute on function public.heartbeat_quran_listening_session(uuid,boolean) to authenticated;
