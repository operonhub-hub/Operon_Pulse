-- ==============================================================================
-- OperonPulse Phase 6 Migration: Weekly Review, Task Rollover & Check-ins
-- ==============================================================================

-- 1. Extend public.tasks with Rollover & Carryover Lineage Fields
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS carried_from_task_id UUID NULL REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rollover_count INTEGER NOT NULL DEFAULT 0 CHECK (rollover_count >= 0),
  ADD COLUMN IF NOT EXISTS rollover_note TEXT NULL;

COMMENT ON COLUMN public.tasks.carried_from_task_id IS 'ID of the source task in the previous week from which this task was carried forward';
COMMENT ON COLUMN public.tasks.rollover_count IS 'Number of times this task lineage has been carried forward across weekly cycles';
COMMENT ON COLUMN public.tasks.rollover_note IS 'Optional context or reason for rolling the task into a new execution week';

-- Index for lineage queries
CREATE INDEX IF NOT EXISTS idx_tasks_carried_from ON public.tasks(carried_from_task_id);

-- 2. Create Task Weekly Reviews Table (Audit Trail of End-of-Week Decisions)
CREATE TABLE IF NOT EXISTS public.task_weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE RESTRICT,
  week_start DATE NOT NULL CHECK (EXTRACT(ISODOW FROM week_start) = 1),
  outcome TEXT NOT NULL CHECK (outcome IN ('CARRY_FORWARD', 'CANCEL', 'REASSIGN', 'KEEP_IN_WEEK')),
  note TEXT NULL,
  reviewed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Enforce one recorded review decision per task per source week
  CONSTRAINT task_weekly_reviews_task_week_uniq UNIQUE (task_id, week_start)
);

COMMENT ON TABLE public.task_weekly_reviews IS 'Immutable historical audit record of end-of-week decisions made on tasks';
COMMENT ON COLUMN public.task_weekly_reviews.task_id IS 'Source task being reviewed (RESTRICT prevents deleting reviewed tasks)';
COMMENT ON COLUMN public.task_weekly_reviews.week_start IS 'Source week of the task under review';
COMMENT ON COLUMN public.task_weekly_reviews.outcome IS 'Explicit decision: CARRY_FORWARD, CANCEL, REASSIGN, or KEEP_IN_WEEK';
COMMENT ON COLUMN public.task_weekly_reviews.reviewed_by IS 'Profile of the member or admin who made the review decision';

-- Indexes for review lookups
CREATE INDEX IF NOT EXISTS idx_task_weekly_reviews_week ON public.task_weekly_reviews(week_start);
CREATE INDEX IF NOT EXISTS idx_task_weekly_reviews_task ON public.task_weekly_reviews(task_id);
CREATE INDEX IF NOT EXISTS idx_task_weekly_reviews_user ON public.task_weekly_reviews(reviewed_by);

-- Trigger to verify review week_start matches source task week_start
CREATE OR REPLACE FUNCTION public.verify_review_week_consistency()
RETURNS TRIGGER AS $$
DECLARE
  v_task_week DATE;
BEGIN
  SELECT week_start INTO v_task_week
  FROM public.tasks
  WHERE id = NEW.task_id;

  IF v_task_week IS NULL THEN
    RAISE EXCEPTION 'Referenced task not found';
  END IF;

  IF v_task_week != NEW.week_start THEN
    RAISE EXCEPTION 'Review week (%) must match task week (%)', NEW.week_start, v_task_week;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_review_week_check ON public.task_weekly_reviews;
CREATE TRIGGER on_review_week_check
  BEFORE INSERT OR UPDATE ON public.task_weekly_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.verify_review_week_consistency();

-- 3. Create Weekly Check-ins Table
CREATE TABLE IF NOT EXISTS public.weekly_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL CHECK (EXTRACT(ISODOW FROM week_start) = 1),
  completed_summary TEXT NULL,
  incomplete_summary TEXT NULL,
  blockers_summary TEXT NULL,
  next_week_focus TEXT NULL,
  is_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at TIMESTAMPTZ NULL DEFAULT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- One check-in per member per weekly cycle
  CONSTRAINT weekly_checkins_user_week_uniq UNIQUE (user_id, week_start)
);

COMMENT ON TABLE public.weekly_checkins IS 'Weekly self-reflection and alignment check-ins submitted by team members';
COMMENT ON COLUMN public.weekly_checkins.user_id IS 'Profile submitting the weekly check-in';
COMMENT ON COLUMN public.weekly_checkins.week_start IS 'Monday date of the sprint week being reviewed';
COMMENT ON COLUMN public.weekly_checkins.is_submitted IS 'Flag indicating whether check-in is officially submitted vs draft';

