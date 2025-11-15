-- Create candidate feedback table for tracking post-hire outcomes
CREATE TABLE public.candidate_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  
  -- AI vs Actual
  ai_recommended_role TEXT NOT NULL,
  ai_recommended_vertical TEXT,
  actual_role_assigned TEXT NOT NULL,
  actual_vertical_assigned UUID REFERENCES public.verticals(id),
  
  -- Accuracy assessment
  ai_accuracy TEXT NOT NULL CHECK (ai_accuracy IN ('accurate', 'partial', 'inaccurate')),
  override_reasoning TEXT,
  hire_confidence TEXT NOT NULL CHECK (hire_confidence IN ('high', 'medium', 'low')),
  hire_date DATE NOT NULL,
  
  -- 6-month review
  six_month_review_date DATE,
  six_month_performance_rating INTEGER CHECK (six_month_performance_rating >= 1 AND six_month_performance_rating <= 5),
  is_still_active BOOLEAN,
  performance_notes TEXT,
  role_change TEXT,
  
  -- Meta
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.candidate_feedback ENABLE ROW LEVEL SECURITY;

-- Admins can manage feedback
CREATE POLICY "Admins can manage candidate feedback"
ON public.candidate_feedback
FOR ALL
TO authenticated
USING (is_admin_user(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_candidate_feedback_updated_at
BEFORE UPDATE ON public.candidate_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Add indexes
CREATE INDEX idx_candidate_feedback_assessment_id ON public.candidate_feedback(assessment_id);
CREATE INDEX idx_candidate_feedback_hire_date ON public.candidate_feedback(hire_date);
CREATE INDEX idx_candidate_feedback_ai_accuracy ON public.candidate_feedback(ai_accuracy);
CREATE INDEX idx_candidate_feedback_review_date ON public.candidate_feedback(six_month_review_date);