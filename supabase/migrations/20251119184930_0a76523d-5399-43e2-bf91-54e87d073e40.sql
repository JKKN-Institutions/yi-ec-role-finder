-- Create table to track adaptation analytics
CREATE TABLE IF NOT EXISTS adaptation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  
  -- Adaptation tracking
  was_adapted BOOLEAN NOT NULL DEFAULT false,
  adaptation_success BOOLEAN,
  adaptation_time_ms INTEGER,
  fallback_used BOOLEAN DEFAULT false,
  
  -- Context used
  adaptation_context JSONB,
  
  -- Response quality metrics
  response_length INTEGER,
  response_completed BOOLEAN NOT NULL DEFAULT false,
  time_to_complete_seconds INTEGER,
  
  -- AI help usage
  ai_help_used BOOLEAN DEFAULT false,
  ai_help_accepted BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_assessment_question UNIQUE(assessment_id, question_number)
);

-- Enable RLS
ALTER TABLE adaptation_analytics ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view adaptation analytics"
  ON adaptation_analytics FOR SELECT
  USING (is_admin_user(auth.uid()));

CREATE POLICY "System can insert adaptation analytics"
  ON adaptation_analytics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update adaptation analytics"
  ON adaptation_analytics FOR UPDATE
  USING (true);

-- Index for performance
CREATE INDEX idx_adaptation_analytics_assessment ON adaptation_analytics(assessment_id);
CREATE INDEX idx_adaptation_analytics_question ON adaptation_analytics(question_number);
CREATE INDEX idx_adaptation_analytics_adapted ON adaptation_analytics(was_adapted);

COMMENT ON TABLE adaptation_analytics IS 'Tracks adaptation success rates and response quality metrics for adaptive questions';
COMMENT ON COLUMN adaptation_analytics.was_adapted IS 'Whether the question was successfully adapted';
COMMENT ON COLUMN adaptation_analytics.adaptation_success IS 'Whether the adaptation API call succeeded';
COMMENT ON COLUMN adaptation_analytics.response_length IS 'Character count of the response';
COMMENT ON COLUMN adaptation_analytics.time_to_complete_seconds IS 'Time spent on this question';