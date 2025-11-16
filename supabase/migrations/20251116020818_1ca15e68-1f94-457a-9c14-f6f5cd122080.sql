-- Create chapters table for organizing assessments by location/division
CREATE TABLE IF NOT EXISTS public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  chapter_type TEXT DEFAULT 'regional',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active chapters
CREATE POLICY "Anyone can view active chapters"
ON public.chapters
FOR SELECT
USING (is_active = true);

-- Policy: Super admins can manage chapters
CREATE POLICY "Super admins can manage chapters"
ON public.chapters
FOR ALL
USING (is_super_admin(auth.uid()));

-- Add chapter_id to assessments table
ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id);

-- Add chapter_id to user_roles table
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_assessments_chapter_id ON public.assessments(chapter_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_chapter_id ON public.user_roles(chapter_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_chapters_updated_at
BEFORE UPDATE ON public.chapters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert Erode chapter as the first chapter
INSERT INTO public.chapters (name, slug, description, chapter_type)
VALUES (
  'Erode Chapter',
  'erode',
  'JKKN Institutions - Erode',
  'regional'
)
ON CONFLICT (name) DO NOTHING;