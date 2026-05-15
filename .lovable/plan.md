
# Library 2.0 — A NotebookLM for university students

Goal: Stop scattering PDFs, lecture notes, voice recordings, and screenshots across phones and laptops. Give every student a single place where each course is a **Notebook**, every source is one tap away, and an AI can answer questions and produce study guides grounded in **their own materials** with citations.

---

## 1. What students will be able to do

- Create a **Notebook** per course / project (e.g. "BIO 201 — Genetics") and drop everything related into it: PDFs, typed notes, pasted links, screenshots, **lecture audio**.
- Record a lecture inside the app (or upload an existing `.mp3 / .m4a / .wav`) and have it **transcribed automatically**, then searchable like text.
- **Find anything fast**: global search across titles, tags, summaries, transcripts; filter by notebook, tag, type, status, favorites, recents.
- **Open & use** a source instantly: in-app PDF viewer, audio player synced to transcript, note editor — no downloads needed.
- **Ask the notebook a question** ("What did the lecturer say about meiosis vs mitosis?") and get an answer **with citations** back to the exact source (and timestamp for audio).
- Generate a **Notebook Study Guide**: combined summary, key topics, FAQs, and a glossary built from all sources in that notebook.
- Continue everything offline (cached lists + last opened) and export the study guide as PDF.

---

## 2. Information architecture

```text
Library
├── Notebooks (grid)        ← course-like containers, colored covers
│   └── Notebook detail
│       ├── Sources tab      (PDF, note, audio, image, link)
│       ├── Chat tab         (ask questions, cited answers)
│       └── Study Guide tab  (auto summary + topics + FAQs + glossary)
└── All materials (flat)    ← existing list, kept as a "view all" mode
```

Tabs on top of Library: **Notebooks · All materials · Recents · Favorites**.
Folders + tags from the existing draft are kept for materials that don't belong to a notebook yet.

---

## 3. New screens & components

**Library shell**
- `LibraryHome.tsx` — top-level shell with the 4 tabs above and global search.
- `NotebookGrid.tsx` — colored notebook tiles with material count + last activity.
- `NotebookCreateSheet.tsx` — name, color, optional course code.

**Notebook detail**
- `NotebookDetail.tsx` — header (title, color, count), 3 tabs.
- `SourcesTab.tsx` — list of materials inside the notebook + "Add source" button.
- `AddSourceSheet.tsx` — Upload file · Record audio · Paste text · Paste link.
- `ChatTab.tsx` — chat UI with source picker + message bubbles + inline citation chips.
- `StudyGuideTab.tsx` — sections rendered from generated guide JSON, "Regenerate" + "Export PDF".

**Sources**
- `AudioRecorder.tsx` — in-app recorder using `MediaRecorder`, live timer, pause/resume, save to bucket.
- `AudioPlayer.tsx` — waveform-less player with transcript synced (click line → seek).
- `PdfViewer.tsx` — lightweight in-app PDF viewer (reuse existing if any, else `react-pdf`).
- `NoteEditor.tsx` — markdown textarea with autosave.

**Existing kept**
- Old `Materials.tsx` becomes the "All materials" tab inside `LibraryHome` (no rewrite needed beyond moving it).

---

## 4. Backend changes (single migration)

```sql
-- Notebooks (course-like containers)
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

-- Materials gain notebook + tags + favorite + last_opened + audio fields
alter table public.materials
  add column if not exists notebook_id uuid,
  add column if not exists tags text[] not null default '{}',
  add column if not exists is_favorite boolean not null default false,
  add column if not exists last_opened_at timestamptz,
  add column if not exists duration_seconds int,         -- audio length
  add column if not exists transcript text,              -- audio transcript
  add column if not exists transcript_segments jsonb;    -- [{start,end,text,speaker?}]

-- Per-notebook chat
create table public.notebook_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  notebook_id uuid not null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notebook_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  chat_id uuid not null references public.notebook_chats(id) on delete cascade,
  role text not null,            -- 'user' | 'assistant'
  content text not null,
  citations jsonb not null default '[]', -- [{material_id,title,quote,start?,end?}]
  created_at timestamptz not null default now()
);

-- Cached notebook study guide
create table public.notebook_guides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  notebook_id uuid not null unique,
  summary text not null default '',
  topics jsonb not null default '[]',  -- [{name, blurb, source_ids[]}]
  faqs jsonb not null default '[]',
  glossary jsonb not null default '[]',
  generated_at timestamptz not null default now()
);

-- Own-row RLS on all four (select/insert/update/delete by auth.uid()=user_id)
-- Indexes: materials(user_id, notebook_id), gin(materials.tags),
--          notebook_messages(chat_id, created_at)
```

Storage: reuse the existing private **`materials`** bucket. Add a per-user folder convention `audio/{user_id}/...` for recordings. RLS on `storage.objects` already restricts to the owner.

