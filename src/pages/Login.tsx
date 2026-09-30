import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, School, Code2, AlertCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ThemeToggle } from '../components/ThemeToggle';

const AUTHORIZED_EMAIL = (import.meta.env.VITE_TEACHER_EMAIL || '').trim();
const AUTHORIZED_PASSWORD = import.meta.env.VITE_TEACHER_PASSWORD || '';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    const enteredPassword = password;

    const targetEmail = AUTHORIZED_EMAIL.toLowerCase();
    const targetPassword = AUTHORIZED_PASSWORD;

    if (!targetEmail || !targetPassword) {
      setError('Teacher login credentials are not configured in environment variables (VITE_TEACHER_EMAIL & VITE_TEACHER_PASSWORD).');
      setIsLoading(false);
      return;
    }

    if (trimmedEmail !== targetEmail || enteredPassword !== targetPassword) {
      setTimeout(() => {
        setError('Invalid credentials. Access is restricted to the authorized instructor.');
        setIsLoading(false);
      }, 300);
      return;
    }

    try {
      if (isSupabaseConfigured && supabase) {
        try {
          const { error: authError } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password: enteredPassword,
          });

          // Only attempt signUp if the user literally does NOT exist in Supabase Auth yet.
          // NEVER call signUp if the email is already registered or awaiting confirmation.
          if (authError) {
            const msg = (authError.message || '').toLowerCase();
            const isEmailUnconfirmed = msg.includes('email not confirmed') || msg.includes('unconfirmed');
            const isUserMissing = msg.includes('invalid login credentials') || msg.includes('user not found');

            if (!isEmailUnconfirmed && isUserMissing) {
              await supabase.auth.signUp({
                email: trimmedEmail,
                password: enteredPassword,
                options: {
                  data: {
                    name: 'Instructor',
                    role: 'teacher',
                  },
                },
              });
            }
          }
        } catch (authErr) {
          // Log auth warning without blocking authorized teacher login
          console.warn('Supabase auth warning:', authErr);
        }
      }

      sessionStorage.setItem(
        'c_exam_teacher_auth',
        JSON.stringify({
          id: 'teacher-auth',
          name: trimmedEmail.split('@')[0] || 'Instructor',
          email: trimmedEmail,
          role: 'teacher',
        })
      );

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 flex flex-col justify-center items-center p-4 selection:bg-indigo-500 selection:text-white font-sans transition-colors">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-black text-2xl shadow-xl shadow-indigo-500/25 border border-indigo-400/30 mb-1">
            CA
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            CodeArena Instructor Portal
          </h1>
          <p className="text-xs text-slate-600 dark:text-zinc-400">
            Sign in to manage tests, monitor students, and view assessment results
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <School className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Instructor Login</h2>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-100 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-[#09090b] border border-slate-300 dark:border-zinc-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-[#09090b] border border-slate-300 dark:border-zinc-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Bottom footer: ONLY WASM Compiler Benchmark link */}
        <div className="text-center text-xs text-slate-600 dark:text-zinc-400">
          <Link
            to="/wasm-diagnostics"
            className="hover:text-emerald-600 dark:hover:text-emerald-400 underline underline-offset-4 transition-colors"
          >
            WASM Compiler Benchmark →
          </Link>
        </div>
      </div>
    </div>
  );
};
