-- ==============================================================================
-- Add performance indexes for help_requests table
-- Reduces database scan I/O and query log usage in Supabase
-- Run in Supabase SQL Editor: Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_help_requests_test_id ON help_requests (test_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_attempt_id ON help_requests (attempt_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_status ON help_requests (status);