---

## 5. New / updated edge functions

1. **`transcribe-audio`** *(new)* — Takes `material_id`, downloads the audio from the bucket using the service role, calls **ElevenLabs `scribe_v2`** (key already in plan via `ELEVENLABS_API_KEY` secret to be requested), writes back `transcript`, `transcript_segments`, `duration_seconds`, sets `status='ready'`. Triggered after upload.
2. **`notebook-chat`** *(new)* — Takes `notebook_id`, `chat_id`, `question`. Loads all materials in that notebook (raw_text + transcript), builds a compact context with per-source markers `[S1]`, `[S2]` …, calls Lovable AI (`google/gemini-2.5-flash`) with a system prompt that **must answer only from sources and cite them**. Returns `{answer, citations:[{source_id,title,quote,start?,end?}]}`. Persists user + assistant messages.
3. **`generate-notebook-guide`** *(new)* — Aggregates all sources in a notebook → asks Gemini for `{summary, topics[], faqs[], glossary[]}` (JSON mode), upserts into `notebook_guides`. Reuses pattern from existing `generate-study-pack` and `generate-topic-content`.
4. **`extract-image-text` / `generate-study-pack`** — unchanged; new uploads still flow through them so single-material study packs keep working.

All three use `verify_jwt = true` (default), validate JWT, validate input with Zod, and include `corsHeaders` on every response (per project conventions).

---

## 6. Audio capture & playback flow

1. User taps **Add source → Record audio** in a notebook.
2. `AudioRecorder` uses `navigator.mediaDevices.getUserMedia` + `MediaRecorder` (audio/webm).
3. On stop: upload blob to `materials/audio/{user_id}/{uuid}.webm`, insert a `materials` row with `source_type='audio'`, `status='processing'`.
4. Client invokes `transcribe-audio`. Function streams to ElevenLabs, writes transcript back; UI polls / subscribes via Supabase Realtime to flip the card from "Transcribing…" to "Ready".
5. `AudioPlayer` renders the transcript as clickable lines that `seek()` the `<audio>` element to `segment.start`.

Uploaded audio files (mp3/m4a/wav) take the same path, skipping the recorder.

---

## 7. Notebook chat with citations

- Source picker at top of the chat lets the student include/exclude specific materials (default: all).
- Context builder concatenates each selected source with a header: `[[S1]] {title}\n{raw_text or transcript}` (truncated per token budget; fall back to per-source summaries if a notebook is huge).
- System prompt enforces: "Answer only using the provided sources. Cite as [S1], [S2]. If not in sources, say you don't know." Response is post-processed to map `[S#]` markers → citation chips that, when tapped, open the source (and seek to timestamp for audio).
- Messages persisted in `notebook_messages` so the conversation survives reloads.

This intentionally avoids vector embeddings for v1 (keeps cost and complexity down). If a notebook outgrows the context window we add `pgvector` + chunk-level retrieval later — schema is forward-compatible because citations already reference `material_id`.

---

## 8. Study guide

- One tap → `generate-notebook-guide` → cached in `notebook_guides` until the student adds/removes a source (then a "Regenerate" button shows).
- Renders as: cover summary → topic accordions → FAQs → glossary chips.
- "Export PDF" reuses the existing `jsPDF` pattern from `SlidesPage.tsx` to emit a single, nicely formatted study guide.

---

## 9. UX polish (keeps current app feel)

- Pull-to-refresh on every list (existing `PullToRefresh`).
- Haptics on filter taps, save, delete (existing `haptic`).
- Offline cache (`cacheGet/cacheSet`) for notebooks list, sources list, last guide, last chat thread.
- Empty states: friendly illustration + 3 example chips ("Lecture notes", "Past paper", "Recorded lecture").
- Skeleton loaders for chat answers and transcription.

---

## 10. Build order (small, shippable steps)

1. **Migration** + storage convention.
2. **Notebooks CRUD** + Library shell with the 4 tabs (move existing Materials into "All materials" tab).
3. **Add to notebook** action on existing materials + notebook detail Sources tab.
4. **Audio recorder + upload** and the **`transcribe-audio`** function (request `ELEVENLABS_API_KEY`).
5. **In-app player with synced transcript**.
6. **`notebook-chat` function** + Chat tab UI with citation chips.
7. **`generate-notebook-guide`** + Study Guide tab + PDF export.
8. **Global search** across titles/tags/transcripts.

Each step is independently useful — we can stop after any of them and the app is better than today.

---

## 11. Out of scope for this iteration (ask if you want)

- Real-time live transcription during a lecture (would use `scribe_v2_realtime`).
- Vector / semantic search across the whole library (needs `pgvector`).
- Sharing a notebook with classmates / collaborative notebooks.
- Mind-map view, audio overview ("podcast"), or video sources.
- OCR for handwritten notes beyond what `extract-image-text` already does.

