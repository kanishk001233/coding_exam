import React, { useState, useEffect, useRef } from 'react';
import { Test, TestAttempt, TestCase, Submission, SubmissionResult } from '../types/database';
import { TestHeader } from '../components/TestHeader';
import { QuestionPanel } from '../components/QuestionPanel';
import { CodeEditor } from '../components/CodeEditor';
import { OutputPanel, SampleCaseResult, EditableCase } from '../components/OutputPanel';
import { useTest } from '../hooks/useTest';
import { useCode } from '../hooks/useCode';
import { wasmCompiler } from '../lib/wasm/compiler';
import { TestJudge } from '../lib/judge/testRunner';
import { compareOutputs } from '../lib/judge/outputCompare';
import { mockDb } from '../lib/mockDb';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  ShieldAlert, Maximize2, AlertTriangle, CheckCircle2,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Code2
} from 'lucide-react';
import { ModalDialog } from '../components/ModalDialog';
import { AiAssistModal, SavedAiQuestionState } from '../components/AiAssistModal';
import handRaiseIcon from '../5721257.png';

interface StudentTestProps {
  test: Test;
  attempt: TestAttempt;
  onFinishTest: (attempt: TestAttempt) => void;
}

export const StudentTest: React.FC<StudentTestProps> = ({
  test,
  attempt,
  onFinishTest,
}) => {
  const {
    currentQuestionIndex,
    currentQuestion,
    questions,
    goToQuestion,
    tabSwitchCount,
    fullscreenExitCount,
    cheatingWarning,
    clearWarning,
    enterFullscreen,
  } = useTest({
    test,
    attempt,
  });

  const activeQuestion = currentQuestion || questions[0];

  const defaultStarter = activeQuestion?.starter_code || `#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    \n    return 0;\n}`;

  const {
    code,
    updateCode,
    resetToStarter,
    saveImmediately,
    isSaving,
    lastSavedTime,
  } = useCode({
    attemptId: attempt.id,
    questionId: activeQuestion?.id || 'default',
    starterCode: defaultStarter,
  });

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isFinishing, setIsFinishing] = useState<boolean>(false);
  const [sampleResults, setSampleResults] = useState<SampleCaseResult[] | null>(null);
  const [submissionResults, setSubmissionResults] = useState<SubmissionResult[] | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [activeOutputTab, setActiveOutputTab] = useState<'testcase' | 'testresult' | 'submitresult'>('testcase');
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  // AI Guidance state (Stores 1-time generated step sequence & step index per question ID, persisted in localStorage)
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [questionAiMap, setQuestionAiMap] = useState<Record<string, SavedAiQuestionState>>(() => {
    try {
      const saved = localStorage.getItem(`c_exam_ai_state_${attempt.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleSaveAiState = (questionId: string, state: SavedAiQuestionState) => {
    setQuestionAiMap(prev => {
      const updated = {
        ...prev,
        [questionId]: state,
      };
      try {
        localStorage.setItem(`c_exam_ai_state_${attempt.id}`, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to persist AI assist state to localStorage', e);
      }
      return updated;
    });
  };

  // Resizable Split Pane States (Horizontal: Question vs Code, Vertical: Editor vs Output)
  const [horizontalSplit, setHorizontalSplit] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('c_exam_layout_h');
      return saved ? Math.max(20, Math.min(75, parseFloat(saved))) : 42;
    } catch {
      return 42;
    }
  });

  const [verticalSplit, setVerticalSplit] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('c_exam_layout_v');
      return saved ? Math.max(20, Math.min(80, parseFloat(saved))) : 58;
    } catch {
      return 58;
    }
  });

  const [isDraggingH, setIsDraggingH] = useState<boolean>(false);
  const [isDraggingV, setIsDraggingV] = useState<boolean>(false);

  const mainContainerRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);

  // Global mouse & touch listeners during horizontal resizing
  useEffect(() => {
    if (!isDraggingH) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!mainContainerRef.current) return;
      const rect = mainContainerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const offset = clientX - rect.left;
      const percent = (offset / rect.width) * 100;
      const clamped = Math.max(20, Math.min(75, percent));
      setHorizontalSplit(clamped);
      try {
        localStorage.setItem('c_exam_layout_h', clamped.toString());
      } catch {}
    };

    const handlePointerUp = () => {
      setIsDraggingH(false);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDraggingH]);

  // Global mouse & touch listeners during vertical resizing
  useEffect(() => {
    if (!isDraggingV) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!rightPaneRef.current) return;
      const rect = rightPaneRef.current.getBoundingClientRect();
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const offset = clientY - rect.top;
      const percent = (offset / rect.height) * 100;
      const clamped = Math.max(20, Math.min(80, percent));
      setVerticalSplit(clamped);
      try {
        localStorage.setItem('c_exam_layout_v', clamped.toString());
      } catch {}
    };

    const handlePointerUp = () => {
      setIsDraggingV(false);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDraggingV]);

  // Latest submissions for questions to show status dots in left sidebar
  const [studentLatestSubmissions, setStudentLatestSubmissions] = useState<Submission[]>(() =>
    mockDb.getLatestSubmissions(attempt.id)
  );

  // Classroom Offline Help Request State
  const [isHelpRequested, setIsHelpRequested] = useState<boolean>(() =>
    mockDb.isHelpPending(attempt.id)
  );
  const [helpToast, setHelpToast] = useState<string | null>(null);

  // Instant real-time listener for help request resolution
  useEffect(() => {
    const checkHelpStatus = () => {
      const isPending = mockDb.isHelpPending(attempt.id);
      setIsHelpRequested(isPending);
    };

    // 1. Local instant BroadcastChannel & CustomEvent listeners
    window.addEventListener('codearena_help_update', checkHelpStatus);

    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('codearena_help_channel');
        bc.onmessage = () => {
          checkHelpStatus();
        };
      } catch {}
    }

    // 2. Supabase Realtime WebSocket listener
    let supabaseChannel: any = null;
    if (isSupabaseConfigured && supabase) {
      try {
        supabaseChannel = supabase
          .channel(`student-help-${attempt.id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'help_requests', filter: `attempt_id=eq.${attempt.id}` },
            async () => {
              await mockDb.syncStudentHelpRequest(attempt.id);
              checkHelpStatus();
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Realtime subscription error on student test:', err);
      }
    }

    // 3. Background interval fallback (5s)
    const interval = setInterval(checkHelpStatus, 5000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('codearena_help_update', checkHelpStatus);
      if (bc) bc.close();
      if (supabaseChannel && supabase) {
        supabase.removeChannel(supabaseChannel);
      }
    };
  }, [attempt.id]);

  const handleToggleNeedHelp = async () => {
    if (isHelpRequested) {
      await mockDb.cancelHelpRequest(attempt.id);
      setIsHelpRequested(false);
      setHelpToast('Help request cancelled.');
      setTimeout(() => setHelpToast(null), 3000);
    } else {
      await mockDb.requestHelp({
        test_id: test.id,
        attempt_id: attempt.id,
        student_name: attempt.student_name || 'Student',
        student_roll_no: attempt.student_roll_no || '',
        question_title: activeQuestion ? `Q${currentQuestionIndex + 1}: ${activeQuestion.title}` : undefined,
      });
      setIsHelpRequested(true);
      setHelpToast('🙋 Instructor has been notified! Please stay seated.');
      setTimeout(() => setHelpToast(null), 4000);
    }
  };

  useEffect(() => {
    setSampleResults(null);
    setSubmissionResults(null);
    setCompileError(null);
    setActiveOutputTab('testcase');
  }, [activeQuestion]);

  const isTabTrackingEnabled = test.enable_tab_switch_tracking !== false && (test.enable_tab_switch_tracking as any) !== 'false';
  const isFullscreenEnabled = test.enable_fullscreen_mode !== false && (test.enable_fullscreen_mode as any) !== 'false';

  useEffect(() => {
    if (isFullscreenEnabled) {
      enterFullscreen();
    }
  }, [enterFullscreen, isFullscreenEnabled]);

  // Handle Run Code (Executes editable test cases and opens Test Result tab)
  const handleRunCode = async (customCasesToRun?: EditableCase[]) => {
    if (!activeQuestion) return;
    setIsRunning(true);
    setCompileError(null);
    saveImmediately();

    try {
      const compileRes = await wasmCompiler.compile(code);
      if (!compileRes.success) {
        setCompileError(compileRes.errors || 'Compilation failed');
        setActiveOutputTab('testresult');
        setIsRunning(false);
        return;
      }

      const sampleCases = (activeQuestion.test_cases || []).filter((tc: TestCase) => tc.is_sample);
      const casesToRun: EditableCase[] =
        customCasesToRun && customCasesToRun.length > 0
          ? customCasesToRun
          : sampleCases.length > 0
          ? sampleCases.map((tc, idx) => ({
              id: tc.id || `sample-${idx}`,
              input: tc.input || '',
              expected: tc.expected_output || '',
              isSample: true,
            }))
          : [{ id: 'tc-fallback', input: '', expected: '', isSample: true }];

      const results: SampleCaseResult[] = [];

      for (let i = 0; i < casesToRun.length; i++) {
        const tc = casesToRun[i];
        const runRes = await wasmCompiler.run(
          compileRes.executable,
          tc.input || '',
          {
            timeoutMs: activeQuestion.time_limit_ms || 2000,
            memoryLimitMb: activeQuestion.memory_limit_mb || 64,
            outputLimitKb: 100,
          }
        );

        let status = 'accepted';
        let errorMessage: string | undefined = undefined;

        if (runRes.timedOut) {
          status = 'time_limit';
          errorMessage = 'Time Limit Exceeded';
        } else if (!runRes.success && runRes.stderr) {
          status = 'runtime_error';
          errorMessage = runRes.stderr;
        } else if (tc.expected) {
          const comp = compareOutputs(runRes.stdout, tc.expected);
          if (!comp.isMatch) {
            status = 'wrong_answer';
            errorMessage = comp.diffMessage;
          }
        }

        results.push({
          caseIndex: i,
          input: tc.input,
          expectedOutput: tc.expected,
          actualOutput: runRes.stdout,
          status: status as any,
          executionTime: runRes.executionTime,
          errorMessage,
        });
      }

      setSampleResults(results);
      setActiveOutputTab('testresult');
    } catch (err: any) {
      setCompileError(err.message || 'Execution error');
      setActiveOutputTab('testresult');
    } finally {
      setIsRunning(false);
    }
  };

  // Handle Submit (Executes hidden test cases and switches to submit result)
  const handleSubmitCode = async () => {
    if (!activeQuestion) return;
    setIsSubmitting(true);
    saveImmediately();

    try {
      const testCases = activeQuestion.test_cases || [];
      const judgeRes = await TestJudge.evaluateCode(
        code,
        testCases,
        activeQuestion.time_limit_ms,
        activeQuestion.memory_limit_mb
      );

      setSubmissionResults(judgeRes.results);
      setActiveOutputTab('submitresult');

      const subId = `sub_${attempt.id}_${activeQuestion.id}`;
      const resultsWithIds = (judgeRes.results || []).map((res) => ({
        ...res,
        id: `res_${subId}_${res.test_case_id}`,
        submission_id: subId,
      }));

      await mockDb.saveSubmission({
        id: subId,
        attempt_id: attempt.id,
        question_id: activeQuestion.id,
        student_id: attempt.student_id,
        code,
        language: 'c',
        status: judgeRes.status,
        score: judgeRes.score,
        max_score: judgeRes.maxScore,
        submitted_at: new Date().toISOString(),
        execution_time: judgeRes.totalExecutionTime,
        results: resultsWithIds,
      });

      const totalScore = mockDb.calculateAttemptScore(attempt.id);
      const currentAttempt = mockDb.getAttempts().find(a => a.id === attempt.id) || attempt;

      const updatedAttempt: TestAttempt = {
        ...currentAttempt,
        score: totalScore,
      };

      await mockDb.saveAttempt(updatedAttempt);
      sessionStorage.setItem('c_exam_student_attempt', JSON.stringify(updatedAttempt));
      setStudentLatestSubmissions(mockDb.getLatestSubmissions(attempt.id));
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishTest = async () => {
    setIsFinishing(true);
    try {
      saveImmediately();
      const totalScore = mockDb.calculateAttemptScore(attempt.id);
      const currentAttempt = mockDb.getAttempts().find(a => a.id === attempt.id) || attempt;

      const finishedAttempt: TestAttempt = {
        ...currentAttempt,
        status: 'submitted',
        score: totalScore,
        submitted_at: new Date().toISOString(),
      };

      await mockDb.saveAttempt(finishedAttempt);
      mockDb.clearStorageAfterTest(attempt.id);
      sessionStorage.setItem('c_exam_student_attempt', JSON.stringify(finishedAttempt));

      setShowFinishConfirm(false);
      onFinishTest(finishedAttempt);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFinishing(false);
    }
  };

  const handleExpireTimer = async () => {
    saveImmediately();
    const totalScore = mockDb.calculateAttemptScore(attempt.id);
    const currentAttempt = mockDb.getAttempts().find(a => a.id === attempt.id) || attempt;

    const finishedAttempt: TestAttempt = {
      ...currentAttempt,
      status: 'auto_submitted',
      score: totalScore,
      submitted_at: new Date().toISOString(),
    };

    await mockDb.saveAttempt(finishedAttempt);
    mockDb.clearStorageAfterTest(attempt.id);
    sessionStorage.setItem('c_exam_student_attempt', JSON.stringify(finishedAttempt));

    onFinishTest(finishedAttempt);
  };

  const sampleCases = (activeQuestion?.test_cases || []).filter((tc: TestCase) => tc.is_sample);

  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-[#0a0a0c] text-slate-900 dark:text-zinc-100 overflow-hidden font-sans transition-colors">
      {/* Test Header */}
      <TestHeader
        test={test}
        startedAt={attempt.started_at}
        totalQuestions={questions.length}
        isSaving={isSaving}
        lastSavedTime={lastSavedTime}
        tabSwitchCount={tabSwitchCount}
        onOpenAiAssist={() => setIsAiModalOpen(true)}
        hasAiGuidance={Boolean(activeQuestion?.id && questionAiMap[activeQuestion.id])}
        onEnterFullscreen={enterFullscreen}
        onFinishTest={() => setShowFinishConfirm(true)}
        onExpireTimer={handleExpireTimer}
      />

      {/* Floating Bottom-Right Hand Raise Button (Direct Large Circular Icon) */}
      <div className="fixed bottom-5 right-5 z-40 select-none">
        <button
          type="button"
          onClick={handleToggleNeedHelp}
          className={`relative p-0 rounded-full transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer focus:outline-none ${
            isHelpRequested
              ? 'animate-bounce drop-shadow-[0_10px_20px_rgba(245,158,11,0.5)]'
              : 'hover:drop-shadow-[0_8px_16px_rgba(0,0,0,0.25)] drop-shadow-[0_4px_10px_rgba(0,0,0,0.15)]'
          }`}
          title={
            isHelpRequested
              ? 'Teacher notified! Click to cancel help request.'
              : 'Click to raise your hand and notify instructor for desk assistance.'
          }
        >
          <img
            src={handRaiseIcon}
            alt="Raise Hand"
            className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-full"
          />
          {isHelpRequested && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-white"></span>
            </span>
          )}
        </button>
      </div>

      {/* Help Requested Toast Notification */}
      {helpToast && (
        <div className="fixed top-14 right-4 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="px-4 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-xs shadow-xl shadow-amber-500/25 flex items-center gap-2 border border-amber-400">
            <span>{helpToast}</span>
          </div>
        </div>
      )}

      {/* Main Container with Left Sidebar */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Questions Sidebar - Pure Color Coded Difficulty Containers */}
        <aside className="w-14 sm:w-16 border-r border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-[#121214]/95 backdrop-blur-md flex flex-col items-center py-3 px-1.5 gap-2.5 shrink-0 overflow-y-auto select-none shadow-xs z-10">
          <div className="flex flex-col items-center gap-0.5 px-0.5 text-center w-full">
            <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
              Problems
            </span>
            <span className="text-[10px] font-bold font-mono text-indigo-600 dark:text-indigo-400">
              {currentQuestionIndex + 1}/{questions.length}
            </span>
          </div>

          <div className="w-full h-[1px] bg-slate-200 dark:bg-zinc-800" />

          {/* 3 Pure Color Coded Containers: Easy (Green), Medium (Amber), Hard (Rose) */}
          {([
            {
              key: 'easy',
              title: 'Easy Questions',
              items: questions
                .map((q, idx) => ({ q, idx }))
                .filter(({ q }) => (q.difficulty || 'easy').toLowerCase() === 'easy'),
              containerClass: 'bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500/30 dark:border-emerald-500/30',
              indicatorClass: 'bg-emerald-500',
              buttonBorderClass: 'border-emerald-200/90 dark:border-emerald-500/30',
            },
            {
              key: 'medium',
              title: 'Medium Questions',
              items: questions
                .map((q, idx) => ({ q, idx }))
                .filter(({ q }) => (q.difficulty || '').toLowerCase() === 'medium'),
              containerClass: 'bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/30 dark:border-amber-500/30',
              indicatorClass: 'bg-amber-500',
              buttonBorderClass: 'border-amber-200/90 dark:border-amber-500/30',
            },
            {
              key: 'hard',
              title: 'Hard Questions',
              items: questions
                .map((q, idx) => ({ q, idx }))
                .filter(({ q }) => (q.difficulty || '').toLowerCase() === 'hard'),
              containerClass: 'bg-rose-500/10 dark:bg-rose-950/20 border-rose-500/30 dark:border-rose-500/30',
              indicatorClass: 'bg-rose-500',
              buttonBorderClass: 'border-rose-200/90 dark:border-rose-500/30',
            },
          ] as const).map((section) => (
            <div
              key={section.key}
              className={`w-full rounded-2xl border p-1.5 flex flex-col items-center gap-1.5 transition-all ${section.containerClass}`}
              title={section.title}
            >
              {/* Top Color Indicator Bar */}
              <div className={`w-5 h-1 rounded-full ${section.indicatorClass} opacity-80`} />

              {/* Questions belonging to this difficulty - Square Buttons */}
              {section.items.length === 0 ? (
                <span className="text-[10px] text-slate-400 dark:text-zinc-600 py-0.5 font-mono">
                  -
                </span>
              ) : (
                <div className="flex flex-col items-center gap-1.5 w-full">
                  {section.items.map(({ q, idx }) => {
                    const isCurrent = idx === currentQuestionIndex;
                    const sub = studentLatestSubmissions.find((s) => s.question_id === q.id);
                    const isAccepted = sub?.status === 'accepted';
                    const isAttempted = Boolean(sub);

                    return (
                      <button
                        key={q.id || idx}
                        type="button"
                        disabled={isSubmitting || isRunning}
                        onClick={() => {
                          saveImmediately();
                          goToQuestion(idx);
                        }}
                        className={`w-10 h-10 aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-150 relative cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                          isCurrent
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105 ring-2 ring-indigo-400/50 dark:ring-indigo-500/50'
                            : isAccepted
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-400/80 dark:border-emerald-500/40 hover:bg-emerald-100 hover:scale-105'
                            : isAttempted
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-400/80 dark:border-amber-500/40 hover:bg-amber-100 hover:scale-105'
                            : `bg-white dark:bg-[#18181b] text-slate-700 dark:text-zinc-200 border ${section.buttonBorderClass} hover:bg-slate-100 dark:hover:bg-zinc-700 hover:scale-105`
                        }`}
                        title={`Q${idx + 1}: ${q.title} (${q.marks} pts) [${q.difficulty}]`}
                      >
                        <span>Q{idx + 1}</span>
                        {isAccepted && (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -top-1 -right-1 ring-2 ring-white dark:ring-zinc-900 shadow-xs" />
                        )}
                        {isAttempted && !isAccepted && (
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 absolute -top-1 -right-1 ring-2 ring-white dark:ring-zinc-900 shadow-xs" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </aside>

        {/* Main Split Interface */}
        <main
          ref={mainContainerRef}
          className="flex-1 flex flex-col lg:flex-row p-2.5 sm:p-3 gap-0 min-h-0 overflow-hidden relative"
        >
          {/* Left Column: Question Details */}
          <div
            className="w-full lg:h-full overflow-hidden flex flex-col min-w-[260px] shrink-0"
            style={{
              width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${horizontalSplit}%` : undefined,
            }}
          >
            {activeQuestion && (
              <QuestionPanel
                question={activeQuestion}
                questionIndex={currentQuestionIndex}
                totalQuestions={questions.length}
                hasNextQuestion={currentQuestionIndex < questions.length - 1}
                hasPrevQuestion={currentQuestionIndex > 0}
                isNavigationDisabled={isRunning || isSubmitting}
                onNextQuestion={() => {
                  if (currentQuestionIndex < questions.length - 1) {
                    saveImmediately();
                    goToQuestion(currentQuestionIndex + 1);
                  }
                }}
                onPrevQuestion={() => {
                  if (currentQuestionIndex > 0) {
                    saveImmediately();
                    goToQuestion(currentQuestionIndex - 1);
                  }
                }}
              />
            )}
          </div>

          {/* Horizontal Resizer Divider between Question Panel and Workspace */}
          <div
            role="separator"
            aria-orientation="vertical"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDraggingH(true);
            }}
            onTouchStart={() => setIsDraggingH(true)}
            onDoubleClick={() => {
              setHorizontalSplit(42);
              try {
                localStorage.setItem('c_exam_layout_h', '42');
              } catch {}
            }}
            className={`hidden lg:flex items-center justify-center relative w-3 hover:w-3.5 group cursor-col-resize select-none shrink-0 transition-all z-20 mx-0.5 ${
              isDraggingH ? 'bg-indigo-600/20' : 'hover:bg-indigo-500/10'
            }`}
            title="Drag horizontally to resize Question vs Code workspace (Double-click to reset)"
          >
            <div
              className={`w-3.5 h-14 rounded-full flex flex-col items-center justify-center gap-0.5 transition-all shadow-xs border ${
                isDraggingH
                  ? 'bg-indigo-600 text-white border-indigo-400 scale-110 shadow-indigo-600/30'
                  : 'bg-white dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border-slate-300/80 dark:border-zinc-700 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 group-hover:scale-105'
              }`}
            >
              <ChevronLeft className="w-2.5 h-2.5 -mr-0.5" />
              <ChevronRight className="w-2.5 h-2.5 -mr-0.5" />
            </div>
          </div>

          {/* Right Column: Code Editor + LeetCode Output Panel */}
          <div
            ref={rightPaneRef}
            className="w-full lg:h-full flex flex-col gap-0 min-h-0 overflow-hidden flex-1 min-w-[300px]"
            style={{
              width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${100 - horizontalSplit}%` : undefined,
            }}
          >
            {/* Top: Code Editor */}
            <div
              className="w-full overflow-hidden flex flex-col min-h-[140px]"
              style={{ height: `${verticalSplit}%` }}
            >
              <CodeEditor
                code={code}
                onChange={updateCode}
                onReset={resetToStarter}
                onRun={handleRunCode}
              />
            </div>

            {/* Vertical Resizer Divider between Code Editor and Output Panel */}
            <div
              role="separator"
              aria-orientation="horizontal"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingV(true);
              }}
              onTouchStart={() => setIsDraggingV(true)}
              onDoubleClick={() => {
                setVerticalSplit(58);
                try {
                  localStorage.setItem('c_exam_layout_v', '58');
                } catch {}
              }}
              className={`flex items-center justify-center relative h-3.5 hover:h-4 group cursor-row-resize select-none shrink-0 transition-all z-20 my-0.5 ${
                isDraggingV ? 'bg-indigo-600/20' : 'hover:bg-indigo-500/10'
              }`}
              title="Drag vertically to resize Code Editor vs Testcase output (Double-click to reset)"
            >
              <div
                className={`h-4 w-16 rounded-full flex items-center justify-center gap-0.5 transition-all shadow-sm border ${
                  isDraggingV
                    ? 'bg-indigo-600 text-white border-indigo-400 scale-110 shadow-indigo-600/30'
                    : 'bg-white dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border-slate-300 dark:border-zinc-700 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 group-hover:scale-105'
                }`}
              >
                <ChevronUp className="w-2.5 h-2.5 -mb-0.5" />
                <ChevronDown className="w-2.5 h-2.5 -mb-0.5" />
              </div>
            </div>

            {/* Bottom: Output / Testcase Panel */}
            <div
              className="w-full overflow-hidden flex flex-col min-h-[120px] flex-1"
              style={{ height: `${100 - verticalSplit}%` }}
            >
              <OutputPanel
                isRunning={isRunning}
                isSubmitting={isSubmitting}
                sampleTestCases={sampleCases}
                sampleResults={sampleResults}
                submissionResults={submissionResults}
                compileError={compileError}
                onRunCode={handleRunCode}
                onSubmitCode={handleSubmitCode}
                activeTab={activeOutputTab}
                setActiveTab={setActiveOutputTab}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Fullscreen transparent drag overlay to prevent iframe / Monaco editor event capture during resize */}
      {(isDraggingH || isDraggingV) && (
        <div
          className={`fixed inset-0 z-50 select-none ${
            isDraggingH ? 'cursor-col-resize' : 'cursor-row-resize'
          }`}
        />
      )}

      {/* Submitting Loading Modal Overlay - Prevents navigation while submitting */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121214] border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xl flex items-center justify-between gap-4 max-w-md w-full relative overflow-hidden">
            {/* Top glowing animated accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 animate-pulse" />

            {/* Left Content */}
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-zinc-800 border border-indigo-200 dark:border-zinc-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Code2 className="w-5 h-5 animate-pulse" />
              </div>

              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">
                    Evaluating Solution
                  </h4>
                  {/* Live pulsing indicator */}
                  <span className="flex h-2 w-2 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">
                  Testing against hidden test cases...
                </p>
              </div>
            </div>

            {/* Right Animated Loader */}
            <div className="flex items-center gap-2 shrink-0 pl-2">
              <div className="relative w-8 h-8 flex items-center justify-center">
                {/* Outer spinning ring */}
                <div className="absolute inset-0 rounded-full border-2 border-indigo-200 dark:border-zinc-700 border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
                {/* Inner counter-spinning dashed ring */}
                <div
                  className="w-4 h-4 rounded-full border-2 border-violet-300 dark:border-zinc-600 border-b-violet-600 dark:border-b-violet-400 animate-spin"
                  style={{ animationDirection: 'reverse', animationDuration: '1.2s' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-app Confirmation Modal for Finishing Test */}
      <ModalDialog
        isOpen={showFinishConfirm}
        type="confirm"
        isDestructive={true}
        isLoading={isFinishing}
        loadingText="Submitting assessment & finalizing results..."
        title="Finish & Submit Assessment"
        message="Are you sure you want to finish and submit the assessment? You cannot make further edits."
        confirmText="Finish & Submit"
        cancelText="Continue Test"
        onConfirm={handleFinishTest}
        onCancel={() => setShowFinishConfirm(false)}
      />

      {/* Anti-cheat Alert Dialog Box in front of screen */}
      {cheatingWarning && (
        (cheatingWarning.type === 'TAB_SWITCH' && isTabTrackingEnabled) ||
        (cheatingWarning.type === 'FULLSCREEN_EXIT' && isFullscreenEnabled)
      ) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-white dark:bg-[#121214] border-2 border-rose-500 rounded-2xl shadow-2xl p-6 space-y-5 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500"></div>

            <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/30 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-xs font-bold uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Security Integrity Flag #{cheatingWarning.count}</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {cheatingWarning.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                {cheatingWarning.message}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 text-left text-xs text-slate-500 dark:text-zinc-400 space-y-1">
              <p className="font-semibold text-slate-800 dark:text-zinc-200">⚠️ Instructor Notification:</p>
              <p>This event, along with your timestamp and test metrics, has been instantly submitted to the instructor's live monitor.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              {cheatingWarning.type === 'FULLSCREEN_EXIT' && (
                <button
                  type="button"
                  onClick={() => {
                    enterFullscreen();
                    clearWarning();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>Re-enter Fullscreen</span>
                </button>
              )}
              <button
                type="button"
                onClick={clearWarning}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all active:scale-95"
              >
                I Understand & Continue Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1-Time AI Assist Coding Coach Modal */}
      {activeQuestion && (
        <AiAssistModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          question={activeQuestion}
          studentCode={code}
          savedState={questionAiMap[activeQuestion.id] || null}
          onSaveState={(state) => handleSaveAiState(activeQuestion.id, state)}
        />
      )}
    </div>
  );
};
