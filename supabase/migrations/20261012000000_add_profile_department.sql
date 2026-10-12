-- ==============================================================================
-- OperonPulse Phase 8.2 Migration: Team Member Department / Function
-- ==============================================================================

-- 1. Add optional department column to public.profiles with length constraint
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS department TEXT NULL;

-- Add check constraint for department length (1–100 characters if not null)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_department_length'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT chk_profiles_department_length
    CHECK (department IS NULL OR (length(trim(department)) BETWEEN 1 AND 100));
  END IF;
END $$;

-- 2. Add documentation comment on column
COMMENT ON COLUMN public.profiles.department IS 'Business function or department for workspace team member (e.g. Sales, Marketing, Engineering). Independent of permission role.';

-- 3. Update automatic profile creation trigger to populate department from raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    avatar_url,
    department,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'MEMBER', -- All new users default safely to MEMBER; ADMIN is promoted manually
    NEW.raw_user_meta_data->>'avatar_url',
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'department', '')), ''),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE 
      WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' 
      THEN EXCLUDED.full_name 
      ELSE public.profiles.full_name 
    END,
    department = CASE
      WHEN public.profiles.department IS NULL
      THEN EXCLUDED.department
      ELSE public.profiles.department
    END,
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Note on Security & Column Grants:
-- In 20261004000000_create_profiles.sql:
-- REVOKE ALL ON TABLE public.profiles FROM authenticated;
-- GRANT SELECT ON TABLE public.profiles TO authenticated;
-- GRANT UPDATE (full_name) ON TABLE public.profiles TO authenticated;
-- Because UPDATE is granted ONLY on full_name, authenticated users CANNOT update department directly.
-- All department mutations MUST occur through trusted ADMIN server actions using service_role.
