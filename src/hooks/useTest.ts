import { useState, useEffect, useCallback, useRef } from 'react';
import { Test, Question, TestAttempt } from '../types/database';
import { mockDb } from '../lib/mockDb';

interface UseTestProps {
  test: Test;
  attempt: TestAttempt;
  onFinishTest?: () => void;
}

export interface CheatingWarningInfo {
  type: 'TAB_SWITCH' | 'FULLSCREEN_EXIT';
  title: string;
  message: string;
  count: number;
}

export function useTest({ test, attempt }: UseTestProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(() => {
    const savedIdx = mockDb.getLastActiveQuestion(attempt.id);
    const totalQ = test.questions?.length || 0;
    return savedIdx >= 0 && savedIdx < totalQ ? savedIdx : 0;
  });
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(attempt.tab_switch_count || 0);
  const [fullscreenExitCount, setFullscreenExitCount] = useState<number>(attempt.fullscreen_exit_count || 0);
  const [cheatingWarning, setCheatingWarning] = useState<CheatingWarningInfo | null>(null);

  const attemptRef = useRef(attempt);
  attemptRef.current = attempt;

  const questions: Question[] = test.questions || [];
  const currentQuestion: Question | undefined = questions[currentQuestionIndex];

  // Anti-cheat 1: Track visibility change and window blur
  useEffect(() => {
    let lastSwitchTime = 0;

    const recordTabSwitch = (reason: string) => {
      const now = Date.now();
      // Debounce rapid multiple blur events within 800ms
      if (now - lastSwitchTime < 800) return;
      lastSwitchTime = now;

      // Always fetch latest attempt from db
      const currentAttempt = mockDb.getAttempts().find(a => a.id === attemptRef.current.id) || attemptRef.current;
      const nextCount = (currentAttempt.tab_switch_count || 0) + 1;

      setTabSwitchCount(nextCount);

      const updatedAttempt: TestAttempt = {
        ...currentAttempt,
        tab_switch_count: nextCount,
      };
      attemptRef.current = updatedAttempt;

      mockDb.logEvent({
        attempt_id: updatedAttempt.id,
        event_type: 'TAB_SWITCH',
        timestamp: new Date().toISOString(),
        metadata: { count: nextCount, reason },
      });

      mockDb.saveAttempt(updatedAttempt);

      // Keep student session updated
      sessionStorage.setItem('c_exam_student_attempt', JSON.stringify(updatedAttempt));

      setCheatingWarning({
        type: 'TAB_SWITCH',
        title: 'Tab Switch / Window Blur Detected',
        message: 'You navigated away from the exam window or switched tabs. This violation has been logged and sent to your instructor.',
        count: nextCount,
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        recordTabSwitch('visibility_hidden');
      }
    };

    const handleWindowBlur = () => {
      recordTabSwitch('window_blur');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  // Anti-cheat 2: Track Fullscreen Exit
  useEffect(() => {
    let hasEnteredFullscreenOnce = Boolean(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );

    const handleFullscreenChange = () => {
      const isFullscreenNow = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      if (isFullscreenNow) {
        hasEnteredFullscreenOnce = true;
      } else if (hasEnteredFullscreenOnce) {
        // Fullscreen was exited!
        const currentAttempt = mockDb.getAttempts().find(a => a.id === attemptRef.current.id) || attemptRef.current;
        const nextCount = (currentAttempt.fullscreen_exit_count || 0) + 1;

        setFullscreenExitCount(nextCount);

        const updatedAttempt: TestAttempt = {
          ...currentAttempt,
          fullscreen_exit_count: nextCount,
        };
        attemptRef.current = updatedAttempt;

        mockDb.logEvent({
          attempt_id: updatedAttempt.id,
          event_type: 'FULLSCREEN_EXIT',
          timestamp: new Date().toISOString(),
          metadata: { count: nextCount },
        });

        mockDb.saveAttempt(updatedAttempt);
        sessionStorage.setItem('c_exam_student_attempt', JSON.stringify(updatedAttempt));

        setCheatingWarning({
          type: 'FULLSCREEN_EXIT',
          title: 'Fullscreen Exit Detected',
          message: 'Exam rules require staying in full screen mode at all times. This exit has been recorded.',
          count: nextCount,
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const enterFullscreen = useCallback(async () => {
    try {
      const el = document.documentElement as any;
      if (!document.fullscreenElement && !el.webkitFullscreenElement) {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        } else if (el.mozRequestFullScreen) {
          await el.mozRequestFullScreen();
        } else if (el.msRequestFullscreen) {
          await el.msRequestFullscreen();
        }
      }
    } catch (e) {
      console.warn('Fullscreen request bypassed or denied:', e);
    }
  }, []);

  const clearWarning = useCallback(() => {
    setCheatingWarning(null);
  }, []);

  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
      mockDb.saveLastActiveQuestion(attempt.id, index);
    }
  }, [attempt.id, questions.length]);

  return {
    currentQuestionIndex,
    currentQuestion,
    questions,
    goToQuestion,
    tabSwitchCount,
    fullscreenExitCount,
    cheatingWarning,
    clearWarning,
    enterFullscreen,
  };
}
