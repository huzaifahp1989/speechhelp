-- Fix: start_quran_listening_session could fail with
-- "duplicate key value violates unique constraint quran_listening_one_active_session_per_child"
-- (surfaced to the client as 409 "Another listening session is active for this child").
--
-- Root cause: the function only closed out a child's existing open session when its
-- last_heartbeat_at was more than 2 minutes old. A page reload, tab close, or rapid
-- track/reciter switch can leave a session open with a very recent heartbeat (heartbeats
-- fire roughly every 15s while playing), so the next "start" call raced ahead of the
-- 2-minute staleness window and collided with the partial unique index on
-- quran_listening_sessions (child_profile_id) where ended_at is null.
--
-- Fix: make "start" idempotent at the child level. Instead of trying to insert a new row
-- and letting the unique constraint reject it, lock and reuse any existing open session
-- for the child, redirecting it to the newly requested mode/Surah/Juz/reciter selection.
-- This preserves already-recorded duration/points on that session (nothing is lost) and
-- guarantees there is still only ever one open session per child, without ever raising a
-- conflict back to the client.
revoke all on function public.start_quran_listening_session(uuid,uuid,text,integer,integer,integer,integer,text,text) from public;

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
  -- unique index. This also covers the stale-session case that previously
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

grant execute on function public.start_quran_listening_session(uuid,uuid,text,integer,integer,integer,integer,text,text) to authenticated;
