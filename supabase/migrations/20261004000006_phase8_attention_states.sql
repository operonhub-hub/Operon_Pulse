-- ==============================================================================
-- Migration: 20261004000006_phase8_attention_states.sql
-- Description: Phase 8 - In-App Notifications & Attention Interaction States
--
-- DO NOT RUN AUTOMATICALLY ON PRODUCTION.
-- User approval required before execution.
-- ==============================================================================

-- 1. Create table for attention interaction state (read, dismissed)
CREATE TABLE IF NOT EXISTS public.attention_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attention_key TEXT NOT NULL CHECK (length(trim(attention_key)) > 0 AND length(attention_key) <= 255),
  read_at TIMESTAMPTZ NULL,
  dismissed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT attention_states_user_key_unique UNIQUE (user_id, attention_key)
);

-- 2. Performance index for user-scoped lookups
CREATE INDEX IF NOT EXISTS idx_attention_states_user_id ON public.attention_states(user_id);

-- 3. Trigger for updated_at
DROP TRIGGER IF EXISTS handle_updated_at_attention_states ON public.attention_states;
CREATE TRIGGER handle_updated_at_attention_states
  BEFORE UPDATE ON public.attention_states
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. Enable Row Level Security
ALTER TABLE public.attention_states ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (Strictly user-scoped, personal UI interaction state)
DROP POLICY IF EXISTS "Users can view own attention states" ON public.attention_states;
CREATE POLICY "Users can view own attention states"
  ON public.attention_states
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own attention states" ON public.attention_states;
CREATE POLICY "Users can insert own attention states"
  ON public.attention_states
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own attention states" ON public.attention_states;
CREATE POLICY "Users can update own attention states"
  ON public.attention_states
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Explicitly disallow anonymous access
REVOKE ALL ON public.attention_states FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.attention_states TO authenticated;
