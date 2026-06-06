/*
# Create plans and plan_progress tables

1. New Tables
- `plans`: Stores generated study plans owned by authenticated users.
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to auth.uid(), references auth.users with cascade delete)
  - `subject_name` (text, not null) — the course/subject title extracted from the syllabus
  - `total_days` (integer, not null) — the number of days the plan spans
  - `raw_syllabus` (text, not null) — the original syllabus text the user pasted
  - `structured_data` (jsonb, not null) — the full AI-extracted JSON (modules, daily_tasks, topics)
  - `created_at` (timestamptz, defaults to now())

- `plan_progress`: Tracks per-day completion status for each plan.
  - `id` (uuid, primary key)
  - `plan_id` (uuid, not null, references plans with cascade delete)
  - `day_number` (integer, not null) — which day in the plan (1-based)
  - `completed` (boolean, defaults to false) — whether the student finished that day's tasks
  - `completed_at` (timestamptz, nullable) — when the day was marked complete
  - Unique constraint on (plan_id, day_number) to prevent duplicate entries

2. Indexes
- `idx_plans_user_id` on plans(user_id) for fast lookup of a user's plans
- `idx_plan_progress_plan_id` on plan_progress(plan_id) for fast lookup of a plan's progress

3. Security
- RLS enabled on both tables.
- Owner-scoped CRUD policies on `plans`: authenticated users can only access their own plans.
- Owner-scoped policies on `plan_progress`: access scoped through the parent plan's user_id via EXISTS subquery.
- user_id on plans defaults to auth.uid() so inserts from the client omitting user_id still succeed.
*/