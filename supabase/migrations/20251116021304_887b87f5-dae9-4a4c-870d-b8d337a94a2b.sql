-- Add missing columns to chapters table for full chapter management
ALTER TABLE public.chapters 
ADD COLUMN IF NOT EXISTS parent_chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create index for parent-child relationships
CREATE INDEX IF NOT EXISTS idx_chapters_parent_id ON public.chapters(parent_chapter_id);

-- Update existing chapters to have display order
UPDATE public.chapters 
SET display_order = 0 
WHERE display_order IS NULL;