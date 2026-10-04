-- Quran recording storage setup
-- 1) Ensure the storage bucket 'quran-recordings' exists (private by default)
-- 2) Storage policies for 'quran-recordings' objects (row level security is already enabled by Supabase on storage.objects)

-- 1. Bucket
insert into storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
values (
  'quran-recordings',
  'quran-recordings',
  false,
  false,
  52428800,  -- 50 MB
  array['audio/mpeg','audio/mp3','audio/wav','audio/webm','audio/ogg','audio/aac','audio/x-m4a','audio/mp4']::text[]
)
on conflict (id) do nothing;

-- 2. Policies on storage.objects — wrap in DO block so if one fails we still continue others
do $$
begin
  -- INSERT
  begin
    drop policy if exists "quran recording insert own" on storage.objects;
    create policy "quran recording insert own"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'quran-recordings'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  exception when others then raise notice 'skip insert policy: %', sqlerrm; end;

  -- SELECT
  begin
    drop policy if exists "quran recording select own" on storage.objects;
    create policy "quran recording select own"
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'quran-recordings'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  exception when others then raise notice 'skip select policy: %', sqlerrm; end;

  -- UPDATE
  begin
    drop policy if exists "quran recording update own" on storage.objects;
    create policy "quran recording update own"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'quran-recordings'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
    with check (
      bucket_id = 'quran-recordings'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  exception when others then raise notice 'skip update policy: %', sqlerrm; end;

  -- DELETE
  begin
    drop policy if exists "quran recording delete own" on storage.objects;
    create policy "quran recording delete own"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'quran-recordings'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  exception when others then raise notice 'skip delete policy: %', sqlerrm; end;

  -- ADMIN READ (instructors/site admins can read any recording for review)
  begin
    drop policy if exists "quran recording admin read" on storage.objects;
    create policy "quran recording admin read"
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'quran-recordings'
      and (
        public.is_site_admin() is true
        or coalesce(public.is_hafiz_instructor(), false) is true
      )
    );
  exception when others then raise notice 'skip admin read policy: %', sqlerrm; end;
end $$;
