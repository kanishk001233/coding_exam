import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Test, TestAttempt } from '../types/database';
import { mockDb } from '../lib/mockDb';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { wasmCompiler } from '../lib/wasm/compiler';
import {
  KeyRound, User, Hash, ArrowRight, Clock, BookOpen, AlertCircle,
  ShieldCheck, Loader2, Terminal, Sparkles, CheckCircle2, ShieldAlert, Cpu
} from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

const CODING_QUOTES = [
  "Great programmers aren’t born. They debug their way there.",
  "The best way to learn coding is to write code.",
  "Don’t just learn to code. Learn to think.",
  "Every problem is an opportunity to write better code.",
  "First solve the problem. Then write the code.",
  "A coder’s journey begins with a single line.",
];

export const JoinTest: React.FC = () => {
  const navigate = useNavigate();
  const [testCode, setTestCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isWasmReady, setIsWasmReady] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);

  // Typewriter State for Left Hero Section
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentQuote = CODING_QUOTES[quoteIdx];
    let timer: NodeJS.Timeout;

    if (!isDeleting && displayText === currentQuote) {
      // Pause at full text
      timer = setTimeout(() => setIsDeleting(true), 2500);
    } else if (isDeleting && displayText === '') {
      // Finished deleting, move to next quote
      setIsDeleting(false);
      setQuoteIdx((prev) => (prev + 1) % CODING_QUOTES.length);
    } else {
      // Typing or deleting
      const nextLength = isDeleting ? displayText.length - 1 : displayText.length + 1;
      const speed = isDeleting ? 25 : 50;
      timer = setTimeout(() => {
        setDisplayText(currentQuote.substring(0, nextLength));
      }, speed);
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, quoteIdx]);

  useEffect(() => {
    wasmCompiler.initialize().then(() => {
      setIsWasmReady(true);
    });

    // Clear any leftover student attempt and test session on mount
    try {
      sessionStorage.removeItem('c_exam_student_attempt');
      sessionStorage.removeItem('c_exam_active_test');
      mockDb.clearAllStudentDrafts();
    } catch {}
  }, []);

  const handleTestCodeChange = (code: string) => {
    const uppercaseCode = code.toUpperCase().trim();
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
      setError('Please enter the Test Join Code provided by your instructor.');
      return;
    }

    const cleanRoll = rollNo.trim().toUpperCase();

    if (!studentName.trim() || !cleanRoll) {
      setError('Please provide both your Full Name and Student UID.');
      return;
    }

    setIsJoining(true);

    try {
      await mockDb.syncFromSupabase();
      const test = mockDb.getTestByJoinCode(testCode);
      if (!test) {
        setError(`No exam found with code "${testCode}". Please verify with your teacher.`);
        setIsJoining(false);
        return;
      }

      // Check 1: Test status ended / draft
      if (test.status === 'ended' || test.status === 'draft') {
        setError(
          test.status === 'ended'
            ? 'This examination has been concluded by the instructor. New attempts are no longer accepted.'
            : 'This test is in draft mode and has not yet been started by the instructor.'
        );
        setIsJoining(false);
        return;
      }

      // Check for existing attempt with case-insensitive UID matching
      const existingAttempts = mockDb.getAttempts(test.id);
      let existing = existingAttempts.find((a) => {
        const aRoll = (a.student_roll_no || a.student_id || '').trim().toUpperCase();
        const aId = (a.student_id || '').trim().toUpperCase();
        return Boolean(cleanRoll) && (aRoll === cleanRoll || aId === cleanRoll);
      });

      // If not in local cache (e.g., reloaded or different browser), query Supabase directly
      if (!existing && isSupabaseConfigured && supabase) {
        try {
          const { data: dbAttempts } = await supabase
            .from('test_attempts')
            .select('*')
            .eq('test_id', test.id)
            .or(`student_roll_no.ilike.${cleanRoll},student_id.ilike.${cleanRoll}`)
            .order('started_at', { ascending: false })
            .limit(5);

          if (dbAttempts && dbAttempts.length > 0) {
            // Strictly match the record to this student's UID
            const matchedAtt = dbAttempts.find((att: any) => {
              const r = (att.student_roll_no || att.student_id || '').trim().toUpperCase();
              const id = (att.student_id || '').trim().toUpperCase();
              return r === cleanRoll || id === cleanRoll;
            });
            if (matchedAtt) {
              const foundAtt = matchedAtt as TestAttempt;
              existing = foundAtt;
              await mockDb.saveAttempt(foundAtt);
            }
          }
        } catch (err) {
          console.warn('Supabase attempt lookup error:', err);
        }
      }

      // Check 2: Student already completed & submitted test
      if (existing && (existing.status === 'submitted' || existing.status === 'auto_submitted')) {
        setError(
          `Student UID "${existing.student_roll_no || cleanRoll}" has already submitted this test. Multiple attempts are not permitted.`
        );
        setIsJoining(false);
        return;
      }

      // Check 3: For timed tests, check if duration has expired while away
      if (existing && !test.is_untimed) {
        const startMs = new Date(existing.started_at).getTime();
        const durationMs = (test.duration_minutes || 45) * 60 * 1000;
        const endMs = startMs + durationMs;
        if (Date.now() >= endMs) {
          existing.status = 'auto_submitted';
          existing.submitted_at = new Date().toISOString();
          existing.score = mockDb.calculateAttemptScore(existing.id);
          await mockDb.saveAttempt(existing);
          setError(
            `The allotted time for this examination has expired. Your attempt has been automatically submitted.`
          );
          setIsJoining(false);
          return;
        }
      }

      let attempt: TestAttempt;
      if (existing) {
        attempt = existing;
        // Update name if previously blank
        if (studentName.trim() && !attempt.student_name) {
          attempt.student_name = studentName.trim();
          await mockDb.saveAttempt(attempt);
        }
        // Restore submissions from Supabase if re-entering from another browser
        await mockDb.syncStudentAttemptSubmissions(attempt.id);
      } else {
        attempt = await mockDb.saveAttempt({
          id: 'att-' + Math.random().toString(36).substring(2, 9),
          test_id: test.id,
          student_id: cleanRoll,
          student_name: studentName.trim(),
          student_roll_no: cleanRoll,
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
      setError(err?.message || 'Failed to initialize exam environment. Please try again.');
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 flex selection:bg-indigo-500 selection:text-white font-sans transition-colors">
      {/* LEFT HERO PANEL (Split-screen on md/lg screens) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-700 via-indigo-700 to-indigo-900 text-white p-12 xl:p-16 flex-col justify-between relative overflow-hidden">
        {/* Subtle geometric line curves in background */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 600 800" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="200" r="300" stroke="white" strokeWidth="1.5" strokeDasharray="6 6" />
            <circle cx="50" cy="250" r="450" stroke="white" strokeWidth="1.5" />
            <path d="M-100,500 C150,300 400,600 700,400" stroke="white" strokeWidth="2" />
            <path d="M-50,600 C200,400 450,700 750,500" stroke="white" strokeWidth="1.5" strokeDasharray="8 8" />
          </svg>
        </div>

        {/* Center Main Headline & Typewriter Quote */}
        <div className="relative z-10 space-y-6 max-w-lg my-auto py-10">
          <h1 className="text-5xl xl:text-7xl font-black tracking-tight leading-tight text-white drop-shadow-sm">
            Hello<br />
            Folks!
          </h1>

          <div className="min-h-[5rem] flex items-center">
            <p className="text-lg xl:text-2xl text-blue-100/95 font-medium leading-relaxed italic tracking-wide">
              &ldquo;{displayText}&rdquo;
              <span className="inline-block w-0.5 h-6 ml-1.5 bg-white animate-pulse align-middle" />
            </p>
          </div>
        </div>

        {/* Bottom Copyright Info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-blue-200/70 pt-6 border-t border-white/10">
          <span>© 2026 CodeArena. All rights reserved.</span>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isWasmReady ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
            <span className="font-mono text-[11px]">WASM: {isWasmReady ? 'Ready' : 'Booting...'}</span>
          </div>
        </div>
      </div>

      {/* RIGHT FORM PANEL (Enlarged Typography & Inputs) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-16 min-h-screen">
        {/* Top Navbar Row (Theme Changer Only) */}
        <div className="flex items-center justify-end">
          <ThemeToggle />
        </div>

        {/* Center Form Section (Enlarged Text & Inputs) */}
        <div className="w-full max-w-lg mx-auto my-auto py-8 space-y-7">
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Welcome Student!
            </h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">
              Enter your assessment join code and student credentials below.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-5">
            {/* Assessment Join Code */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                  Assessment Join Code *
                </label>
                {selectedTest && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Assessment Found
                  </span>
                )}
              </div>
              <div className="relative">
                <KeyRound className="w-5 h-5 text-indigo-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  disabled={isJoining}
                  value={testCode}
                  onChange={(e) => handleTestCodeChange(e.target.value)}
                  placeholder="e.g. C2026A"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-2xl text-base font-mono uppercase font-bold tracking-widest text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* Student Full Name */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                Student Full Name *
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  disabled={isJoining}
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-2xl text-sm sm:text-base font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* Student UID */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                Student UID / Roll No *
              </label>
              <div className="relative">
                <Hash className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  disabled={isJoining}
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value.toUpperCase())}
                  placeholder="e.g. 26BCS10145"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-2xl text-sm sm:text-base font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all uppercase disabled:opacity-60"
                />
              </div>
            </div>

            {/* Live Matched Assessment Preview Box */}
            {selectedTest && (
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-500/30 space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-indigo-950 dark:text-indigo-200 truncate pr-2">
                    {selectedTest.title}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider shrink-0">
                    {selectedTest.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600 dark:text-zinc-400 pt-2 border-t border-indigo-200/60 dark:border-indigo-800/40">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    {selectedTest.is_untimed ? 'Untimed Assessment' : `${selectedTest.duration_minutes} Mins`}
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    <BookOpen className="w-4 h-4 text-emerald-500" />
                    {selectedTest.questions?.length || 0} Questions
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                    <ShieldCheck className="w-4 h-4" />
                    Proctored
                  </span>
                </div>
              </div>
            )}

            {/* Main Action Button */}
            <button
              type="submit"
              disabled={!isWasmReady || isJoining}
              className="w-full py-4 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>Preparing Assessment Environment...</span>
                </>
              ) : (
                <>
                  <span>Enter Assessment Hall</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Anti-cheat guidelines note */}
          <div className="pt-1 text-center">
            <p className="text-xs text-slate-400 dark:text-zinc-500 flex items-center justify-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span>Fullscreen mode & tab switch integrity monitoring enabled</span>
            </p>
          </div>
        </div>

        {/* Bottom Helper Bar */}
        <div className="text-center text-xs text-slate-400 dark:text-zinc-600 pt-4 border-t border-slate-100 dark:border-zinc-800">
          <span>Need help joining? Contact your course instructor or assessment invigilator.</span>
        </div>
      </div>
    </div>
  );
};

