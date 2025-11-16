-- Set replica identity for complete row data (safe to run even if already set)
ALTER TABLE public.assessments REPLICA IDENTITY FULL;
ALTER TABLE public.user_roles REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.admin_audit_log REPLICA IDENTITY FULL;

-- Try to add tables to realtime publication (will skip if already added)
DO $$
BEGIN
  -- Add user_roles if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'user_roles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
  END IF;

  -- Add profiles if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;

  -- Add admin_audit_log if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'admin_audit_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_audit_log;
  END IF;
END $$;