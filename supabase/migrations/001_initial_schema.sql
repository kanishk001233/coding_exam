-- ==============================================================================
-- C Coding Test Platform - Supabase Schema
-- Run this script in the Supabase SQL Editor (SQL Editor -> New Query -> Run)
-- ==============================================================================

-- Drop old tables if they exist (with cascade to remove old constraints)
DROP TABLE IF EXISTS submission_results CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS test_events CASCADE;
DROP TABLE IF EXISTS test_attempts CASCADE;
DROP TABLE IF EXISTS test_cases CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS tests CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 1. Profiles table
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  roll_no TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tests table
CREATE TABLE tests (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  join_code TEXT UNIQUE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'live', 'ended')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  enable_tab_switch_tracking BOOLEAN DEFAULT true,
  enable_fullscreen_mode BOOLEAN DEFAULT true
);

-- 3. Questions table
CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  test_id TEXT REFERENCES tests(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  input_format TEXT,
  output_format TEXT,
  constraints TEXT,
  starter_code TEXT DEFAULT '#include <stdio.h>\n\nint main() {\n    // Write your code here\n    \n    return 0;\n}',
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  marks INTEGER NOT NULL DEFAULT 10,
  time_limit_ms INTEGER NOT NULL DEFAULT 2000,
  memory_limit_mb INTEGER NOT NULL DEFAULT 64,
  question_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Test cases table
CREATE TABLE test_cases (
  id TEXT PRIMARY KEY,
  question_id TEXT REFERENCES questions(id) ON DELETE CASCADE,
  input TEXT NOT NULL DEFAULT '',
  expected_output TEXT NOT NULL,
  is_sample BOOLEAN NOT NULL DEFAULT false,
  marks INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Test attempts table
CREATE TABLE test_attempts (
  id TEXT PRIMARY KEY,
  test_id TEXT REFERENCES tests(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_roll_no TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'auto_submitted')),
  score INTEGER DEFAULT 0,
  tab_switch_count INTEGER DEFAULT 0,
  fullscreen_exit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Submissions table (1 submission row per attempt per question)
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  attempt_id TEXT REFERENCES test_attempts(id) ON DELETE CASCADE,
  question_id TEXT REFERENCES questions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  code TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'c',
  status TEXT NOT NULL CHECK (status IN ('accepted', 'wrong_answer', 'compile_error', 'runtime_error', 'time_limit', 'memory_limit')),
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 10,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  execution_time INTEGER DEFAULT 0,
  CONSTRAINT unique_attempt_question UNIQUE (attempt_id, question_id)
);

-- 7. Submission results table (1 row per submission containing all testcase results as JSONB)
CREATE TABLE submission_results (
  id TEXT PRIMARY KEY,
  submission_id TEXT UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Test anti-cheating events table
CREATE TABLE test_events (
  id TEXT PRIMARY KEY,
  attempt_id TEXT REFERENCES test_attempts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ==============================================================================
-- Database Indexing for High Performance Retrieval
-- ==============================================================================

-- Tests indexes
CREATE INDEX IF NOT EXISTS idx_tests_join_code ON tests (join_code);
CREATE INDEX IF NOT EXISTS idx_tests_status ON tests (status);
CREATE INDEX IF NOT EXISTS idx_tests_created_by ON tests (created_by);

-- Questions indexes
CREATE INDEX IF NOT EXISTS idx_questions_test_id ON questions (test_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON questions (test_id, question_order);

-- Test cases indexes
CREATE INDEX IF NOT EXISTS idx_test_cases_question_id ON test_cases (question_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_sample ON test_cases (question_id, is_sample);

-- Test attempts indexes (Live Classroom Monitor & Results)
CREATE INDEX IF NOT EXISTS idx_test_attempts_test_id ON test_attempts (test_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_roll_no ON test_attempts (test_id, student_roll_no);
CREATE INDEX IF NOT EXISTS idx_test_attempts_status ON test_attempts (test_id, status);

-- Submissions indexes (Score aggregation & Code Viewer)
CREATE INDEX IF NOT EXISTS idx_submissions_attempt_id ON submissions (attempt_id);
CREATE INDEX IF NOT EXISTS idx_submissions_question_id ON submissions (question_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions (submitted_at DESC);

-- Submission results indexes
CREATE INDEX IF NOT EXISTS idx_submission_results_sub_id ON submission_results (submission_id);

-- Test events (Anti-cheat logs)
CREATE INDEX IF NOT EXISTS idx_test_events_attempt_time ON test_events (attempt_id, timestamp DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_events ENABLE ROW LEVEL SECURITY;

-- Grant Full Anonymous Access Policies (Read/Write/Update/Delete)
CREATE POLICY "Public profiles all" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public tests all" ON tests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public questions all" ON questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public test cases all" ON test_cases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public attempts all" ON test_attempts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public submissions all" ON submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public submission results all" ON submission_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public events all" ON test_events FOR ALL USING (true) WITH CHECK (true);
