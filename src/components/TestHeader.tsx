import React from 'react';
import { Test } from '../types/database';
import { TestTimer } from './TestTimer';
import { Maximize2, ShieldAlert, Save, LogOut, Hand, HelpCircle } from 'lucide-react';
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
    <header className="bg-white/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between select-none shrink-0 z-20 transition-colors">
      {/* Brand & Test Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-black text-xs shadow-md shadow-indigo-500/20">
            CA
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">CodeArena</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[150px] sm:max-w-[280px]">
                {test.title}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Code: <strong className="text-indigo-600 dark:text-indigo-300 font-mono">{test.join_code}</strong></span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span>{totalQuestions} Questions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Offline Classroom Help Request Button */}
        {onToggleNeedHelp && (
          <button
            type="button"
            onClick={onToggleNeedHelp}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer ${
              isHelpRequested
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30 animate-pulse border border-amber-400'
                : 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-500/40'
            }`}
            title={isHelpRequested ? 'Teacher notified! Click to cancel help request.' : 'Click to notify instructor that you need assistance at your desk.'}
          >
            {isHelpRequested ? (
              <>
                <Hand className="w-3.5 h-3.5" />
                <span>Help Requested ⏳</span>
              </>
            ) : (
              <>
                <HelpCircle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>Need Help?</span>
              </>
            )}
          </button>
        )}

        {/* Auto-save status */}
        <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <Save className={`w-3.5 h-3.5 ${isSaving ? 'text-amber-500 animate-spin' : 'text-emerald-500 dark:text-emerald-400'}`} />
          <span>{isSaving ? 'Saving...' : 'Auto-saved'}</span>
        </div>

        {/* Tab switch anti-cheat badge */}
        {test.enable_tab_switch_tracking !== false && (test.enable_tab_switch_tracking as any) !== 'false' && tabSwitchCount > 0 && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-[11px] font-mono"
            title={`${tabSwitchCount} tab switch/blur event(s) recorded`}
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
          className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 transition-colors hidden sm:block"
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
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Finish Test</span>
        </button>
      </div>
    </header>
  );
};
