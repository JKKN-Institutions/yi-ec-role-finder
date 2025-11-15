-- Enable realtime for assessments table
ALTER TABLE public.assessments REPLICA IDENTITY FULL;

-- Add the assessments table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.assessments;