import React, { useState, useEffect, useRef } from 'react';
import { Test, Question, TestCase } from '../types/database';
import { mockDb } from '../lib/mockDb';
import { ArrowLeft, Check, RefreshCw, Plus, Trash2, Eye, EyeOff, Code2, Upload, FileSpreadsheet, Download, ShieldCheck, Loader2 } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { ModalDialog } from '../components/ModalDialog';
import { QuestionMediaUpload } from '../components/QuestionMediaUpload';
import { downloadSampleCSVTemplate, parseCSVToQuestions } from '../lib/csvHelper';

interface CreateTestProps {
  onSave: (newTest: Test) => void;
  onCancel: () => void;
}

export const CreateTest: React.FC<CreateTestProps> = ({ onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [joinCode, setJoinCode] = useState(() => 'C' + Math.floor(1000 + Math.random() * 9000));
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [status, setStatus] = useState<'draft' | 'scheduled' | 'live'>('live');
  const [enableTabSwitchTracking, setEnableTabSwitchTracking] = useState(true);
  const [enableFullscreenMode, setEnableFullscreenMode] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Dialog State
  const [validationAlert, setValidationAlert] = useState<{ title: string; message: string } | null>(null);

  // File input ref for CSV upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Question Bank
  const [questionBank, setQuestionBank] = useState<Omit<Question, 'test_id'>[]>([]);

  useEffect(() => {
    setQuestionBank(mockDb.getQuestionBank());
  }, []);

  // Selected Bank Question IDs
  const [selectedBankQuestionIds, setSelectedBankQuestionIds] = useState<string[]>([]);

  // Custom Questions created directly in this wizard
  const [customQuestions, setCustomQuestions] = useState<Question[]>([]);
  const [showCustomModal, setShowCustomModal] = useState(false);

  // New Custom Question Form State
  const [newQTitle, setNewQTitle] = useState('');
  const [newQDesc, setNewQDesc] = useState('');
  const [newQImageUrl, setNewQImageUrl] = useState('');
  const [newQDifficulty, setNewQDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [newQMarks, setNewQMarks] = useState(10);
  const [newQInputFormat, setNewQInputFormat] = useState('');
  const [newQOutputFormat, setNewQOutputFormat] = useState('');
  const [newQConstraints, setNewQConstraints] = useState('1 <= N <= 10^5');
  const [newQStarterCode, setNewQStarterCode] = useState(`#include <stdio.h>\n\nint main() {\n    //write your code here\n    return 0;\n}`);
  const [newQTestCases, setNewQTestCases] = useState<TestCase[]>([
    {
      id: 'tc-sample-1',
      question_id: '',
      input: '10',
      expected_output: '20',
      is_sample: true,
      marks: 5,
    },
    {
      id: 'tc-hidden-1',
      question_id: '',
      input: '50',
      expected_output: '100',
      is_sample: false,
      marks: 5,
    },
  ]);

  const generateNewJoinCode = () => {
    setJoinCode('C' + Math.floor(1000 + Math.random() * 9000));
  };

  const toggleBankQuestionSelection = (id: string) => {
    setSelectedBankQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddTestCaseToNewQ = (isSample: boolean) => {
    const newTC: TestCase = {
      id: 'tc-' + Math.random().toString(36).substring(2, 9),
      question_id: '',
      input: '',
      expected_output: '',
      is_sample: isSample,
      marks: 5,
    };
    setNewQTestCases([...newQTestCases, newTC]);
  };

  const handleUpdateNewQTestCase = (idx: number, field: keyof TestCase, value: any) => {
    setNewQTestCases((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleDeleteNewQTestCase = (idx: number) => {
    setNewQTestCases((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error('File content is empty.');

        const parsedQuestions = parseCSVToQuestions(text);
        if (parsedQuestions.length === 0) {
          throw new Error('No valid questions found in the uploaded CSV.');
        }

        setCustomQuestions((prev) => [...prev, ...parsedQuestions]);
        setValidationAlert({
          title: 'CSV Import Successful',
          message: `Successfully parsed and added ${parsedQuestions.length} custom question(s) with sample & hidden test cases to your test.`,
        });
      } catch (err: any) {
        setValidationAlert({
          title: 'CSV Import Error',
          message: err.message || 'Failed to parse CSV file. Please make sure the format matches the sample template.',
        });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.readAsText(file);
  };

  const handleSaveCustomQuestion = () => {
    if (!newQTitle.trim()) {
      setValidationAlert({
        title: 'Missing Question Title',
        message: 'Please provide a title for the custom problem.',
      });
      return;
    }

    const newQuestion: Question = {
      id: 'q-custom-' + Math.random().toString(36).substring(2, 9),
      test_id: '',
      title: newQTitle.trim(),
      description: newQDesc.trim(),
      input_format: newQInputFormat.trim(),
      output_format: newQOutputFormat.trim(),
      constraints: newQConstraints.trim(),
      starter_code: newQStarterCode,
      difficulty: newQDifficulty,
      marks: Number(newQMarks) || 10,
      time_limit_ms: 2000,
      memory_limit_mb: 64,
      image_url: newQImageUrl.trim() || undefined,
      question_order: customQuestions.length + 1,
      test_cases: newQTestCases.map((tc) => ({
        ...tc,
        id: 'tc-' + Math.random().toString(36).substring(2, 9),
      })),
    };

    setCustomQuestions([...customQuestions, newQuestion]);

    // Reset Form
    setNewQTitle('');
    setNewQDesc('');
    setNewQImageUrl('');
    setNewQInputFormat('');
    setNewQOutputFormat('');
    setNewQConstraints('1 <= N <= 10^5');
    setNewQStarterCode(`#include <stdio.h>\n\nint main() {\n    // Write your code here\n    \n    return 0;\n}`);
    setNewQTestCases([
      {
        id: 'tc-sample-1',
        question_id: '',
        input: '10',
        expected_output: '20',
        is_sample: true,
        marks: 5,
      },
      {
        id: 'tc-hidden-1',
        question_id: '',
        input: '50',
        expected_output: '100',
        is_sample: false,
        marks: 5,
      },
    ]);
    setShowCustomModal(false);
  };

  const handleDeleteCustomQuestion = (idx: number) => {
    setCustomQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setValidationAlert({
        title: 'Missing Test Title',
        message: 'Please enter a title for the test before proceeding.',
      });
      return;
    }

    const bankSelected = questionBank.filter((q: Omit<Question, 'test_id'>) =>
      selectedBankQuestionIds.includes(q.id)
    );

    const totalQuestionsCount = bankSelected.length + customQuestions.length;

    if (totalQuestionsCount === 0) {
      setValidationAlert({
        title: 'No Questions Selected',
        message: 'Please select at least 1 question from the Question Bank or add a custom question.',
      });
      return;
    }

    const testId = 'test-' + Math.random().toString(36).substring(2, 9);

    let orderIndex = 1;
    const finalQuestions: Question[] = [
      ...bankSelected.map((q: Omit<Question, 'test_id'>) => ({
        ...q,
        id: 'q-' + Math.random().toString(36).substring(2, 9),
        test_id: testId,
        question_order: orderIndex++,
      })),
      ...customQuestions.map((q: Question) => ({
        ...q,
        test_id: testId,
        question_order: orderIndex++,
      })),
    ];

    const totalMarks = finalQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);

    const newTest: Test = {
      id: testId,
      title: title.trim(),
      description: description.trim(),
      join_code: joinCode.trim().toUpperCase(),
      duration_minutes: Number(durationMinutes) || 45,
      status,
      created_by: 'teacher-kanishk',
      created_at: new Date().toISOString(),
      questions: finalQuestions,
      total_marks: totalMarks,
      enable_tab_switch_tracking: enableTabSwitchTracking,
      enable_fullscreen_mode: enableFullscreenMode,
    };

    setIsSaving(true);
    try {
      await mockDb.saveTest(newTest);
      onSave(newTest);
    } catch (err) {
      console.error('Failed to create test:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 sm:p-10 font-sans transition-colors relative">
      {/* Loading Overlay */}
      {isSaving && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3 text-center animate-in zoom-in-95 duration-150">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Publishing Test</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Creating test session and setting up questions...</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cancel & Back</span>
            </button>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Create New C Coding Test</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configure exam parameters, add custom questions, or pick from question bank</p>
          </div>

          <ThemeToggle />
        </div>

        <form onSubmit={handleCreate} className="space-y-6">
          {/* Main Details Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Test Configuration</h2>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Test Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. C Programming Lab Assessment (Pointers & Loops)"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description / Exam Instructions</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instructions for students regarding allowed libraries, time constraints, etc."
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Student Join Code</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono font-bold uppercase text-indigo-600 dark:text-indigo-300 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={generateNewJoinCode}
                    className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    title="Generate New Code"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Duration (Minutes)</label>
                <input
                  type="number"
                  required
                  min={5}
                  max={300}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Initial Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="live">Live (Students can join now)</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
          </div>

          {/* Anti-Cheat & Proctoring Controls Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                Anti-Cheat & Proctoring Controls
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure browser restrictions and integrity tracking for students taking this test
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Tab Switch Detection Toggle */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Tab Switch & Window Blur Detection</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      enableTabSwitchTracking
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {enableTabSwitchTracking ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Track and log whenever students navigate away, switch tabs, or lose window focus, showing anti-cheat integrity alerts.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={enableTabSwitchTracking}
                    onChange={(e) => setEnableTabSwitchTracking(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Fullscreen Mode Toggle */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Enforce Fullscreen Mode</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      enableFullscreenMode
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {enableFullscreenMode ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Automatically launch test in fullscreen mode and log violations / alerts if a student exits fullscreen.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={enableFullscreenMode}
                    onChange={(e) => setEnableFullscreenMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Custom Questions Section with CSV Upload */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Custom Questions ({customQuestions.length})</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Add your own customized C questions, constraints, or import in bulk via CSV</p>
              </div>

              {/* Hidden CSV file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVFileChange}
                className="hidden"
              />

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={downloadSampleCSVTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-300 dark:border-slate-700 transition-all active:scale-95 cursor-pointer"
                  title="Download a pre-formatted CSV sample with sample and hidden test cases"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Sample CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                  title="Upload CSV with question details and multiple test cases"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCustomModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Question</span>
                </button>
              </div>
            </div>

            {customQuestions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {customQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-3.5 rounded-xl border border-indigo-300 dark:border-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-950/30 flex items-start justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {idx + 1}. {q.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {q.marks} Marks • {q.difficulty} • {q.test_cases?.length || 0} Test cases ({(q.test_cases || []).filter(tc => tc.is_sample).length} Sample, {(q.test_cases || []).filter(tc => !tc.is_sample).length} Hidden)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomQuestion(idx)}
                      className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                      title="Remove Custom Question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-500 space-y-2">
                <p>No custom questions added yet.</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload questions via CSV</span>
                  </button>
                  <span>or click</span>
                  <button
                    type="button"
                    onClick={() => setShowCustomModal(true)}
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                  >
                    + Add Custom Question
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Question Bank Picker Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Select From Question Bank</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Optional: pick pre-tested questions with verified sample and hidden test cases</p>
              </div>
              <span className="text-xs font-bold font-mono px-2.5 py-1 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30">
                {selectedBankQuestionIds.length} Selected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {questionBank.map((q: Omit<Question, 'test_id'>) => {
                const isSelected = selectedBankQuestionIds.includes(q.id);
                return (
                  <div
                    key={q.id}
                    onClick={() => toggleBankQuestionSelection(q.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 shadow-md'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-xs text-slate-900 dark:text-white">{q.title}</h3>
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">{q.description}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                      <span className="capitalize">{q.difficulty}</span>
                      <span>{q.marks} Marks</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Creating Test...</span>
                </>
              ) : (
                <span>Create & Publish Test ({customQuestions.length + selectedBankQuestionIds.length} Questions)</span>
              )}
            </button>
          </div>
        </form>

        {/* Modal: Add Custom Question */}
        {showCustomModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Custom C Question</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={downloadSampleCSVTemplate}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    <Download className="w-3 h-3 text-indigo-500" />
                    <span>Sample CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomModal(false);
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomModal(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold pl-2 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Question Title *</label>
                    <input
                      type="text"
                      required
                      value={newQTitle}
                      onChange={(e) => setNewQTitle(e.target.value)}
                      placeholder="e.g. Find Second Largest Number in Array"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Marks *</label>
                    <input
                      type="number"
                      min={1}
                      value={newQMarks}
                      onChange={(e) => setNewQMarks(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Difficulty</label>
                    <select
                      value={newQDifficulty}
                      onChange={(e) => setNewQDifficulty(e.target.value as any)}
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
                      value={newQConstraints}
                      onChange={(e) => setNewQConstraints(e.target.value)}
                      placeholder="e.g. 1 <= N <= 1000"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Problem Description *</label>
                  <textarea
                    rows={3}
                    value={newQDesc}
                    onChange={(e) => setNewQDesc(e.target.value)}
                    placeholder="Write the full problem statement and requirements here..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none font-sans"
                  />
                </div>

                {/* Problem Diagram / Media Upload */}
                <QuestionMediaUpload
                  imageUrl={newQImageUrl}
                  onChange={setNewQImageUrl}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Input Format</label>
                    <textarea
                      rows={2}
                      value={newQInputFormat}
                      onChange={(e) => setNewQInputFormat(e.target.value)}
                      placeholder="e.g. First line contains N, second line contains N integers."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Output Format</label>
                    <textarea
                      rows={2}
                      value={newQOutputFormat}
                      onChange={(e) => setNewQOutputFormat(e.target.value)}
                      placeholder="e.g. Print the answer on a single line."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Starter Code Template</label>
                  <textarea
                    rows={4}
                    value={newQStarterCode}
                    onChange={(e) => setNewQStarterCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                {/* Test Cases */}
                <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Test Cases ({newQTestCases.length})</h4>
                      <p className="text-[11px] text-slate-500">Add visible sample cases and hidden test cases</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddTestCaseToNewQ(true)}
                        className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-500" />
                        <span>+ Sample</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddTestCaseToNewQ(false)}
                        className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1"
                      >
                        <EyeOff className="w-3.5 h-3.5 text-amber-500" />
                        <span>+ Hidden</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto">
                    {newQTestCases.map((tc, idx) => (
                      <div
                        key={idx}
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
                                onChange={(e) => handleUpdateNewQTestCase(idx, 'marks', Number(e.target.value))}
                                className="w-12 px-1 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-center"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleDeleteNewQTestCase(idx)}
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
                              onChange={(e) => handleUpdateNewQTestCase(idx, 'input', e.target.value)}
                              placeholder="e.g. 10 20"
                              className="w-full p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 font-mono text-xs"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 block mb-0.5">Expected Output</span>
                            <textarea
                              rows={2}
                              value={tc.expected_output}
                              onChange={(e) => handleUpdateNewQTestCase(idx, 'expected_output', e.target.value)}
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
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomQuestion}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md"
                >
                  Add Question to Test
                </button>
              </div>
            </div>
          </div>
        )}

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
