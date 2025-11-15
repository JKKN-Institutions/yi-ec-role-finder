-- Add reviewed_by and reviewed_at columns to assessments table
ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;