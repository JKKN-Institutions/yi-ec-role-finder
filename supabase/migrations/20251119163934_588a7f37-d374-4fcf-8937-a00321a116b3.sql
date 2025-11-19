-- Allow both admins and super admins to view assessment results
ALTER POLICY "Only admins can view results"
ON public.assessment_results
USING (is_admin_user(auth.uid()));