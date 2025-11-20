-- Create candidate_notes table
CREATE TABLE public.candidate_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_by_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.candidate_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can view and manage notes
CREATE POLICY "Admins can view all notes"
ON public.candidate_notes
FOR SELECT
TO authenticated
USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can insert notes"
ON public.candidate_notes
FOR INSERT
TO authenticated
WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Admins can update their own notes"
ON public.candidate_notes
FOR UPDATE
TO authenticated
USING (is_admin_user(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Admins can delete their own notes"
ON public.candidate_notes
FOR DELETE
TO authenticated
USING (is_admin_user(auth.uid()) AND created_by = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_candidate_notes_updated_at
BEFORE UPDATE ON public.candidate_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create index for faster queries
CREATE INDEX idx_candidate_notes_assessment_id ON public.candidate_notes(assessment_id);
CREATE INDEX idx_candidate_notes_created_by ON public.candidate_notes(created_by);