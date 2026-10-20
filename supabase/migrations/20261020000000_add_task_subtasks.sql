-- ==============================================================================
-- OperonPulse Migration: Task Subtasks & Checklist-Driven Progress
--
-- RUN MANUALLY in the Supabase SQL Editor of project ybjwkhflmykllduacuvh,
-- BEFORE deploying the app code that uses it. Paste this whole file and run it.
-- Depends on: 20261004000001 (tasks), 20261004000004 (rollover_task).
--
-- One transaction: it fully applies or fully fails. Safe to re-run
-- (IF NOT EXISTS / CREATE OR REPLACE / DROP ... IF EXISTS throughout).
-- ==============================================================================

BEGIN;

-- 1. Table ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0 AND length(title) <= 255),
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.task_subtasks IS 'Checklist items for a task; when any exist, tasks.progress is derived from them';
COMMENT ON COLUMN public.task_subtasks.position IS 'Sort order within the task (ascending)';
COMMENT ON COLUMN public.task_subtasks.completed_at IS 'Set when is_done becomes true; cleared when unticked (trigger-managed)';

CREATE INDEX IF NOT EXISTS idx_task_subtasks_task_position ON public.task_subtasks(task_id, position);

-- 2. Permission helpers -----------------------------------------------------------
-- Owner or admin: may insert, rename, reorder and delete subtasks.
CREATE OR REPLACE FUNCTION public.can_manage_task_subtasks(p_task_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN public.is_admin() OR EXISTS (
    SELECT 1 FROM public.tasks WHERE id = p_task_id AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Owner, support person or admin: may tick / untick subtasks.
CREATE OR REPLACE FUNCTION public.can_toggle_task_subtasks(p_task_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN public.is_admin() OR EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id = p_task_id
      AND (owner_id = auth.uid() OR support_person_id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 3. Row consistency: trimming, immutable fields, completed_at, structural-edit guard
CREATE OR REPLACE FUNCTION public.handle_subtask_consistency()
RETURNS TRIGGER AS $$
BEGIN
  NEW.title := trim(COALESCE(NEW.title, ''));
  IF NEW.title = '' THEN
    RAISE EXCEPTION 'Subtask title cannot be empty';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.task_id != OLD.task_id THEN
      RAISE EXCEPTION 'Subtask task_id is immutable';
    END IF;
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;

    -- Support people may only tick/untick. auth.uid() IS NULL = SQL editor / service role.
    -- (Deliberately not using current_user: inside SECURITY DEFINER it is always the owner.)
    IF (NEW.title IS DISTINCT FROM OLD.title OR NEW.position IS DISTINCT FROM OLD.position)
       AND auth.uid() IS NOT NULL
       AND NOT public.can_manage_task_subtasks(NEW.task_id) THEN
      RAISE EXCEPTION 'Only the task owner or an administrator can rename or reorder subtasks';
    END IF;

    IF NEW.is_done AND NOT OLD.is_done THEN
      NEW.completed_at := timezone('utc'::text, now());
    ELSIF NOT NEW.is_done THEN
      NEW.completed_at := NULL;
    ELSE
      NEW.completed_at := OLD.completed_at;
    END IF;

    NEW.updated_at := timezone('utc'::text, now());
  ELSE
    -- INSERT: keep a supplied completed_at (rollover copies), otherwise stamp now
    IF NEW.is_done THEN
      NEW.completed_at := COALESCE(NEW.completed_at, timezone('utc'::text, now()));
    ELSE
      NEW.completed_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_subtask_consistency ON public.task_subtasks;
CREATE TRIGGER on_subtask_consistency
  BEFORE INSERT OR UPDATE ON public.task_subtasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_subtask_consistency();

-- 4. Progress derivation on tasks ----------------------------------------------------
-- Runs after on_task_consistency and on_task_goal_week_check (triggers fire alphabetically).
-- When a task has subtasks, any written progress is replaced by round(done/total*100).
-- DONE keeps 100 (required by tasks_done_status_chk and handle_task_consistency).
-- Tasks without subtasks keep manual progress.
CREATE OR REPLACE FUNCTION public.apply_subtask_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_total INTEGER;
  v_done INTEGER;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE is_done)
    INTO v_total, v_done
  FROM public.task_subtasks
  WHERE task_id = NEW.id;

  IF v_total > 0 AND NEW.status <> 'DONE' THEN
    NEW.progress := round(v_done::numeric / v_total * 100)::INTEGER;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_task_subtask_progress ON public.tasks;
CREATE TRIGGER on_task_subtask_progress
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_subtask_progress();

-- 5. Subtask changes push status/progress onto the parent task ---------------------
--  * a subtask becoming done while the task is NOT_STARTED -> IN_PROGRESS
--  * [DECISION A] the task is DONE and now has an open subtask -> IN_PROGRESS
--  * all done -> progress 100, status unchanged (the UI offers "Mark task as Done?")
-- The UPDATE fires on_task_subtask_progress, which recalculates progress.
CREATE OR REPLACE FUNCTION public.sync_task_from_subtasks()
RETURNS TRIGGER AS $$
DECLARE
  v_task_id UUID := COALESCE(NEW.task_id, OLD.task_id);
  v_newly_done BOOLEAN := FALSE;
  v_has_open BOOLEAN;
BEGIN
  IF TG_OP <> 'DELETE' THEN
    v_newly_done := NEW.is_done AND (TG_OP = 'INSERT' OR NOT OLD.is_done);
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.task_subtasks WHERE task_id = v_task_id AND NOT is_done)
    INTO v_has_open;

  UPDATE public.tasks t
  SET status = CASE
        WHEN v_newly_done AND t.status = 'NOT_STARTED' THEN 'IN_PROGRESS'
        WHEN v_has_open AND t.status = 'DONE' THEN 'IN_PROGRESS'
        ELSE t.status
      END
  WHERE t.id = v_task_id;   -- no-op if the task itself is being deleted (cascade)

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_subtask_changed ON public.task_subtasks;
CREATE TRIGGER on_subtask_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.task_subtasks
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_task_from_subtasks();

-- 6. Row Level Security ---------------------------------------------------------------
ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_subtasks_select_policy" ON public.task_subtasks;
CREATE POLICY "task_subtasks_select_policy"
  ON public.task_subtasks FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "task_subtasks_insert_policy" ON public.task_subtasks;
CREATE POLICY "task_subtasks_insert_policy"
  ON public.task_subtasks FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.can_manage_task_subtasks(task_id));

-- Toggle rights (owner, support, admin); renames/reorders by support are blocked by the trigger
DROP POLICY IF EXISTS "task_subtasks_update_policy" ON public.task_subtasks;
CREATE POLICY "task_subtasks_update_policy"
  ON public.task_subtasks FOR UPDATE TO authenticated
  USING (public.can_toggle_task_subtasks(task_id))
  WITH CHECK (public.can_toggle_task_subtasks(task_id));

DROP POLICY IF EXISTS "task_subtasks_delete_policy" ON public.task_subtasks;
CREATE POLICY "task_subtasks_delete_policy"
  ON public.task_subtasks FOR DELETE TO authenticated
  USING (public.can_manage_task_subtasks(task_id));

-- 7. Least-privilege grants ---------------------------------------------------------
REVOKE ALL ON TABLE public.task_subtasks FROM anon;
REVOKE ALL ON TABLE public.task_subtasks FROM authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.task_subtasks TO authenticated;
GRANT UPDATE (title, is_done, position) ON TABLE public.task_subtasks TO authenticated;
GRANT ALL ON TABLE public.task_subtasks TO service_role;

REVOKE ALL ON FUNCTION public.can_manage_task_subtasks(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_toggle_task_subtasks(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_task_subtasks(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_toggle_task_subtasks(UUID) TO authenticated, service_role;

-- 8. rollover_task: identical to 20261004000004 except step 9b (copies subtasks) ----
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

  -- 9b. Copy subtasks (title, position, is_done) onto the carried task.
  --     Inserting them fires sync_task_from_subtasks, which recalculates progress.
  INSERT INTO public.task_subtasks (task_id, title, is_done, position, created_by, completed_at)
  SELECT v_new_task_id, s.title, s.is_done, s.position, v_caller_id, s.completed_at
  FROM public.task_subtasks s
  WHERE s.task_id = v_source.id
  ORDER BY s.position, s.created_at;

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

COMMIT;

-- Make the new table and functions visible to the Supabase API immediately
NOTIFY pgrst, 'reload schema';
