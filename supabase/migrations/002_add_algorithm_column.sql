-- ==============================================================================
-- Add algorithm column to questions table
-- Run this in Supabase SQL Editor: Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

ALTER TABLE questions ADD COLUMN IF NOT EXISTS algorithm TEXT;

-- Verify the column was added
COMMENT ON COLUMN questions.algorithm IS 'Teacher-provided solution approach or step-by-step algorithm shown in AI Code Assist';
