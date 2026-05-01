-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  course_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Users view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Materials
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_type text not null check (source_type in ('file','text')),
  storage_path text,
  raw_text text,
  status text not null default 'pending' check (status in ('pending','processing','ready','failed')),
  error text,
  created_at timestamptz not null default now()
);
alter table public.materials enable row level security;
create policy "own materials select" on public.materials for select using (auth.uid() = user_id);
create policy "own materials insert" on public.materials for insert with check (auth.uid() = user_id);
create policy "own materials update" on public.materials for update using (auth.uid() = user_id);
create policy "own materials delete" on public.materials for delete using (auth.uid() = user_id);

-- Study packs
create table public.study_packs (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  summary text not null default '',
  topics jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.study_packs enable row level security;
create policy "own packs select" on public.study_packs for select using (auth.uid() = user_id);
create policy "own packs insert" on public.study_packs for insert with check (auth.uid() = user_id);
create policy "own packs update" on public.study_packs for update using (auth.uid() = user_id);
create policy "own packs delete" on public.study_packs for delete using (auth.uid() = user_id);

-- Questions
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  study_pack_id uuid not null references public.study_packs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text,
  question text not null,
  options jsonb not null,
  correct_index int not null,
  explanation text,
  difficulty text default 'medium',
  created_at timestamptz not null default now()
);
alter table public.questions enable row level security;
create policy "own questions select" on public.questions for select using (auth.uid() = user_id);
create policy "own questions insert" on public.questions for insert with check (auth.uid() = user_id);
create policy "own questions delete" on public.questions for delete using (auth.uid() = user_id);

-- Practice attempts
create table public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  study_pack_id uuid references public.study_packs(id) on delete set null,
  total int not null default 0,
  correct int not null default 0,
  duration_seconds int not null default 0,
  finished_at timestamptz not null default now()
);
alter table public.practice_attempts enable row level security;
create policy "own attempts select" on public.practice_attempts for select using (auth.uid() = user_id);
create policy "own attempts insert" on public.practice_attempts for insert with check (auth.uid() = user_id);

-- Per question answer log
create table public.answer_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  topic text,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);
alter table public.answer_attempts enable row level security;
create policy "own answers select" on public.answer_attempts for select using (auth.uid() = user_id);
create policy "own answers insert" on public.answer_attempts for insert with check (auth.uid() = user_id);

-- Storage bucket for uploaded materials (private)
insert into storage.buckets (id, name, public) values ('materials','materials', false)
on conflict (id) do nothing;

create policy "users read own files" on storage.objects for select
  using (bucket_id = 'materials' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "users upload own files" on storage.objects for insert
  with check (bucket_id = 'materials' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "users delete own files" on storage.objects for delete
  using (bucket_id = 'materials' and auth.uid()::text = (storage.foldername(name))[1]);