-- Fix search_path for update_admin_preferences_updated_at function
DROP TRIGGER IF EXISTS update_admin_preferences_updated_at ON public.admin_preferences;
DROP FUNCTION IF EXISTS public.update_admin_preferences_updated_at();

CREATE OR REPLACE FUNCTION public.update_admin_preferences_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_admin_preferences_updated_at
BEFORE UPDATE ON public.admin_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_admin_preferences_updated_at();