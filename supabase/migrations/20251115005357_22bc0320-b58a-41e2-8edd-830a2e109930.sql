-- Create validation metrics table for tracking AI prediction accuracy
CREATE TABLE public.validation_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  ai_recommended_role TEXT NOT NULL,
  actual_role_assigned TEXT,
  match_status TEXT CHECK (match_status IN ('accurate', 'partial', 'inaccurate')),
  override_reasoning TEXT,
  hire_date TIMESTAMP WITH TIME ZONE,
  performance_rating INTEGER CHECK (performance_rating >= 1 AND performance_rating <= 5),
  still_active BOOLEAN DEFAULT true,
  retention_6_month BOOLEAN,
  admin_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.validation_metrics ENABLE ROW LEVEL SECURITY;

-- Admins can manage validation data
CREATE POLICY "Admins can manage validation metrics"
ON public.validation_metrics
FOR ALL
TO authenticated
USING (is_admin_user(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_validation_metrics_updated_at
BEFORE UPDATE ON public.validation_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Add index for faster queries
CREATE INDEX idx_validation_metrics_assessment_id ON public.validation_metrics(assessment_id);
CREATE INDEX idx_validation_metrics_match_status ON public.validation_metrics(match_status);
CREATE INDEX idx_validation_metrics_hire_date ON public.validation_metrics(hire_date);