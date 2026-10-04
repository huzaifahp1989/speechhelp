-- Fix: heartbeat_quran_listening_session was crashing with
-- "null value in column \"points\" of relation \"quran_listening_weekly\" violates not-null constraint".
--
-- Root cause: when the reciter-bonus INSERT ... SELECT ... RETURNING INTO v_reciter_points matches
-- zero rows (the common case, since the bonus is only awarded once per child/reciter), Postgres sets
-- the INTO target to NULL, overwriting the initialized 0. The later expression
-- `v_points + v_reciter_points` then evaluates to NULL, which violates the NOT NULL constraint on
-- quran_listening_weekly.points.
revoke all on function public.heartbeat_quran_listening_session(uuid,boolean) from public;

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
    -- RETURNING INTO sets the target to NULL when the INSERT ... SELECT matches zero rows
    -- (bonus not yet earned, or already awarded). Restore the 0 default so later arithmetic
    -- and the NOT NULL points column never see NULL.
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

grant execute on function public.heartbeat_quran_listening_session(uuid,boolean) to authenticated;
