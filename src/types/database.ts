export type UserRole = 'teacher' | 'student';

export type TestStatus = 'draft' | 'scheduled' | 'live' | 'ended';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export type AttemptStatus = 'in_progress' | 'submitted' | 'auto_submitted';

export type SubmissionStatus = 
  | 'accepted' 
  | 'wrong_answer' 
  | 'compile_error' 
  | 'runtime_error' 
  | 'time_limit' 
  | 'memory_limit';

export interface Profile {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  roll_no?: string;
  created_at?: string;
}

export interface TestCase {
  id: string;
  question_id: string;
  input: string;
  expected_output: string;
  is_sample: boolean;
  marks: number;
  created_at?: string;
}

export interface Question {
  id: string;
  test_id: string;
  title: string;
  description: string;
  input_format?: string;
  output_format?: string;
  constraints?: string;
  starter_code?: string;
  difficulty: QuestionDifficulty;
  marks: number;
  time_limit_ms: number;
  memory_limit_mb: number;
  question_order: number;
  test_cases?: TestCase[];
  created_at?: string;
}

export interface Test {
  id: string;
  title: string;
  description?: string;
  join_code: string;
  duration_minutes: number;
  start_time?: string;
  end_time?: string;
  status: TestStatus;
  created_by: string;
  created_at?: string;
  questions?: Question[];
  total_marks?: number;
  enable_tab_switch_tracking?: boolean;
  enable_fullscreen_mode?: boolean;
}

export interface TestAttempt {
  id: string;
  test_id: string;
  student_id: string;
  student_name?: string;
  student_roll_no?: string;
  started_at: string;
  submitted_at?: string;
  status: AttemptStatus;
  score: number;
  tab_switch_count?: number;
  fullscreen_exit_count?: number;
  created_at?: string;
}

export interface SubmissionResult {
  id: string;
  submission_id?: string;
  test_case_id: string;
  is_sample: boolean;
  status: SubmissionStatus;
  actual_output: string;
  expected_output?: string;
  execution_time: number;
  error_message?: string;
  marks_awarded: number;
  max_marks: number;
}

export interface Submission {
  id: string;
  attempt_id: string;
  question_id: string;
  student_id: string;
  code: string;
  language: string;
  status: SubmissionStatus;
  score: number;
  max_score: number;
  submitted_at: string;
  execution_time: number;
  results?: SubmissionResult[];
}

export type EventType = 
  | 'TAB_SWITCH' 
  | 'FULLSCREEN_EXIT' 
  | 'TEST_STARTED' 
  | 'TEST_SUBMITTED' 
  | 'TIMEOUT' 
  | 'COPY_PASTE_ATTEMPT'
  | 'CODE_RUN';

export interface TestEvent {
  id: string;
  attempt_id: string;
  event_type: EventType;
  timestamp: string;
  metadata?: Record<string, any>;
}
