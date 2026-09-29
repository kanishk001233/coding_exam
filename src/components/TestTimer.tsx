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
    <div
      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border font-mono transition-all select-none shadow-xs ${
        isExpired
          ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
          : isUrgent
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 animate-pulse ring-1 ring-amber-400/30'
          : 'bg-slate-100 dark:bg-zinc-800/90 border-slate-200 dark:border-zinc-700/80 text-slate-800 dark:text-zinc-200'
      }`}
    >
      <div className="flex items-center justify-center shrink-0">
        {isUrgent || isExpired ? (
          <AlertTriangle className={`w-4 h-4 ${isExpired ? 'text-rose-500' : 'text-amber-500'}`} />
        ) : (
          <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        )}
      </div>

      <div className="flex flex-col min-w-[76px]">
        <div className="flex items-center justify-between gap-1 leading-none">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-zinc-400 font-sans font-semibold">
            {isExpired ? 'Expired' : isUrgent ? 'Hurry' : 'Time'}
          </span>
          <span className="text-xs sm:text-sm font-bold tracking-tight">{formattedTime}</span>
        </div>

        {/* Mini progress bar */}
        <div className="w-full bg-slate-200 dark:bg-zinc-700/60 h-1 rounded-full overflow-hidden mt-1">
          <div
            className={`h-full transition-all duration-1000 rounded-full ${
              isExpired ? 'bg-rose-500' : isUrgent ? 'bg-amber-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, percentageRemaining))}%` }}
          />
        </div>
      </div>
    </div>
  );
};

