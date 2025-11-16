-- Create admin_preferences table for storing user preferences
CREATE TABLE IF NOT EXISTS public.admin_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  notification_preferences JSONB DEFAULT '{
    "email_new_assessments": true,
    "email_pending_reviews": true,
    "browser_notifications": true,
    "daily_digest": false
  }'::jsonb,
  default_filters JSONB DEFAULT '{
    "status": "all",
    "review_status": "all",
    "show_shortlisted_only": false
  }'::jsonb,
  dashboard_layout JSONB DEFAULT '{
    "widgets": ["top_chapters", "recent_trends", "key_metrics"],
    "widget_order": ["top_chapters", "recent_trends", "key_metrics"]
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own preferences
CREATE POLICY "Users can view their own preferences"
ON public.admin_preferences
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert their own preferences"
ON public.admin_preferences
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update their own preferences"
ON public.admin_preferences
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_admin_preferences_user_id ON public.admin_preferences(user_id);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_admin_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_preferences_updated_at
BEFORE UPDATE ON public.admin_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_admin_preferences_updated_at();