import React, { useState, useEffect } from 'react';
import { Test, TestAttempt, Question, TestCase } from '../types/database';
import { mockDb } from '../lib/mockDb';
import { isSupabaseConfigured } from '../lib/supabase';
import { StudentList } from '../components/StudentList';
import { ThemeToggle } from '../components/ThemeToggle';
import { ModalDialog } from '../components/ModalDialog';
import { Plus, Play, Pause, BarChart2, BookOpen, Clock, Users, Key, LogOut, Trash2, Edit3, Code2, Eye, EyeOff } from 'lucide-react';

interface TeacherDashboardProps {
  user: { id: string; name: string; email: string };
  onCreateTest: () => void;
  onEditTest: (test: Test) => void;
  onViewResults: (test: Test) => void;
  onViewStudentSubmission: (attempt: TestAttempt) => void;
  onLogout: () => void;
  onNavigateDiagnostics: () => void;
  onJoinAsStudent: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  user,
  onCreateTest,
  onEditTest,
  onViewResults,
  onViewStudentSubmission,
  onLogout,
  onNavigateDiagnostics,
  onJoinAsStudent,
}) => {
  const [tests, setTests] = useState<Test[]>(() => mockDb.getTests());
  const [selectedTestId, setSelectedTestId] = useState<string>(() => tests[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'tests' | 'monitor' | 'bank'>('tests');
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dialog States
  const [testToDelete, setTestToDelete] = useState<Test | null>(null);
  const [bankQToDelete, setBankQToDelete] = useState<string | null>(null);
  const [dialogAlert, setDialogAlert] = useState<{ title: string; message: string } | null>(null);

  // Question Bank State
  const [bankQuestions, setBankQuestions] = useState<Omit<Question, 'test_id'>[]>(() => mockDb.getQuestionBank());
  const [editingBankQ, setEditingBankQ] = useState<Omit<Question, 'test_id'> | null>(null);
  const [showBankModal, setShowBankModal] = useState(false);

  const fetchLiveAttempts = async () => {
    await mockDb.syncFromSupabase();
    const updatedTests = mockDb.getTests();
    setTests(updatedTests);
    const activeId = selectedTestId || updatedTests[0]?.id;
    if (activeId) {
      setAttempts(mockDb.getAttempts(activeId));
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchLiveAttempts();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    const refreshData = async () => {
      await mockDb.syncFromSupabase();
      const refreshedTests = mockDb.getTests();
      setTests(refreshedTests);
      setBankQuestions(mockDb.getQuestionBank());
      const currentTestId = selectedTestId || refreshedTests[0]?.id || '';
      if (!selectedTestId && refreshedTests.length > 0) {
        setSelectedTestId(refreshedTests[0].id);
      }
      if (currentTestId) {
        setAttempts(mockDb.getAttempts(currentTestId));
      }
    };

    refreshData();

    const interval = setInterval(async () => {
      await fetchLiveAttempts();
    }, 1500);

    return () => clearInterval(interval);
  }, [selectedTestId]);

  const selectedTest = tests.find((t) => t.id === selectedTestId) || tests[0];

  const handleToggleStatus = async (test: Test) => {
    const nextStatus = test.status === 'live' ? 'ended' : 'live';
    await mockDb.saveTest({
      ...test,
      status: nextStatus,
    });
    setTests(mockDb.getTests());
  };

  const handleConfirmDeleteTest = async () => {
    if (!testToDelete) return;
    const id = testToDelete.id;
    await mockDb.deleteTest(id);
    const remaining = mockDb.getTests();
    setTests(remaining);
    if (selectedTestId === id) {
      setSelectedTestId(remaining[0]?.id || '');
    }
    setTestToDelete(null);
  };

  const handleDeleteStudentAttempt = async (attemptId: string) => {
    await mockDb.deleteAttempt(attemptId);
    setTests([...mockDb.getTests()]);
    if (selectedTest) {
      setAttempts(mockDb.getAttempts(selectedTest.id));
    }
  };

  // Question Bank Actions
  const handleOpenAddBankQ = () => {
    setEditingBankQ({
      id: 'q-' + Math.random().toString(36).substring(2, 9),
      title: '',
      description: '',
      difficulty: 'easy',
      marks: 10,
      time_limit_ms: 2000,
      memory_limit_mb: 64,
      question_order: bankQuestions.length + 1,
      input_format: '',
      output_format: '',
      constraints: '1 <= N <= 10^5',
      starter_code: `#include <stdio.h>\n\nint main() {\n    //write your code here\n    return 0;\n}`,
      test_cases: [
        {
          id: 'tc-' + Math.random().toString(36).substring(2, 9),
          question_id: '',
          input: '10',
          expected_output: '20',
          is_sample: true,
          marks: 5,
        },
        {
          id: 'tc-' + Math.random().toString(36).substring(2, 9),
          question_id: '',
          input: '50',
          expected_output: '100',
          is_sample: false,
          marks: 5,
        },
      ],
    });
    setShowBankModal(true);
  };

  const handleOpenEditBankQ = (q: Omit<Question, 'test_id'>) => {
    setEditingBankQ({ ...q, test_cases: q.test_cases ? [...q.test_cases] : [] });
    setShowBankModal(true);
  };

  const handleConfirmDeleteBankQ = () => {
    if (!bankQToDelete) return;
    const updated = mockDb.deleteQuestionBankQuestion(bankQToDelete);
    setBankQuestions(updated);
    setBankQToDelete(null);
  };

  const handleSaveBankQuestion = () => {
    if (!editingBankQ || !editingBankQ.title.trim()) {
      setDialogAlert({
        title: 'Validation Error',
        message: 'Please provide a title for the question before saving.',
      });
      return;
    }

    const updated = mockDb.saveQuestionBankQuestion(editingBankQ);
    setBankQuestions(updated);
    setShowBankModal(false);
    setEditingBankQ(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors">
      {/* Top Navbar */}
      <nav className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-500/20">
            CA
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
              CodeArena Instructor Dashboard
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {user.name} ({user.email})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800">
            <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
            <span className="text-slate-600 dark:text-slate-400">
              {isSupabaseConfigured ? 'Supabase Connected' : 'Local Storage Mode (No .env keys)'}
            </span>
          </div>

          <ThemeToggle />

          <button
            type="button"
            onClick={onNavigateDiagnostics}
            className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors hidden sm:block"
          >
            WASM Benchmark
          </button>

          <button
            type="button"
            onClick={onJoinAsStudent}
            className="px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 hover:bg-indigo-200 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30 text-xs font-semibold transition-colors"
          >
            Student Join Screen
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-400 text-slate-600 dark:text-slate-400 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 bg-slate-200/70 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('tests')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'tests'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Coding Tests ({tests.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('monitor')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'monitor'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Classroom Live Monitor
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bank')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'bank'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Question Bank ({bankQuestions.length})
            </button>
          </div>

          <button
            type="button"
            onClick={onCreateTest}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Test</span>
          </button>
        </div>

        {/* Tab 1: Coding Tests List */}
        {activeTab === 'tests' && (
          <div>
            {tests.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl space-y-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">No Tests Created Yet</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Click the button below to create your first classroom coding test!
                </p>
                <button
                  type="button"
                  onClick={onCreateTest}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg transition-all"
                >
                  Create Test Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {tests.map((test) => {
                  const testAttempts = mockDb.getAttempts(test.id);
                  const isLive = test.status === 'live';

                  return (
                    <div
                      key={test.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-base text-slate-900 dark:text-white">{test.title}</h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              isLive
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                                : test.status === 'scheduled'
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                            }`}
                          >
                            {test.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{test.description}</p>

                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <Key className="w-3.5 h-3.5 text-indigo-500" />
                              Join Code:
                            </span>
                            <code className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold">
                              {test.join_code}
                            </code>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {test.duration_minutes} Mins
                            </span>
                            <span className="flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                              {test.questions?.length || 0} Questions
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              {testAttempts.length} Students
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(test)}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                            isLive
                              ? 'bg-amber-100 dark:bg-amber-950/50 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                              : 'bg-emerald-100 dark:bg-emerald-950/50 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                          }`}
                        >
                          {isLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                          <span>{isLive ? 'End Test' : 'Start Live'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onViewResults(test)}
                          className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 transition-colors"
                          title="View Class Results"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onEditTest(test)}
                          className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                          title="Edit Test"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setTestToDelete(test)}
                          className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-400 text-slate-500 dark:text-slate-400 transition-colors"
                          title="Delete Test"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Live Classroom Monitor */}
        {activeTab === 'monitor' && (
          <div>
            {tests.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                Please create a test first to monitor live students.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Monitoring: {selectedTest?.title || 'Active Test'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Student Join Code: <strong className="text-indigo-600 dark:text-indigo-300 font-mono">{selectedTest?.join_code}</strong>
                    </p>
                  </div>

                  <select
                    value={selectedTestId}
                    onChange={(e) => setSelectedTestId(e.target.value)}
                    className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  >
                    {tests.map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>

                <StudentList
                  test={selectedTest}
                  attempts={attempts}
                  onViewStudentSubmission={onViewStudentSubmission}
                  onDeleteStudentAttempt={handleDeleteStudentAttempt}
                  onRefresh={handleManualRefresh}
                  isRefreshing={isRefreshing}
                />
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Question Bank Browser (Request #2: Edit Question Bank Questions) */}
        {activeTab === 'bank' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Curated C Programming Question Bank</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Create, customize, and edit reusable questions with test cases</p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddBankQ}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Question to Bank</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bankQuestions.map((q) => (
                <div key={q.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-md flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{q.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {q.difficulty} • {q.marks} pts
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenEditBankQ(q)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-600 dark:text-slate-300 transition-colors"
                          title="Edit Question Bank Question"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setBankQToDelete(q.id)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-400 text-slate-500 dark:text-slate-400 transition-colors"
                          title="Delete from Question Bank"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{q.description}</p>

                    <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-800 dark:text-slate-300 max-h-24 overflow-y-auto border border-slate-200 dark:border-slate-800">
                      <pre>{q.starter_code}</pre>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <span>{q.test_cases?.length || 0} Test Cases ({q.test_cases?.filter(t => t.is_sample).length} Sample, {q.test_cases?.filter(t => !t.is_sample).length} Hidden)</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">C99 Verified</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal to Add / Edit Question Bank Question */}
        {showBankModal && editingBankQ && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingBankQ.title ? 'Edit Question Bank Question' : 'Add Question to Question Bank'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Question Title *</label>
                    <input
                      type="text"
                      required
                      value={editingBankQ.title}
                      onChange={(e) => setEditingBankQ({ ...editingBankQ, title: e.target.value })}
                      placeholder="e.g. Check Palindrome Number"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Marks *</label>
                    <input
                      type="number"
                      min={1}
                      value={editingBankQ.marks}
                      onChange={(e) => setEditingBankQ({ ...editingBankQ, marks: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Difficulty</label>
                    <select
                      value={editingBankQ.difficulty}
                      onChange={(e) => setEditingBankQ({ ...editingBankQ, difficulty: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Constraints</label>
                    <input
                      type="text"
                      value={editingBankQ.constraints || ''}
                      onChange={(e) => setEditingBankQ({ ...editingBankQ, constraints: e.target.value })}
                      placeholder="e.g. 1 <= N <= 10^5"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Problem Description *</label>
                  <textarea
                    rows={3}
                    value={editingBankQ.description}
                    onChange={(e) => setEditingBankQ({ ...editingBankQ, description: e.target.value })}
                    placeholder="Problem statement and task description..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Input Format</label>
                    <textarea
                      rows={2}
                      value={editingBankQ.input_format || ''}
                      onChange={(e) => setEditingBankQ({ ...editingBankQ, input_format: e.target.value })}
                      placeholder="Input format..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Output Format</label>
                    <textarea
                      rows={2}
                      value={editingBankQ.output_format || ''}
                      onChange={(e) => setEditingBankQ({ ...editingBankQ, output_format: e.target.value })}
                      placeholder="Output format..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Starter Code Template</label>
                  <textarea
                    rows={4}
                    value={editingBankQ.starter_code || ''}
                    onChange={(e) => setEditingBankQ({ ...editingBankQ, starter_code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                {/* Test Cases */}
                <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Test Cases ({editingBankQ.test_cases?.length || 0})
                      </h4>
                      <p className="text-[11px] text-slate-500">Configure sample and hidden test cases</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const newTC: TestCase = {
                            id: 'tc-' + Math.random().toString(36).substring(2, 9),
                            question_id: editingBankQ.id,
                            input: '',
                            expected_output: '',
                            is_sample: true,
                            marks: 5,
                          };
                          setEditingBankQ({
                            ...editingBankQ,
                            test_cases: [...(editingBankQ.test_cases || []), newTC],
                          });
                        }}
                        className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-500" />
                        <span>+ Sample</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const newTC: TestCase = {
                            id: 'tc-' + Math.random().toString(36).substring(2, 9),
                            question_id: editingBankQ.id,
                            input: '',
                            expected_output: '',
                            is_sample: false,
                            marks: 5,
                          };
                          setEditingBankQ({
                            ...editingBankQ,
                            test_cases: [...(editingBankQ.test_cases || []), newTC],
                          });
                        }}
                        className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1"
                      >
                        <EyeOff className="w-3.5 h-3.5 text-amber-500" />
                        <span>+ Hidden</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto">
                    {(editingBankQ.test_cases || []).map((tc, idx) => (
                      <div
                        key={tc.id || idx}
                        className={`p-3 rounded-xl border text-xs space-y-2 ${
                          tc.is_sample
                            ? 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                            : 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            tc.is_sample ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          }`}>
                            {tc.is_sample ? 'Sample Case' : 'Hidden Test Case'} #{idx + 1}
                          </span>

                          <div className="flex items-center gap-2">
                            <label className="text-[11px] text-slate-500 flex items-center gap-1">
                              <span>Marks:</span>
                              <input
                                type="number"
                                value={tc.marks}
                                onChange={(e) => {
                                  const updatedTCs = [...(editingBankQ.test_cases || [])];
                                  updatedTCs[idx] = { ...updatedTCs[idx], marks: Number(e.target.value) };
                                  setEditingBankQ({ ...editingBankQ, test_cases: updatedTCs });
                                }}
                                className="w-12 px-1 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-center"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const updatedTCs = (editingBankQ.test_cases || []).filter((_, i) => i !== idx);
                                setEditingBankQ({ ...editingBankQ, test_cases: updatedTCs });
                              }}
                              className="text-slate-400 hover:text-rose-500 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-500 block mb-0.5">Input (stdin)</span>
                            <textarea
                              rows={2}
                              value={tc.input}
                              onChange={(e) => {
                                const updatedTCs = [...(editingBankQ.test_cases || [])];
                                updatedTCs[idx] = { ...updatedTCs[idx], input: e.target.value };
                                setEditingBankQ({ ...editingBankQ, test_cases: updatedTCs });
                              }}
                              placeholder="e.g. 10 20"
                              className="w-full p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 font-mono text-xs"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 block mb-0.5">Expected Output</span>
                            <textarea
                              rows={2}
                              value={tc.expected_output}
                              onChange={(e) => {
                                const updatedTCs = [...(editingBankQ.test_cases || [])];
                                updatedTCs[idx] = { ...updatedTCs[idx], expected_output: e.target.value };
                                setEditingBankQ({ ...editingBankQ, test_cases: updatedTCs });
                              }}
                              placeholder="e.g. 30"
                              className="w-full p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 font-mono text-xs text-emerald-600 dark:text-emerald-400"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBankQuestion}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md"
                >
                  Save to Question Bank
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Test Modal Dialog */}
        <ModalDialog
          isOpen={Boolean(testToDelete)}
          type="confirm"
          isDestructive={true}
          title="Delete Test"
          message={`Are you sure you want to permanently delete the test "${testToDelete?.title}"? All associated questions, student submissions, and results will be permanently deleted.`}
          confirmText="Delete Test"
          cancelText="Cancel"
          onConfirm={handleConfirmDeleteTest}
          onCancel={() => setTestToDelete(null)}
        />

        {/* Delete Bank Question Modal Dialog */}
        <ModalDialog
          isOpen={Boolean(bankQToDelete)}
          type="confirm"
          isDestructive={true}
          title="Remove Question from Bank"
          message="Are you sure you want to permanently remove this problem from the Question Bank?"
          confirmText="Remove Question"
          cancelText="Cancel"
          onConfirm={handleConfirmDeleteBankQ}
          onCancel={() => setBankQToDelete(null)}
        />

        {/* Generic Alert Modal */}
        <ModalDialog
          isOpen={Boolean(dialogAlert)}
          type="warning"
          title={dialogAlert?.title || 'Notice'}
          message={dialogAlert?.message || ''}
          confirmText="OK"
          onConfirm={() => setDialogAlert(null)}
          onClose={() => setDialogAlert(null)}
        />
      </div>
    </div>
  );
};
