# Board

A calm, single-user personal dashboard: **Vision** and **Board** (Kanban + Calendar). Built with Next.js (App Router), Tailwind CSS, and Supabase (Auth, Postgres, Storage).

Nothing here is a "life OS." Vision is a freeform mood board with no links out to anything else. The Board tab's Kanban and Calendar views share the same task data (a task's due date naturally belongs on both), and that's the only data shared across the app.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In **Project Settings → API**, copy the **Project URL** and **anon public key**.

## 2. Set up the database

1. Open the Supabase **SQL Editor**.
2. Paste and run the contents of [`supabase/schema.sql`](./supabase/schema.sql). This creates:
   - `profiles`, `vision_items`, `tasks`, `events` tables (plus an unused `goals` table, kept for a possible future tab)
   - Row Level Security policies so each user only ever sees their own rows, with `user_id` defaulting to the logged-in user automatically
   - A trigger that creates a `profiles` row automatically when someone signs up
   - The public `vision-images` Storage bucket, scoped per-user by folder (`storage.objects` policies)

Since this is a single-user app, sign up once from the app's `/login` page (email + password) before continuing — the seed script needs a `auth.users` row to attach sample data to.

3. Optionally, run [`supabase/seed.sql`](./supabase/seed.sql) in the SQL editor to add a few sample tasks and events so the UI isn't empty. It automatically targets the first (only) user in the project.

### Auth settings

By default Supabase requires email confirmation for new accounts. For a single-user app you can either:
- Confirm the email Supabase sends you, or
- Turn off "Confirm email" under **Authentication → Providers → Email** for faster local setup.

If you keep email confirmation on, add `http://localhost:3000/auth/callback` (and your production URL's `/auth/callback`) to **Authentication → URL Configuration → Redirect URLs**. Once signed in, the session cookie lasts 400 days and refreshes on every visit, so you won't be asked to sign in again on that device.

## 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

## 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, and you'll land on Vision.

## 5. Deploy to Vercel

1. Push this repo to GitHub.
2. Import it into [Vercel](https://vercel.com/new).
3. Add the same two environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings.
4. Deploy. Add the deployed URL's `/auth/callback` to Supabase's redirect URL list if email confirmation is on.

## Project structure

```
src/app/(dashboard)/     Vision, Board pages (behind auth via middleware.ts)
src/app/login/           Sign in / sign up (email + password)
src/app/auth/            Email-confirmation callback route
src/components/          One folder per tab, plus shared ui/
src/lib/supabase/        Browser, server, and middleware Supabase clients
supabase/schema.sql      Tables, RLS policies, storage bucket + policies
supabase/seed.sql        Optional sample data
```

## What's intentionally not here

There's no AI, no collaboration/sharing, no comments, no Google Calendar sync, no habit tracker, no journal, no notifications, and no public pages. Vision has no links out to Board — it's a mood board, nothing more.
