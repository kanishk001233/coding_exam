import React, { useState } from 'react';
import { Question } from '../types/database';
import { Code2, AlertCircle, Copy, Check, ChevronRight, ChevronLeft, Image as ImageIcon, Maximize2, X } from 'lucide-react';

interface QuestionPanelProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  onNextQuestion?: () => void;
  onPrevQuestion?: () => void;
  hasNextQuestion?: boolean;
  hasPrevQuestion?: boolean;
  isNavigationDisabled?: boolean;
}

export const QuestionPanel: React.FC<QuestionPanelProps> = ({
  question,
  questionIndex,
  totalQuestions,
  onNextQuestion,
  onPrevQuestion,
  hasNextQuestion,
  hasPrevQuestion,
  isNavigationDisabled = false,
}) => {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  const sampleCases = (question.test_cases || []).filter((tc) => tc.is_sample);

  const handleCopyInput = (input: string, idx: number) => {
    navigator.clipboard.writeText(input);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff.toLowerCase()) {
      case 'easy':
        return 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30';
      case 'medium':
        return 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30';
      case 'hard':
        return 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/30';
      default:
        return 'bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-500/30';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xl transition-colors relative">
      {/* Header */}
      <div className="px-5 py-3.5 bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-md bg-indigo-600 text-white font-bold text-xs">
            Q{questionIndex + 1}
          </span>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">
            {question.title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getDifficultyColor(question.difficulty)}`}>
            {question.difficulty}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30">
            {question.marks} Marks
          </span>

          {/* Blue Next Button */}
          {hasNextQuestion && onNextQuestion && (
            <button
              type="button"
              disabled={isNavigationDisabled}
              onClick={onNextQuestion}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ml-1"
              title="Proceed to next problem"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm text-slate-700 dark:text-slate-300">
        {/* Description */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Problem Statement
          </h3>
          <p className="text-slate-900 dark:text-slate-200 leading-relaxed whitespace-pre-line font-sans">
            {question.description}
          </p>

          {/* Question Media / Image / GIF */}
          {question.image_url && (
            <div className="pt-2">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Diagram / Illustration</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsMediaModalOpen(true)}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Enlarge</span>
                  </button>
                </div>

                <div
                  onClick={() => setIsMediaModalOpen(true)}
                  className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 cursor-pointer group relative flex items-center justify-center p-2 max-h-80 hover:border-indigo-400 transition-colors"
                  title="Click to expand full image/GIF"
                >
                  <img
                    src={question.image_url}
                    alt={question.title || 'Problem diagram'}
                    className="max-h-72 w-auto object-contain rounded transition-transform duration-200 group-hover:scale-[1.01]"
                  />
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors flex items-center justify-center pointer-events-none">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-[11px] font-medium shadow-md flex items-center gap-1">
                      <Maximize2 className="w-3 h-3" /> Click to Zoom
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input / Output Format */}
        {(question.input_format || question.output_format) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {question.input_format && (
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Input Format
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line">
                  {question.input_format}
                </p>
              </div>
            )}
            {question.output_format && (
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Output Format
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line">
                  {question.output_format}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Constraints */}
        {question.constraints && (
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              Constraints
            </h4>
            <code className="text-xs font-mono text-amber-700 dark:text-amber-200/90 block">
              {question.constraints}
            </code>
            <div className="text-[11px] text-slate-500 pt-1">
              Time Limit: {question.time_limit_ms || 2000} ms | Memory Limit: {question.memory_limit_mb || 64} MB
            </div>
          </div>
        )}

        {/* Sample Test Cases */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Code2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Sample Test Cases
          </h3>

          {sampleCases.length === 0 ? (
            <div className="text-xs text-slate-500 italic">No visible sample test cases provided.</div>
          ) : (
            sampleCases.map((tc, idx) => (
              <div
                key={tc.id || idx}
                className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2.5 font-mono text-xs"
              >
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-sans">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Sample Case #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyInput(tc.input, idx)}
                    className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline transition-colors"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-500 font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Input</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-sans">
                      Input
                    </div>
                    <pre className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 overflow-x-auto">
                      {tc.input || '(empty)'}
                    </pre>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-sans">
                      Expected Output
                    </div>
                    <pre className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-300 overflow-x-auto">
                      {tc.expected_output}
                    </pre>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Media Lightbox Modal */}
      {isMediaModalOpen && question.image_url && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsMediaModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl max-h-[90vh] w-full p-4 flex flex-col shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {question.title} - Diagram
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMediaModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[300px]">
              <img
                src={question.image_url}
                alt={question.title || 'Question illustration'}
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Press anywhere outside or click close button to dismiss</span>
              <button
                type="button"
                onClick={() => setIsMediaModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
