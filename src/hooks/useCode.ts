import { useState, useEffect, useRef, useCallback } from 'react';
import { mockDb } from '../lib/mockDb';

interface UseCodeProps {
  attemptId: string;
  questionId: string;
  starterCode: string;
}

export function useCode({ attemptId, questionId, starterCode }: UseCodeProps) {
  const [code, setCode] = useState<string>(() => {
    const saved = mockDb.getCodeDraft(attemptId, questionId);
    return saved !== null ? saved : starterCode;
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(new Date());
  
  const currentCodeRef = useRef(code);
  currentCodeRef.current = code;

  // Load draft when questionId changes
  useEffect(() => {
    const saved = mockDb.getCodeDraft(attemptId, questionId);
    const initialCode = saved !== null ? saved : starterCode;
    setCode(initialCode);
    currentCodeRef.current = initialCode;
  }, [attemptId, questionId, starterCode]);

  // Immediate save function
  const saveImmediately = useCallback(() => {
    setIsSaving(true);
    mockDb.saveCodeDraft(attemptId, questionId, currentCodeRef.current);
    setLastSavedTime(new Date());
    setTimeout(() => setIsSaving(false), 300);
  }, [attemptId, questionId]);

  // Debounced auto-save every 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      saveImmediately();
    }, 5000);

    return () => clearTimeout(timer);
  }, [code, saveImmediately]);

  // Save on tab visibility change or unload
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveImmediately();
      }
    };

    const handleBeforeUnload = () => {
      saveImmediately();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveImmediately]);

  const updateCode = useCallback((newCode: string) => {
    setCode(newCode);
    currentCodeRef.current = newCode;
  }, []);

  const resetToStarter = useCallback(() => {
    setCode(starterCode);
    currentCodeRef.current = starterCode;
    saveImmediately();
  }, [starterCode, saveImmediately]);

  return {
    code,
    updateCode,
    resetToStarter,
    saveImmediately,
    isSaving,
    lastSavedTime,
  };
}
