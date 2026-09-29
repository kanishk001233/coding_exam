import React, { useState } from 'react';
import { Question } from '../types/database';
import { Code2, AlertCircle, Copy, Check, ChevronRight, ChevronLeft, Image as ImageIcon, Maximize2, X, Clock, Cpu, Award } from 'lucide-react';

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
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  const sampleCases = (question.test_cases || []).filter((tc) => tc.is_sample);

  const handleCopyInput = (input: string, idx: number) => {
    navigator.clipboard.writeText(input);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff.toLowerCase()) {
      case 'easy':
        return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30';
      case 'medium':
        return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30';
      case 'hard':
        return 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30';
      default:
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#121214] border border-slate-200/90 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm transition-colors relative">
      {/* Question Header Bar */}
      <div className="px-4 sm:px-5 py-3 bg-slate-50/80 dark:bg-[#18181b]/90 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-xs shrink-0">
            {questionIndex + 1}
          </span>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 tracking-tight truncate">
            {question.title}
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize ${getDifficultyBadge(question.difficulty)}`}>
            {question.difficulty}
          </span>
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-zinc-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-zinc-700">
            <Award className="w-3 h-3" />
            <span>{question.marks} pts</span>
          </span>

          {/* Previous / Next Navigation Buttons */}
          <div className="flex items-center gap-1 ml-1">
            {hasPrevQuestion && onPrevQuestion && (
              <button
                type="button"
                disabled={isNavigationDisabled}
                onClick={onPrevQuestion}
                className="p-1.5 rounded-lg bg-slate-200/70 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Previous problem"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {hasNextQuestion && onNextQuestion && (
              <button
                type="button"
                disabled={isNavigationDisabled}
                onClick={onNextQuestion}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Next problem"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-sm text-slate-700 dark:text-zinc-300 leading-relaxed font-sans">
        {/* Description */}
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
            Problem Description
          </h3>
          <p className="text-slate-800 dark:text-zinc-200 whitespace-pre-line leading-relaxed text-xs sm:text-sm">
            {question.description}
          </p>

          {/* Question Media / Image / GIF */}
          {question.image_url && (
            <div className="pt-2">
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-[#18181b]/60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Diagram / Reference</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsMediaModalOpen(true)}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Zoom</span>
                  </button>
                </div>

                <div
                  onClick={() => setIsMediaModalOpen(true)}
                  className="rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] cursor-pointer group relative flex items-center justify-center p-2 max-h-72 hover:border-indigo-400 transition-colors"
                  title="Click to zoom image"
                >
                  <img
                    src={question.image_url}
                    alt={question.title || 'Problem diagram'}
                    className="max-h-64 w-auto object-contain rounded transition-transform duration-200 group-hover:scale-[1.01]"
                  />
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1 rounded-full bg-zinc-900/90 text-white text-[11px] font-medium shadow-md flex items-center gap-1.5">
                      <Maximize2 className="w-3 h-3" /> Click to Enlarge
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input / Output Format */}
        {(question.input_format || question.output_format) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {question.input_format && (
              <div className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-[#18181b]/70 border border-slate-200 dark:border-zinc-800 space-y-1">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Input Format
                </h4>
                <p className="text-xs text-slate-700 dark:text-zinc-300 whitespace-pre-line font-mono leading-relaxed">
                  {question.input_format}
                </p>
              </div>
            )}
            {question.output_format && (
              <div className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-[#18181b]/70 border border-slate-200 dark:border-zinc-800 space-y-1">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Output Format
                </h4>
                <p className="text-xs text-slate-700 dark:text-zinc-300 whitespace-pre-line font-mono leading-relaxed">
                  {question.output_format}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Constraints */}
        {question.constraints && (
          <div className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-[#18181b]/70 border border-slate-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span>Constraints</span>
              </h4>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {question.time_limit_ms || 2000}ms
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Cpu className="w-3 h-3" /> {question.memory_limit_mb || 64}MB
                </span>
              </div>
            </div>
            <code className="text-xs font-mono text-amber-700 dark:text-amber-300/90 block bg-white dark:bg-[#09090b] p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800">
              {question.constraints}
            </code>
          </div>
        )}

        {/* Sample Test Cases */}
        <div className="space-y-3 pt-1">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Sample Test Cases</span>
          </h3>

          {sampleCases.length === 0 ? (
            <div className="p-3 text-xs text-slate-400 dark:text-zinc-500 italic bg-slate-50 dark:bg-[#18181b]/60 rounded-xl border border-slate-200 dark:border-zinc-800">
              No sample test cases provided.
            </div>
          ) : (
            sampleCases.map((tc, idx) => (
              <div
                key={tc.id || idx}
                className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-[#18181b]/70 border border-slate-200 dark:border-zinc-800 space-y-2.5 font-mono text-xs"
              >
                <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-[11px] font-sans">
                  <span className="font-bold text-slate-700 dark:text-zinc-200">
                    Sample Case #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyInput(tc.input, idx)}
                    className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors font-medium cursor-pointer"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-500 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Input</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 font-sans font-semibold">
                      Input (stdin)
                    </div>
                    <pre className="p-2.5 rounded-lg bg-white dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 overflow-x-auto text-xs leading-tight">
                      {tc.input || '(empty)'}
                    </pre>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 font-sans font-semibold">
                      Expected Output
                    </div>
                    <pre className="p-2.5 rounded-lg bg-white dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 text-emerald-600 dark:text-emerald-400 overflow-x-auto text-xs font-bold leading-tight">
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
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsMediaModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-4xl max-h-[90vh] w-full p-4 flex flex-col shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
              <span className="font-bold text-sm text-slate-900 dark:text-zinc-100 truncate">
                {question.title} - Diagram
              </span>
              <button
                type="button"
                onClick={() => setIsMediaModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
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

            <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsMediaModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
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

