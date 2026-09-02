-- Sample data so the app isn't empty on first login.
-- Run this AFTER you've created your one user account and logged in once.
-- Replace :user_id below with your auth.users id (Supabase Dashboard > Authentication > Users),
-- or in the SQL editor run: select id from auth.users; and paste it in place of :user_id.

-- Example (psql-style variable). In the Supabase SQL editor, just do a find/replace
-- of :user_id with your actual UUID before running.

with me as (
  select id as user_id from auth.users order by created_at asc limit 1
)
insert into public.goals (user_id, title, notes, status, target_date, pinned)
select user_id, 'Run a half marathon', 'Build up long runs on weekends. Target under 2:15.', 'active', current_date + interval '90 days', true from me
union all
select user_id, 'Read 12 books this year', 'Mix of fiction and non-fiction.', 'active', null, false from me
union all
select user_id, 'Learn to sail', 'Take a beginner course this summer.', 'paused', null, false from me
union all
select user_id, 'Repaint the living room', 'Sage green, already picked the swatch.', 'done', current_date - interval '10 days', false from me;

with me as (
  select id as user_id from auth.users order by created_at asc limit 1
)
insert into public.tasks (user_id, title, notes, type, "column", sort_order, due_date)
select user_id, 'Book physio appointment', null, 'personal', 'this_week', 0, current_date + interval '2 days' from me
union all
select user_id, 'Send Q3 numbers to accountant', 'Export from the ledger first.', 'business', 'this_week', 1, current_date + interval '3 days' from me
union all
select user_id, 'Plan weekend trip', null, 'personal', 'backlog', 0, null from me
union all
select user_id, 'Review vendor contract', 'Waiting on redlines from legal.', 'business', 'waiting', 0, current_date + interval '5 days' from me
union all
select user_id, 'Draft newsletter', null, 'business', 'doing', 0, null from me
union all
select user_id, 'Unpack moving boxes', null, 'personal', 'doing', 1, null from me
union all
select user_id, 'Renew passport', null, 'personal', 'done', 0, current_date - interval '20 days' from me;

with me as (
  select id as user_id from auth.users order by created_at asc limit 1
)
insert into public.events (user_id, title, notes, type, start_at, end_at, all_day)
select user_id, 'Dentist checkup', null, 'personal', (current_date + interval '1 day' + time '09:30')::timestamptz, (current_date + interval '1 day' + time '10:15')::timestamptz, false from me
union all
select user_id, 'Team offsite', 'Bring laptop and badge.', 'business', (current_date + interval '4 days')::timestamptz, (current_date + interval '5 days')::timestamptz, true from me
union all
select user_id, 'Mom''s birthday', null, 'personal', (current_date + interval '9 days')::timestamptz, null, true from me;

with me as (
  select id as user_id from auth.users order by created_at asc limit 1
)
insert into public.vision_items (user_id, type, content, x, y, width, height, z_index)
select user_id, 'text', E'This year\n\nSlow down. Build things that last. Spend more time outside.', 60, 60, 280, 180, 1 from me
union all
select user_id, 'note', 'Say yes to more trips', 380, 100, 220, 140, 2 from me
union all
select user_id, 'note', 'Cook one new recipe a week', 640, 60, 220, 140, 3 from me;

-- No sample images are seeded (would require uploading a real file to Storage).
-- Add one from the Vision tab after logging in.
