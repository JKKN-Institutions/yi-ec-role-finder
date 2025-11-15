-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'chair', 'co_chair', 'em', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Create verticals table
CREATE TABLE public.verticals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  display_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.verticals ENABLE ROW LEVEL SECURITY;

-- Create assessments table
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  status TEXT DEFAULT 'in_progress' NOT NULL CHECK (status IN ('in_progress', 'completed', 'analyzed')),
  current_question INTEGER DEFAULT 1 NOT NULL,
  review_status TEXT DEFAULT 'new' NOT NULL CHECK (review_status IN ('new', 'reviewed', 'shortlisted', 'rejected')),
  is_shortlisted BOOLEAN DEFAULT false NOT NULL,
  admin_notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- Create assessment_responses table
CREATE TABLE public.assessment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE NOT NULL,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  response_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(assessment_id, question_number)
);

ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;

-- Create assessment_results table
CREATE TABLE public.assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE NOT NULL UNIQUE,
  will_score INTEGER NOT NULL CHECK (will_score >= 0 AND will_score <= 100),
  skill_score INTEGER NOT NULL CHECK (skill_score >= 0 AND skill_score <= 100),
  quadrant TEXT NOT NULL CHECK (quadrant IN ('Q1', 'Q2', 'Q3', 'Q4')),
  recommended_role TEXT NOT NULL,
  role_explanation TEXT NOT NULL,
  vertical_matches TEXT[] NOT NULL DEFAULT '{}',
  leadership_style TEXT,
  recommendations JSONB NOT NULL DEFAULT '[]',
  reasoning TEXT,
  scoring_breakdown JSONB,
  key_insights JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for verticals (public read)
CREATE POLICY "Anyone can view active verticals"
  ON public.verticals FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage verticals"
  ON public.verticals FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- RLS Policies for assessments (anonymous can create/update their own)
CREATE POLICY "Anyone can create assessments"
  ON public.assessments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own in-progress assessments"
  ON public.assessments FOR UPDATE
  USING (status = 'in_progress');

CREATE POLICY "Users can view their own assessments"
  ON public.assessments FOR SELECT
  USING (true);

CREATE POLICY "Admins can update all assessments"
  ON public.assessments FOR UPDATE
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- RLS Policies for assessment_responses
CREATE POLICY "Anyone can create responses"
  ON public.assessment_responses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view responses for their assessment"
  ON public.assessment_responses FOR SELECT
  USING (true);

-- RLS Policies for assessment_results
CREATE POLICY "Anyone can view results"
  ON public.assessment_results FOR SELECT
  USING (true);

CREATE POLICY "System can create results"
  ON public.assessment_results FOR INSERT
  WITH CHECK (true);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_verticals_updated_at
  BEFORE UPDATE ON public.verticals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert default verticals
INSERT INTO public.verticals (name, description, display_order) VALUES
  ('Membership Growth', 'Focus on recruiting and retaining members', 1),
  ('Events & Programs', 'Plan and execute Yi events and programs', 2),
  ('Social Impact', 'Lead community service and social initiatives', 3),
  ('Communications', 'Manage Yi brand and communications', 4),
  ('Finance & Operations', 'Oversee financial management and operations', 5),
  ('Member Engagement', 'Foster member connections and engagement', 6);