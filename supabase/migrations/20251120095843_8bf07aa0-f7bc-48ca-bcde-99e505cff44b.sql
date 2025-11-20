-- Allow admins to delete assessments
CREATE POLICY "Admins can delete assessments"
ON assessments
FOR DELETE
TO authenticated
USING (is_admin_user(auth.uid()));