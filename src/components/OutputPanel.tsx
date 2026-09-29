import React, { useState, useEffect } from 'react';
import { Play, Send, CheckCircle2, XCircle, Clock, AlertTriangle, Terminal, Code2, Plus, X, Zap } from 'lucide-react';
import { TestCase, SubmissionResult, SubmissionStatus } from '../types/database';

export interface SampleCaseResult {
  caseIndex: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  status: SubmissionStatus;
  executionTime: number;
  errorMessage?: string;
}

export interface EditableCase {
  id: string;
  input: string;
  expected: string;
  isSample: boolean;
}

interface OutputPanelProps {
  isRunning: boolean;
  isSubmitting: boolean;
  sampleTestCases: TestCase[];
  sampleResults: SampleCaseResult[] | null;
  submissionResults: SubmissionResult[] | null;
  compileError: string | null;
  onRunCode: (casesToRun: EditableCase[]) => void;
  onSubmitCode: () => void;
  activeTab: 'testcase' | 'testresult' | 'submitresult';
  setActiveTab: (tab: 'testcase' | 'testresult' | 'submitresult') => void;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({
  isRunning,
  isSubmitting,
  sampleTestCases,
  sampleResults,
  submissionResults,
  compileError,
  onRunCode,
  onSubmitCode,
  activeTab,
  setActiveTab,
}) => {
  const [selectedCaseIdx, setSelectedCaseIdx] = useState<number>(0);
  const [casesList, setCasesList] = useState<EditableCase[]>([]);

  // Initialize or update cases when question sample test cases change
  useEffect(() => {
    const initialCases: EditableCase[] = sampleTestCases.map((tc, idx) => ({
      id: tc.id || `sample-${idx}`,
      input: tc.input || '',
      expected: tc.expected_output || '',
      isSample: true,
    }));

    if (initialCases.length === 0) {
      initialCases.push({
        id: 'custom-1',
        input: '',
        expected: '',
        isSample: false,
      });
    }

    setCasesList(initialCases);
    setSelectedCaseIdx(0);
  }, [sampleTestCases]);

  const currentCase = casesList[selectedCaseIdx] || casesList[0] || {
    id: 'default',
    input: '',
    expected: '',
    isSample: false,
  };

  const currentResult = sampleResults ? sampleResults[selectedCaseIdx] : null;

  const handleUpdateCaseInput = (idx: number, val: string) => {
    setCasesList((prev) => {
      const updated = [...prev];
      if (updated[idx]) {
        updated[idx] = { ...updated[idx], input: val };
      }
      return updated;
    });
  };

  const handleAddCustomCase = () => {
    const newCase: EditableCase = {
      id: `custom-${Date.now()}`,
      input: '',
      expected: '',
      isSample: false,
    };
    const nextList = [...casesList, newCase];
    setCasesList(nextList);
    setSelectedCaseIdx(nextList.length - 1);
    setActiveTab('testcase');
  };

  const handleDeleteCase = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (casesList.length <= 1) return;
    const nextList = casesList.filter((_, i) => i !== idx);
    setCasesList(nextList);
    setSelectedCaseIdx(Math.max(0, idx - 1));
  };

  const handleRun = () => {
    onRunCode(casesList);
  };

