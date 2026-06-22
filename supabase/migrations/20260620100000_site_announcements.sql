-- Run this entire file in Supabase Dashboard → SQL Editor → Run
-- Creates announcement tables, policies, and admin access for huzaify786@gmail.com

-- 1. Admin allowlist table
create table if not exists public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.site_admins enable row level security;

drop policy if exists "site_admins_select_own" on public.site_admins;
create policy "site_admins_select_own"
on public.site_admins for select
using (auth.uid() = user_id);

-- 2. Admin check (email whitelist + site_admins table)
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

-- 3. Announcements table
create table if not exists public.site_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  link_url text,
  link_label text,
  target_pages text[] not null default array['*']::text[],
  starts_at timestamptz not null,
  ends_at timestamptz,
  is_active boolean not null default true,
  show_once boolean not null default true,
  priority integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_announcements enable row level security;

drop policy if exists "site_announcements_select_active" on public.site_announcements;
create policy "site_announcements_select_active"
on public.site_announcements for select
using (
  is_active = true
  and starts_at <= now()
  and (ends_at is null or ends_at >= now())
);

drop policy if exists "site_announcements_admin_select" on public.site_announcements;
create policy "site_announcements_admin_select"
on public.site_announcements for select
using (public.is_site_admin());

drop policy if exists "site_announcements_admin_insert" on public.site_announcements;
create policy "site_announcements_admin_insert"
on public.site_announcements for insert
with check (public.is_site_admin());

drop policy if exists "site_announcements_admin_update" on public.site_announcements;
create policy "site_announcements_admin_update"
on public.site_announcements for update
using (public.is_site_admin())
with check (public.is_site_admin());

drop policy if exists "site_announcements_admin_delete" on public.site_announcements;
create policy "site_announcements_admin_delete"
on public.site_announcements for delete
using (public.is_site_admin());

create index if not exists site_announcements_schedule_idx
on public.site_announcements (is_active, starts_at, ends_at, priority desc);

-- 4. Add huzaify786@gmail.com to site_admins (after they have signed up once)
insert into public.site_admins (user_id)
select id from auth.users where lower(email) = 'huzaify786@gmail.com'
on conflict (user_id) do nothing;

-- 5. Refresh API schema cache
notify pgrst, 'reload schema';
