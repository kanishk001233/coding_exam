import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Test, TestAttempt } from '../types/database';
import { mockDb } from '../lib/mockDb';
import { wasmCompiler } from '../lib/wasm/compiler';
import { KeyRound, User, Hash, ArrowRight, Clock, BookOpen, AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export const JoinTest: React.FC = () => {
  const navigate = useNavigate();
  const [testCode, setTestCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isWasmReady, setIsWasmReady] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);

  useEffect(() => {
    wasmCompiler.initialize().then(() => {
      setIsWasmReady(true);
    });
  }, []);

  const handleTestCodeChange = (code: string) => {
    const uppercaseCode = code.toUpperCase();
    setTestCode(uppercaseCode);
    const matched = mockDb.getTestByJoinCode(uppercaseCode);
    if (matched) {
      setSelectedTest(matched);
      setError(null);
    } else {
      setSelectedTest(null);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!testCode.trim()) {
      setError('Please enter a valid Test Code provided by your instructor.');
      return;
    }

    if (!studentName.trim() || !rollNo.trim()) {
      setError('Please provide your full name and UID.');
      return;
    }

    setIsJoining(true);

    try {
      await mockDb.syncFromSupabase();
      const test = mockDb.getTestByJoinCode(testCode);
      if (!test) {
        setError(`No test found with code "${testCode}". Please check with your instructor.`);
        setIsJoining(false);
        return;
      }

      // Check 1: Test status ended / draft
      if (test.status === 'ended' || test.status === 'draft') {
        setError(
          test.status === 'ended'
            ? 'This examination has been concluded/closed by the instructor. New attempts or edits are no longer accepted.'
            : 'This test is currently in draft mode and has not been started yet by the instructor.'
        );
        setIsJoining(false);
        return;
      }

      const existingAttempts = mockDb.getAttempts(test.id);
      const existing = existingAttempts.find(
        (a) => (a.student_roll_no || '').toLowerCase() === rollNo.trim().toLowerCase()
      );

      // Check 2: Student already completed & submitted test
      if (existing && (existing.status === 'submitted' || existing.status === 'auto_submitted')) {
        setError(
          `You (UID: ${existing.student_roll_no}) have already completed and submitted this examination. Re-access is not allowed.`
        );
        setIsJoining(false);
        return;
      }

      let attempt: TestAttempt;
      if (existing) {
        attempt = existing;
      } else {
        attempt = await mockDb.saveAttempt({
          id: 'att-' + Math.random().toString(36).substring(2, 9),
          test_id: test.id,
          student_id: rollNo.trim(),
          student_name: studentName.trim(),
          student_roll_no: rollNo.trim(),
          started_at: new Date().toISOString(),
          status: 'in_progress',
          score: 0,
          tab_switch_count: 0,
          fullscreen_exit_count: 0,
        });
      }

      sessionStorage.setItem('c_exam_active_test', JSON.stringify(test));
      sessionStorage.setItem('c_exam_student_attempt', JSON.stringify(attempt));

      navigate('/student/test');
    } catch (err: any) {
      setError(err?.message || 'Failed to start examination. Please try again.');
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-indigo-500 selection:text-white font-sans transition-colors relative">
      {/* Top Left: Small Subtle Status Text as requested */}
      <div className="absolute top-4 left-4 flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
        <span className={`w-2 h-2 rounded-full ${isWasmReady ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
        <span>Compiler Engine: {isWasmReady ? 'Ready' : 'Initializing...'}</span>
      </div>

      {/* Top Right: Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg space-y-6">
        {/* Brand */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-black text-xl shadow-lg shadow-indigo-500/25 mb-2">
            CA
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            CodeArena
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Enter your test code and student details to begin your examination
          </p>
        </div>

        {/* Join Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-rose-100 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Test Code (Provided by Teacher)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  disabled={isJoining}
                  value={testCode}
                  onChange={(e) => handleTestCodeChange(e.target.value)}
                  placeholder="e.g. C2026A"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono uppercase text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors font-bold disabled:opacity-60"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Student Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    disabled={isJoining}
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">UID</label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    disabled={isJoining}
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    placeholder="26bcs11111"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors lowercase disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            {selectedTest && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">{selectedTest.title}</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30 text-[11px] font-semibold">
                    {selectedTest.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    {selectedTest.duration_minutes} Minutes
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                    {selectedTest.questions?.length || 0} Questions
                  </span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                    Anti-Cheat Active
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!isWasmReady || isJoining}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Preparing Examination Environment...</span>
                </>
              ) : (
                <>
                  <span>Start Examination</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
