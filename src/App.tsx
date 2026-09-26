import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { JoinTest } from './pages/JoinTest';
import { StudentTest } from './pages/StudentTest';
import { Results } from './pages/Results';
import { Login } from './pages/Login';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { CreateTest } from './pages/CreateTest';
import { TestEditor } from './pages/TestEditor';
import { Submission } from './pages/Submission';
import { WasmTestPage } from './pages/WasmTestPage';
import { ThemeProvider } from './context/ThemeContext';
import { mockDb } from './lib/mockDb';
import { Test, TestAttempt } from './types/database';

// 1. Student Test Wrapper
function StudentTestWrapper() {
  const navigate = useNavigate();
  const testRaw = sessionStorage.getItem('c_exam_active_test');
  const attemptRaw = sessionStorage.getItem('c_exam_student_attempt');

  if (!testRaw || !attemptRaw) {
    return <Navigate to="/student" replace />;
  }

  const test: Test = JSON.parse(testRaw);
  const attempt: TestAttempt = JSON.parse(attemptRaw);

  // If already submitted or closed, redirect to results view
  if (attempt.status === 'submitted' || attempt.status === 'auto_submitted') {
    return <Navigate to="/student/results" replace />;
  }

  const handleFinish = (finishedAttempt: TestAttempt) => {
    sessionStorage.setItem('c_exam_student_attempt', JSON.stringify(finishedAttempt));
    navigate('/student/results');
  };

  return <StudentTest test={test} attempt={attempt} onFinishTest={handleFinish} />;
}

// 2. Student Results Wrapper
function StudentResultsWrapper() {
  const navigate = useNavigate();
  const testRaw = sessionStorage.getItem('c_exam_active_test');
  const attemptRaw = sessionStorage.getItem('c_exam_student_attempt');

  if (!testRaw || !attemptRaw) {
    return <Navigate to="/student" replace />;
  }

  const test: Test = JSON.parse(testRaw);
  const attempt: TestAttempt = JSON.parse(attemptRaw);

  return (
    <Results
      test={test}
      attempt={attempt}
      isTeacherView={false}
      onBackToDashboard={() => navigate('/student')}
    />
  );
}

// 3. Teacher Dashboard Wrapper
function TeacherDashboardWrapper() {
  const navigate = useNavigate();
  const authRaw = sessionStorage.getItem('c_exam_teacher_auth');

  if (!authRaw) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(authRaw);

  return (
    <TeacherDashboard
      user={user}
      onCreateTest={() => navigate('/create-test')}
      onEditTest={(test) => navigate(`/edit-test/${test.id}`)}
      onViewResults={(test) => navigate(`/results/${test.id}`)}
      onViewStudentSubmission={(attempt) => navigate(`/submission/${attempt.id}`)}
      onLogout={() => {
        sessionStorage.removeItem('c_exam_teacher_auth');
        navigate('/login');
      }}
      onNavigateDiagnostics={() => navigate('/wasm-diagnostics')}
      onJoinAsStudent={() => navigate('/student')}
    />
  );
}

// 4. Create Test Wrapper
function CreateTestWrapper() {
  const navigate = useNavigate();
  const authRaw = sessionStorage.getItem('c_exam_teacher_auth');

  if (!authRaw) {
    return <Navigate to="/login" replace />;
  }

  return (
    <CreateTest
      onSave={() => navigate('/dashboard')}
      onCancel={() => navigate('/dashboard')}
    />
  );
}

// 5. Edit Test Wrapper
function TestEditorWrapper() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const authRaw = sessionStorage.getItem('c_exam_teacher_auth');

  if (!authRaw) {
    return <Navigate to="/login" replace />;
  }

  const test = id ? mockDb.getTestById(id) : null;
  if (!test) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <TestEditor
      test={test}
      onSave={() => navigate('/dashboard')}
      onCancel={() => navigate('/dashboard')}
    />
  );
}

// 6. Teacher Results Wrapper
function TeacherResultsWrapper() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const authRaw = sessionStorage.getItem('c_exam_teacher_auth');

  if (!authRaw) {
    return <Navigate to="/login" replace />;
  }

  const test = id ? mockDb.getTestById(id) : null;
  if (!test) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Results
      test={test}
      isTeacherView={true}
      onBackToDashboard={() => navigate('/dashboard')}
    />
  );
}

// 7. Student Submission Inspection Wrapper
function SubmissionWrapper() {
  const navigate = useNavigate();
  const { attemptId } = useParams<{ attemptId: string }>();
  const authRaw = sessionStorage.getItem('c_exam_teacher_auth');

  if (!authRaw) {
    return <Navigate to="/login" replace />;
  }

  const attempts = mockDb.getAttempts();
  const attempt = attempts.find((a) => a.id === attemptId);

  if (!attempt) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Submission attempt={attempt} onBack={() => navigate('/dashboard')} />;
}

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Student Routes */}
          <Route path="/" element={<Navigate to="/student" replace />} />
          <Route path="/student" element={<JoinTest />} />
          <Route path="/student/test" element={<StudentTestWrapper />} />
          <Route path="/student/results" element={<StudentResultsWrapper />} />

          {/* Teacher Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<TeacherDashboardWrapper />} />
          <Route path="/create-test" element={<CreateTestWrapper />} />
          <Route path="/edit-test/:id" element={<TestEditorWrapper />} />
          <Route path="/results/:id" element={<TeacherResultsWrapper />} />
          <Route path="/submission/:attemptId" element={<SubmissionWrapper />} />

          {/* Diagnostics / Benchmark */}
          <Route path="/wasm-diagnostics" element={<WasmTestPage onNavigateHome={() => window.history.back()} />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/student" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
