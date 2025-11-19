-- Add columns to store adapted question information
ALTER TABLE assessment_responses 
ADD COLUMN adapted_question_text TEXT,
ADD COLUMN adaptation_context JSONB;

COMMENT ON COLUMN assessment_responses.adapted_question_text IS 'The personalized question text shown to the candidate (if adapted)';
COMMENT ON COLUMN assessment_responses.adaptation_context IS 'Metadata about the adaptation: problem summary, initiative summary, verticals, etc.';