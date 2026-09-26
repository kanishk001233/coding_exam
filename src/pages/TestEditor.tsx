import React, { useState } from 'react';
import { Test, Question, TestCase } from '../types/database';
import { mockDb } from '../lib/mockDb';
import { ArrowLeft, Plus, Trash2, Save, Eye, EyeOff, Code2 } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { ModalDialog } from '../components/ModalDialog';

interface TestEditorProps {
  test: Test;
  onSave: (updatedTest: Test) => void;
  onCancel: () => void;
}

export const TestEditor: React.FC<TestEditorProps> = ({ test, onSave, onCancel }) => {
  const [currentTest, setCurrentTest] = useState<Test>({ ...test });
  const [questions, setQuestions] = useState<Question[]>(test.questions || []);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);
  const [validationAlert, setValidationAlert] = useState<{ title: string; message: string } | null>(null);

  const activeQuestion = questions[selectedQuestionIndex];

  const handleUpdateQuestionField = (field: keyof Question, value: any) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[selectedQuestionIndex] = {
        ...next[selectedQuestionIndex],
        [field]: value,
      };
      return next;
    });
  };

  const handleAddQuestion = () => {
    const newQ: Question = {
      id: 'q-' + Math.random().toString(36).substring(2, 9),
      test_id: currentTest.id,
      title: 'New Custom C Problem',
      description: 'Describe the problem statement here...',
      input_format: 'Standard input specification',
      output_format: 'Standard output specification',
      constraints: '1 <= N <= 1000',
      starter_code: `#include <stdio.h>\n\nint main() {\n    // Write your code here\n    \n    return 0;\n}`,
      difficulty: 'easy',
      marks: 10,
      time_limit_ms: 2000,
      memory_limit_mb: 64,
      question_order: questions.length + 1,
      test_cases: [
        {
          id: 'tc-' + Math.random().toString(36).substring(2, 9),
          question_id: '',
          input: '5',
          expected_output: '10',
          is_sample: true,
          marks: 5,
        },
        {
          id: 'tc-' + Math.random().toString(36).substring(2, 9),
          question_id: '',
          input: '100',
          expected_output: '200',
          is_sample: false,
          marks: 5,
        },
      ]
    };

    setQuestions([...questions, newQ]);
    setSelectedQuestionIndex(questions.length);
  };

  const handleDeleteQuestion = (idx: number) => {
    if (questions.length <= 1) {
      setValidationAlert({
        title: 'Minimum Question Requirement',
        message: 'A test must contain at least 1 question. You cannot delete the only remaining problem.',
      });
      return;
    }
    const next = questions.filter((_, i) => i !== idx);
    setQuestions(next);
    setSelectedQuestionIndex(Math.max(0, idx - 1));
  };

  const handleAddTestCase = (isSample: boolean) => {
    if (!activeQuestion) return;
    const newTC: TestCase = {
      id: 'tc-' + Math.random().toString(36).substring(2, 9),
      question_id: activeQuestion.id,
      input: '',
      expected_output: '',
      is_sample: isSample,
      marks: 5,
    };
    const updatedTCs = [...(activeQuestion.test_cases || []), newTC];
    handleUpdateQuestionField('test_cases', updatedTCs);
  };

  const handleDeleteTestCase = (tcId: string) => {
    if (!activeQuestion) return;
    const updatedTCs = (activeQuestion.test_cases || []).filter((t) => t.id !== tcId);
    handleUpdateQuestionField('test_cases', updatedTCs);
  };

  const handleUpdateTestCase = (tcId: string, field: keyof TestCase, value: any) => {
    if (!activeQuestion) return;
    const updatedTCs = (activeQuestion.test_cases || []).map((t) => {
      if (t.id === tcId) {
        return { ...t, [field]: value };
      }
      return t;
    });
    handleUpdateQuestionField('test_cases', updatedTCs);
  };

  const handleSaveAll = async () => {
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
    const updated: Test = {
      ...currentTest,
      questions,
      total_marks: totalMarks,
    };

    await mockDb.saveTest(updated);
    onSave(updated);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 font-sans transition-colors">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Edit Test: {currentTest.title}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Modify test questions, starter code templates, sample and hidden test cases</p>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleSaveAll}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save All Changes</span>
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Question Navigator Column (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Questions</span>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30 text-xs font-semibold hover:bg-indigo-200 dark:hover:bg-indigo-900"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-2">
              {questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  onClick={() => setSelectedQuestionIndex(idx)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    idx === selectedQuestionIndex
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-slate-900 dark:text-white shadow-md'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="text-xs font-bold truncate">Q{idx + 1}. {q.title}</div>
                    <div className="text-[10px] text-slate-500">{q.marks} pts • {q.difficulty}</div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteQuestion(idx);
                    }}
                    className="text-slate-400 hover:text-rose-500 p-1"
                    title="Delete Question"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Question Editor Column (9 cols) */}
          <div className="lg:col-span-9 space-y-6">
            {activeQuestion ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Question Title</label>
                    <input
                      type="text"
                      value={activeQuestion.title}
                      onChange={(e) => handleUpdateQuestionField('title', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Marks / Points</label>
                    <input
                      type="number"
                      value={activeQuestion.marks}
                      onChange={(e) => handleUpdateQuestionField('marks', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Problem Description</label>
                  <textarea
                    rows={4}
                    value={activeQuestion.description}
                    onChange={(e) => handleUpdateQuestionField('description', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Input Format</label>
                    <textarea
                      rows={2}
                      value={activeQuestion.input_format || ''}
                      onChange={(e) => handleUpdateQuestionField('input_format', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Output Format</label>
                    <textarea
                      rows={2}
                      value={activeQuestion.output_format || ''}
                      onChange={(e) => handleUpdateQuestionField('output_format', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                </div>

                {/* Starter Code Template Editor (Request #3 Fix) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-indigo-500" />
                    Starter Code Template (Initial code shown to student)
                  </label>
                  <textarea
                    rows={5}
                    value={activeQuestion.starter_code || `#include <stdio.h>\n\nint main() {\n    // Write your code here\n    \n    return 0;\n}`}
                    onChange={(e) => handleUpdateQuestionField('starter_code', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                {/* Test Cases Section */}
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Test Cases</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Sample cases are visible to students; Hidden cases are evaluated during grading.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddTestCase(true)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-500" />
                        <span>+ Sample Case</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddTestCase(false)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold"
                      >
                        <EyeOff className="w-3.5 h-3.5 text-amber-500" />
                        <span>+ Hidden Case</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(activeQuestion.test_cases || []).map((tc, tcIdx) => (
                      <div
                        key={tc.id || tcIdx}
                        className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                          tc.is_sample
                            ? 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                            : 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              tc.is_sample ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            }`}>
                              {tc.is_sample ? 'Visible Sample Case' : 'Hidden Test Case'}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 font-mono">Case #{tcIdx + 1}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <span>Points:</span>
                              <input
                                type="number"
                                value={tc.marks}
                                onChange={(e) => handleUpdateTestCase(tc.id, 'marks', Number(e.target.value))}
                                className="w-12 px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-center font-mono"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => handleDeleteTestCase(tc.id)}
                              className="text-slate-400 hover:text-rose-500"
                              title="Delete Test Case"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                              Input (stdin)
                            </span>
                            <textarea
                              rows={2}
                              value={tc.input}
                              onChange={(e) => handleUpdateTestCase(tc.id, 'input', e.target.value)}
                              placeholder="e.g. 10 20"
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded text-slate-800 dark:text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500 resize-none"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                              Expected Output (stdout)
                            </span>
                            <textarea
                              rows={2}
                              value={tc.expected_output}
                              onChange={(e) => handleUpdateTestCase(tc.id, 'expected_output', e.target.value)}
                              placeholder="e.g. 30"
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded text-emerald-700 dark:text-emerald-300 font-mono text-xs focus:outline-none focus:border-indigo-500 resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">Select a question to edit.</div>
            )}
          </div>
        </div>

        {/* Validation Modal Dialog */}
        <ModalDialog
          isOpen={Boolean(validationAlert)}
          type="warning"
          title={validationAlert?.title || 'Notice'}
          message={validationAlert?.message || ''}
          confirmText="OK"
          onConfirm={() => setValidationAlert(null)}
          onClose={() => setValidationAlert(null)}
        />
      </div>
    </div>
  );
};
