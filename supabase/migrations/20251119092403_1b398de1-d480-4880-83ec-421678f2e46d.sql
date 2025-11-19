-- Create candidate tags table
CREATE TABLE public.candidate_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  category TEXT NOT NULL DEFAULT 'general', -- 'favorite', 'hiring_round', 'position', 'vertical'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assessment_tags junction table
CREATE TABLE public.assessment_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.candidate_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.candidate_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for candidate_tags
CREATE POLICY "Admins can manage tags"
ON public.candidate_tags
FOR ALL
USING (is_admin_user(auth.uid()));

CREATE POLICY "Anyone can view tags"
ON public.candidate_tags
FOR SELECT
USING (true);

-- RLS Policies for assessment_tags
CREATE POLICY "Admins can manage assessment tags"
ON public.assessment_tags
FOR ALL
USING (is_admin_user(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_candidate_tags_updated_at
BEFORE UPDATE ON public.candidate_tags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert default tags
INSERT INTO public.candidate_tags (name, color, category) VALUES
  ('Favorite', '#F59E0B', 'favorite'),
  ('Round 1', '#10B981', 'hiring_round'),
  ('Round 2', '#3B82F6', 'hiring_round'),
  ('Final Round', '#8B5CF6', 'hiring_round'),
  ('Chair Position', '#EF4444', 'position'),
  ('Co-Chair Position', '#F97316', 'position'),
  ('EC Member', '#06B6D4', 'position'),
  ('Education Vertical', '#84CC16', 'vertical'),
  ('Health Vertical', '#22C55E', 'vertical'),
  ('Environment Vertical', '#14B8A6', 'vertical');

-- Create index for performance
CREATE INDEX idx_assessment_tags_assessment_id ON public.assessment_tags(assessment_id);
CREATE INDEX idx_assessment_tags_tag_id ON public.assessment_tags(tag_id);