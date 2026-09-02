# Board

A calm, single-user personal dashboard: **Home**, **Vision**, **Goals**, **Board** (Kanban + Calendar). Built with Next.js (App Router), Tailwind CSS, and Supabase (Auth, Postgres, Storage).

Nothing here is a "life OS" — the four tabs are intentionally kept separate. Vision is not linked to Goals; Goals are not linked to tasks. The Board tab (Kanban + Calendar) is the only pair of views that share data, and only because a task's due date naturally belongs on both.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In **Project Settings → API**, copy the **Project URL** and **anon public key**.

## 2. Set up the database

1. Open the Supabase **SQL Editor**.
2. Paste and run the contents of [`supabase/schema.sql`](./supabase/schema.sql). This creates:
   - `profiles`, `vision_items`, `goals`, `tasks`, `events` tables
   - Row Level Security policies so each user only ever sees their own rows
   - A trigger that creates a `profiles` row automatically when someone signs up
   - The public `vision-images` Storage bucket, scoped per-user by folder (`storage.objects` policies)

Since this is a single-user app, sign up once from the app's `/login` page (email + password, or a magic link) before continuing — the seed script needs a `auth.users` row to attach sample data to.

3. Optionally, run [`supabase/seed.sql`](./supabase/seed.sql) in the SQL editor to add a few sample goals, tasks, and events so the UI isn't empty. It automatically targets the first (only) user in the project.

### Auth settings

By default Supabase requires email confirmation for new accounts. For a single-user app you can either:
- Confirm the email Supabase sends you, or
- Turn off "Confirm email" under **Authentication → Providers → Email** for faster local setup.

If you plan to use magic links or email confirmation, add `http://localhost:3000/auth/callback` (and your production URL's `/auth/callback`) to **Authentication → URL Configuration → Redirect URLs**.

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

Open [http://localhost:3000](http://localhost:3000), sign up, and you'll land on Home.

## 5. Deploy to Vercel

1. Push this repo to GitHub.
2. Import it into [Vercel](https://vercel.com/new).
3. Add the same two environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings.
4. Deploy. Add the deployed URL's `/auth/callback` to Supabase's redirect URL list if you use magic links.

## Project structure

```
src/app/(dashboard)/     Home, Vision, Goals, Board pages (behind auth via middleware.ts)
src/app/login/           Sign in / sign up / magic link
src/app/auth/            OAuth/magic-link callback + sign-out route
src/components/          One folder per tab, plus shared ui/
src/lib/supabase/        Browser, server, and middleware Supabase clients
supabase/schema.sql      Tables, RLS policies, storage bucket + policies
supabase/seed.sql        Optional sample data
```

## What's intentionally not here

Per the app's design, there's no AI, no collaboration/sharing, no comments, no Google Calendar sync, no habit tracker, no journal, no notifications, no public pages, and no linking between Vision, Goals, and tasks. Each tab does one job.
