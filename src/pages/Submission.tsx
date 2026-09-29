import React from 'react';
import { TestAttempt } from '../types/database';
import { mockDb } from '../lib/mockDb';
import { ArrowLeft, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react';
import { CodeEditor } from '../components/CodeEditor';
import { ThemeToggle } from '../components/ThemeToggle';

interface SubmissionProps {
  attempt: TestAttempt;
  onBack: () => void;
}

export const Submission: React.FC<SubmissionProps> = ({ attempt, onBack }) => {
  const submissions = mockDb.getLatestSubmissions(attempt.id);
  const [selectedSubIndex, setSelectedSubIndex] = React.useState(0);

  const activeSub = submissions[selectedSubIndex] || submissions[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 p-6 sm:p-8 font-sans transition-colors">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Monitor</span>
            </button>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Student Code Submission: {attempt.student_name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Roll No: <strong className="text-indigo-600 dark:text-indigo-300 font-mono">{attempt.student_roll_no}</strong> • Score: <strong className="text-emerald-600 dark:text-emerald-400">{attempt.score} pts</strong> • Status: {attempt.status}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {attempt.tab_switch_count && attempt.tab_switch_count > 0 ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                <ShieldAlert className="w-4 h-4" />
                <span>{attempt.tab_switch_count} Anti-Cheat Flags</span>
              </span>
            ) : null}
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-2xl text-slate-500 text-xs">
            Student has not submitted code for any questions yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Question Selector Tabs */}
            <div className="lg:col-span-4 space-y-3">
              <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Submissions</span>

              <div className="space-y-2">
                {submissions.map((sub, idx) => (
                  <div
                    key={sub.id || idx}
                    onClick={() => setSelectedSubIndex(idx)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      idx === selectedSubIndex
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-slate-900 dark:text-white shadow-md'
                        : 'bg-white dark:bg-[#121214] border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold">Submission #{idx + 1}</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                        sub.status === 'accepted' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'
                      }`}>
                        {sub.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 mt-2 font-mono">
                      <span>Score: {sub.score}/{sub.max_score}</span>
                      <span>{sub.execution_time}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Code & Results Viewer */}
            <div className="lg:col-span-8 space-y-4">
              {activeSub && (
                <>
                  <div className="h-80">
                    <CodeEditor
                      code={activeSub.code}
                      onChange={() => {}}
                      onReset={() => {}}
                      readOnly={true}
                    />
                  </div>

                  {activeSub.results && activeSub.results.length > 0 && (
                    <div className="p-4 bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-xl space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                        Grading Results Breakdown
                      </h4>

                      <div className="grid grid-cols-1 gap-2">
                        {activeSub.results.map((r, rIdx) => (
                          <div
                            key={r.id || rIdx}
                            className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                              r.status === 'accepted'
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {r.status === 'accepted' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                              )}
                              <span>{r.is_sample ? `Sample Case #${rIdx + 1}` : `Hidden Case #${rIdx + 1}`}</span>
                            </div>

                            <span className="font-mono font-bold">
                              +{r.marks_awarded} / {r.max_marks} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
