import React, { useState, useEffect } from 'react';
import { wasmCompiler } from '../lib/wasm/compiler';
import { Play, CheckCircle2, XCircle, RefreshCw, Sparkles } from 'lucide-react';
import { CodeEditor } from '../components/CodeEditor';
import { ThemeToggle } from '../components/ThemeToggle';

const SUITE_TESTS = [
  {
    id: 1,
    title: 'Test 1 — Standard Hello World',
    code: `#include <stdio.h>

int main() {
    printf("Hello World");
    return 0;
}`,
    input: '',
    expected: 'Hello World',
    description: 'Verifies standard printf output formatting to stdout.',
  },
  {
    id: 2,
    title: 'Test 2 — Standard Input (scanf) & Summation',
    code: `#include <stdio.h>

int main() {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d", a + b);
    return 0;
}`,
    input: '10 20',
    expected: '30',
    description: 'Verifies parsing space-separated numbers with scanf and performing addition.',
  },
  {
    id: 3,
    title: 'Test 3 — Compilation Syntax Error Handling',
    code: `#include <stdio.h>

int main() {
    printf("Hello")
    return 0;
}`,
    input: '',
    expected: 'Compilation Error',
    description: 'Verifies that missing semicolons or syntax errors are trapped with line numbers.',
  },
  {
    id: 4,
    title: 'Test 4 — Infinite Loop & Time Limit Exceeded Termination',
    code: `#include <stdio.h>

int main() {
    while(1) {
        // Infinite loop - worker must safely terminate!
    }
    return 0;
}`,
    input: '',
    expected: 'Time Limit Exceeded',
    description: 'Verifies that an infinite loop is killed within 2000ms by the Web Worker without freezing the browser.',
  },
];