-- Indexes for check-in queries
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_user ON public.weekly_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_week ON public.weekly_checkins(week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_submitted ON public.weekly_checkins(is_submitted);

-- Immutability and updated-at trigger for check-ins
CREATE OR REPLACE FUNCTION public.handle_checkin_consistency()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF NEW.id != OLD.id THEN
      RAISE EXCEPTION 'Check-in id is immutable';
    END IF;
    IF NEW.user_id != OLD.user_id THEN
      RAISE EXCEPTION 'Check-in user_id is immutable';
    END IF;
    IF NEW.week_start != OLD.week_start THEN
      RAISE EXCEPTION 'Check-in week_start is immutable';
    END IF;

    -- Manage submitted_at timestamp
    IF NEW.is_submitted AND NOT OLD.is_submitted THEN
      NEW.submitted_at := timezone('utc'::text, now());
    ELSIF NOT NEW.is_submitted THEN
      NEW.submitted_at := NULL;
    ELSE
      -- Preserve original submitted_at if updating an already-submitted checkin
      NEW.submitted_at := COALESCE(OLD.submitted_at, timezone('utc'::text, now()));
    END IF;
  ELSE
    -- INSERT
    IF NEW.is_submitted AND NEW.submitted_at IS NULL THEN
      NEW.submitted_at := timezone('utc'::text, now());
    ELSIF NOT NEW.is_submitted THEN
      NEW.submitted_at := NULL;
    END IF;
  END IF;

  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_checkin_consistency ON public.weekly_checkins;
CREATE TRIGGER on_checkin_consistency
  BEFORE INSERT OR UPDATE ON public.weekly_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_checkin_consistency();

-- 4. Atomic Task Rollover RPC Function
CREATE OR REPLACE FUNCTION public.rollover_task(
  p_task_id UUID,
  p_target_week DATE,
  p_note TEXT DEFAULT NULL,
  p_new_owner_id UUID DEFAULT NULL,
  p_new_goal_id UUID DEFAULT NULL,
  p_due_date DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_caller_id UUID;
  v_is_admin BOOLEAN;
  v_source public.tasks%ROWTYPE;
  v_new_task_id UUID;
  v_target_owner_id UUID;
  v_target_status TEXT;
  v_review_outcome TEXT;
  v_goal_week DATE;
  v_owner_exists BOOLEAN;
BEGIN
  -- 1. Identify caller and authorization
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_is_admin := public.is_admin();

  -- 2. Fetch and validate source task
  SELECT * INTO v_source
  FROM public.tasks
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source task not found';
  END IF;

  -- 3. Check ownership / admin permissions
  IF NOT v_is_admin AND v_source.owner_id != v_caller_id THEN
    RAISE EXCEPTION 'Permission denied: You can only roll over tasks you own';
  END IF;

  -- 4. Completed tasks cannot be rolled over
  IF v_source.status = 'DONE' THEN
    RAISE EXCEPTION 'Completed tasks cannot be carried forward';
  END IF;

  -- 5. Target week validation (must be a Monday and strictly later than source week)
  IF EXTRACT(ISODOW FROM p_target_week) != 1 THEN
    RAISE EXCEPTION 'Target week must be a Monday (ISODOW = 1)';
  END IF;

  IF p_target_week <= v_source.week_start THEN
    RAISE EXCEPTION 'Target week (%) must be later than source week (%)', p_target_week, v_source.week_start;
  END IF;

  -- 6. Ownership assignment validation
  IF p_new_owner_id IS NOT NULL AND p_new_owner_id != v_source.owner_id THEN
    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'Permission denied: Only workspace administrators can reassign task ownership during rollover';
    END IF;

    -- Validate target owner profile exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_new_owner_id) INTO v_owner_exists;
    IF NOT v_owner_exists THEN
      RAISE EXCEPTION 'Assigned new owner does not exist';
    END IF;

    v_target_owner_id := p_new_owner_id;
    v_review_outcome := 'REASSIGN';
  ELSE
    v_target_owner_id := v_source.owner_id;
    v_review_outcome := 'CARRY_FORWARD';
  END IF;

  -- 7. Validate new goal if provided (must belong to target week)
  IF p_new_goal_id IS NOT NULL THEN
    SELECT week_start INTO v_goal_week
    FROM public.weekly_goals
    WHERE id = p_new_goal_id;

    IF v_goal_week IS NULL THEN
      RAISE EXCEPTION 'Selected goal does not exist';
    END IF;

    IF v_goal_week != p_target_week THEN
      RAISE EXCEPTION 'Selected goal belongs to week %, but target week is %', v_goal_week, p_target_week;
    END IF;
  END IF;

  -- 8. Determine target task status
  IF v_source.status = 'BLOCKED' THEN
    v_target_status := 'BLOCKED';
  ELSIF v_source.status IN ('IN_PROGRESS', 'IN_REVIEW') THEN
    v_target_status := 'IN_PROGRESS';
  ELSE
    v_target_status := 'NOT_STARTED';
  END IF;

  -- 9. Insert new carried task record into target week
  INSERT INTO public.tasks (
    title,
    description,
    acceptance_criteria,
    priority,
    status,
    progress,
    is_blocked,
    blocker_reason,
    week_start,
    due_date,
    owner_id,
    support_person_id,
    goal_id,
    carried_from_task_id,
    rollover_count,
    rollover_note,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    v_source.title,
    v_source.description,
    v_source.acceptance_criteria,
    v_source.priority,
    v_target_status,
    v_source.progress,
    CASE WHEN v_target_status = 'BLOCKED' THEN true ELSE false END,
    CASE WHEN v_target_status = 'BLOCKED' THEN v_source.blocker_reason ELSE NULL END,
    p_target_week,
    p_due_date,
    v_target_owner_id,
    v_source.support_person_id,
    p_new_goal_id,
    v_source.id,
    v_source.rollover_count + 1,
    p_note,
    v_caller_id,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  RETURNING id INTO v_new_task_id;

  -- 10. Record immutable review outcome for source task (Pure INSERT; duplicates fail via UNIQUE constraint)
  INSERT INTO public.task_weekly_reviews (
    task_id,
    week_start,
    outcome,
    note,
    reviewed_by,
    created_at
  ) VALUES (
    v_source.id,
    v_source.week_start,
    v_review_outcome,
    p_note,
    v_caller_id,
    timezone('utc'::text, now())
  );

  RETURN v_new_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Row Level Security (RLS) Configuration

-- Enable RLS on task_weekly_reviews
ALTER TABLE public.task_weekly_reviews ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Members can view reviews for tasks they own; Admins can view all reviews
DROP POLICY IF EXISTS "task_weekly_reviews_select_policy" ON public.task_weekly_reviews;
CREATE POLICY "task_weekly_reviews_select_policy"
  ON public.task_weekly_reviews
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_weekly_reviews.task_id
        AND tasks.owner_id = auth.uid()
    )
  );

