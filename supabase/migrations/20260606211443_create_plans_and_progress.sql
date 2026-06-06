/*
# Create plans and plan_progress tables

1. New Tables
- `plans`: Stores generated study plans owned by authenticated users.
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to auth.uid(), references auth.users with cascade delete)
  - `subject_name` (text, not null) — the course/subject title
  - `total_days` (integer, not null) — the number of days the plan spans
  - `raw_syllabus` (text, not null) — the original pasted syllabus text
  - `structured_data` (jsonb, not null) — the full AI-extracted JSON
  - `created_at` (timestamptz, defaults to now())

- `plan_progress`: Tracks per-day completion status for each plan.
  - `id` (uuid, primary key)
  - `plan_id` (uuid, not null, references plans with cascade delete)
  - `day_number` (integer, not null) — which day (1-based)
  - `completed` (boolean, defaults to false)
  - `completed_at` (timestamptz, nullable)
  - Unique constraint on (plan_id, day_number)

2. Indexes
- `idx_plans_user_id` on plans(user_id)
- `idx_plan_progress_plan_id` on plan_progress(plan_id)

3. Security
- RLS enabled on both tables.
- Owner-scoped CRUD on plans via auth.uid() = user_id.
- plan_progress scoped through parent plan ownership via EXISTS subquery.
- user_id defaults to auth.uid() so client inserts omitting user_id succeed.
*/

CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  total_days integer NOT NULL,
  raw_syllabus text NOT NULL,
  structured_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  CONSTRAINT unique_plan_day UNIQUE (plan_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_plans_user_id ON plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_progress_plan_id ON plan_progress(plan_id);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_plans" ON plans;
CREATE POLICY "select_own_plans" ON plans FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_plans" ON plans;
CREATE POLICY "insert_own_plans" ON plans FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_plans" ON plans;
CREATE POLICY "update_own_plans" ON plans FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_plans" ON plans;
CREATE POLICY "delete_own_plans" ON plans FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_own_progress" ON plan_progress;
CREATE POLICY "select_own_progress" ON plan_progress FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM plans WHERE plans.id = plan_progress.plan_id AND plans.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_progress" ON plan_progress;
CREATE POLICY "insert_own_progress" ON plan_progress FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM plans WHERE plans.id = plan_progress.plan_id AND plans.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_progress" ON plan_progress;
CREATE POLICY "update_own_progress" ON plan_progress FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM plans WHERE plans.id = plan_progress.plan_id AND plans.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM plans WHERE plans.id = plan_progress.plan_id AND plans.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_progress" ON plan_progress;
CREATE POLICY "delete_own_progress" ON plan_progress FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM plans WHERE plans.id = plan_progress.plan_id AND plans.user_id = auth.uid())
  );