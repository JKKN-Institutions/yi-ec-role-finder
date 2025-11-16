-- First, verify super_admin exists in app_role enum, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'super_admin' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'super_admin';
  END IF;
END $$;

-- Create is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'::app_role
  );
END;
$$;

-- Create get_user_chapters function for regular admins
CREATE OR REPLACE FUNCTION public.get_user_chapters(_user_id UUID)
RETURNS TABLE(
  chapter_id UUID,
  chapter_name TEXT,
  chapter_type TEXT,
  role TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as chapter_id,
    c.name as chapter_name,
    c.chapter_type::text as chapter_type,
    ur.role::text as role
  FROM user_roles ur
  JOIN chapters c ON ur.chapter_id = c.id
  WHERE ur.user_id = _user_id
  ORDER BY c.name;
END;
$$;