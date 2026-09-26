import React, { useState, useEffect } from 'react';
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
import { ShieldAlert, Maximize2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ModalDialog } from '../components/ModalDialog';

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

  // Latest submissions for questions to show status dots in left sidebar
  const [studentLatestSubmissions, setStudentLatestSubmissions] = useState<Submission[]>(() =>
    mockDb.getLatestSubmissions(attempt.id)
  );

  useEffect(() => {
    setSampleResults(null);
    setSubmissionResults(null);
    setCompileError(null);
    setActiveOutputTab('testcase');
  }, [activeQuestion]);

  useEffect(() => {
    if (test.enable_fullscreen_mode !== false) {
      enterFullscreen();
    }
  }, [enterFullscreen, test.enable_fullscreen_mode]);

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
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors">
      {/* Test Header */}
      <TestHeader
        test={test}
        startedAt={attempt.started_at}
        totalQuestions={questions.length}
        isSaving={isSaving}
        lastSavedTime={lastSavedTime}
        tabSwitchCount={tabSwitchCount}
        onEnterFullscreen={enterFullscreen}
        onFinishTest={() => setShowFinishConfirm(true)}
        onExpireTimer={handleExpireTimer}
      />

      {/* Main Container with Left Sidebar */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Questions Sidebar */}
        <aside className="w-14 sm:w-16 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 flex flex-col items-center py-3 gap-2.5 shrink-0 overflow-y-auto select-none shadow-sm z-10">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Problems
          </span>

          {questions.map((q, idx) => {
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
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all relative disabled:opacity-40 disabled:cursor-not-allowed ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105 ring-2 ring-indigo-400 dark:ring-indigo-500'
                    : isAccepted
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/40 hover:bg-emerald-100'
                    : isAttempted
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/40 hover:bg-amber-100'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-105'
                }`}
                title={`Q${idx + 1}: ${q.title} (${q.marks} pts)`}
              >
                <span>Q{idx + 1}</span>
                {isAccepted && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -top-1 -right-1 ring-2 ring-white dark:ring-slate-900" />
                )}
                {isAttempted && !isAccepted && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 absolute -top-1 -right-1 ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>
            );
          })}
        </aside>

        {/* Main Split Interface */}
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 min-h-0 overflow-hidden">
          {/* Left Column: Question Details (5 cols) */}
          <div className="lg:col-span-5 h-full overflow-hidden flex flex-col">
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

          {/* Right Column: Code Editor + LeetCode Output Panel (7 cols) */}
          <div className="lg:col-span-7 h-full flex flex-col gap-3 min-h-0 overflow-hidden">
            <div className="flex-1 min-h-[260px] overflow-hidden">
              <CodeEditor
                code={code}
                onChange={updateCode}
                onReset={resetToStarter}
                onRun={handleRunCode}
              />
            </div>

            <div className="h-64 shrink-0 overflow-hidden">
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

      {/* Submitting Loading Modal Overlay - Prevents navigation while submitting */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl flex items-center gap-4 max-w-sm w-full animate-in fade-in">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Evaluating Solution...</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Testing against all test cases. Please wait...</p>
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
        loadingText="Submitting test & finalizing results..."
        title="Finish & Submit Examination"
        message="Are you sure you want to finish and submit the test? You cannot make further edits."
        confirmText="Finish & Submit"
        cancelText="Continue Test"
        onConfirm={handleFinishTest}
        onCancel={() => setShowFinishConfirm(false)}
      />

      {/* Anti-cheat Alert Dialog Box in front of screen */}
      {cheatingWarning && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border-2 border-rose-500 rounded-2xl shadow-2xl p-6 space-y-5 text-center relative overflow-hidden">
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
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {cheatingWarning.message}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-200">⚠️ Instructor Notification:</p>
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
    </div>
  );
};
