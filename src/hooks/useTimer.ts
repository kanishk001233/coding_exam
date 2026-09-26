import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTimerOptions {
  durationMinutes: number;
  startedAt: string; // ISO string
  onExpire?: () => void;
}

export function useTimer({ durationMinutes, startedAt, onExpire }: UseTimerOptions) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    const startMs = new Date(startedAt).getTime();
    const durationMs = durationMinutes * 60 * 1000;
    const endMs = startMs + durationMs;
    const remaining = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
    return remaining;
  });

  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const expiredHandledRef = useRef(false);

  useEffect(() => {
    const updateTimer = () => {
      const startMs = new Date(startedAt).getTime();
      const durationMs = durationMinutes * 60 * 1000;
      const endMs = startMs + durationMs;
      const remaining = Math.max(0, Math.floor((endMs - Date.now()) / 1000));

      setSecondsRemaining(remaining);

      if (remaining <= 0 && !expiredHandledRef.current) {
        expiredHandledRef.current = true;
        if (onExpireRef.current) {
          onExpireRef.current();
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [durationMinutes, startedAt]);

  const formatTime = useCallback((totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }, []);

  const totalDurationSeconds = durationMinutes * 60;
  const percentageRemaining = Math.round((secondsRemaining / (totalDurationSeconds || 1)) * 100);
  const isUrgent = secondsRemaining < 300 && secondsRemaining > 0; // Less than 5 minutes

  return {
    secondsRemaining,
    formattedTime: formatTime(secondsRemaining),
    percentageRemaining,
    isUrgent,
    isExpired: secondsRemaining <= 0,
  };
}