-- INSERT policy: Members can only review own tasks with reviewed_by = auth.uid(); Admins can review all tasks
DROP POLICY IF EXISTS "task_weekly_reviews_insert_policy" ON public.task_weekly_reviews;
CREATE POLICY "task_weekly_reviews_insert_policy"
  ON public.task_weekly_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewed_by = auth.uid()
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.tasks
        WHERE tasks.id = task_weekly_reviews.task_id
          AND tasks.owner_id = auth.uid()
      )
    )
  );

-- Enable RLS on weekly_checkins
ALTER TABLE public.weekly_checkins ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Members can view own check-ins; Admins can view all check-ins
DROP POLICY IF EXISTS "weekly_checkins_select_policy" ON public.weekly_checkins;
CREATE POLICY "weekly_checkins_select_policy"
  ON public.weekly_checkins
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
  );

-- INSERT policy: Users can insert only their own check-in
DROP POLICY IF EXISTS "weekly_checkins_insert_policy" ON public.weekly_checkins;
CREATE POLICY "weekly_checkins_insert_policy"
  ON public.weekly_checkins
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE policy: Users can update only their own check-in
DROP POLICY IF EXISTS "weekly_checkins_update_policy" ON public.weekly_checkins;
CREATE POLICY "weekly_checkins_update_policy"
  ON public.weekly_checkins
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 6. Least-Privilege Grants
REVOKE ALL ON TABLE public.task_weekly_reviews FROM anon;
REVOKE ALL ON TABLE public.task_weekly_reviews FROM authenticated;
GRANT SELECT, INSERT ON TABLE public.task_weekly_reviews TO authenticated;
GRANT ALL ON TABLE public.task_weekly_reviews TO service_role;

REVOKE ALL ON TABLE public.weekly_checkins FROM anon;
REVOKE ALL ON TABLE public.weekly_checkins FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.weekly_checkins TO authenticated;
GRANT ALL ON TABLE public.weekly_checkins TO service_role;

REVOKE ALL ON FUNCTION public.rollover_task FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rollover_task TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollover_task TO service_role;
