import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { useTimer } from '../hooks/useTimer';

interface TestTimerProps {
  durationMinutes: number;
  startedAt: string;
  onExpire?: () => void;
}

export const TestTimer: React.FC<TestTimerProps> = ({
  durationMinutes,
  startedAt,
  onExpire,
}) => {
  const { formattedTime, percentageRemaining, isUrgent, isExpired } = useTimer({
    durationMinutes,
    startedAt,
    onExpire,
  });

  return (
    <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border font-mono transition-all ${
      isExpired
        ? 'bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-500/50 text-rose-800 dark:text-rose-300'
        : isUrgent
        ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-500/50 text-amber-800 dark:text-amber-300 animate-pulse'
        : 'bg-slate-100 dark:bg-slate-900/80 border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200'
    }`}>
      {isUrgent || isExpired ? (
        <AlertTriangle className={`w-4 h-4 ${isExpired ? 'text-rose-500' : 'text-amber-500'}`} />
      ) : (
        <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
      )}

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-sans font-semibold">
            {isExpired ? 'Time Up' : 'Time Left'}:
          </span>
          <span className="text-sm font-bold tracking-wider">{formattedTime}</span>
        </div>

        {/* Mini progress bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
          <div
            className={`h-full transition-all duration-1000 ${
              isExpired ? 'bg-rose-500' : isUrgent ? 'bg-amber-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, percentageRemaining))}%` }}
          />
        </div>
      </div>
    </div>
  );
};
