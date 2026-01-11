-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- For text search

-- USERS / PROFILES
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- QURAN SCHEMA
create table public.surahs (
  number integer primary key,
  name_simple text not null,
  name_complex text,
  name_arabic text not null,
  verses_count integer not null,
  revelation_place text,
  revelation_order integer,
  bismillah_pre boolean default true
);

create table public.ayahs (
  id serial primary key,
  surah_id integer references public.surahs(number),
  ayah_number integer not null,
  text_uthmani text not null,
  text_simple text,
  juz_number integer,
  hizb_number integer,
  rub_number integer,
  page_number integer,
  sajda boolean default false,
  unique(surah_id, ayah_number)
);

create table public.translations (
  id serial primary key,
  ayah_id integer references public.ayahs(id),
  language text not null, -- 'en', 'ur'
  translator text not null,
  text text not null
);

-- TAFSEER SCHEMA
create table public.tafseers (
  id serial primary key,
  ayah_id integer references public.ayahs(id),
  source_name text not null, -- 'Maariful Quran', 'Ibn Kathir'
  text text not null,
  language text default 'en'
);

-- HADITH SCHEMA
create table public.hadith_collections (
  id serial primary key,
  name text not null, -- 'Sahih al-Bukhari'
  slug text unique not null, -- 'bukhari'
  has_books boolean default true,
  has_chapters boolean default true
);

create table public.hadith_books (
  id serial primary key,
  collection_id integer references public.hadith_collections(id),
  book_number text not null, -- Some are Roman numerals or text
  name_en text,
  name_ar text
);

create table public.hadith_chapters (
  id serial primary key,
  book_id integer references public.hadith_books(id),
  chapter_number text,
  title_en text,
  title_ar text
);

create table public.hadiths (
  id serial primary key,
  collection_id integer references public.hadith_collections(id),
  book_id integer references public.hadith_books(id),
  chapter_id integer references public.hadith_chapters(id),
  hadith_number text not null,
  text_ar text,
  text_en text,
  grading text, -- 'Sahih', 'Hasan', etc.
  narrator text
);

-- SEERAH SCHEMA
create table public.seerah_topics (
  id serial primary key,
  title text not null,
  slug text unique not null,
  category text, -- 'Makkah', 'Madinah', 'Battles'
  summary text,
  order_index integer
);

create table public.seerah_events (
  id serial primary key,
  topic_id integer references public.seerah_topics(id),
  title text not null,
  year_hijri integer,
  year_gregorian integer,
  description text,
  lessons text[]
);

-- TOPICS (Curated)
create table public.topics (
  id serial primary key,
  title text not null,
  slug text unique not null,
  category text,
  overview text,
  practical_points text[]
);

-- Junction tables for Topic/Seerah references to Ayat/Hadith
create table public.topic_evidences (
  id serial primary key,
  topic_id integer references public.topics(id),
  seerah_topic_id integer references public.seerah_topics(id),
  evidence_type text check (evidence_type in ('ayah', 'hadith')),
  ayah_id integer references public.ayahs(id),
  hadith_id integer references public.hadiths(id),
  notes text
);

-- LECTURE BUILDER
create table public.lectures (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  title text not null,
  target_audience text,
  duration_minutes integer,
  content jsonb, -- structured content for sections
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- DICTIONARY
create table public.dictionary_words (
  id serial primary key,
  word text not null,
  definition text not null,
  part_of_speech text,
  example_sentence text,
  pronunciation text,
  audio_url text
);

create table public.user_vocab (
  id serial primary key,
  user_id uuid references public.profiles(id) not null,
  word_id integer references public.dictionary_words(id),
  status text default 'learning', -- 'learning', 'mastered'
  next_review_at timestamp with time zone
);

-- BOOKMARKS & NOTES
create table public.bookmarks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  resource_type text not null, -- 'ayah', 'hadith', 'topic', 'seerah'
  resource_id text not null, -- Generic ID reference
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  title text,
  content text,
  tags text[],
  folder text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
