-- ============================================================================
-- Quran Recording Submission and Review System
-- ============================================================================

-- Admin prerequisite used by the RLS policies below
create table if not exists public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.site_admins enable row level security;

drop policy if exists "site_admins_select_own" on public.site_admins;
create policy "site_admins_select_own"
on public.site_admins for select
using (auth.uid() = user_id);

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'huzaify786@gmail.com'
    or exists (
      select 1 from public.site_admins where user_id = auth.uid()
    );
$$;

-- Table for storing quran recording submissions from hafiz students

create table if not exists quran_recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Recording details
  title text not null,
  description text,
  
  -- Quran reference
  surah_from integer,
  ayah_from integer,
  surah_to integer,
  ayah_to integer,
  juz integer,
  
  -- Storage
  audio_url text not null,
  audio_path text not null,
  duration_seconds integer,
  file_size_bytes integer,
  
  -- Review status
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'approved', 'needs_improvement')),
  
  -- Feedback from admin
  admin_feedback text,
  admin_rating integer check (admin_rating >= 1 and admin_rating <= 10),
  points_awarded integer default 0,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamp with time zone,
  
  -- Mistakes tracking
  mistakes_count integer default 0,
  mistakes_details jsonb default '[]'::jsonb,
  
  -- Timestamps
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- Enable RLS
alter table quran_recordings enable row level security;

-- Indexes for common queries
create index if not exists quran_recordings_user_id_idx on quran_recordings (user_id);
create index if not exists quran_recordings_status_idx on quran_recordings (status);
create index if not exists quran_recordings_created_at_idx on quran_recordings (created_at desc);
create index if not exists quran_recordings_reviewed_by_idx on quran_recordings (reviewed_by) where reviewed_by is not null;

-- RLS Policies

-- Students can view their own recordings

drop policy if exists "quran_recordings_select_own" on quran_recordings;
create policy "quran_recordings_select_own"
on quran_recordings for select
using (auth.uid() = user_id);

-- Students can insert their own recordings

drop policy if exists "quran_recordings_insert_own" on quran_recordings;
create policy "quran_recordings_insert_own"
on quran_recordings for insert
with check (auth.uid() = user_id);

-- Students can update their own pending recordings

drop policy if exists "quran_recordings_update_own_pending" on quran_recordings;
create policy "quran_recordings_update_own_pending"
on quran_recordings for update
using (auth.uid() = user_id and status = 'pending')
with check (auth.uid() = user_id);

-- Admins can view all recordings

drop policy if exists "quran_recordings_admin_select" on quran_recordings;
create policy "quran_recordings_admin_select"
on quran_recordings for select
using (public.is_site_admin());

-- Admins can update all recordings (for review)

drop policy if exists "quran_recordings_admin_update" on quran_recordings;
create policy "quran_recordings_admin_update"
on quran_recordings for update
using (public.is_site_admin())
with check (public.is_site_admin());

-- Admins can delete recordings

drop policy if exists "quran_recordings_admin_delete" on quran_recordings;
create policy "quran_recordings_admin_delete"
on quran_recordings for delete
using (public.is_site_admin());

-- ============================================================================
-- Recording Comments/Discussion Table
-- ============================================================================

