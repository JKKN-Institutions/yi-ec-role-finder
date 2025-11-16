-- Add branding and customization columns to chapters table
ALTER TABLE public.chapters 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS primary_color TEXT,
ADD COLUMN IF NOT EXISTS secondary_color TEXT,
ADD COLUMN IF NOT EXISTS welcome_message TEXT;

COMMENT ON COLUMN public.chapters.logo_url IS 'URL to chapter logo image';
COMMENT ON COLUMN public.chapters.primary_color IS 'Primary brand color in hex format';
COMMENT ON COLUMN public.chapters.secondary_color IS 'Secondary brand color in hex format';
COMMENT ON COLUMN public.chapters.welcome_message IS 'Custom welcome message for candidates';