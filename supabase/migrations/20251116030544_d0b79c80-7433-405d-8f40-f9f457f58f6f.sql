-- Create function to get user by email for impersonation
CREATE OR REPLACE FUNCTION public.get_user_by_email(user_email text)
RETURNS TABLE(id uuid, email text) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, email 
  FROM auth.users 
  WHERE email = user_email
  LIMIT 1;
$$;