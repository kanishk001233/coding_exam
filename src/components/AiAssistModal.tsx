import React, { useState } from 'react';
import { Question } from '../types/database';
import { AiGuidanceResponse, requestAiGuidance } from '../lib/aiAssist';
import { Sparkles, X, Loader2, ArrowRight, CheckCircle2, BookOpen, Copy, Check, FileText } from 'lucide-react';

export interface SavedAiQuestionState {
  guidance: AiGuidanceResponse;
  currentStepIndex: number;
}

interface AiAssistModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question;
  studentCode: string;
  savedState: SavedAiQuestionState | null;
  onSaveState: (state: SavedAiQuestionState) => void;
}

export const AiAssistModal: React.FC<AiAssistModalProps> = ({
  isOpen,
  onClose,
  question,
  studentCode,
  savedState,
  onSaveState,
}) => {
  const [activeTab, setActiveTab] = useState<'guidance' | 'algorithm'>('guidance');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedAlgo, setCopiedAlgo] = useState<boolean>(false);

  // Local viewing index (defaults to saved active step)
  const [viewingStepIdx, setViewingStepIdx] = useState<number>(() => {
    return savedState ? Math.min(savedState.currentStepIndex, savedState.guidance.steps.length - 1) : 0;
  });

  // Sync viewingStepIdx when savedState changes or modal opens
  React.useEffect(() => {
    if (savedState) {
      setViewingStepIdx(Math.min(savedState.currentStepIndex, savedState.guidance.steps.length - 1));
    } else {
      setViewingStepIdx(0);
    }
  }, [savedState, isOpen]);

  if (!isOpen) return null;

  const handleGenerateGuidance = async () => {
    if (savedState || isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const guidance = await requestAiGuidance(question, studentCode);
      const newState: SavedAiQuestionState = {
        guidance,
        currentStepIndex: 0,
      };
      onSaveState(newState);
      setViewingStepIdx(0);
    } catch (err: any) {
      console.error('AI Guidance error:', err);
      setErrorMsg(err.message || 'Failed to generate guidance. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAlgorithm = () => {
    if (!question.algorithm) return;
    navigator.clipboard.writeText(question.algorithm);
    setCopiedAlgo(true);
    setTimeout(() => setCopiedAlgo(false), 2000);
  };

  const handleGotItAndClose = () => {
    if (!savedState) {
      onClose();
      return;
    }

    const totalSteps = savedState.guidance.steps.length;
    // Advance active step pointer for the next time they open AI Assist (up to last step)
    const nextStepIndex = Math.min(totalSteps - 1, viewingStepIdx + 1);

    onSaveState({
      ...savedState,
      currentStepIndex: nextStepIndex,
    });

    onClose();
  };

  const guidance = savedState?.guidance;
  const totalSteps = guidance?.steps?.length || 0;
  const currentStep = guidance?.steps?.[viewingStepIdx];
  const isLastStep = viewingStepIdx >= totalSteps - 1;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto select-none flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Modal Dialog Card - Enlarged size */}
      <div className="relative w-full max-w-xl sm:max-w-2xl bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 my-auto">
        
        {/* Top Header */}
        <div className="px-6 py-4 sm:py-5 border-b border-slate-100 dark:border-zinc-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-[#18181b]/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                AI Coding Coach & Algorithm
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 truncate max-w-[280px] sm:max-w-md">
                {question.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Controls */}
        <div className="px-6 pt-3 pb-0 border-b border-slate-200/80 dark:border-zinc-800 flex items-center gap-2 bg-slate-100/60 dark:bg-[#09090b]/60 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('guidance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'guidance'
                ? 'bg-white dark:bg-[#121214] text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-500 shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border-transparent'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Step Guidance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('algorithm')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'algorithm'
                ? 'bg-white dark:bg-[#121214] text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-500 shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border-transparent'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Problem Algorithm</span>
            {question.algorithm && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Algorithm available" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* TAB 1: AI GUIDANCE */}
          {activeTab === 'guidance' && (
            <>
              {!guidance ? (
                /* Initial State: 1-Time Request Trigger */
                <div className="text-center py-4 sm:py-6 space-y-5">
                  <div className="space-y-2">
                    <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      Need help with this problem?
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-zinc-300 max-w-md mx-auto leading-relaxed">
                      The AI guide will check what you have written so far and give you <strong>easy step-by-step hints</strong> without giving away the direct code answer.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-500/30 text-left text-xs sm:text-sm text-violet-950 dark:text-violet-200 flex items-center gap-3">
                    <span className="text-xl shrink-0">💡</span>
                    <span className="leading-relaxed">
                      Hints are made <strong>once per problem</strong>. You can view each step one by one as you work on your solution.
                    </span>
                  </div>

                  {errorMsg && (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs sm:text-sm">
                      {errorMsg}
                    </div>
                  )}

                  <div className="space-y-3">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleGenerateGuidance}
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2.5 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Analyzing Code...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Get Step 1 Guidance</span>
                        </>
                      )}
                    </button>

                    {question.algorithm && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('algorithm')}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-[#18181b] hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold border border-slate-200 dark:border-zinc-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Or View Curated Algorithm Approach</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Active State: Showing EXACTLY ONE STEP AT A TIME (ENLARGED) */
                <div className="space-y-5">
                  {/* Step Header Pill & Counter */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs sm:text-sm font-bold">
                      <span>Step {viewingStepIdx + 1} of {totalSteps}</span>
                    </span>

                    {/* Step Navigation Dots */}
                    <div className="flex items-center gap-1.5">
                      {guidance.steps.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setViewingStepIdx(idx)}
                          className={`h-2.5 rounded-full transition-all cursor-pointer ${
                            idx === viewingStepIdx
                              ? 'bg-indigo-600 dark:bg-indigo-400 w-6'
                              : idx < viewingStepIdx
                              ? 'bg-emerald-500 dark:bg-emerald-400 w-2.5'
                              : 'bg-slate-200 dark:bg-zinc-700 w-2.5'
                          }`}
                          title={`View Step ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Enlarged Step Guidance Box */}
                  {currentStep && (
                    <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
                      <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                        {currentStep.title}
                      </h4>
                      <p className="text-sm sm:text-base text-slate-700 dark:text-zinc-200 leading-relaxed font-normal">
                        {currentStep.guidance}
                      </p>
                    </div>
                  )}

                  {/* Progress Analysis (Concise) */}
                  {guidance.progress_summary && viewingStepIdx === 0 && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{guidance.progress_summary}</span>
                    </div>
                  )}

                  {/* Action Buttons: Got It & Back to Code / View Algorithm */}
                  <div className="pt-2 space-y-2.5">
                    <button
                      type="button"
                      onClick={handleGotItAndClose}
                      className="w-full py-3.5 px-6 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2.5 transition-all active:scale-98 cursor-pointer"
                    >
                      <span>Got it! Back to Coding</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    {question.algorithm && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('algorithm')}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-[#18181b] hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold border border-slate-200 dark:border-zinc-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                        <span>View Problem Algorithm</span>
                      </button>
                    )}

                    {/* Subtext explaining what happens next */}
                    <p className="text-xs text-center text-slate-400 dark:text-zinc-500">
                      {!isLastStep
                        ? `Click "AI Assist" again when you're ready for Step ${viewingStepIdx + 2}.`
                        : 'You have viewed all guided steps for this question.'}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 2: PROBLEM ALGORITHM */}
          {activeTab === 'algorithm' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-zinc-700">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Solution Algorithm & Approach
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Standard logic to solve this problem
                    </p>
                  </div>
                </div>

                {question.algorithm && (
                  <button
                    type="button"
                    onClick={handleCopyAlgorithm}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-semibold border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer"
                  >
                    {copiedAlgo ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {question.algorithm ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 shadow-inner max-h-72 overflow-y-auto">
                  <pre className="text-xs sm:text-sm text-slate-800 dark:text-zinc-200 font-mono whitespace-pre-wrap leading-relaxed">
                    {question.algorithm}
                  </pre>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 text-center space-y-3">
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400">
                    No custom algorithm was attached by the instructor for this question.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('guidance')}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md"
                  >
                    Use AI Step Guidance Instead
                  </button>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 px-5 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  Back to Workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
