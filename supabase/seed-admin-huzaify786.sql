-- Run in Supabase SQL Editor to grant admin to huzaify786@gmail.com
-- (User must have signed up at least once so they exist in auth.users)

insert into site_admins (user_id)
select id from auth.users where lower(email) = 'huzaify786@gmail.com'
on conflict (user_id) do nothing;

-- Also refresh the admin function (email whitelist + site_admins table)
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
