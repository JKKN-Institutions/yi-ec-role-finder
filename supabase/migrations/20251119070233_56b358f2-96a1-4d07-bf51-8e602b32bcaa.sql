-- Phase 1: Add new 3D scoring system columns to assessment_results
-- This is an additive-only migration - maintains backward compatibility

-- Add Personal Ownership Score (0-100)
ALTER TABLE assessment_results 
ADD COLUMN IF NOT EXISTS personal_ownership_score INTEGER 
CHECK (personal_ownership_score >= 0 AND personal_ownership_score <= 100);

-- Add Impact Readiness Score (0-100)
ALTER TABLE assessment_results 
ADD COLUMN IF NOT EXISTS impact_readiness_score INTEGER 
CHECK (impact_readiness_score >= 0 AND impact_readiness_score <= 100);

-- Add Execution Capability Score (0-100)
ALTER TABLE assessment_results 
ADD COLUMN IF NOT EXISTS execution_capability_score INTEGER 
CHECK (execution_capability_score >= 0 AND execution_capability_score <= 100);

-- Add Key Strengths (array of strings stored as JSONB)
ALTER TABLE assessment_results 
ADD COLUMN IF NOT EXISTS key_strengths JSONB DEFAULT '[]'::jsonb;

-- Add Development Areas (array of strings stored as JSONB)
ALTER TABLE assessment_results 
ADD COLUMN IF NOT EXISTS development_areas JSONB DEFAULT '[]'::jsonb;

-- Add Confidence Level (High/Medium/Low)
ALTER TABLE assessment_results 
ADD COLUMN IF NOT EXISTS confidence_level TEXT 
CHECK (confidence_level IN ('High', 'Medium', 'Low'));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_assessment_results_new_scores 
ON assessment_results(personal_ownership_score, impact_readiness_score, execution_capability_score);

CREATE INDEX IF NOT EXISTS idx_assessment_results_confidence 
ON assessment_results(confidence_level);

-- Add column comments for documentation
COMMENT ON COLUMN assessment_results.personal_ownership_score IS 'Measures genuine passion, past actions, and specific commitments (0-100)';
COMMENT ON COLUMN assessment_results.impact_readiness_score IS 'Measures scale thinking, policy vs service orientation, and validation mindset (0-100)';
COMMENT ON COLUMN assessment_results.execution_capability_score IS 'Measures commitment, leadership ability, constraint handling, and strategic thinking (0-100)';
COMMENT ON COLUMN assessment_results.key_strengths IS 'Array of top 3 candidate strengths identified by AI';
COMMENT ON COLUMN assessment_results.development_areas IS 'Array of top 2 areas for candidate development identified by AI';
COMMENT ON COLUMN assessment_results.confidence_level IS 'AI confidence in the assessment: High, Medium, or Low';