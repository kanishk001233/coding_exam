-- Migration: 004_add_is_untimed.sql
-- Add is_untimed column to tests table to support untimed take-home assessments

ALTER TABLE public.tests
ADD COLUMN IF NOT EXISTS is_untimed BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.tests.is_untimed IS 'Whether the test is an untimed assessment with disabled live monitoring and help requests';
