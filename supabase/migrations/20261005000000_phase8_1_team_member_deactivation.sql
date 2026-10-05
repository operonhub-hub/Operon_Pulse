-- ==============================================================================
-- OperonPulse Phase 8.1 Migration: Team Member Deactivation & Access Control
-- ==============================================================================

-- 1. Add is_active column to public.profiles with default TRUE
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Add comment explaining column intent
COMMENT ON COLUMN public.profiles.is_active IS 'Active status for team workspace access. Set to false to deactivate member without deleting historical records.';

-- 3. Note on Row Level Security & Column Grants:
-- In 20261004000000_create_profiles.sql:
-- REVOKE ALL ON TABLE public.profiles FROM authenticated;
-- GRANT SELECT ON TABLE public.profiles TO authenticated;
-- GRANT UPDATE (full_name) ON TABLE public.profiles TO authenticated;
-- Because UPDATE is granted ONLY on full_name, authenticated users CANNOT update is_active.
-- All deactivation and reactivation updates MUST occur via service_role server actions.
