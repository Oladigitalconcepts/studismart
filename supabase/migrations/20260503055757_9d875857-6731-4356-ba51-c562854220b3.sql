
-- shared_quizzes
create table public.shared_quizzes (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  creator_id uuid not null,
  title text not null,
  study_pack_id uuid not null,
  question_ids uuid[] not null,
  time_limit_seconds int not null default 600,
  reveal_mode text not null default 'end' check (reveal_mode in ('immediate','end')),
  created_at timestamptz not null default now()
);
create index shared_quizzes_creator_idx on public.shared_quizzes(creator_id);
create index shared_quizzes_token_idx on public.shared_quizzes(token);
alter table public.shared_quizzes enable row level security;

create policy "public read shared quizzes"
  on public.shared_quizzes for select
  using (true);

create policy "creator insert shared quizzes"
  on public.shared_quizzes for insert
  with check (auth.uid() = creator_id);

create policy "creator update shared quizzes"
  on public.shared_quizzes for update
  using (auth.uid() = creator_id);

create policy "creator delete shared quizzes"
  on public.shared_quizzes for delete
  using (auth.uid() = creator_id);

-- shared_quiz_attempts
create table public.shared_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  shared_quiz_id uuid not null references public.shared_quizzes(id) on delete cascade,
  taker_id uuid not null,
  answers jsonb not null default '[]'::jsonb,
  correct int not null default 0,
  total int not null default 0,
  duration_seconds int not null default 0,
  finished_at timestamptz not null default now()
);
create index shared_quiz_attempts_quiz_idx on public.shared_quiz_attempts(shared_quiz_id);
create index shared_quiz_attempts_taker_idx on public.shared_quiz_attempts(taker_id);
alter table public.shared_quiz_attempts enable row level security;

create policy "taker select own attempts"
  on public.shared_quiz_attempts for select
  using (auth.uid() = taker_id);

create policy "creator select attempts on own quizzes"
  on public.shared_quiz_attempts for select
  using (exists (
    select 1 from public.shared_quizzes q
    where q.id = shared_quiz_id and q.creator_id = auth.uid()
  ));

create policy "taker insert own attempts"
  on public.shared_quiz_attempts for insert
  with check (auth.uid() = taker_id);

-- test_configs
create table public.test_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  study_pack_id uuid not null,
  num_questions int not null,
  time_limit_seconds int not null,
  reveal_mode text not null check (reveal_mode in ('immediate','end')),
  created_at timestamptz not null default now()
);
alter table public.test_configs enable row level security;

create policy "own test_configs select"
  on public.test_configs for select using (auth.uid() = user_id);
create policy "own test_configs insert"
  on public.test_configs for insert with check (auth.uid() = user_id);
create policy "own test_configs update"
  on public.test_configs for update using (auth.uid() = user_id);
create policy "own test_configs delete"
  on public.test_configs for delete using (auth.uid() = user_id);
