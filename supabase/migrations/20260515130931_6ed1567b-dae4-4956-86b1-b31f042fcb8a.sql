-- Notebooks
create table public.notebooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  color text not null default 'primary',
  course_code text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.notebooks enable row level security;
create policy "own notebooks select" on public.notebooks for select using (auth.uid() = user_id);
create policy "own notebooks insert" on public.notebooks for insert with check (auth.uid() = user_id);
create policy "own notebooks update" on public.notebooks for update using (auth.uid() = user_id);
create policy "own notebooks delete" on public.notebooks for delete using (auth.uid() = user_id);
create trigger update_notebooks_updated_at before update on public.notebooks
  for each row execute function public.update_updated_at_column();

-- Materials extensions
alter table public.materials
  add column if not exists notebook_id uuid,
  add column if not exists tags text[] not null default '{}',
  add column if not exists is_favorite boolean not null default false,
  add column if not exists last_opened_at timestamptz,
  add column if not exists duration_seconds int,
  add column if not exists transcript text,
  add column if not exists transcript_segments jsonb;
create index if not exists materials_user_notebook_idx on public.materials (user_id, notebook_id);
create index if not exists materials_tags_idx on public.materials using gin (tags);

-- Notebook chats
create table public.notebook_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  notebook_id uuid not null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.notebook_chats enable row level security;
create policy "own nb chats select" on public.notebook_chats for select using (auth.uid() = user_id);
create policy "own nb chats insert" on public.notebook_chats for insert with check (auth.uid() = user_id);
create policy "own nb chats update" on public.notebook_chats for update using (auth.uid() = user_id);
create policy "own nb chats delete" on public.notebook_chats for delete using (auth.uid() = user_id);

create table public.notebook_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  chat_id uuid not null references public.notebook_chats(id) on delete cascade,
  role text not null,
  content text not null,
  citations jsonb not null default '[]',
  created_at timestamptz not null default now()
);
alter table public.notebook_messages enable row level security;
create policy "own nb msgs select" on public.notebook_messages for select using (auth.uid() = user_id);
create policy "own nb msgs insert" on public.notebook_messages for insert with check (auth.uid() = user_id);
create policy "own nb msgs delete" on public.notebook_messages for delete using (auth.uid() = user_id);
create index if not exists notebook_messages_chat_idx on public.notebook_messages (chat_id, created_at);

-- Notebook study guides (cached)
create table public.notebook_guides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  notebook_id uuid not null unique,
  summary text not null default '',
  topics jsonb not null default '[]',
  faqs jsonb not null default '[]',
  glossary jsonb not null default '[]',
  generated_at timestamptz not null default now()
);
alter table public.notebook_guides enable row level security;
create policy "own nb guides select" on public.notebook_guides for select using (auth.uid() = user_id);
create policy "own nb guides insert" on public.notebook_guides for insert with check (auth.uid() = user_id);
create policy "own nb guides update" on public.notebook_guides for update using (auth.uid() = user_id);
create policy "own nb guides delete" on public.notebook_guides for delete using (auth.uid() = user_id);