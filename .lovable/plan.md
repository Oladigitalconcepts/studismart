# Create Test & Quiz for Others

Replaces the two "Coming soon" cards on the dashboard with full flows that turn any uploaded material (PDF, DOCX, TXT, **image, or camera snap**) into a configurable timed quiz — either for the user themselves or for others via a shareable link.

---

## 1. New screens & routes


| Route              | Purpose                                                 |
| ------------------ | ------------------------------------------------------- |
| `/create-test`     | Upload + extract → configure → take quiz (self)         |
| `/quiz-for-others` | Same upload + configure → generates a public share link |
| `/q/:token`        | Public quiz taker (no auth required to take)            |
| `/q/:token/result` | Result screen — **forces sign-in before showing score** |


Both `/create-test` and `/quiz-for-others` reuse one shared `TestBuilder` component; only the final step differs (start quiz vs. copy share link).

---

## 2. Test creation flow (5 steps)

```text
[1 Upload] → [2 Extracting/Summarising] → [3 Configure] → [4 Quiz] → [5 Result]
```

**Step 1 — Upload**

- File picker accepting `.pdf .docx .txt .md` AND images `.png .jpg .jpeg .webp .heic`
- Big "Take photo" button using `<input type="file" accept="image/*" capture="environment">` for camera snap on mobile
- Multiple files allowed (snap several pages of notes)

**Step 2 — Extract & summarise (automatic)**

- PDF / DOCX / TXT: existing `extractText.ts` pipeline
- Images: new path that uploads to `materials` bucket and calls a new edge function `extract-image-text` which uses `google/gemini-2.5-flash` vision to OCR the image into text
- All extracted text is concatenated, then `generate-study-pack` is invoked to produce summary + question bank (reuses existing function)

**Step 3 — Configure quiz**

- Slider/select: **Number of questions** (5 / 10 / 15 / 20, capped at available)
- Slider/select: **Time limit** in minutes (1, 5, 10, 15, 20, 30)
- Toggle: **Reveal answers** → "After each question" or "At the end"
- For Quiz-for-Others only: **Quiz title** + creator name

**Step 4 — Take quiz**

- Top bar shows live **countdown timer** (mm:ss); auto-submits at 0
- Question card with options, progress dots
- If "after each question": shows ✓/✗ + explanation between questions
- If "at end": just records answers and moves on

**Step 5 — Result**

- Score, %, time taken, per-question review with correct answers + explanations
- "Retake" / "Back to home" / (for shared taker) "Share your score"

---

## 3. Quiz for Others — share + conversion flow

After the creator finishes Step 3:

1. We insert a row into a new `shared_quizzes` table with the question set + config + a random `token`
2. Show a screen with the link `https://<app>/q/<token>`, copy button, and native share sheet
3. **Taker** opens the link → no login required → answers all questions
4. On submit:
  - If logged in: go straight to `/q/:token/result`
  - **If not logged in**: store the attempt + answers in `localStorage` keyed by token, then route to `/auth?redirect=/q/<token>/result`
  - After successful sign-in/sign-up, `AuthPage` reads the `redirect` param, replays the cached attempt into `shared_quiz_attempts`, and navigates straight to the result screen
5. Creator can later see "X people took your quiz, avg score Y%" on the dashboard

---

## 4. Database changes (migration)

```sql
-- Quiz config attached to an existing study_pack
create table public.test_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  study_pack_id uuid not null,
  num_questions int not null,
  time_limit_seconds int not null,
  reveal_mode text not null check (reveal_mode in ('immediate','end')),
  created_at timestamptz not null default now()
);

-- Public shareable quiz
create table public.shared_quizzes (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,                -- short random url-safe id
  creator_id uuid not null,
  title text not null,
  study_pack_id uuid not null,
  question_ids uuid[] not null,              -- frozen subset
  time_limit_seconds int not null,
  reveal_mode text not null,
  created_at timestamptz not null default now()
);

-- Attempts on shared quizzes
create table public.shared_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  shared_quiz_id uuid not null,
  taker_id uuid not null,                    -- requires sign-in to persist
  answers jsonb not null,                    -- [{question_id, picked_index}]
  correct int not null,
  total int not null,
  duration_seconds int not null,
  finished_at timestamptz not null default now()
);
```

RLS:

- `test_configs`, `shared_quiz_attempts`: standard "own row" policies
- `shared_quizzes`: **public SELECT by token** (so anonymous takers can load the quiz), INSERT/UPDATE/DELETE only by creator
- Public read of the corresponding `questions` rows is gated through a new edge function `get-shared-quiz` that returns the question text + options **without `correct_index**` to anonymous callers, and the full payload to the creator/authenticated takers after submit.

---

## 5. Edge functions

- `extract-image-text` (new) — accepts an uploaded image path, calls Lovable AI vision model, returns clean text. Used for both photos and image uploads.
- `get-shared-quiz` (new) — public, returns quiz metadata + sanitised questions for `/q/:token`
- `submit-shared-quiz` (new) — accepts answers, computes score server-side using the real `correct_index`, writes `shared_quiz_attempts`, returns full review payload

`generate-study-pack` is reused unchanged.

---

## 6. UI changes

- `Dashboard.tsx`: replace the two "Coming soon" cards
  - **Create Test** → `navigate('/create-test')`, subtitle "Quiz yourself, beat the clock"
  - **Quiz for Others** → `navigate('/quiz-for-others')`, subtitle "Share a link, challenge friends"
- New components in `src/components/studymind/test/`:
`TestUpload.tsx`, `TestConfigure.tsx`, `TestRunner.tsx` (timer + question UI), `TestResult.tsx`, `ShareLinkScreen.tsx`, `PublicQuizTaker.tsx`
- New pages: `CreateTestPage.tsx`, `QuizForOthersPage.tsx`, `PublicQuizPage.tsx`, `PublicQuizResultPage.tsx`
- `AuthPage.tsx`: honour `?redirect=` query param after sign-in/sign-up and replay any cached anonymous attempt

---

## 7. Analytics events

`create_test_started`, `test_configured`, `test_completed`, `shared_quiz_created`, `shared_quiz_link_copied`, `public_quiz_started`, `public_quiz_submitted`, `public_quiz_signin_for_result`.

---

## Out of scope (ask if you want them)

- Leaderboard per shared quiz
- Editing questions before publishing
- Multi-attempt limits / expiry on share links