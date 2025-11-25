-- Create rate_limits table for server-side rate limiting
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX idx_rate_limits_key ON public.rate_limits(key);
CREATE INDEX idx_rate_limits_reset_at ON public.rate_limits(reset_at);

-- Enable RLS - only service role can access
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No RLS policies = only service role (edge functions) can access
-- This is intentional for security

-- Add comment for documentation
COMMENT ON TABLE public.rate_limits IS 'Server-side rate limiting for edge functions. Only accessible via service role.';