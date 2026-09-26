import React, { useState } from 'react';
import { Test, TestAttempt } from '../types/database';
import { mockDb } from '../lib/mockDb';
import { CheckCircle, ArrowLeft, BarChart3, Users, FileSpreadsheet, Trash2 } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { ModalDialog } from '../components/ModalDialog';

interface ResultsProps {
  test: Test;
  attempt?: TestAttempt;
  isTeacherView?: boolean;
  onBackToDashboard: () => void;
}

export const Results: React.FC<ResultsProps> = ({
  test,
  attempt,
  isTeacherView = false,
  onBackToDashboard,
}) => {
  const [allAttempts, setAllAttempts] = useState<TestAttempt[]>(() => mockDb.getAttempts(test.id));
  const [attemptToDelete, setAttemptToDelete] = useState<TestAttempt | null>(null);
  const questions = test.questions || [];
  const maxPossibleMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

  // Real-time polling for teacher dashboard results
  React.useEffect(() => {
    const refresh = async () => {
      await mockDb.syncFromSupabase();
      setAllAttempts(mockDb.getAttempts(test.id));
    };
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [test.id]);

  const studentSubmissions = attempt ? mockDb.getLatestSubmissions(attempt.id) : [];

  const submittedAttempts = allAttempts.filter((a) => a.status === 'submitted' || a.status === 'auto_submitted');
  const avgScore = submittedAttempts.length > 0
    ? Math.round(submittedAttempts.reduce((sum, a) => sum + a.score, 0) / submittedAttempts.length)
    : 0;
  const avgPercentage = maxPossibleMarks > 0 ? Math.round((avgScore / maxPossibleMarks) * 100) : 0;

  const handleDeleteAttempt = async () => {
    if (!attemptToDelete) return;
    await mockDb.deleteAttempt(attemptToDelete.id);
    setAllAttempts(mockDb.getAttempts(test.id));
    setAttemptToDelete(null);
  };

  const questionStats = questions.map((q) => {
    const validAttempts = allAttempts.filter((a) => a.status === 'submitted' || a.status === 'auto_submitted');
    let acceptedCount = 0;
    let studentsAttempted = 0;

    validAttempts.forEach((att) => {
      const latestSubs = mockDb.getLatestSubmissions(att.id);
      const sub = latestSubs.find((s) => s.question_id === q.id);
      if (sub) {
        studentsAttempted++;
        if (sub.status === 'accepted') {
          acceptedCount++;
        }
      }
    });

    const successRate = studentsAttempted > 0 ? Math.round((acceptedCount / studentsAttempted) * 100) : 0;
    return {
      id: q.id,
      title: q.title,
      difficulty: q.difficulty,
      marks: q.marks,
      successRate,
      attemptsCount: studentsAttempted,
    };
  });

  const handleExportCSV = () => {
    const headers = [
      'UID',
      'Name',
      'Test',
      'Score',
      'Max Score',
      'Percentage',
      ...questions.map((_, idx) => `Q${idx + 1}`),
      'Submitted At',
      'Anti-Cheat Flags',
    ];

    const rows = submittedAttempts.map((att) => {
      const latestSubs = mockDb.getLatestSubmissions(att.id);
      const qScores = questions.map((q) => {
        const sub = latestSubs.find((s) => s.question_id === q.id);
        return sub ? sub.score : 0;
      });

      const pct = maxPossibleMarks > 0 ? Math.round((att.score / maxPossibleMarks) * 100) : 0;

      return [
        `"${att.student_roll_no}"`,
        `"${att.student_name}"`,
        `"${test.title}"`,
        att.score,
        maxPossibleMarks,
        `${pct}%`,
        ...qScores,
        `"${att.submitted_at ? new Date(att.submitted_at).toLocaleString() : 'N/A'}"`,
        att.tab_switch_count || 0,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${test.title.replace(/\s+/g, '_')}_Results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-8 font-sans transition-colors">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation / Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <button
              type="button"
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">{test.title}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assessment Results & Performance Analytics • Code: <strong className="text-indigo-600 dark:text-indigo-300 font-mono">{test.join_code}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isTeacherView && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export CSV Report</span>
              </button>
            )}
          </div>
        </div>

        {/* Student View Breakdown */}
        {attempt && !isTeacherView && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-md">
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Total Score</span>
                <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {attempt.score} <span className="text-slate-400 dark:text-slate-500 text-lg">/ {maxPossibleMarks}</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-md">
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Percentage</span>
                <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {maxPossibleMarks > 0 ? Math.round((attempt.score / maxPossibleMarks) * 100) : 0}%
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-md">
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Status</span>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 capitalize flex items-center gap-1.5 pt-1">
                  <CheckCircle className="w-5 h-5" />
                  <span>Submitted Successfully</span>
                </div>
              </div>
            </div>

            {/* Questions Breakdown */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Question-Wise Performance
              </h3>

              <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {questions.map((q, idx) => {
                  const sub = studentSubmissions.find((s) => s.question_id === q.id);
                  const isAccepted = sub?.status === 'accepted';
                  const score = sub ? sub.score : 0;

                  return (
                    <div key={q.id} className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs">
                          Q{idx + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{q.title}</h4>
                          <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{q.difficulty} • {q.marks} Max Points</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          isAccepted
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                            : score > 0
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'
                            : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30'
                        }`}>
                          {sub?.status || 'Not Submitted'}
                        </span>
                        <span className="text-sm font-bold font-mono text-slate-900 dark:text-white min-w-[50px] text-right">
                          {score}/{q.marks}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Teacher Class Analytics View */}
        {isTeacherView && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-md">
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Class Average Score</span>
                <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {avgScore} <span className="text-slate-400 dark:text-slate-500 text-lg">/ {maxPossibleMarks}</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-md">
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Average Pass Percentage</span>
                <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">{avgPercentage}%</div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-md">
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Total Submissions</span>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {submittedAttempts.length} <span className="text-slate-400 dark:text-slate-500 text-lg">/ {allAttempts.length}</span>
                </div>
              </div>
            </div>

            {/* Question Analytics */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Question Success Rate Analytics</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Identifies curriculum topics requiring additional reinforcement</p>
                </div>
                <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {questionStats.map((qs) => (
                  <div key={qs.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">{qs.title}</span>
                      <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-300">{qs.successRate}% Success</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          qs.successRate >= 75 ? 'bg-emerald-500' : qs.successRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${qs.successRate}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 capitalize">
                      <span>Difficulty: {qs.difficulty}</span>
                      <span>{qs.marks} marks</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Student Leaderboard */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Student Scores & Submissions</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Individual scores and anti-cheat event counts</p>
                </div>
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>

              {submittedAttempts.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No submissions recorded yet for this test.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-100 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">UID</th>
                        <th className="px-4 py-3">Student Name</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Score</th>
                        <th className="px-4 py-3">Percentage</th>
                        <th className="px-4 py-3">Anti-Cheat Flags</th>
                        {isTeacherView && <th className="px-4 py-3 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
                      {submittedAttempts.map((att) => {
                        const pct = maxPossibleMarks > 0 ? Math.round((att.score / maxPossibleMarks) * 100) : 0;
                        return (
                          <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-300">{att.student_roll_no}</td>
                            <td className="px-4 py-3 font-sans font-medium text-slate-900 dark:text-white">{att.student_name}</td>
                            <td className="px-4 py-3 font-sans">
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                                {att.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{att.score} / {maxPossibleMarks}</td>
                            <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400">{pct}%</td>
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{att.tab_switch_count || 0} flags</td>
                            {isTeacherView && (
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => setAttemptToDelete(att)}
                                  className="p-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950 hover:text-rose-600 dark:hover:text-rose-400 text-slate-400 transition-colors inline-flex items-center"
                                  title="Delete Result"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* In-app confirmation dialog for deleting student attempt */}
        <ModalDialog
          isOpen={Boolean(attemptToDelete)}
          type="confirm"
          isDestructive={true}
          title="Delete Student Submission"
          message={`Are you sure you want to permanently delete the submission and results for ${attemptToDelete?.student_name} (${attemptToDelete?.student_roll_no})? This cannot be undone.`}
          confirmText="Delete Result"
          cancelText="Cancel"
          onConfirm={handleDeleteAttempt}
          onCancel={() => setAttemptToDelete(null)}
        />
      </div>
    </div>
  );
};