  const getStatusBadge = (status?: SubmissionStatus | string) => {
    if (!status) return null;
    switch (status) {
      case 'accepted':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
          </span>
        );
      case 'wrong_answer':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-400 font-bold text-xs">
            <XCircle className="w-3.5 h-3.5" /> Wrong Answer
          </span>
        );
      case 'time_limit':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-400 font-bold text-xs">
            <Clock className="w-3.5 h-3.5" /> Time Limit Exceeded
          </span>
        );
      case 'compile_error':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-400 font-bold text-xs">
            <AlertTriangle className="w-3.5 h-3.5" /> Compile Error
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#121214] border border-slate-200/90 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm transition-colors">
      {/* Header & Tab Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-slate-50/80 dark:bg-[#18181b]/90 border-b border-slate-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('testcase')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'testcase'
                ? 'bg-white dark:bg-[#121214] text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-zinc-700'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/50'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Testcases</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('testresult')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'testresult'
                ? 'bg-white dark:bg-[#121214] text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200 dark:border-zinc-700'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/50'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-500" />
            <span>Run Result</span>
          </button>

          {submissionResults && (
            <button
              type="button"
              onClick={() => setActiveTab('submitresult')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'submitresult'
                  ? 'bg-indigo-50 dark:bg-zinc-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-zinc-700 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/50'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-indigo-500" />
              <span>Submit Result</span>
            </button>
          )}
        </div>

        {/* Action Buttons: Run Code & Submit */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isRunning || isSubmitting}
            onClick={handleRun}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-200/80 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-100 border border-slate-300/80 dark:border-zinc-700 font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs active:scale-95 cursor-pointer"
            title="Execute testcases (Ctrl+Enter)"
          >
            {isRunning ? (
              <>
                <span className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-emerald-600 dark:fill-emerald-400" />
                <span>Run Code</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isRunning || isSubmitting}
            onClick={onSubmitCode}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs shadow-indigo-600/20 active:scale-95 cursor-pointer"
            title="Submit solution for grading"
          >
            {isSubmitting ? (
              <>
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Submit</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto font-sans text-xs text-slate-800 dark:text-zinc-200">
        {/* SUBMISSION LOADING STATE */}
        {isSubmitting ? (
          <div className="h-40 flex flex-col items-center justify-center p-4 space-y-3 font-sans text-center">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-zinc-800 border border-indigo-200 dark:border-zinc-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Code2 className="w-5 h-5 animate-pulse" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white dark:border-zinc-900 animate-ping" />
            </div>

            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Grading Submission...
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Evaluating solution against hidden test cases
              </p>
            </div>

            <div className="w-40 bg-slate-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-600 rounded-full w-full animate-pulse" />
            </div>
          </div>
        ) : (
          <>
            {/* TAB 1: TESTCASE */}
            {activeTab === 'testcase' && (
              <div className="space-y-3.5">
                {/* Case Selector Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {casesList.map((c, idx) => (
                    <div
                      key={c.id || idx}
                      onClick={() => setSelectedCaseIdx(idx)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                        selectedCaseIdx === idx
                          ? 'bg-slate-200/90 dark:bg-zinc-800 text-slate-900 dark:text-white border border-slate-300 dark:border-zinc-700 font-bold shadow-xs'
                          : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <span>Case {idx + 1}</span>
                      {!c.isSample && casesList.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCase(idx, e)}
                          className="text-slate-400 hover:text-rose-500 p-0.5 rounded cursor-pointer"
                          title="Remove Case"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddCustomCase}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors border border-dashed border-slate-300 dark:border-zinc-700 cursor-pointer"
                    title="Add Custom Test Case"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Case</span>
                  </button>
                </div>

                {/* Selected Case Detail - Editable Input */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      <span>Input (stdin):</span>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 lowercase font-normal">Editable</span>
                    </div>
                    <textarea
                      rows={3}
                      value={currentCase.input}
                      onChange={(e) => handleUpdateCaseInput(selectedCaseIdx, e.target.value)}
                      placeholder="Enter stdin input (e.g. 10 20)..."
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 font-mono text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 resize-none transition-colors"
                    />
                  </div>

                  {currentCase.expected && (
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                        Expected Output (Reference):
                      </div>
                      <pre className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 font-mono text-xs text-emerald-600 dark:text-emerald-400 overflow-x-auto leading-tight">
                        {currentCase.expected}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: TEST RESULT */}
            {activeTab === 'testresult' && (
              <div className="space-y-3.5">
                {compileError ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getStatusBadge('compile_error')}
                    </div>
                    <pre className="p-3 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                      {compileError}
                    </pre>
                  </div>
                ) : sampleResults && sampleResults.length > 0 ? (
                  <div className="space-y-3.5">
                    {/* Overall status bar */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
                      <div className="flex items-center gap-2.5">
                        {getStatusBadge(
                          sampleResults.every((r) => r.status === 'accepted')
                            ? 'accepted'
                            : sampleResults.some((r) => r.status === 'time_limit')
                            ? 'time_limit'
                            : 'wrong_answer'
                        )}
                        <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                          Runtime: <strong className="text-slate-900 dark:text-zinc-200 font-mono">{sampleResults[selectedCaseIdx]?.executionTime || 0} ms</strong>
                        </span>
                      </div>
                    </div>

                    {/* Case Selector Pills with Pass/Fail dots */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {sampleResults.map((res, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedCaseIdx(idx)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            selectedCaseIdx === idx
                              ? 'bg-slate-200/90 dark:bg-zinc-800 text-slate-900 dark:text-white border border-slate-300 dark:border-zinc-700 font-bold shadow-xs'
                              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/50'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              res.status === 'accepted' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span>Case {idx + 1}</span>
                        </button>
                      ))}
                    </div>

                    {/* Active Case Details */}
                    {currentResult && (
                      <div className="space-y-3">
                        <div>
                          <div className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                            Input:
                          </div>
                          <pre className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 font-mono text-xs text-slate-900 dark:text-zinc-200 overflow-x-auto leading-tight">
                            {currentResult.input || '(empty)'}
                          </pre>
                        </div>

                        <div>
                          <div className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                            Your Output:
                          </div>
                          <pre className={`p-2.5 rounded-xl bg-slate-50 dark:bg-[#09090b] border font-mono text-xs overflow-x-auto leading-tight ${
                            currentResult.status === 'accepted'
                              ? 'border-emerald-300 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                              : 'border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400'
                          }`}>
                            {currentResult.actualOutput || '(no output)'}
                          </pre>
                        </div>

                        {currentResult.expectedOutput && (
                          <div>
                            <div className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                              Expected Output:
                            </div>
                            <pre className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 font-mono text-xs text-emerald-600 dark:text-emerald-400 overflow-x-auto leading-tight">
                              {currentResult.expectedOutput}
                            </pre>
                          </div>
                        )}

                        {currentResult.errorMessage && currentResult.status !== 'accepted' && (
                          <div className="p-2.5 rounded-xl bg-rose-50/90 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 font-mono text-xs">
                            {currentResult.errorMessage}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-36 flex flex-col items-center justify-center text-slate-400 dark:text-zinc-500 space-y-2 text-center">
                    <Terminal className="w-7 h-7 text-slate-300 dark:text-zinc-700" />
                    <p className="text-xs">
                      Click <strong className="text-slate-700 dark:text-zinc-300">Run Code</strong> to execute your code against test cases.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SUBMISSION RESULT */}
            {activeTab === 'submitresult' && submissionResults && (
              <div className="space-y-3 font-sans">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(
                      submissionResults.every((r) => r.status === 'accepted') ? 'accepted' : 'wrong_answer'
                    )}
                  </div>
                  <div className="text-xs font-bold font-mono text-slate-700 dark:text-zinc-300">
                    Score: {submissionResults.reduce((sum, r) => sum + r.marks_awarded, 0)} / {submissionResults.reduce((sum, r) => sum + r.max_marks, 0)} pts
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {submissionResults.map((result, idx) => (
                    <div
                      key={result.id || idx}
                      className={`p-3 rounded-xl border text-xs transition-all ${
                        result.status === 'accepted'
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/30 text-slate-800 dark:text-zinc-200'
                          : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30 text-slate-800 dark:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {result.status === 'accepted' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                          )}
                          <span className="font-bold text-slate-900 dark:text-zinc-200">
                            {result.is_sample ? `Sample Case #${idx + 1}` : `Hidden Test Case #${idx + 1}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400">{result.execution_time}ms</span>
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            result.status === 'accepted' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                          }`}>
                            +{result.marks_awarded} / {result.max_marks} pts
                          </span>
                        </div>
                      </div>

                      {result.error_message && (
                        <div className="mt-2 p-2 rounded-lg bg-white dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 text-[11px] font-mono text-rose-700 dark:text-rose-300 whitespace-pre-wrap">
                          {result.error_message}
                        </div>
                      )}

                      {result.is_sample && result.actual_output && (
                        <div className="mt-2 text-[11px] font-mono text-slate-700 dark:text-zinc-300">
                          <div>Output: <span className="text-slate-500 dark:text-zinc-400">{result.actual_output}</span></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

