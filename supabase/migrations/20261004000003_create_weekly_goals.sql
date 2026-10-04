-- ==============================================================================
-- OperonPulse Phase 5 Migration: Weekly Goals & Task-to-Goal Linking
-- ==============================================================================

-- 1. Create Weekly Goals Table
CREATE TABLE IF NOT EXISTS public.weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0 AND length(title) <= 255),
  description TEXT NULL,
  week_start DATE NOT NULL CHECK (EXTRACT(ISODOW FROM week_start) = 1),
  status TEXT NOT NULL DEFAULT 'ON_TRACK' CHECK (status IN ('ON_TRACK', 'AT_RISK', 'OFF_TRACK', 'ACHIEVED')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  owner_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_date DATE NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Target Date validation (must fall within the Monday–Sunday week of the goal)
  CONSTRAINT weekly_goals_target_date_chk CHECK (
    target_date IS NULL
    OR (target_date >= week_start AND target_date <= (week_start + INTERVAL '6 days')::DATE)
  )
);

-- Comments on table and columns
COMMENT ON TABLE public.weekly_goals IS 'High-priority company goals and deliverables for a weekly execution cycle';
COMMENT ON COLUMN public.weekly_goals.week_start IS 'Monday date (YYYY-MM-DD, ISODOW = 1) representing the goal week';
COMMENT ON COLUMN public.weekly_goals.owner_id IS 'Profile directly driving execution of this company goal';
COMMENT ON COLUMN public.weekly_goals.created_by IS 'Admin profile that created the goal (immutable)';

-- 2. Add goal_id to public.tasks table
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS goal_id UUID NULL REFERENCES public.weekly_goals(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.tasks.goal_id IS 'Optional link attaching task execution to a weekly company goal';

-- 3. Indexes for fast goal and task relationship lookups
CREATE INDEX IF NOT EXISTS idx_weekly_goals_week_start ON public.weekly_goals(week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_goals_owner ON public.weekly_goals(owner_id);
CREATE INDEX IF NOT EXISTS idx_weekly_goals_status ON public.weekly_goals(status);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON public.tasks(goal_id);

-- 4. Goal / Task Week Consistency & Immutability Trigger
CREATE OR REPLACE FUNCTION public.handle_goal_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Trim and validate title
  NEW.title = trim(COALESCE(NEW.title, ''));
  IF NEW.title = '' THEN
    RAISE EXCEPTION 'Goal title cannot be empty';
  END IF;

  -- Trim description if provided
  IF NEW.description IS NOT NULL THEN
    NEW.description = trim(NEW.description);
    IF NEW.description = '' THEN
      NEW.description = NULL;
    END IF;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    -- Immutable fields
    IF NEW.id != OLD.id THEN
      RAISE EXCEPTION 'Goal id is immutable';
    END IF;

    NEW.created_at = OLD.created_at;
    NEW.created_by = OLD.created_by;

    -- Prevent changing week_start if linked tasks already exist
    IF NEW.week_start != OLD.week_start THEN
      IF EXISTS (SELECT 1 FROM public.tasks WHERE goal_id = OLD.id) THEN
        RAISE EXCEPTION 'Cannot change goal week while linked tasks exist. Please unlink or reassign tasks first.';
      END IF;
    END IF;

    NEW.updated_at = timezone('utc'::text, now());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_goal_consistency ON public.weekly_goals;
CREATE TRIGGER on_goal_consistency
  BEFORE INSERT OR UPDATE ON public.weekly_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_goal_consistency();

-- 5. Cross-Week Task-Goal Verification Trigger on public.tasks
CREATE OR REPLACE FUNCTION public.verify_task_goal_week()
RETURNS TRIGGER AS $$
DECLARE
  v_goal_week DATE;
BEGIN
  IF NEW.goal_id IS NOT NULL THEN
    SELECT week_start INTO v_goal_week
    FROM public.weekly_goals
    WHERE id = NEW.goal_id;

    IF v_goal_week IS NULL THEN
      RAISE EXCEPTION 'Linked goal does not exist';
    END IF;

    IF v_goal_week != NEW.week_start THEN
      RAISE EXCEPTION 'Cross-week goal linking is not permitted: task week (%) must match goal week (%)', NEW.week_start, v_goal_week;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_task_goal_week_check ON public.tasks;
CREATE TRIGGER on_task_goal_week_check
  BEFORE INSERT OR UPDATE OF goal_id, week_start ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.verify_task_goal_week();

-- 6. Row Level Security (RLS) for Weekly Goals
ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT (All authenticated members and admins can view company goals)
DROP POLICY IF EXISTS "weekly_goals_select_policy" ON public.weekly_goals;
CREATE POLICY "weekly_goals_select_policy"
  ON public.weekly_goals
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: INSERT (Only ADMINs can create weekly company goals)
DROP POLICY IF EXISTS "weekly_goals_insert_policy" ON public.weekly_goals;
CREATE POLICY "weekly_goals_insert_policy"
  ON public.weekly_goals
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Policy 3: UPDATE (Only ADMINs can update weekly company goals)
DROP POLICY IF EXISTS "weekly_goals_update_policy" ON public.weekly_goals;
CREATE POLICY "weekly_goals_update_policy"
  ON public.weekly_goals
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Policy 4: DELETE (Only ADMINs can delete weekly company goals)
DROP POLICY IF EXISTS "weekly_goals_delete_policy" ON public.weekly_goals;
CREATE POLICY "weekly_goals_delete_policy"
  ON public.weekly_goals
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 7. Least-Privilege Permissions
REVOKE ALL ON TABLE public.weekly_goals FROM anon;
REVOKE ALL ON TABLE public.weekly_goals FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.weekly_goals TO authenticated;
GRANT ALL ON TABLE public.weekly_goals TO service_role;
