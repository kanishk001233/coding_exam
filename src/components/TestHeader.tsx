import React from 'react';
import { Test } from '../types/database';
import { TestTimer } from './TestTimer';
import { Maximize2, ShieldAlert, CheckCircle2, Sparkles, LogOut, Terminal, Layers, Clock } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface TestHeaderProps {
  test: Test;
  startedAt: string;
  totalQuestions: number;
  isSaving: boolean;
  lastSavedTime: Date | null;
  tabSwitchCount: number;
  isHelpRequested?: boolean;
  onToggleNeedHelp?: () => void;
  onOpenAiAssist?: () => void;
  hasAiGuidance?: boolean;
  onEnterFullscreen: () => void;
  onFinishTest: () => void;
  onExpireTimer: () => void;
}

export const TestHeader: React.FC<TestHeaderProps> = ({
  test,
  startedAt,
  totalQuestions,
  isSaving,
  lastSavedTime,
  tabSwitchCount,
  onOpenAiAssist,
  hasAiGuidance = false,
  onEnterFullscreen,
  onFinishTest,
  onExpireTimer,
}) => {
  return (
    <header className="bg-white/95 dark:bg-[#121214]/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800/80 px-3.5 sm:px-5 py-2.5 flex items-center justify-between select-none shrink-0 z-30 transition-colors shadow-xs">
      {/* Brand & Test Info */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-xs shadow-indigo-600/20 shrink-0">
          <Terminal className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 leading-tight truncate max-w-[140px] sm:max-w-[280px] lg:max-w-[400px]">
              {test.title}
            </h1>
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-zinc-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-zinc-700 text-[10px] font-mono font-bold">
              {test.join_code}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
              <span>{totalQuestions} {totalQuestions === 1 ? 'Problem' : 'Problems'}</span>
            </span>
            <span className="text-slate-300 dark:text-zinc-700">•</span>
            <span>{test.is_untimed ? 'Untimed Assessment' : `${test.duration_minutes} mins`}</span>
          </div>
        </div>
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* AI Guidance Button */}
        {onOpenAiAssist && (
          <button
            type="button"
            onClick={onOpenAiAssist}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 shadow-xs cursor-pointer ${
              hasAiGuidance
                ? 'bg-violet-50 dark:bg-zinc-800 hover:bg-violet-100 dark:hover:bg-zinc-700 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-zinc-700'
                : 'bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600 text-white shadow-indigo-600/25 ring-1 ring-white/20'
            }`}
            title="Get 1-time step-by-step AI guidance for this question"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">{hasAiGuidance ? 'AI Guide (View)' : 'AI Guidance'}</span>
            <span className="sm:hidden">AI</span>
          </button>
        )}

        {/* Auto-save status */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/60 dark:border-zinc-700/60 text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
          {isSaving ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>Saved</span>
            </>
          )}
        </div>

        {/* Tab switch anti-cheat badge */}
        {test.enable_tab_switch_tracking !== false && (test.enable_tab_switch_tracking as any) !== 'false' && tabSwitchCount > 0 && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-[11px] font-mono font-bold"
            title={`${tabSwitchCount} tab switch event(s) recorded`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <span>{tabSwitchCount}</span>
          </div>
        )}

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={onEnterFullscreen}
          className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800/90 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/80 transition-colors hidden sm:flex items-center justify-center cursor-pointer shadow-xs"
          title="Toggle Fullscreen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Test Timer or Untimed Badge */}
        {test.is_untimed ? (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono select-none shadow-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
            title="Untimed Assessment: No countdown timer. You can resume at any point."
          >
            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/70 font-sans font-semibold leading-none">
                Mode
              </span>
              <span className="text-xs font-bold leading-tight">Untimed</span>
            </div>
          </div>
        ) : (
          <TestTimer
            durationMinutes={test.duration_minutes}
            startedAt={startedAt}
            onExpire={onExpireTimer}
          />
        )}

        {/* End Test Button */}
        <button
          type="button"
          onClick={onFinishTest}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold shadow-xs shadow-rose-600/20 border border-rose-500/30 transition-all active:scale-95 cursor-pointer shrink-0"
          title="Submit all solutions and complete exam"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Finish Test</span>
        </button>
      </div>
    </header>
  );
};

