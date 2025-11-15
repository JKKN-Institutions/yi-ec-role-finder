-- Update RLS policy for assessment_results to be admin-only for SELECT
DROP POLICY IF EXISTS "Anyone can view results" ON public.assessment_results;

CREATE POLICY "Only admins can view results"
ON public.assessment_results
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);