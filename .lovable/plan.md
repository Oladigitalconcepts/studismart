# Materials → Study Library

Turn the current flat "Materials" list into a real **Library** users can rely on: organize, find, preview, and act on every uploaded resource from one place.

---

## 1. Goals

- Make every uploaded material easy to **find**, **organize**, and **reuse**.
- Surface the work users already did (summary, questions, slides, last practice score) without opening multiple screens.
- Add productive **quick actions** (Practice, Open pack, Generate slides, Create test, Share quiz, Rename, Delete).
- Keep it fast on mobile, offline-friendly (uses existing `offlineCache`), and consistent with the app's pull-to-refresh + haptics.

---

## 2. New Library layout

Rename the screen header to **Library** (subtitle: "All your study materials"). Page structure:

```text
[ Status bar ]
[ Header: Library            (+ Upload) ]
[ Search bar  🔍 ]
[ Filter chips: All · Recent · Favorites · Folders ▾ · Tags ▾ ]
[ Sort + view toggle:  Newest ▾    [Grid|List] ]
[ Stats strip: 24 materials · 312 questions · 8 slide decks ]
[ Section: Continue studying  →  (last 3 opened) ]
[ Section: All materials                       ]
   - Card / row per material (see §3)
[ FAB: + Upload ]
```

- **Search** matches title + tags + summary snippet (client-side first, then can move server-side later).
- **Filter chips** are toggleable; "Folders" and "Tags" open a sheet to pick one.
- **Sort options**: Newest, Oldest, A→Z, Most practiced, Highest score.
- **View toggle**: list (default) and grid (2-col cards with a colored cover).
- **Continue studying** = top 3 by `last_opened_at` (stored locally per user).

---

## 3. Material card (richer than today)

Each card shows:

- File-type icon (PDF / DOCX / TXT / Image / Text) with a colored background
- Title (editable inline via long-press or menu)
- Folder name + up to 2 tag chips
- Meta row: `42 questions · Last score 78% · 3d ago`
- Status badge if not `ready` (Processing / Failed → with Retry)
- Star/favorite toggle
- Overflow menu (`⋯`) with:
  - Open study pack
  - Practice now
  - Generate slides
  - Create test from this
  - Share as quiz
  - Move to folder…
  - Edit tags…
  - Rename
  - Delete (confirm)

Tapping the card opens the existing StudyPack screen (unchanged).

---

## 4. Folders & tags

Lightweight organization that doesn't get in the way.

- **Folders**: one folder per material (optional). Default = "Uncategorized".
- **Tags**: many per material (free text, autocomplete from existing tags).
- Folder picker is a bottom sheet with: list of folders, "+ New folder", rename/delete via swipe.
- Tag editor is a chip input with suggestions.

A "Folders" tab at the top of the library shows folder tiles with material counts; tapping a folder filters the list.

---

## 5. Bulk actions

Long-press a card → enters **selection mode**:

- Top bar shows count + actions: Move, Tag, Delete, Cancel.
- Tap other cards to add to selection.

---

## 6. Empty / error / offline states

- **Empty**: friendly illustration + "Upload your first material" CTA + 3 example chips ("Lecture notes", "Past paper", "Textbook chapter").
- **Processing**: subtle shimmer + "We're preparing your study pack…".
- **Failed**: red badge + Retry button calling `generate-study-pack` again.
- **Offline**: banner + cached list still browsable; actions that need network are disabled with a tooltip.

---

## 7. Database changes (migration)

Add minimal columns + one new table. All RLS = own-row.

```sql
alter table public.materials
  add column if not exists folder_id uuid,
  add column if not exists tags text[] not null default '{}',
  add column if not exists is_favorite boolean not null default false,
  add column if not exists last_opened_at timestamptz;

create table public.material_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  color text not null default 'primary',
  created_at timestamptz not null default now()
);
alter table public.material_folders enable row level security;
-- own-row select/insert/update/delete policies
create index on public.materials (user_id, folder_id);
create index on public.materials using gin (tags);
```

No FK to `auth.users` (per project convention). `folder_id` is a soft reference.

---

## 8. Files to add / change

**New**
- `src/components/studymind/library/LibraryHeader.tsx` — search + chips + sort/view toggle
- `src/components/studymind/library/MaterialCard.tsx` — list + grid variants
- `src/components/studymind/library/MaterialActionsSheet.tsx` — overflow menu
- `src/components/studymind/library/FolderPickerSheet.tsx`
- `src/components/studymind/library/TagEditorSheet.tsx`
- `src/components/studymind/library/FoldersTab.tsx`
- `src/lib/library.ts` — query helpers (list, rename, delete, move, toggle favorite, set tags, mark opened)

**Changed**
- `src/components/studymind/Materials.tsx` — replaced by new Library composition (kept as a thin wrapper that renders the new components so the existing route `/materials` keeps working).
- `src/pages/MaterialsPage.tsx` — wire new actions (open pack, practice, slides, create-test, share quiz) using existing routes.
- `src/components/studymind/StudyPack.tsx` — on mount, update `materials.last_opened_at` so "Continue studying" works.
- Header label updated to "Library" in `BottomNav.tsx` if needed.

---

## 9. Technical notes

- Reuse existing `cacheGet/cacheSet` for offline list + per-material details.
- Reuse existing `PullToRefresh` wrapper at the top of the Library page.
- All mutations go through Supabase with optimistic UI + rollback on error (toast).
- "Create test from this" reuses `buildPackFromFiles` flow's later steps by jumping into `/create-test` pre-seeded with the existing `study_pack_id` (small addition to `CreateTestPage` to accept a query param).
- "Share as quiz" navigates to `/quiz-for-others?from=<study_pack_id>` similarly.
- Search is debounced (200ms) and runs client-side over the cached array; if list grows beyond 200 items, switch to a Supabase `ilike` query.
- All destructive actions use `AlertDialog` with explicit confirm.
- Haptics: light on selection toggle, success on save/delete.

---

## 10. Out of scope (ask if you want)

- Full-text search inside material body (would need `tsvector` + edge function)
- Sharing materials between users / classroom mode
- Multi-file folders zip export
- AI auto-tagging on upload (could be added later via `generate-study-pack`)
