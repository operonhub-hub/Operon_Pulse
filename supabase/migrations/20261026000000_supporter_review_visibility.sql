-- ==============================================================================
-- OperonPulse Migration: Supporters can read review outcomes of tasks they support
--
-- RUN MANUALLY in the Supabase SQL Editor of project ybjwkhflmykllduacuvh,
-- BEFORE deploying the app code that uses it. Paste this whole file and run it.
-- Depends on: 20261004000004 (task_weekly_reviews).
--
-- Only the SELECT policy changes. Writing reviews (INSERT) stays owner/admin only,
-- and there is still no UPDATE or DELETE on reviews.
--
-- One transaction: it fully applies or fully fails. Safe to re-run.
-- ==============================================================================

BEGIN;

-- Previously: admin OR task owner. Now also the task's support person
-- (excluding the odd case where the owner is also listed as support).
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
        AND (
          tasks.owner_id = auth.uid()
          OR tasks.support_person_id = auth.uid()
        )
    )
  );

COMMENT ON POLICY "task_weekly_reviews_select_policy" ON public.task_weekly_reviews IS
  'Admins, the task owner and the task support person can read review outcomes (read-only for support)';

COMMIT;

-- Make the change visible to the Supabase API immediately
NOTIFY pgrst, 'reload schema';
