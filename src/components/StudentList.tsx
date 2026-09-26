import React, { useState } from 'react';
import { TestAttempt } from '../types/database';
import { UserCheck, ShieldAlert, FileCode2, Maximize2, ExternalLink, Trash2, RefreshCw } from 'lucide-react';
import { ModalDialog } from './ModalDialog';

interface StudentListProps {
  attempts: TestAttempt[];
  onViewStudentSubmission?: (attempt: TestAttempt) => void;
  onDeleteStudentAttempt?: (attemptId: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const StudentList: React.FC<StudentListProps> = ({
  attempts,
  onViewStudentSubmission,
  onDeleteStudentAttempt,
  onRefresh,
  isRefreshing = false,
}) => {
  const [attemptToDelete, setAttemptToDelete] = useState<TestAttempt | null>(null);

  const activeCount = attempts.filter((a) => a.status === 'in_progress').length;
  const submittedCount = attempts.filter((a) => a.status === 'submitted' || a.status === 'auto_submitted').length;
  const totalStudents = attempts.length;
  const totalFlags = attempts.reduce(
    (sum, a) => sum + (a.tab_switch_count || 0) + (a.fullscreen_exit_count || 0),
    0
  );

  const handleConfirmDelete = () => {
    if (attemptToDelete && onDeleteStudentAttempt) {
      onDeleteStudentAttempt(attemptToDelete.id);
    }
    setAttemptToDelete(null);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl transition-colors">
      {/* Top statistics summary */}
      <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Classroom Activity Monitor</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Live real-time monitoring of students and integrity flags</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
            <span>{activeCount} In Progress</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
            <UserCheck className="w-3.5 h-3.5" />
            <span>
              <strong className="font-mono">{submittedCount}/{totalStudents}</strong> Submitted
            </span>
          </div>

          {totalFlags > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              <span>{totalFlags} Total Flags</span>
            </div>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all active:scale-95"
              title="Refresh live classroom status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-100 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3">UID</th>
              <th className="px-4 py-3">Student Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tab Switches</th>
              <th className="px-4 py-3">Fullscreen Exits</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Started At</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
            {attempts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500 font-sans">
                  No students have joined this test yet. Share the join code with your class!
                </td>
              </tr>
            ) : (
              attempts.map((attempt) => {
                const isSubmitted = attempt.status === 'submitted' || attempt.status === 'auto_submitted';
                const tabSwitches = attempt.tab_switch_count || 0;
                const fullscreenExits = attempt.fullscreen_exit_count || 0;

                return (
                  <tr key={attempt.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-indigo-600 dark:text-indigo-300">
                      {attempt.student_roll_no}
                    </td>
                    <td className="px-4 py-3 font-sans font-medium text-slate-900 dark:text-white">
                      {attempt.student_name}
                    </td>
                    <td className="px-4 py-3 font-sans">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          attempt.status === 'in_progress'
                            ? 'bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-300'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {attempt.status === 'in_progress' ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-ping"></span>
                            In Progress
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            Submitted
                          </>
                        )}
                      </span>
                    </td>
                    {/* Tab Switches Column */}
                    <td className="px-4 py-3">
                      {tabSwitches > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-500/50 text-rose-700 dark:text-rose-300 text-[11px] font-bold">
                          <ExternalLink className="w-3 h-3" />
                          {tabSwitches} {tabSwitches === 1 ? 'switch' : 'switches'}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">0</span>
                      )}
                    </td>
                    {/* Fullscreen Exits Column */}
                    <td className="px-4 py-3">
                      {fullscreenExits > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-500/50 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
                          <Maximize2 className="w-3 h-3" />
                          {fullscreenExits} {fullscreenExits === 1 ? 'exit' : 'exits'}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {isSubmitted ? `${attempt.score} pts` : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-[11px]">
                      {new Date(attempt.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        {onViewStudentSubmission && (
                          <button
                            type="button"
                            onClick={() => onViewStudentSubmission(attempt)}
                            className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 transition-colors inline-flex items-center gap-1 font-sans text-xs"
                            title="View student code submissions"
                          >
                            <FileCode2 className="w-3 h-3" />
                            <span>View Code</span>
                          </button>
                        )}
                        {onDeleteStudentAttempt && (
                          <button
                            type="button"
                            onClick={() => setAttemptToDelete(attempt)}
                            className="p-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950 hover:text-rose-600 dark:hover:text-rose-400 text-slate-400 transition-colors"
                            title="Delete Student Attempt / Result"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation modal for deleting student attempt */}
      <ModalDialog
        isOpen={Boolean(attemptToDelete)}
        type="confirm"
        isDestructive={true}
        title="Delete Student Attempt"
        message={`Are you sure you want to permanently delete the live attempt for ${attemptToDelete?.student_name} (${attemptToDelete?.student_roll_no})?`}
        confirmText="Delete Attempt"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setAttemptToDelete(null)}
      />
    </div>
  );
};
