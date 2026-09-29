import React, { useState, useEffect, useRef } from 'react';
import { Test, TestAttempt, Question, TestCase, HelpRequest } from '../types/database';
import { mockDb } from '../lib/mockDb';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { playTingNotification } from '../lib/soundHelper';
import { StudentList } from '../components/StudentList';
import { ThemeToggle } from '../components/ThemeToggle';
import { ModalDialog } from '../components/ModalDialog';
import { QuestionMediaUpload } from '../components/QuestionMediaUpload';
import { AlgorithmEditor } from '../components/AlgorithmEditor';
import handRaiseIcon from '../5721257.png';
import {
  Plus, Play, Pause, BarChart2, BookOpen, Clock, Users, Key, LogOut, Trash2, Edit3,
  Code2, Eye, EyeOff, ShieldAlert, Maximize2, Hand, MessageSquare, Check, X, Bell,
  HelpCircle, CheckCircle2, Loader2, Search, Copy, CopyPlus, CheckCheck, Sparkles, Filter,
  AlertCircle, Share2, Layers, ChevronRight, Activity, Terminal, Shield, Volume2
} from 'lucide-react';

interface TeacherDashboardProps {
  user: { id: string; name: string; email: string };
  onCreateTest: () => void;
  onEditTest: (test: Test) => void;
  onViewResults: (test: Test) => void;
  onViewStudentSubmission: (attempt: TestAttempt) => void;
  onLogout: () => void;
  onNavigateDiagnostics: () => void;
  onJoinAsStudent: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  user,
  onCreateTest,
  onEditTest,
  onViewResults,
  onViewStudentSubmission,
  onLogout,
  onNavigateDiagnostics,
  onJoinAsStudent,
}) => {
  const [tests, setTests] = useState<Test[]>(() => mockDb.getTests());
  const [selectedTestId, setSelectedTestId] = useState<string>(() => tests[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'tests' | 'monitor' | 'bank'>('tests');
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Filter State
  const [testSearch, setTestSearch] = useState('');
  const [testStatusFilter, setTestStatusFilter] = useState<'all' | 'live' | 'scheduled' | 'draft' | 'ended'>('all');
  const [bankSearch, setBankSearch] = useState('');
  const [bankDifficultyFilter, setBankDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Classroom Assistance Help Queue State
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>(() => mockDb.getHelpRequests());
  const [isHelpDrawerOpen, setIsHelpDrawerOpen] = useState(false);

  // Tracking refs to play chime only for NEW incoming pending requests
  const prevPendingIdsRef = useRef<Set<string>>(
    new Set(mockDb.getHelpRequests().filter(r => r.status === 'pending').map(r => r.id))
  );
  const isInitialMountRef = useRef(true);

  // Dialog States
  const [testToDelete, setTestToDelete] = useState<Test | null>(null);
  const [bankQToDelete, setBankQToDelete] = useState<string | null>(null);
  const [dialogAlert, setDialogAlert] = useState<{ title: string; message: string } | null>(null);

  // Question Bank State
  const [bankQuestions, setBankQuestions] = useState<Omit<Question, 'test_id'>[]>(() => mockDb.getQuestionBank());
  const [editingBankQ, setEditingBankQ] = useState<Omit<Question, 'test_id'> | null>(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [isSavingBankQ, setIsSavingBankQ] = useState(false);

  const fetchHelpRequests = (options?: { playSoundIfNew?: boolean }) => {
    const latest = mockDb.getHelpRequests();
    setHelpRequests(latest);

    const pendingRequests = latest.filter(r => r.status === 'pending');
    const currentPendingIds = new Set(pendingRequests.map(r => r.id));

    if (!isInitialMountRef.current) {
      const hasNewPending = pendingRequests.some(r => !prevPendingIdsRef.current.has(r.id));
      if (hasNewPending || options?.playSoundIfNew) {
        playTingNotification();
      }
    } else {
      isInitialMountRef.current = false;
    }

    prevPendingIdsRef.current = currentPendingIds;
  };

  const fetchLiveAttempts = async () => {
    await mockDb.syncFromSupabase();
    const updatedTests = mockDb.getTests();
    setTests(updatedTests);
    const activeId = selectedTestId || updatedTests[0]?.id;
    if (activeId) {
      setAttempts(mockDb.getAttempts(activeId));
    }
    fetchHelpRequests();
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchLiveAttempts();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleCopyJoinCode = (test: Test, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(test.join_code);
    setCopiedCodeId(test.id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleResolveHelp = async (id: string) => {
    await mockDb.resolveHelpRequest(id);
    fetchHelpRequests();
  };

  const handleDeleteHelp = async (id: string) => {
    await mockDb.deleteHelpRequest(id);
    fetchHelpRequests();
  };

  const [isDuplicatingId, setIsDuplicatingId] = useState<string | null>(null);

  const handleDuplicateTest = async (test: Test, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsDuplicatingId(test.id);
      const cloned = await mockDb.duplicateTest(test.id, test);
      if (cloned) {
        setTests(mockDb.getTests());
        setDialogAlert({
          title: 'Assessment Duplicated',
          message: `Successfully duplicated "${test.title}" as "${cloned.title}" with Join Code "${cloned.join_code}". All ${cloned.questions?.length || 0} question(s), testcases, and images have been copied.`,
        });
      }
    } catch (err) {
      console.error('Duplicate test error:', err);
      setDialogAlert({
        title: 'Duplication Failed',
        message: 'An unexpected error occurred while duplicating the assessment. Please try again.',
      });
    } finally {
      setIsDuplicatingId(null);
    }
  };

  const handleClearAllHelp = async () => {
    await mockDb.clearAllHelpRequests();
    fetchHelpRequests();
  };

  useEffect(() => {
    const refreshData = async () => {
      await mockDb.syncFromSupabase();
      const refreshedTests = mockDb.getTests();
      setTests(refreshedTests);
      setBankQuestions(mockDb.getQuestionBank());
      fetchHelpRequests();
      const currentTestId = selectedTestId || refreshedTests[0]?.id || '';
      if (!selectedTestId && refreshedTests.length > 0) {
        setSelectedTestId(refreshedTests[0].id);
      }
      if (currentTestId) {
        setAttempts(mockDb.getAttempts(currentTestId));
      }
    };

    refreshData();

    // 1. Instant local BroadcastChannel & CustomEvent listeners (0ms instant sync)
    const handleInstantHelpUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const isNew = customEvent?.detail?.action === 'new';
      if (isNew) {
        playTingNotification();
      }
      fetchHelpRequests({ playSoundIfNew: isNew });
    };

    window.addEventListener('codearena_help_update', handleInstantHelpUpdate);

    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('codearena_help_channel');
        bc.onmessage = (ev) => {
          const isNew = ev.data?.action === 'new';
          if (isNew) {
            playTingNotification();
          }
          fetchHelpRequests({ playSoundIfNew: isNew });
        };
      } catch {}
    }

    // 2. Supabase Realtime WebSockets (< 100ms instant remote sync)
    let supabaseChannel: any = null;
    if (isSupabaseConfigured && supabase) {
      try {
        supabaseChannel = supabase
          .channel('codearena-dashboard-live')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'help_requests' },
            async (payload: any) => {
              if (payload.eventType === 'INSERT' && payload.new?.status === 'pending') {
                playTingNotification();
              }
              await mockDb.syncFromSupabase();
              fetchHelpRequests({ playSoundIfNew: payload.eventType === 'INSERT' });
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'test_attempts' },
            async () => {
              await mockDb.syncFromSupabase();
              const refreshed = mockDb.getTests();
              setTests(refreshed);
              if (selectedTestId) {
                setAttempts(mockDb.getAttempts(selectedTestId));
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Realtime subscription error:', err);
      }
    }

    // 3. Relaxed fallback interval polling (6s) to avoid overloading Supabase Realtime
    let isSyncing = false;
    const interval = setInterval(async () => {
      if (isSyncing) return;
      isSyncing = true;
      try {
        await fetchLiveAttempts();
      } finally {
        isSyncing = false;
      }
    }, 6000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('codearena_help_update', handleInstantHelpUpdate);
      if (bc) bc.close();
      if (supabaseChannel && supabase) {
        supabase.removeChannel(supabaseChannel);
      }
    };
  }, [selectedTestId]);

  const selectedTest = tests.find((t) => t.id === selectedTestId) || tests[0];

  const handleToggleStatus = async (test: Test) => {
    const nextStatus = test.status === 'live' ? 'ended' : 'live';
    await mockDb.saveTest({
      ...test,
      status: nextStatus,
    });
    setTests(mockDb.getTests());
  };

  const handleToggleTabSwitch = async (test: Test) => {
    const isCurrentlyEnabled = test.enable_tab_switch_tracking !== false && (test.enable_tab_switch_tracking as any) !== 'false';
    const nextVal = !isCurrentlyEnabled;
    const updated: Test = {
      ...test,
      enable_tab_switch_tracking: nextVal,
    };
    await mockDb.saveTest(updated);
    
    // Sync active test session storage if currently running locally
    const activeTestRaw = sessionStorage.getItem('c_exam_active_test');
    if (activeTestRaw) {
      try {
        const activeTest = JSON.parse(activeTestRaw);
        if (activeTest.id === test.id) {
          sessionStorage.setItem('c_exam_active_test', JSON.stringify(updated));
        }
      } catch (e) {
        // ignore
      }
    }
    
    setTests(mockDb.getTests());
  };

  const handleToggleFullscreen = async (test: Test) => {
    const isCurrentlyEnabled = test.enable_fullscreen_mode !== false && (test.enable_fullscreen_mode as any) !== 'false';
    const nextVal = !isCurrentlyEnabled;
    const updated: Test = {
      ...test,
      enable_fullscreen_mode: nextVal,
    };
    await mockDb.saveTest(updated);
    
    // Sync active test session storage if currently running locally
    const activeTestRaw = sessionStorage.getItem('c_exam_active_test');
    if (activeTestRaw) {
      try {
        const activeTest = JSON.parse(activeTestRaw);
        if (activeTest.id === test.id) {
          sessionStorage.setItem('c_exam_active_test', JSON.stringify(updated));
        }
      } catch (e) {
        // ignore
      }
    }

    setTests(mockDb.getTests());
  };

  const handleConfirmDeleteTest = async () => {
    if (!testToDelete) return;
    const id = testToDelete.id;
    await mockDb.deleteTest(id);
    const remaining = mockDb.getTests();
    setTests(remaining);
    if (selectedTestId === id) {
      setSelectedTestId(remaining[0]?.id || '');
    }
    setTestToDelete(null);
  };

  const handleDeleteStudentAttempt = async (attemptId: string) => {
    await mockDb.deleteAttempt(attemptId);
    setTests([...mockDb.getTests()]);
    if (selectedTest) {
      setAttempts(mockDb.getAttempts(selectedTest.id));
    }
  };

  // Question Bank Actions
  const handleOpenAddBankQ = () => {
    setEditingBankQ({
      id: 'q-' + Math.random().toString(36).substring(2, 9),
      title: '',
      description: '',
      difficulty: 'easy',
      marks: 10,
      time_limit_ms: 2000,
      memory_limit_mb: 64,
      question_order: bankQuestions.length + 1,
      input_format: '',
      output_format: '',
      constraints: '1 <= N <= 10^5',
      starter_code: `#include <stdio.h>\n\nint main() {\n    // Write your code here\n    \n    return 0;\n}`,
      test_cases: [
        {
          id: 'tc-' + Math.random().toString(36).substring(2, 9),
          question_id: '',
          input: '10',
          expected_output: '20',
          is_sample: true,
          marks: 5,
        },
        {
          id: 'tc-' + Math.random().toString(36).substring(2, 9),
          question_id: '',
          input: '50',
          expected_output: '100',
          is_sample: false,
          marks: 5,
        },
      ],
    });
    setShowBankModal(true);
  };

  const handleOpenEditBankQ = (q: Omit<Question, 'test_id'>) => {
    setEditingBankQ({ ...q, test_cases: q.test_cases ? [...q.test_cases] : [] });
    setShowBankModal(true);
  };

  const handleConfirmDeleteBankQ = () => {
    if (!bankQToDelete) return;
    const updated = mockDb.deleteQuestionBankQuestion(bankQToDelete);
    setBankQuestions(updated);
    setBankQToDelete(null);
  };

  const handleSaveBankQuestion = async () => {
    if (!editingBankQ || !editingBankQ.title.trim()) {
      setDialogAlert({
        title: 'Validation Error',
        message: 'Please provide a title for the question before saving.',
      });
      return;
    }

    setIsSavingBankQ(true);
    try {
      const updated = await mockDb.saveQuestionBankQuestion(editingBankQ);
      setBankQuestions(updated);
      setShowBankModal(false);
      setEditingBankQ(null);
    } catch (err) {
      console.error('Failed to save bank question:', err);
    } finally {
      setIsSavingBankQ(false);
    }
  };

  // Filtered Tests
  const filteredTests = tests.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(testSearch.toLowerCase()) ||
      t.join_code.toLowerCase().includes(testSearch.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(testSearch.toLowerCase()));
    const matchesStatus = testStatusFilter === 'all' || t.status === testStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered Bank Questions
  const filteredBankQuestions = bankQuestions.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(bankSearch.toLowerCase()) ||
      q.description.toLowerCase().includes(bankSearch.toLowerCase());
    const matchesDifficulty = bankDifficultyFilter === 'all' || q.difficulty === bankDifficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  // Top Statistics Calculations
  const liveTestsCount = tests.filter((t) => t.status === 'live').length;
  const totalStudentsAcrossTests = tests.reduce((sum, t) => sum + mockDb.getAttempts(t.id).length, 0);
  const pendingHelpCount = helpRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 font-sans transition-colors selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <nav className="bg-white/90 dark:bg-[#121214]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-zinc-800/80 sticky top-0 z-30 shadow-xs">
        {/* Top Decorative Gradient Accent */}
        <div className="h-[3px] w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

        <div className="px-5 sm:px-8 py-3 flex items-center justify-between">
          {/* Left Brand & Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-600 flex items-center justify-center text-white font-black text-base shadow-md shadow-indigo-600/25 ring-2 ring-indigo-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  CodeArena
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/80 dark:to-blue-950/80 border border-indigo-200/80 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-black tracking-wider uppercase">
                  Instructor
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-1.5">
                <span>Assessment Command Center</span>
              </p>
            </div>
          </div>

          {/* Right Actions & Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Help Queue Trigger Button */}
            <button
              type="button"
              onClick={() => setIsHelpDrawerOpen(true)}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs ${
                pendingHelpCount > 0
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-amber-500/30 ring-2 ring-amber-400/40 animate-pulse'
                  : 'bg-slate-100 dark:bg-[#18181b]/90 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/80'
              }`}
              title="Open Student Offline Help Queue"
            >
              <img src={handRaiseIcon} alt="Help Queue" className="w-4 h-4 object-contain" />
              <span className="hidden md:inline">Help Queue</span>
              {pendingHelpCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white text-rose-600 text-[11px] font-black shadow-xs">
                  {pendingHelpCount}
                </span>
              )}
            </button>

            {/* Database Connection Pill */}
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium border bg-slate-100/80 dark:bg-[#18181b]/60 border-slate-200 dark:border-zinc-800">
              <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-amber-500 animate-ping'}`} />
              <span className="text-slate-600 dark:text-zinc-300">
                {isSupabaseConfigured ? 'Database Synced' : 'Local Storage Mode'}
              </span>
            </div>

            {/* User Profile Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/70 dark:bg-[#18181b]/60 border border-slate-200/80 dark:border-zinc-800">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold uppercase">
                {user.name ? user.name[0] : 'T'}
              </div>
              <div className="text-left">
                <span className="block text-xs font-bold text-slate-800 dark:text-zinc-200 leading-none">{user.name}</span>
                <span className="block text-[10px] text-slate-400 dark:text-zinc-500 leading-none mt-0.5">{user.email}</span>
              </div>
            </div>

            <ThemeToggle />

            <button
              type="button"
              onClick={onNavigateDiagnostics}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#18181b] hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-semibold transition-colors hidden lg:flex items-center gap-1.5 border border-slate-200 dark:border-zinc-700/60 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
              <span>Benchmark</span>
            </button>

            <button
              type="button"
              onClick={onJoinAsStudent}
              className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Student View</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-xl bg-slate-100 dark:bg-[#18181b] hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-400 text-slate-500 dark:text-zinc-400 transition-colors border border-slate-200 dark:border-zinc-700/60 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto p-5 sm:p-8 space-y-7">
        {/* Top KPI Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#121214] border border-slate-200/80 dark:border-zinc-800 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Total Assessments
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{tests.length}</span>
                {liveTestsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                    {liveTestsCount} Live
                  </span>
                )}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#121214] border border-slate-200/80 dark:border-zinc-800 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Total Submissions
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{totalStudentsAcrossTests}</span>
                <span className="text-[11px] text-slate-400">Attempts</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#121214] border border-slate-200/80 dark:border-zinc-800 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Question Bank
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{bankQuestions.length}</span>
                <span className="text-[11px] text-slate-400">Problems</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Code2 className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => setIsHelpDrawerOpen(true)}
            className={`p-4 rounded-2xl border shadow-sm flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] ${
              pendingHelpCount > 0
                ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-500/40 ring-2 ring-amber-400/20'
                : 'bg-white dark:bg-[#121214] border-slate-200/80 dark:border-zinc-800'
            }`}
          >
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Help Queue
              </p>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black ${pendingHelpCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                  {pendingHelpCount}
                </span>
                <span className="text-[11px] text-slate-400">
                  {pendingHelpCount > 0 ? 'Students waiting' : 'All clear'}
                </span>
              </div>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center p-2 ${
              pendingHelpCount > 0
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 animate-pulse'
                : 'bg-slate-100 dark:bg-[#18181b] text-slate-500 dark:text-zinc-400'
            }`}>
              <img src={handRaiseIcon} alt="Help" className="w-6 h-6 object-contain" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-zinc-800/80">
          <div className="flex items-center gap-1.5 bg-slate-200/60 dark:bg-[#121214]/80 p-1.5 rounded-2xl border border-slate-300/70 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('tests')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'tests'
                  ? 'bg-white dark:bg-[#18181b] text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-zinc-700/60'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Assessments</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-[#09090b] text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                {tests.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('monitor')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'monitor'
                  ? 'bg-white dark:bg-[#18181b] text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-zinc-700/60'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Live Monitor</span>
              {liveTestsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bank')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'bank'
                  ? 'bg-white dark:bg-[#18181b] text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-zinc-700/60'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Question Bank</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-[#09090b] text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                {bankQuestions.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onCreateTest}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Assessment</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Coding Tests List */}
        {activeTab === 'tests' && (
          <div className="space-y-5">
            {/* Search & Status Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#121214] p-3.5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  placeholder="Search assessments by title, join code, or description..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
                {testSearch && (
                  <button
                    onClick={() => setTestSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(['all', 'live', 'scheduled', 'draft', 'ended'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setTestStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                      testStatusFilter === st
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-[#18181b] text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {st === 'all' ? 'All Assessments' : st}
                  </button>
                ))}
              </div>
            </div>

            {tests.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-sm space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400 shadow-sm">
                  <BookOpen className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">No Coding Assessments Created Yet</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                    Design your first offline or online classroom coding assessment with automated testcase evaluation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCreateTest}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  Create Assessment Now
                </button>
              </div>
            ) : filteredTests.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">No assessments match your search criteria</p>
                <button
                  type="button"
                  onClick={() => { setTestSearch(''); setTestStatusFilter('all'); }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTests.map((test) => {
                  const testAttempts = mockDb.getAttempts(test.id);
                  const isLive = test.status === 'live';
                  const isCopied = copiedCodeId === test.id;

                  return (
                    <div
                      key={test.id}
                      className={`bg-white dark:bg-[#121214] border rounded-2xl p-5 transition-all flex flex-col justify-between space-y-4 relative ${
                        isLive
                          ? 'border-emerald-400 dark:border-emerald-500/70 bg-gradient-to-b from-emerald-50/30 to-white dark:from-emerald-950/10 dark:to-[#121214]'
                          : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="space-y-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 flex-1 min-w-0">
                            <h3 className="font-bold text-base text-slate-900 dark:text-white truncate leading-snug">
                              {test.title}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2">
                              {test.description || 'No description provided.'}
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                              isLive
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/40'
                                : test.status === 'scheduled'
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'
                                : test.status === 'ended'
                                ? 'bg-slate-100 dark:bg-[#18181b] text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'
                                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                            }`}
                          >
                            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
                            {test.status}
                          </span>
                        </div>

                        {/* Join Code & Assessment Specs Box */}
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#09090b]/70 border border-slate-200/80 dark:border-zinc-800/80 space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
                              <Key className="w-3.5 h-3.5 text-indigo-500" />
                              Join Code:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <code className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs tracking-wider border border-indigo-200 dark:border-indigo-800">
                                {test.join_code}
                              </code>
                              <button
                                type="button"
                                onClick={(e) => handleCopyJoinCode(test, e)}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  isCopied
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 border-emerald-300'
                                    : 'bg-white dark:bg-[#121214] hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 border-slate-200 dark:border-zinc-800'
                                }`}
                                title="Copy Join Code"
                              >
                                {isCopied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center text-xs py-1 border-t border-b border-slate-200/60 dark:border-zinc-800/60">
                            <div>
                              <span className="block text-[10px] text-slate-400 uppercase font-semibold">Duration</span>
                              <span className="font-bold text-slate-800 dark:text-zinc-200">{test.duration_minutes}m</span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-slate-400 uppercase font-semibold">Questions</span>
                              <span className="font-bold text-slate-800 dark:text-zinc-200">{test.questions?.length || 0}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-slate-400 uppercase font-semibold">Students</span>
                              <span className="font-bold text-slate-800 dark:text-zinc-200">{testAttempts.length}</span>
                            </div>
                          </div>

                          {/* Anti-cheat Proctoring Badges */}
                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleTabSwitch(test);
                              }}
                              className={`flex-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                                test.enable_tab_switch_tracking !== false
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100'
                                  : 'bg-slate-100 dark:bg-[#121214] text-slate-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-200'
                              }`}
                              title="Toggle Tab-Switch Monitoring"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Tab Guard: {test.enable_tab_switch_tracking !== false ? 'ON' : 'OFF'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFullscreen(test);
                              }}
                              className={`flex-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                                test.enable_fullscreen_mode !== false
                                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100'
                                  : 'bg-slate-100 dark:bg-[#121214] text-slate-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-200'
                              }`}
                              title="Toggle Fullscreen Requirement"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                              <span>Fullscreen: {test.enable_fullscreen_mode !== false ? 'ON' : 'OFF'}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(test)}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                            isLive
                              ? 'bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20'
                          }`}
                        >
                          {isLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                          <span>{isLive ? 'End Assessment' : 'Start Assessment'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onViewResults(test)}
                          className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#18181b] hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-zinc-300 transition-all cursor-pointer border border-slate-200/80 dark:border-zinc-700/60"
                          title="View Assessment Results & Analytics"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onEditTest(test)}
                          className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#18181b] hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-all cursor-pointer border border-slate-200/80 dark:border-zinc-700/60"
                          title="Edit Assessment & Questions"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDuplicateTest(test, e)}
                          disabled={isDuplicatingId === test.id}
                          className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#18181b] hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-zinc-300 transition-all cursor-pointer border border-slate-200/80 dark:border-zinc-700/60 disabled:opacity-50"
                          title="Duplicate / Clone Assessment"
                        >
                          {isDuplicatingId === test.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                          ) : (
                            <CopyPlus className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setTestToDelete(test)}
                          className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#18181b] hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-400 text-slate-400 transition-all cursor-pointer border border-slate-200/80 dark:border-zinc-700/60"
                          title="Delete Assessment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Live Classroom Monitor */}
        {activeTab === 'monitor' && (
          <div className="space-y-5">
            {tests.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-3xl">
                Please create an assessment first to monitor live students.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white dark:bg-[#121214] p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        Monitoring: {selectedTest?.title || 'Active Assessment'}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        Join Code: <strong className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">{selectedTest?.join_code}</strong>
                        <span className="mx-2">•</span>
                        Status: <span className="font-bold capitalize">{selectedTest?.status}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Select Assessment:</span>
                    <select
                      value={selectedTestId}
                      onChange={(e) => setSelectedTestId(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {tests.map((t) => (
                        <option key={t.id} value={t.id}>{t.title} ({t.status})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <StudentList
                  test={selectedTest}
                  attempts={attempts}
                  onViewStudentSubmission={onViewStudentSubmission}
                  onDeleteStudentAttempt={handleDeleteStudentAttempt}
                  onRefresh={handleManualRefresh}
                  isRefreshing={isRefreshing}
                />
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Question Bank Browser */}
        {activeTab === 'bank' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Curated C Programming Question Bank</h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Manage reusable problems with verified test cases and starter templates</p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddBankQ}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question to Bank</span>
              </button>
            </div>

            {/* Search & Difficulty Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#121214] p-3.5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  placeholder="Search problem bank..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setBankDifficultyFilter(diff)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                      bankDifficultyFilter === diff
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-[#18181b] text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {diff === 'all' ? 'All Difficulties' : diff}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBankQuestions.map((q) => (
                <div key={q.id} className="p-5 rounded-3xl bg-white dark:bg-[#121214] border border-slate-200/90 dark:border-zinc-800 space-y-3.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">{q.title}</h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          q.difficulty === 'easy'
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400'
                            : q.difficulty === 'medium'
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400'
                            : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400'
                        }`}>
                          {q.difficulty} • {q.marks} pts
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenEditBankQ(q)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#18181b] hover:bg-indigo-600 hover:text-white text-slate-600 dark:text-zinc-300 transition-colors"
                          title="Edit Question"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setBankQToDelete(q.id)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#18181b] hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-400 text-slate-400 transition-colors"
                          title="Delete from Question Bank"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2">{q.description}</p>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#09090b] text-xs font-mono text-slate-800 dark:text-zinc-300 max-h-24 overflow-y-auto border border-slate-200/80 dark:border-zinc-800">
                      <pre>{q.starter_code}</pre>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                    <span className="font-medium">{q.test_cases?.length || 0} Test Cases ({q.test_cases?.filter(t => t.is_sample).length} Sample, {q.test_cases?.filter(t => !t.is_sample).length} Hidden)</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">C99 Standard</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal to Add / Edit Question Bank Question */}
        {showBankModal && editingBankQ && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingBankQ.title ? 'Edit Question Bank Question' : 'Add Question to Question Bank'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Question Title *</label>
                    <input
                      type="text"
                      required
                      value={editingBankQ.title}
                      onChange={(e) => setEditingBankQ({ ...editingBankQ, title: e.target.value })}
                      placeholder="e.g. Check Palindrome Number"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090b] border border-slate-300 dark:border-zinc-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Marks *</label>
                    <input
                      type="number"
                      min={1}
                      value={editingBankQ.marks}
                      onChange={(e) => setEditingBankQ({ ...editingBankQ, marks: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090b] border border-slate-300 dark:border-zinc-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Difficulty</label>
                    <select
                      value={editingBankQ.difficulty}
                      onChange={(e) => setEditingBankQ({ ...editingBankQ, difficulty: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090b] border border-slate-300 dark:border-zinc-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Constraints</label>
                    <input
                      type="text"
                      value={editingBankQ.constraints || ''}
                      onChange={(e) => setEditingBankQ({ ...editingBankQ, constraints: e.target.value })}
                      placeholder="e.g. 1 <= N <= 10^5"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090b] border border-slate-300 dark:border-zinc-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Problem Description *</label>
                  <textarea
                    rows={3}
                    value={editingBankQ.description}
                    onChange={(e) => setEditingBankQ({ ...editingBankQ, description: e.target.value })}
                    placeholder="Problem statement and task description..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090b] border border-slate-300 dark:border-zinc-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none font-sans"
                  />
                </div>

                {/* Problem Diagram / Media Upload */}
                <QuestionMediaUpload
                  imageUrl={editingBankQ.image_url || ''}
                  onChange={(url) => setEditingBankQ({ ...editingBankQ, image_url: url })}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Input Format</label>
                    <textarea
                      rows={2}
                      value={editingBankQ.input_format || ''}
                      onChange={(e) => setEditingBankQ({ ...editingBankQ, input_format: e.target.value })}
                      placeholder="Input format..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090b] border border-slate-300 dark:border-zinc-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Output Format</label>
                    <textarea
                      rows={2}
                      value={editingBankQ.output_format || ''}
                      onChange={(e) => setEditingBankQ({ ...editingBankQ, output_format: e.target.value })}
                      placeholder="Output format..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090b] border border-slate-300 dark:border-zinc-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Starter Code Template</label>
                  <textarea
                    rows={4}
                    value={editingBankQ.starter_code || ''}
                    onChange={(e) => setEditingBankQ({ ...editingBankQ, starter_code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090b] border border-slate-300 dark:border-zinc-800 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                {/* Algorithm / Solution Approach Field with MS Word-style Smart Bullets and Numbering */}
                <AlgorithmEditor
                  value={editingBankQ.algorithm || ''}
                  onChange={(val) => setEditingBankQ({ ...editingBankQ, algorithm: val })}
                  rows={3}
                  label="Algorithm / Solution Approach (Optional)"
                  badgeText="Accessible in AI Code Assist"
                />

                {/* Test Cases */}
                <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Test Cases ({editingBankQ.test_cases?.length || 0})
                      </h4>
                      <p className="text-[11px] text-slate-500">Configure sample and hidden test cases</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const newTC: TestCase = {
                            id: 'tc-' + Math.random().toString(36).substring(2, 9),
                            question_id: editingBankQ.id,
                            input: '',
                            expected_output: '',
                            is_sample: true,
                            marks: 5,
                          };
                          setEditingBankQ({
                            ...editingBankQ,
                            test_cases: [...(editingBankQ.test_cases || []), newTC],
                          });
                        }}
                        className="px-2.5 py-1 rounded bg-slate-200 dark:bg-[#18181b] hover:bg-slate-300 dark:hover:bg-zinc-700 text-xs font-semibold flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-500" />
                        <span>+ Sample</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const newTC: TestCase = {
                            id: 'tc-' + Math.random().toString(36).substring(2, 9),
                            question_id: editingBankQ.id,
                            input: '',
                            expected_output: '',
                            is_sample: false,
                            marks: 5,
                          };
                          setEditingBankQ({
                            ...editingBankQ,
                            test_cases: [...(editingBankQ.test_cases || []), newTC],
                          });
                        }}
                        className="px-2.5 py-1 rounded bg-slate-200 dark:bg-[#18181b] hover:bg-slate-300 dark:hover:bg-zinc-700 text-xs font-semibold flex items-center gap-1"
                      >
                        <EyeOff className="w-3.5 h-3.5 text-amber-500" />
                        <span>+ Hidden</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto">
                    {(editingBankQ.test_cases || []).map((tc, idx) => (
                      <div
                        key={tc.id || idx}
                        className={`p-3 rounded-xl border text-xs space-y-2 ${
                          tc.is_sample
                            ? 'bg-slate-50 dark:bg-[#09090b]/60 border-slate-200 dark:border-zinc-800'
                            : 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            tc.is_sample ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          }`}>
                            {tc.is_sample ? 'Sample Case' : 'Hidden Test Case'} #{idx + 1}
                          </span>

                          <div className="flex items-center gap-2">
                            <label className="text-[11px] text-slate-500 flex items-center gap-1">
                              <span>Marks:</span>
                              <input
                                type="number"
                                value={tc.marks}
                                onChange={(e) => {
                                  const updatedTCs = [...(editingBankQ.test_cases || [])];
                                  updatedTCs[idx] = { ...updatedTCs[idx], marks: Number(e.target.value) };
                                  setEditingBankQ({ ...editingBankQ, test_cases: updatedTCs });
                                }}
                                className="w-12 px-1 py-0.5 rounded bg-white dark:bg-[#121214] border border-slate-300 dark:border-zinc-800 text-center"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const updatedTCs = (editingBankQ.test_cases || []).filter((_, i) => i !== idx);
                                setEditingBankQ({ ...editingBankQ, test_cases: updatedTCs });
                              }}
                              className="text-slate-400 hover:text-rose-500 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-500 block mb-0.5">Input (stdin)</span>
                            <textarea
                              rows={2}
                              value={tc.input}
                              onChange={(e) => {
                                const updatedTCs = [...(editingBankQ.test_cases || [])];
                                updatedTCs[idx] = { ...updatedTCs[idx], input: e.target.value };
                                setEditingBankQ({ ...editingBankQ, test_cases: updatedTCs });
                              }}
                              placeholder="e.g. 10 20"
                              className="w-full p-1.5 rounded bg-white dark:bg-[#121214] border border-slate-300 dark:border-zinc-800 font-mono text-xs"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 block mb-0.5">Expected Output</span>
                            <textarea
                              rows={2}
                              value={tc.expected_output}
                              onChange={(e) => {
                                const updatedTCs = [...(editingBankQ.test_cases || [])];
                                updatedTCs[idx] = { ...updatedTCs[idx], expected_output: e.target.value };
                                setEditingBankQ({ ...editingBankQ, test_cases: updatedTCs });
                              }}
                              placeholder="e.g. 30"
                              className="w-full p-1.5 rounded bg-white dark:bg-[#121214] border border-slate-300 dark:border-zinc-800 font-mono text-xs text-emerald-600 dark:text-emerald-400"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-[#18181b] hover:bg-slate-300 dark:hover:bg-zinc-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingBankQ}
                  onClick={handleSaveBankQuestion}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md transition-all active:scale-95"
                >
                  {isSavingBankQ ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Problem...</span>
                    </>
                  ) : (
                    <span>Save to Question Bank</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Test Modal Dialog */}
        <ModalDialog
          isOpen={Boolean(testToDelete)}
          type="confirm"
          isDestructive={true}
          title="Delete Test"
          message={`Are you sure you want to permanently delete the test "${testToDelete?.title}"? All associated questions, student submissions, and results will be permanently deleted.`}
          confirmText="Delete Test"
          cancelText="Cancel"
          onConfirm={handleConfirmDeleteTest}
          onCancel={() => setTestToDelete(null)}
        />

        {/* Delete Bank Question Modal Dialog */}
        <ModalDialog
          isOpen={Boolean(bankQToDelete)}
          type="confirm"
          isDestructive={true}
          title="Remove Question from Bank"
          message="Are you sure you want to permanently remove this problem from the Question Bank?"
          confirmText="Remove Question"
          cancelText="Cancel"
          onConfirm={handleConfirmDeleteBankQ}
          onCancel={() => setBankQToDelete(null)}
        />

        {/* Generic Alert Modal */}
        <ModalDialog
          isOpen={Boolean(dialogAlert)}
          type="warning"
          title={dialogAlert?.title || 'Notice'}
          message={dialogAlert?.message || ''}
          confirmText="OK"
          onConfirm={() => setDialogAlert(null)}
          onClose={() => setDialogAlert(null)}
        />
      </div>

      {/* Floating Help Queue Action Button (Bottom Right - Direct Large Circular Icon) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsHelpDrawerOpen(true)}
          className={`relative p-0 rounded-full transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer focus:outline-none ${
            helpRequests.filter(r => r.status === 'pending').length > 0
              ? 'animate-bounce drop-shadow-[0_10px_20px_rgba(245,158,11,0.6)]'
              : 'hover:drop-shadow-[0_8px_16px_rgba(0,0,0,0.3)] drop-shadow-[0_4px_10px_rgba(0,0,0,0.15)]'
          }`}
          title="Student Help Queue (Click to open)"
        >
          <img src={handRaiseIcon} alt="Help Queue" className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-full" />
          {helpRequests.filter(r => r.status === 'pending').length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[24px] h-[24px] px-1 rounded-full bg-rose-600 text-white text-xs font-black flex items-center justify-center border-2 border-white dark:border-zinc-800 shadow-lg animate-pulse">
              {helpRequests.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {/* Fullscreen Centered Help Queue Dialog Box */}
      {isHelpDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto select-none flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md transition-opacity animate-in fade-in">
          {/* Backdrop Click Dismiss */}
          <div
            onClick={() => setIsHelpDrawerOpen(false)}
            className="fixed inset-0 -z-10"
          />

          {/* Modal Container - Extended Vertical Height */}
          <div className="relative w-full max-w-2xl sm:max-w-3xl h-[90vh] sm:h-[94vh] max-h-[96vh] min-h-[580px] bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200">
            
            {/* Dialog Header */}
            <div className="px-6 py-4 sm:py-5 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between bg-slate-50/80 dark:bg-[#09090b]/60 shrink-0">
              <div className="flex items-center gap-3.5">
                <img src={handRaiseIcon} alt="Help" className="w-12 h-12 sm:w-14 sm:h-14 object-contain rounded-full shrink-0 drop-shadow-md" />
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      Student Classroom Help Queue
                    </h2>
                    {pendingHelpCount > 0 ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 text-xs font-bold animate-pulse">
                        {pendingHelpCount} Students Waiting
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 text-xs font-bold">
                        Queue Clear
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Live offline assistance requests from students at their desks
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => playTingNotification()}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#18181b] hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  title="Test audio alert chime"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Test Chime</span>
                </button>

                {helpRequests.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllHelp}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsHelpDrawerOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Close Queue"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Dialog Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3.5 flex flex-col">
              {pendingHelpCount === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4 space-y-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    No Pending Requests
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                    When students click the <strong>"Need Help?"</strong> button at their desks, their names, roll numbers, and active questions will appear here instantly.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col space-y-3.5">
                  {helpRequests
                    .filter(r => r.status === 'pending')
                    .map((req) => {
                      const diffMs = Date.now() - new Date(req.requested_at).getTime();
                      const diffMin = Math.floor(diffMs / 60000);
                      const timeText = diffMin < 1 ? 'Just now' : `${diffMin}m ago`;

                      return (
                        <div
                          key={req.id}
                          className="bg-white dark:bg-[#09090b]/70 border-2 border-amber-400 dark:border-amber-500/60 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all space-y-3.5 flex flex-col justify-between relative overflow-hidden animate-in fade-in duration-150"
                        >
                          <div className="space-y-2.5">
                            {/* Card Top: Student Info */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                                  {req.student_name}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 mt-1">
                                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                                    UID: {req.student_roll_no}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1 font-medium">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {timeText}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteHelp(req.id)}
                                className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                title="Dismiss Request"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Active Question Box */}
                            {req.question_title && (
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#121214] border border-slate-200/90 dark:border-zinc-800 text-xs">
                                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">
                                  Current Problem
                                </span>
                                <span className="font-bold text-slate-800 dark:text-zinc-200 line-clamp-1 block">
                                  {req.question_title}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Action Button: Cut from queue / Mark assisted */}
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => handleResolveHelp(req.id)}
                              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 transition-all active:scale-98 cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                              <span>Attended & Cut from Queue</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Dialog Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-[#09090b]/60 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
              <span>Classroom assistance queue synced in real-time</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">First Come, First Served</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
