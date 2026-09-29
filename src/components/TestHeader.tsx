import React from 'react';
import { Test } from '../types/database';
import { TestTimer } from './TestTimer';
import { Maximize2, ShieldAlert, Save, LogOut, Hand, HelpCircle, Terminal } from 'lucide-react';
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
  isHelpRequested = false,
  onToggleNeedHelp,
  onEnterFullscreen,
  onFinishTest,
  onExpireTimer,
}) => {
  return (
    <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 py-2.5 flex items-center justify-between select-none shrink-0 z-20 transition-colors shadow-xs">
      {/* Brand & Test Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold shadow-xs">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[140px] sm:max-w-[260px]">
                {test.title}
              </h1>
              <span className="hidden md:inline-flex px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-[10px] font-mono font-bold">
                {test.join_code}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>{totalQuestions} Questions</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span>{test.duration_minutes}m Assessment</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Offline Classroom Help Request Button */}
        {onToggleNeedHelp && (
          <button
            type="button"
            onClick={onToggleNeedHelp}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer ${
              isHelpRequested
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-amber-500/30 ring-2 ring-amber-400/40 animate-pulse'
                : 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40'
            }`}
            title={isHelpRequested ? 'Teacher notified! Click to cancel help request.' : 'Click to notify instructor that you need assistance at your desk.'}
          >
            {isHelpRequested ? (
              <>
                <Hand className="w-3.5 h-3.5" />
                <span>Help Waiting ⏳</span>
              </>
            ) : (
              <>
                <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Need Help?</span>
              </>
            )}
          </button>
        )}

        {/* Auto-save status */}
        <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <Save className={`w-3.5 h-3.5 ${isSaving ? 'text-amber-500 animate-spin' : 'text-emerald-500'}`} />
          <span>{isSaving ? 'Saving...' : 'Saved'}</span>
        </div>

        {/* Tab switch anti-cheat badge */}
        {test.enable_tab_switch_tracking !== false && (test.enable_tab_switch_tracking as any) !== 'false' && tabSwitchCount > 0 && (
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-[11px] font-mono font-bold"
            title={`${tabSwitchCount} tab switch event(s) recorded`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <span>{tabSwitchCount} {tabSwitchCount === 1 ? 'switch' : 'switches'}</span>
          </div>
        )}

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={onEnterFullscreen}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition-colors hidden sm:block cursor-pointer"
          title="Toggle Fullscreen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Test Timer */}
        <TestTimer
          durationMinutes={test.duration_minutes}
          startedAt={startedAt}
          onExpire={onExpireTimer}
        />

        {/* End Test Button */}
        <button
          type="button"
          onClick={onFinishTest}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs shadow-rose-600/20 transition-all active:scale-95 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Submit Test</span>
        </button>
      </div>
    </header>
  );
};
