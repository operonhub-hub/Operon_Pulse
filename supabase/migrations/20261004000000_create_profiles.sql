-- ==============================================================================
-- OperonPulse Phase 2 Migration: User Profiles, Roles & Row Level Security
-- ==============================================================================

-- 1. Create Profiles Table linked 1:1 with Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Comment on table and columns
COMMENT ON TABLE public.profiles IS 'User profile and role identity records for OperonPulse';
COMMENT ON COLUMN public.profiles.id IS 'References auth.users UUID 1:1';
COMMENT ON COLUMN public.profiles.role IS 'User authorization role: ADMIN or MEMBER';

-- Create index on email and role for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 2. Automatic updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 3. Automatic Profile Creation on User Sign-up / Creation in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    avatar_url,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'MEMBER', -- All new users default safely to MEMBER; ADMIN is promoted manually
    NEW.raw_user_meta_data->>'avatar_url',
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
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger firing on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Helper Function for Non-Recursive Admin Checks in RLS and Triggers
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- If not an authenticated session, return false
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 5. Role Immutability Protection Trigger
-- Prevents standard users from escalating their own or other users' roles
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.role IS DISTINCT FROM NEW.role) THEN
    -- Allow direct management in Supabase SQL Editor / Admin / Service Role
    IF current_user IN ('postgres', 'supabase_admin', 'service_role') AND auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;

    -- In authenticated user sessions, only ADMINs can modify roles
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Unauthorized: Only workspace administrators can modify user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_protect_profile_role ON public.profiles;
CREATE TRIGGER on_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can view team profiles
-- (Required for team execution views, task assignees, and team pulse in an internal team app)
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: Authenticated users can update their own safe profile fields
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 7. Explicit Least-Privilege Permissions
REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.profiles FROM authenticated;

-- Allow authenticated team members to read profiles for team directory & pulse
GRANT SELECT ON TABLE public.profiles TO authenticated;

-- Strictly restrict authenticated users to update ONLY their full_name column
GRANT UPDATE (full_name) ON TABLE public.profiles TO authenticated;

-- Grant full access to service_role for backend operations
GRANT ALL ON TABLE public.profiles TO service_role;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- ==============================================================================
-- 8. MANUAL FOUNDER/ADMIN SETUP (Run in Supabase SQL Editor after user creation)
-- ==============================================================================
-- Replace 'founder@operonpulse.io' with the actual founder/admin email:
--
-- UPDATE public.profiles
-- SET role = 'ADMIN', updated_at = now()
-- WHERE email = 'founder@operonpulse.io';
