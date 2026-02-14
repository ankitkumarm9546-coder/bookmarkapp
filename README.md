# Smart Bookmark App

## Problems Faced and How I Solved Them

1. **Supabase OAuth URL confusion (dashboard URL vs project API URL)**
- **Problem:** Login and realtime failed because the wrong URL was used in `.env.local`.
- **Solution:** Updated `NEXT_PUBLIC_SUPABASE_URL` to the correct project API URL format: `https://<project-ref>.supabase.co`.

2. **SWC blocked on Windows (policy restriction)**
- **Problem:** Next.js SWC native binary was blocked by local policy.
- **Solution:** Used Babel fallback setup and ensured required runtime dependencies were installed so development could continue.

3. **BOM/encoding issues causing JSON parse errors**
- **Problem:** Some files were saved with UTF-8 BOM, causing errors like invalid JSON parsing.
- **Solution:** Re-saved files in UTF-8 without BOM.

4. **Realtime not updating consistently across tabs**
- **Problem:** Bookmark list did not always refresh immediately in another tab.
- **Solution:** Implemented reliable realtime subscription and added cross-tab sync fallback logic where needed.

5. **Delete UX issues**
- **Problem:** Direct delete and small click area caused accidental deletes / missed clicks.
- **Solution:** Added a custom in-app delete confirmation popup and improved delete button hit area.

6. **Hydration and UI consistency issues during development**
- **Problem:** Mismatch warnings and inconsistent styles while iterating.
- **Solution:** Standardized layout/styles and aligned server/client rendering patterns.

---

## About the Project

Smart Bookmark App is a private bookmark manager built with Next.js App Router and Supabase. Users authenticate with Google OAuth, save bookmarks, and manage them with realtime updates.

The app focuses on:
- private per-user data access
- clean and responsive UI
- fast bookmark add/delete workflow
- realtime sync behavior across sessions/tabs

---

## Functionality Implemented

- Google OAuth authentication (no password form)
- Separate Sign up / Log in UI states
- Add bookmark with `title` + `url`
- Basic URL validation (`http://` / `https://`)
- Per-user private bookmarks using Supabase RLS
- Realtime bookmark updates
- Delete bookmarks with custom confirmation popup
- Open saved bookmark links directly from list
- Search and sort support in bookmark list

---

## Tech Stack

- Next.js 14 (App Router)
- Supabase Auth + Database + Realtime
- `@supabase/ssr` + `@supabase/supabase-js`
- Tailwind CSS

---

## Setup (Local)

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example` and set:

- `NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>`

3. In Supabase:

- Enable Google provider in `Authentication > Providers`
- Add redirect URL(s):
  - `http://localhost:3000/auth/callback`
  - `https://<your-vercel-domain>/auth/callback` (after deployment)
- Run SQL from `supabase/schema.sql`

4. Start app:

```bash
npm run dev
```

---

## Deployment (Vercel)

1. Push repo to GitHub
2. Import project in Vercel
3. Add env vars in Vercel project settings
4. Deploy
5. Add production callback URL in Supabase Google provider settings

---

## Data & Privacy Notes

`public.bookmarks` table stores:
- `id`
- `user_id`
- `title`
- `url`
- `created_at`

RLS policies ensure users can only read/write/delete their own bookmarks.
