-- Create a table for Durood pledges
create table if not exists durood_pledges (
  id uuid default gen_random_uuid() primary key,
  user_name text not null,
  count integer not null check (count > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table durood_pledges enable row level security;

-- Create policies to allow public read/write access (since we don't have authentication yet)
-- In a real production app with users, you would restrict this to authenticated users.

create policy "Enable insert for all users" 
on durood_pledges for insert 
with check (true);

create policy "Enable select for all users" 
on durood_pledges for select 
using (true);

-- Create a view to aggregate pledges by user for the leaderboard
create or replace view durood_leaderboard as
select
  user_name as name,
  sum(count) as total_count,
  max(created_at) as last_updated
from durood_pledges
group by user_name
order by total_count desc;

create table if not exists user_monthly_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null,
  activity text not null,
  count bigint not null default 0,
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, month, activity)
);

alter table user_monthly_activity enable row level security;

create policy "user_monthly_activity_select_authenticated"
on user_monthly_activity for select
using (auth.uid() is not null);

create policy "user_monthly_activity_insert_own"
on user_monthly_activity for insert
with check (auth.uid() = user_id);

create policy "user_monthly_activity_update_own"
on user_monthly_activity for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public_profiles enable row level security;

create policy "public_profiles_select_all"
on public_profiles for select
using (true);

create policy "public_profiles_insert_own"
on public_profiles for insert
with check (auth.uid() = user_id);

create policy "public_profiles_update_own"
on public_profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists user_weekly_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  week text not null,
  activity text not null,
  count bigint not null default 0,
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, week, activity)
);

alter table user_weekly_activity enable row level security;

create policy "user_weekly_activity_select_authenticated"
on user_weekly_activity for select
using (auth.uid() is not null);

create policy "user_weekly_activity_insert_own"
on user_weekly_activity for insert
with check (auth.uid() = user_id);

create policy "user_weekly_activity_update_own"
on user_weekly_activity for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists user_daily_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  activity text not null,
  count bigint not null default 0,
  goal bigint not null default 0,
  completed boolean not null default false,
  completed_at timestamp with time zone,
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, day, activity)
);

alter table user_daily_activity enable row level security;

create policy "user_daily_activity_select_authenticated"
on user_daily_activity for select
using (auth.uid() is not null);

create policy "user_daily_activity_insert_own"
on user_daily_activity for insert
with check (auth.uid() = user_id);

create policy "user_daily_activity_update_own"
on user_daily_activity for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists user_daily_quran (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  pages integer not null default 0,
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, day)
);

alter table user_daily_quran enable row level security;

create policy "user_daily_quran_select_authenticated"
on user_daily_quran for select
using (auth.uid() is not null);

create policy "user_daily_quran_insert_own"
on user_daily_quran for insert
with check (auth.uid() = user_id);

create policy "user_daily_quran_update_own"
on user_daily_quran for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists user_daily_juz (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  juz integer not null check (juz >= 1 and juz <= 30),
  completed boolean not null default true,
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, day, juz)
);

alter table user_daily_juz enable row level security;

create policy "user_daily_juz_select_authenticated"
on user_daily_juz for select
using (auth.uid() is not null);

create policy "user_daily_juz_insert_own"
on user_daily_juz for insert
with check (auth.uid() = user_id);

create policy "user_daily_juz_update_own"
on user_daily_juz for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_daily_juz_delete_own"
on user_daily_juz for delete
using (auth.uid() = user_id);

create table if not exists user_daily_surah (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  surah text not null,
  completed boolean not null default true,
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, day, surah)
);

alter table user_daily_surah enable row level security;

create policy "user_daily_surah_select_authenticated"
on user_daily_surah for select
using (auth.uid() is not null);

create policy "user_daily_surah_insert_own"
on user_daily_surah for insert
with check (auth.uid() = user_id);

create policy "user_daily_surah_update_own"
on user_daily_surah for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_daily_surah_delete_own"
on user_daily_surah for delete
using (auth.uid() = user_id);

create table if not exists islamic_books (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  path text not null,
  title text not null,
  original_name text,
  size_bytes bigint not null default 0,
  category text not null default 'General',
  is_public boolean not null default false,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table islamic_books enable row level security;

create policy "islamic_books_select_public_or_own"
on islamic_books for select
using (is_public = true or auth.uid() = user_id);

create policy "islamic_books_insert_own"
on islamic_books for insert
with check (auth.uid() = user_id);

create policy "islamic_books_update_own"
on islamic_books for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "islamic_books_delete_own"
on islamic_books for delete
using (auth.uid() = user_id);

create table if not exists islamic_books_saved (
  user_id uuid not null references auth.users(id) on delete cascade,
  path text not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, path)
);

alter table islamic_books_saved enable row level security;

create policy "islamic_books_saved_select_own"
on islamic_books_saved for select
using (auth.uid() = user_id);

create policy "islamic_books_saved_insert_own"
on islamic_books_saved for insert
with check (auth.uid() = user_id);

create policy "islamic_books_saved_delete_own"
on islamic_books_saved for delete
using (auth.uid() = user_id);

alter table islamic_books
  add column if not exists thumbnail_path text;

create table if not exists islamic_book_categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  unique (user_id, name)
);

alter table islamic_book_categories enable row level security;

create policy "islamic_book_categories_select_own"
on islamic_book_categories for select
using (auth.uid() = user_id);

create policy "islamic_book_categories_insert_own"
on islamic_book_categories for insert
with check (auth.uid() = user_id);

create policy "islamic_book_categories_update_own"
on islamic_book_categories for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "islamic_book_categories_delete_own"
on islamic_book_categories for delete
using (auth.uid() = user_id);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  ingredients text not null,
  instructions text not null,
  cooking_time_minutes integer not null check (cooking_time_minutes > 0),
  serving_size integer not null check (serving_size > 0),
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  category text not null check (category in ('Breakfast','Lunch','Dinner','Desserts','Vegetarian','Vegan','Gluten-Free')),
  image_url text,
  image_path text,
  excerpt text,
  halal_confirmed boolean not null default true,
  is_public boolean not null default true,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table recipes enable row level security;

create policy "recipes_select_public_or_own"
on recipes for select
using (is_public = true or auth.uid() = user_id);

create policy "recipes_insert_own"
on recipes for insert
with check (auth.uid() = user_id);

create policy "recipes_update_own"
on recipes for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "recipes_delete_own"
on recipes for delete
using (auth.uid() = user_id);