export const WasmTestPage: React.FC<{ onNavigateHome?: () => void }> = ({ onNavigateHome }) => {
  const [suiteResults, setSuiteResults] = useState<Record<number, { status: string; output: string; time: number; passed: boolean }>>({});
  const [isRunningSuite, setIsRunningSuite] = useState(false);

  // Custom interactive test
  const [customCode, setCustomCode] = useState(`#include <stdio.h>

int main() {
    int n;
    printf("Enter a number: ");
    scanf("%d", &n);
    printf("You entered %d squared is %d\\n", n, n * n);
    return 0;
}`);
  const [customInput, setCustomInput] = useState('7');
  const [customOutput, setCustomOutput] = useState('');
  const [isExecutingCustom, setIsExecutingCustom] = useState(false);

  useEffect(() => {
    wasmCompiler.initialize();
  }, []);

  const runAllSuiteTests = async () => {
    setIsRunningSuite(true);
    const results: Record<number, { status: string; output: string; time: number; passed: boolean }> = {};

    for (const test of SUITE_TESTS) {
      const startTime = performance.now();
      if (test.id === 3) {
        const compileRes = await wasmCompiler.compile(test.code);
        const passed = !compileRes.success;
        results[test.id] = {
          status: passed ? 'Passed (Syntax Error Trapped)' : 'Failed',
          output: compileRes.errors || 'Unexpected compilation success',
          time: Math.round(performance.now() - startTime),
          passed,
        };
      } else {
        const compileRes = await wasmCompiler.compile(test.code);
        if (!compileRes.success) {
          results[test.id] = {
            status: 'Compile Error',
            output: compileRes.errors || '',
            time: Math.round(performance.now() - startTime),
            passed: false,
          };
          continue;
        }

        const runRes = await wasmCompiler.run(compileRes.executable, test.input, { timeoutMs: 2000 });
        if (test.id === 4) {
          const passed = runRes.timedOut;
          results[test.id] = {
            status: passed ? 'Passed (Worker Terminated Safely)' : 'Failed',
            output: runRes.stderr || runRes.stdout,
            time: runRes.executionTime,
            passed,
          };
        } else {
          const normActual = (runRes.stdout || '').trim();
          const passed = normActual === test.expected.trim();
          results[test.id] = {
            status: passed ? 'Passed' : 'Failed',
            output: runRes.stdout || runRes.stderr,
            time: runRes.executionTime,
            passed,
          };
        }
      }
    }

    setSuiteResults(results);
    setIsRunningSuite(false);
  };

  const handleRunCustomCode = async () => {
    setIsExecutingCustom(true);
    setCustomOutput('Compiling C code in Web Worker...');

    const compileRes = await wasmCompiler.compile(customCode);
    if (!compileRes.success) {
      setCustomOutput(`[Compilation Error]\n${compileRes.errors}`);
      setIsExecutingCustom(false);
      return;
    }

    setCustomOutput('Running in WebAssembly Sandbox...');
    const runRes = await wasmCompiler.run(compileRes.executable, customInput, { timeoutMs: 2000 });

    if (runRes.timedOut) {
      setCustomOutput(`[Time Limit Exceeded]\nExecution terminated by watchdog (2000ms).`);
    } else if (runRes.stderr && !runRes.success) {
      setCustomOutput(`[Runtime Error]\n${runRes.stderr}\n\nStdout:\n${runRes.stdout}`);
    } else {
      setCustomOutput(`Exit Code: ${runRes.exitCode} | Time: ${runRes.executionTime}ms\n\n[STDOUT]:\n${runRes.stdout}`);
    }
    setIsExecutingCustom(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 p-6 md:p-10 font-sans transition-colors">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-zinc-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-300 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phase 3 WASM C Compiler Diagnostic & Test Suite</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              In-Browser C Execution Sandbox
            </h1>
            <p className="text-sm text-slate-600 dark:text-zinc-400 mt-1">
              Zero backend compilation • Zero paid APIs • Safe isolated Web Worker execution with watchdog termination
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            {onNavigateHome && (
              <button
                type="button"
                onClick={onNavigateHome}
                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-[#18181b] hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-semibold transition-colors"
              >
                Back to App
              </button>
            )}

            <button
              type="button"
              disabled={isRunningSuite}
              onClick={runAllSuiteTests}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {isRunningSuite ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Running Benchmark Suite...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Run Instruction.md Test Suite (1–4)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Section 30 Benchmark Cards */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
            Mandatory Instruction.md Section 30 Verification Tests
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SUITE_TESTS.map((test) => {
              const res = suiteResults[test.id];
              return (
                <div
                  key={test.id}
                  className={`p-5 rounded-xl border transition-all ${
                    res
                      ? res.passed
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/40 shadow-md'
                        : 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/40 shadow-md'
                      : 'bg-white dark:bg-[#121214]/90 border-slate-200 dark:border-zinc-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{test.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{test.description}</p>
                    </div>

                    {res && (
                      <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                        res.passed ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'
                      }`}>
                        {res.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {res.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 p-2.5 rounded bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800/80 font-mono text-[11px] text-slate-800 dark:text-zinc-300 max-h-32 overflow-y-auto">
                    <pre>{test.code}</pre>
                  </div>

                  {test.input && (
                    <div className="mt-2 text-xs font-mono text-slate-600 dark:text-zinc-400">
                      Input: <code className="text-indigo-600 dark:text-indigo-300">{test.input}</code>
                    </div>
                  )}

                  {res && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-zinc-800 text-xs flex items-center justify-between font-mono">
                      <div className="text-slate-700 dark:text-zinc-300 truncate max-w-[280px]">
                        Result: <span className={res.passed ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400'}>{res.output}</span>
                      </div>
                      <span className="text-slate-400">{res.time}ms</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Interactive Playground */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Live Interactive C Sandbox</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Write custom C code and run it directly in your browser's Web Worker</p>
            </div>

            <button
              type="button"
              disabled={isExecutingCustom}
              onClick={handleRunCustomCode}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isExecutingCustom ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Execute Custom C Code</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-96">
              <CodeEditor
                code={customCode}
                onChange={setCustomCode}
                onReset={() => setCustomCode(`#include <stdio.h>\n\nint main() {\n    printf("Hello C!\\n");\n    return 0;\n}`)}
                onRun={handleRunCustomCode}
              />
            </div>

            <div className="h-96 flex flex-col gap-3">
              <div className="h-28 flex flex-col bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-lg p-3 shadow-md">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1 font-sans">
                  Standard Input (stdin for scanf):
                </span>
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="flex-1 w-full bg-slate-50 dark:bg-[#09090b] border border-slate-300 dark:border-zinc-800 rounded p-2 text-xs font-mono text-slate-900 dark:text-zinc-200 resize-none focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex-1 flex flex-col bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-lg p-3 shadow-md">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1 font-sans">
                  Program Output (stdout / stderr):
                </span>
                <pre className="flex-1 w-full bg-slate-50 dark:bg-[#09090b] border border-slate-300 dark:border-zinc-800 rounded p-2 text-xs font-mono text-emerald-800 dark:text-emerald-300 overflow-y-auto whitespace-pre-wrap">
                  {customOutput || 'Ready. Click "Execute Custom C Code" to test.'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
