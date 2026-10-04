create table if not exists public.tracker_cloud_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.tracker_cloud_data enable row level security;

drop policy if exists "tracker_cloud_data_select_own" on public.tracker_cloud_data;
create policy "tracker_cloud_data_select_own"
on public.tracker_cloud_data for select
using (auth.uid() = user_id);

drop policy if exists "tracker_cloud_data_insert_own" on public.tracker_cloud_data;
create policy "tracker_cloud_data_insert_own"
on public.tracker_cloud_data for insert
with check (auth.uid() = user_id);

drop policy if exists "tracker_cloud_data_update_own" on public.tracker_cloud_data;
create policy "tracker_cloud_data_update_own"
on public.tracker_cloud_data for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "tracker_cloud_data_delete_own" on public.tracker_cloud_data;
create policy "tracker_cloud_data_delete_own"
on public.tracker_cloud_data for delete
using (auth.uid() = user_id);

notify pgrst, 'reload schema';