create table if not exists quran_recording_comments (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references quran_recordings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  comment text not null,
  audio_timestamp_seconds integer, -- Optional: reference to specific part of recording
  is_admin_comment boolean default false,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table quran_recording_comments enable row level security;

create index if not exists quran_recording_comments_recording_id_idx on quran_recording_comments (recording_id);
create index if not exists quran_recording_comments_user_id_idx on quran_recording_comments (user_id);

-- Comments policies

drop policy if exists "quran_recording_comments_select_own_recording" on quran_recording_comments;
create policy "quran_recording_comments_select_own_recording"
on quran_recording_comments for select
using (
  exists (
    select 1 from quran_recordings r
    where r.id = recording_id
    and (r.user_id = auth.uid() or public.is_site_admin())
  )
);

drop policy if exists "quran_recording_comments_insert_own" on quran_recording_comments;
create policy "quran_recording_comments_insert_own"
on quran_recording_comments for insert
with check (
  user_id = auth.uid() and
  exists (
    select 1 from quran_recordings r
    where r.id = recording_id
    and (r.user_id = auth.uid() or public.is_site_admin())
  )
);

-- Only admins can mark comments as admin comments

drop policy if exists "quran_recording_comments_admin_update" on quran_recording_comments;
create policy "quran_recording_comments_admin_update"
on quran_recording_comments for update
using (public.is_site_admin())
with check (public.is_site_admin());

drop policy if exists "quran_recording_comments_admin_delete" on quran_recording_comments;
create policy "quran_recording_comments_admin_delete"
on quran_recording_comments for delete
using (public.is_site_admin());

-- ============================================================================
-- Student Progress Tracking for Quran Recitation
-- ============================================================================

create table if not exists quran_recitation_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  
  -- Overall stats
  total_recordings integer default 0,
  total_reviews integer default 0,
  average_rating numeric(3,1),
  total_points integer default 0,
  
  -- Mistakes tracking (aggregated)
  total_mistakes integer default 0,
  common_mistake_types jsonb default '{}'::jsonb,
  
  -- Improvement tracking
  recordings_count_by_month jsonb default '{}'::jsonb,
  ratings_trend jsonb default '[]'::jsonb,
  
  -- Surah mastery
  completed_surahs integer[] default '{}',
  surahs_in_progress integer[] default '{}',
  
  last_recording_at timestamp with time zone,
  last_review_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table quran_recitation_progress enable row level security;

create index if not exists quran_recitation_progress_user_id_idx on quran_recitation_progress (user_id);

-- Students can view and update their own progress

drop policy if exists "quran_recitation_progress_select_own" on quran_recitation_progress;
create policy "quran_recitation_progress_select_own"
on quran_recitation_progress for select
using (auth.uid() = user_id);

drop policy if exists "quran_recitation_progress_update_own" on quran_recitation_progress;
create policy "quran_recitation_progress_update_own"
on quran_recitation_progress for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Admins can view all progress

drop policy if exists "quran_recitation_progress_admin_select" on quran_recitation_progress;
create policy "quran_recitation_progress_admin_select"
on quran_recitation_progress for select
using (public.is_site_admin());

-- ============================================================================
-- Function to update progress after recording review
-- ============================================================================

create or replace function update_recitation_progress_after_review()
returns trigger as $$
begin
  -- Insert or update progress record
  insert into quran_recitation_progress (
    user_id,
    total_recordings,
    total_reviews,
    total_points,
    last_recording_at,
    last_review_at,
    updated_at
  )
  values (
    new.user_id,
    1,
    case when new.status != 'pending' then 1 else 0 end,
    coalesce(new.points_awarded, 0),
    new.created_at,
    case when new.status != 'pending' then new.reviewed_at else null end,
    now()
  )
  on conflict (user_id) do update set
    total_recordings = quran_recitation_progress.total_recordings + 1,
    total_reviews = quran_recitation_progress.total_reviews + 
      case when new.status != 'pending' then 1 else 0 end,
    total_points = quran_recitation_progress.total_points + coalesce(new.points_awarded, 0),
    last_recording_at = new.created_at,
    last_review_at = case when new.status != 'pending' then new.reviewed_at else quran_recitation_progress.last_review_at end,
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer;

-- Trigger to automatically update progress

drop trigger if exists on_recording_reviewed on quran_recordings;
create trigger on_recording_reviewed
  after insert or update on quran_recordings
  for each row
  execute function update_recitation_progress_after_review();

-- ============================================================================
-- Storage bucket for audio recordings (run in Supabase SQL editor if needed)
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quran-recordings',
  'quran-recordings',
  true,
  52428800,
  array[
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/webm',
    'audio/ogg',
    'audio/aac',
    'audio/x-m4a',
    'audio/mp4',
    'audio/x-caf',
    'audio/flac'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "quran_recordings_storage_insert_own" on storage.objects;
create policy "quran_recordings_storage_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'quran-recordings'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "quran_recordings_storage_select_own" on storage.objects;
create policy "quran_recordings_storage_select_own"
on storage.objects for select to authenticated
using (
  bucket_id = 'quran-recordings'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_site_admin()
  )
);

drop policy if exists "quran_recordings_storage_delete_own" on storage.objects;
create policy "quran_recordings_storage_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'quran-recordings'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_site_admin()
  )
);

