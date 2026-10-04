-- ==============================================================================
-- OperonPulse Phase 4 Migration: Team Board Shared Visibility
-- ==============================================================================

-- 1. Update SELECT policy on public.tasks
-- In Phase 4, all authenticated team members can view all tasks across the workspace
-- to enable the shared Team Board, collaborative sprint planning, and blocker tracking.
-- Write permissions (INSERT, UPDATE, DELETE) and audit immutability triggers remain strictly protected.

DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;

CREATE POLICY "tasks_select_policy"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON POLICY "tasks_select_policy" ON public.tasks IS 'Allows all authenticated workspace members to view team tasks on the shared Team Board';
