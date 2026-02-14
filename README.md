# Smart Bookmark App

A simple bookmark manager using **Next.js App Router + Supabase Auth/DB/Realtime + Tailwind CSS**.

## Features implemented

- Google OAuth only sign-in (no email/password UI)
- Add bookmark (`title` + `url`)
- Per-user private bookmarks via Supabase RLS
- Realtime bookmark updates across tabs (Supabase Realtime)
- Delete your own bookmarks
- Vercel deployment-ready

## Tech Stack

- Next.js 14 (App Router)
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- Tailwind CSS

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment file and set values:

```bash
cp .env.example .env.local
```

Required vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. In Supabase dashboard:

- Enable **Google** provider in Auth > Providers.
- Add redirect URL:
  - Local: `http://localhost:3000/auth/callback`
  - Production: `https://<your-vercel-domain>/auth/callback`
- Run SQL from `supabase/schema.sql` in SQL Editor.

4. Run locally:

```bash
npm run dev
```

## Deployment on Vercel

1. Push code to a public GitHub repo.
2. Import project in Vercel.
3. Add env vars in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.
5. Add deployed callback URL in Supabase Google provider settings.

## Data model

`public.bookmarks`

- `id` UUID PK
- `user_id` UUID FK -> `auth.users.id`
- `title` text
- `url` text
- `created_at` timestamptz

## Privacy model

RLS policies ensure each user can only select/insert/delete their own rows.
A trigger sets `user_id = auth.uid()` during insert to avoid spoofing.

## Problems faced and solutions

1. **Session consistency between App Router server/client**
   - Used `@supabase/ssr` helpers and middleware-based cookie refresh to keep auth state consistent.

2. **Ensuring strict per-user data isolation**
   - Implemented RLS policies and insert trigger in SQL so privacy is enforced in DB, not just UI.

3. **Realtime cross-tab sync**
   - Added Realtime subscription with `postgres_changes` filtered by `user_id`, then refetched list on each change.

## What to submit

- Live Vercel URL
- Public GitHub repo URL
- This README (includes problems and solutions)
