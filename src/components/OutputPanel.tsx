import React, { useState, useEffect } from 'react';
import { Play, Send, CheckCircle2, XCircle, Clock, AlertTriangle, Terminal, Code2, Plus, X } from 'lucide-react';
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
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
          </span>
        );
      case 'wrong_answer':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-400 font-bold text-xs">
            <XCircle className="w-3.5 h-3.5" /> Wrong Answer
          </span>
        );
      case 'time_limit':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-400 font-bold text-xs">
            <Clock className="w-3.5 h-3.5" /> Time Limit Exceeded
          </span>
        );
      case 'compile_error':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-500/40 text-red-700 dark:text-red-400 font-bold text-xs">
            <AlertTriangle className="w-3.5 h-3.5" /> Compile Error
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xl transition-colors">
      {/* Header & LeetCode Tab Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('testcase')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'testcase'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-300 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Testcase</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('testresult')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'testresult'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-300 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-500" />
            <span>Test Result</span>
          </button>

          {submissionResults && (
            <button
              type="button"
              onClick={() => setActiveTab('submitresult')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'submitresult'
                  ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-500/40 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
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
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
          >
            {isRunning ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
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
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 active:scale-95"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
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
      <div className="flex-1 p-4 overflow-y-auto font-sans text-xs text-slate-800 dark:text-slate-200">
        {/* SUBMISSION LOADING JUDGING STATE */}
        {isSubmitting ? (
          <div className="h-44 flex flex-col items-center justify-center p-4 space-y-3.5 font-sans text-center">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Code2 className="w-5 h-5 animate-pulse" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-900 animate-ping" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Judging Submission...
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Compiling & evaluating solution against all hidden test cases
              </p>
            </div>

            {/* Glowing progress line */}
            <div className="w-44 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-600 rounded-full w-full animate-pulse" />
            </div>
          </div>
        ) : (
          <>
            {/* TAB 1: TESTCASE (LeetCode Case Tabs with Editable Textarea) */}
            {activeTab === 'testcase' && (
              <div className="space-y-4">
                {/* Case Selector Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {casesList.map((c, idx) => (
                    <div
                      key={c.id || idx}
                      onClick={() => setSelectedCaseIdx(idx)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        selectedCaseIdx === idx
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 font-bold shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <span>Case {idx + 1}</span>
                      {!c.isSample && casesList.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCase(idx, e)}
                          className="text-slate-400 hover:text-rose-500 p-0.5 rounded"
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
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-dashed border-slate-300 dark:border-slate-700"
                    title="Add Custom Test Case"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Case</span>
                  </button>
                </div>

                {/* Selected Case Detail - Editable Input */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      <span>Input (stdin):</span>
                      <span className="text-[10px] text-slate-400 lowercase font-normal">Editable testcase</span>
                    </div>
                    <textarea
                      rows={3}
                      value={currentCase.input}
                      onChange={(e) => handleUpdateCaseInput(selectedCaseIdx, e.target.value)}
                      placeholder="Enter stdin input (e.g. 10 20)..."
                      className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 resize-none transition-colors"
                    />
                  </div>

                  {currentCase.expected && (
                    <div>
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Expected Output (sample reference):
                      </div>
                      <pre className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-emerald-700 dark:text-emerald-400 overflow-x-auto">
                        {currentCase.expected}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: TEST RESULT (LeetCode Run Result View) */}
            {activeTab === 'testresult' && (
              <div className="space-y-4">
                {compileError ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getStatusBadge('compile_error')}
                    </div>
                    <pre className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 font-mono text-xs whitespace-pre-wrap">
                      {compileError}
                    </pre>
                  </div>
                ) : sampleResults && sampleResults.length > 0 ? (
                  <div className="space-y-4">
                    {/* Overall status header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        {getStatusBadge(
                          sampleResults.every((r) => r.status === 'accepted')
                            ? 'accepted'
                            : sampleResults.some((r) => r.status === 'time_limit')
                            ? 'time_limit'
                            : 'wrong_answer'
                        )}
                        <span className="text-xs font-semibold text-slate-500">
                          Runtime: <strong className="text-slate-900 dark:text-slate-200 font-mono">{sampleResults[selectedCaseIdx]?.executionTime || 0} ms</strong>
                        </span>
                      </div>
                    </div>

                    {/* Case Selector Pills with Pass/Fail indicators */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {sampleResults.map((res, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedCaseIdx(idx)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            selectedCaseIdx === idx
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
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
                          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            Input:
                          </div>
                          <pre className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-slate-200 overflow-x-auto">
                            {currentResult.input || '(empty)'}
                          </pre>
                        </div>

                        <div>
                          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            Output:
                          </div>
                          <pre className={`p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border font-mono text-xs overflow-x-auto ${
                            currentResult.status === 'accepted'
                              ? 'border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
                              : 'border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-400'
                          }`}>
                            {currentResult.actualOutput || '(no stdout output)'}
                          </pre>
                        </div>

                        {currentResult.expectedOutput && (
                          <div>
                            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                              Expected:
                            </div>
                            <pre className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-slate-200 overflow-x-auto">
                              {currentResult.expectedOutput}
                            </pre>
                          </div>
                        )}

                        {currentResult.errorMessage && currentResult.status !== 'accepted' && (
                          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300 font-mono text-xs">
                            {currentResult.errorMessage}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-40 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 space-y-2">
                    <Terminal className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                    <p className="text-xs">Click <strong className="text-slate-700 dark:text-slate-300">Run Code</strong> to execute your solution against test cases.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SUBMISSION RESULT */}
            {activeTab === 'submitresult' && submissionResults && (
              <div className="space-y-3 font-sans">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(
                      submissionResults.every((r) => r.status === 'accepted') ? 'accepted' : 'wrong_answer'
                    )}
                  </div>
                  <div className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">
                    Score: {submissionResults.reduce((sum, r) => sum + r.marks_awarded, 0)} / {submissionResults.reduce((sum, r) => sum + r.max_marks, 0)} pts
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {submissionResults.map((result, idx) => (
                    <div
                      key={result.id || idx}
                      className={`p-3 rounded-lg border text-xs transition-all ${
                        result.status === 'accepted'
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/30 text-slate-800 dark:text-slate-200'
                          : 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/30 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {result.status === 'accepted' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                          )}
                          <span className="font-semibold text-slate-900 dark:text-slate-200">
                            {result.is_sample ? `Sample Case #${idx + 1}` : `Hidden Test Case #${idx + 1}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">{result.execution_time}ms</span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            result.status === 'accepted' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                          }`}>
                            +{result.marks_awarded} / {result.max_marks} pts
                          </span>
                        </div>
                      </div>

                      {result.error_message && (
                        <div className="mt-2 p-2 rounded bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 text-[11px] font-mono text-rose-700 dark:text-rose-300 whitespace-pre-wrap">
                          {result.error_message}
                        </div>
                      )}

                      {result.is_sample && result.actual_output && (
                        <div className="mt-2 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                          <div>Output: <span className="text-slate-500 dark:text-slate-400">{result.actual_output}</span></div>
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
