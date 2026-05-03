CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.slide_decks (
  id uuid primary key default gen_random_uuid(),
  study_pack_id uuid not null references public.study_packs(id) on delete cascade,
  user_id uuid not null,
  title text not null,
  slides jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE UNIQUE INDEX slide_decks_pack_idx ON public.slide_decks(study_pack_id);

ALTER TABLE public.slide_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own decks" ON public.slide_decks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own decks" ON public.slide_decks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own decks" ON public.slide_decks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own decks" ON public.slide_decks FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_slide_decks_updated_at
BEFORE UPDATE ON public.slide_decks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();