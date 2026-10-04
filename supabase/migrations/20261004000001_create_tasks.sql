-- ==============================================================================
-- OperonPulse Phase 3 Migration: Weekly Tasks Management
-- ==============================================================================

-- 1. Create Tasks Table with Strict Constraints
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0 AND length(title) <= 255),
  description TEXT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  support_person_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  due_date DATE NULL,
  week_start DATE NOT NULL CHECK (EXTRACT(ISODOW FROM week_start) = 1),
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  blocker_reason TEXT NULL,
  acceptance_criteria TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Blocker & Status Consistency Constraints
  CONSTRAINT tasks_blocked_status_chk CHECK (
    (status = 'BLOCKED' AND is_blocked = TRUE) OR (status != 'BLOCKED')
  ),
  CONSTRAINT tasks_blocker_reason_chk CHECK (
    (is_blocked = TRUE AND blocker_reason IS NOT NULL AND length(trim(blocker_reason)) > 0)
    OR (is_blocked = FALSE AND blocker_reason IS NULL)
  ),
  CONSTRAINT tasks_done_status_chk CHECK (
    (status = 'DONE' AND progress = 100 AND is_blocked = FALSE AND blocker_reason IS NULL)
    OR (status != 'DONE')
  )
);

-- Comments on table and columns
COMMENT ON TABLE public.tasks IS 'Weekly task commitments and execution items for OperonPulse';
COMMENT ON COLUMN public.tasks.week_start IS 'Monday date (YYYY-MM-DD, ISODOW = 1) representing the execution week cycle';
COMMENT ON COLUMN public.tasks.owner_id IS 'Profile responsible for executing the task';
COMMENT ON COLUMN public.tasks.created_by IS 'Profile that created the task (immutable audit field)';
COMMENT ON COLUMN public.tasks.support_person_id IS 'Optional teammate assisting on the task';

-- 2. Indexes for fast weekly and owner queries
CREATE INDEX IF NOT EXISTS idx_tasks_owner_week ON public.tasks(owner_id, week_start);
CREATE INDEX IF NOT EXISTS idx_tasks_week_start ON public.tasks(week_start);
CREATE INDEX IF NOT EXISTS idx_tasks_week_status ON public.tasks(week_start, status);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_is_blocked ON public.tasks(is_blocked);
CREATE INDEX IF NOT EXISTS idx_tasks_support_person ON public.tasks(support_person_id);

-- 3. Business Logic, Status, Progress & Immutability Trigger
CREATE OR REPLACE FUNCTION public.handle_task_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate and trim title
  NEW.title = trim(COALESCE(NEW.title, ''));
  IF NEW.title = '' THEN
    RAISE EXCEPTION 'Task title cannot be empty';
  END IF;

  -- Trim acceptance criteria and description if present
  IF NEW.description IS NOT NULL THEN
    NEW.description = trim(NEW.description);
    IF NEW.description = '' THEN
      NEW.description = NULL;
    END IF;
  END IF;

  IF NEW.acceptance_criteria IS NOT NULL THEN
    NEW.acceptance_criteria = trim(NEW.acceptance_criteria);
    IF NEW.acceptance_criteria = '' THEN
      NEW.acceptance_criteria = NULL;
    END IF;
  END IF;

  -- Status / Progress / Blocker consistency rules:
  -- 1. When status is DONE: auto-set progress to 100%, clear blocked state
  IF NEW.status = 'DONE' THEN
    NEW.progress = 100;
    NEW.is_blocked = FALSE;
    NEW.blocker_reason = NULL;
  END IF;

  -- 2. When status is BLOCKED: force is_blocked flag to true
  IF NEW.status = 'BLOCKED' THEN
    NEW.is_blocked = TRUE;
  END IF;

  -- 3. When is_blocked is TRUE: require a non-empty blocker_reason
  IF NEW.is_blocked = TRUE THEN
    NEW.blocker_reason = trim(COALESCE(NEW.blocker_reason, ''));
    IF NEW.blocker_reason = '' THEN
      RAISE EXCEPTION 'A blocker reason is required when a task is marked as blocked';
    END IF;
  ELSE
    -- If not blocked: ensure status is not BLOCKED and clear blocker_reason
    IF NEW.status = 'BLOCKED' THEN
      NEW.status = 'IN_PROGRESS';
    END IF;
    NEW.blocker_reason = NULL;
  END IF;

  -- On UPDATE operations:
  IF (TG_OP = 'UPDATE') THEN
    -- Ensure task id cannot be changed
    IF NEW.id != OLD.id THEN
      RAISE EXCEPTION 'Task id is immutable';
    END IF;

    -- Ensure created_at cannot be rewritten
    NEW.created_at = OLD.created_at;

    -- Keep created_by strictly immutable for all users
    NEW.created_by = OLD.created_by;

    -- Prevent non-admin members from reassigning task ownership
    IF (OLD.owner_id != NEW.owner_id) THEN
      IF current_user NOT IN ('postgres', 'supabase_admin', 'service_role') AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only workspace administrators can reassign task ownership';
      END IF;
    END IF;

    -- Update timestamp
    NEW.updated_at = timezone('utc'::text, now());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_task_consistency ON public.tasks;
CREATE TRIGGER on_task_consistency
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_consistency();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT
-- Phase 3 Scope: MEMBER can only view tasks they own; ADMIN can view all tasks
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
CREATE POLICY "tasks_select_policy"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = owner_id
    OR public.is_admin()
  );

-- Policy 2: INSERT
-- MEMBER creates tasks for themselves (owner_id = auth.uid(), created_by = auth.uid());
-- ADMIN can create tasks for any valid profile (created_by = auth.uid())
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
CREATE POLICY "tasks_insert_policy"
  ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = owner_id AND auth.uid() = created_by)
    OR (public.is_admin() AND auth.uid() = created_by)
  );

-- Policy 3: UPDATE
-- MEMBER can only update tasks they own; ADMIN can update any task
DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
CREATE POLICY "tasks_update_policy"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = owner_id
    OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR public.is_admin()
  );

-- Policy 4: DELETE
-- MEMBER can only delete tasks they own; ADMIN can delete any task
DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;
CREATE POLICY "tasks_delete_policy"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = owner_id
    OR public.is_admin()
  );

-- 5. Explicit Least-Privilege Permissions
REVOKE ALL ON TABLE public.tasks FROM anon;
REVOKE ALL ON TABLE public.tasks FROM authenticated;

-- Allow authenticated users to perform CRUD on tasks governed strictly by RLS policies
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO authenticated;

-- Full access for service_role
GRANT ALL ON TABLE public.tasks TO service_role;
