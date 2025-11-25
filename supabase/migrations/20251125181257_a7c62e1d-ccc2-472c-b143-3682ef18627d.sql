-- Create impersonation sessions table
CREATE TABLE public.impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  impersonated_user_id uuid NOT NULL,
  impersonated_user_email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  is_active boolean DEFAULT true
);

-- Enable RLS
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- Only super admins can view their own sessions
CREATE POLICY "Super admins can view their sessions"
ON public.impersonation_sessions FOR SELECT
USING (admin_user_id = auth.uid() AND is_super_admin(auth.uid()));

-- Only super admins can create sessions
CREATE POLICY "Super admins can create sessions"
ON public.impersonation_sessions FOR INSERT
WITH CHECK (admin_user_id = auth.uid() AND is_super_admin(auth.uid()));

-- Only super admins can update their sessions
CREATE POLICY "Super admins can update their sessions"
ON public.impersonation_sessions FOR UPDATE
USING (admin_user_id = auth.uid() AND is_super_admin(auth.uid()));

-- Create RPC function to get active impersonation session
CREATE OR REPLACE FUNCTION public.get_active_impersonation(_user_id uuid)
RETURNS TABLE(
  session_id uuid,
  impersonated_user_id uuid,
  impersonated_user_email text,
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return if the requesting user is a super admin
  IF NOT is_super_admin(_user_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    s.id as session_id,
    s.impersonated_user_id,
    s.impersonated_user_email,
    s.created_at,
    s.expires_at
  FROM impersonation_sessions s
  WHERE s.admin_user_id = _user_id
    AND s.is_active = true
    AND s.expires_at > now()
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$;

-- Create RPC function to start impersonation
CREATE OR REPLACE FUNCTION public.start_impersonation(
  _target_user_id uuid,
  _target_user_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _session_id uuid;
  _admin_id uuid;
BEGIN
  _admin_id := auth.uid();
  
  -- Validate caller is super admin
  IF NOT is_super_admin(_admin_id) THEN
    RAISE EXCEPTION 'Only super admins can impersonate users';
  END IF;

  -- Deactivate any existing sessions for this admin
  UPDATE impersonation_sessions
  SET is_active = false
  WHERE admin_user_id = _admin_id AND is_active = true;

  -- Create new session
  INSERT INTO impersonation_sessions (
    admin_user_id,
    impersonated_user_id,
    impersonated_user_email
  )
  VALUES (_admin_id, _target_user_id, _target_user_email)
  RETURNING id INTO _session_id;

  RETURN _session_id;
END;
$$;

-- Create RPC function to end impersonation
CREATE OR REPLACE FUNCTION public.end_impersonation()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE impersonation_sessions
  SET is_active = false
  WHERE admin_user_id = auth.uid() AND is_active = true;
  
  RETURN true;
END;
$$;