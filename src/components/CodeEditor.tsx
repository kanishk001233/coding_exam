import React, { useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { RotateCcw, Copy, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ModalDialog } from './ModalDialog';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  onReset: () => void;
  readOnly?: boolean;
  fontSize?: number;
  onRun?: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  onReset,
  readOnly = false,
  fontSize = 14,
  onRun,
}) => {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const editorRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Add Ctrl+Enter shortcut to Run Code
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (onRun) {
        onRun();
      }
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'light';

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xl transition-colors">
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 select-none">
        <div className="flex items-center gap-2 font-mono">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-semibold">
            <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse"></span>
            solution.c
          </div>
          <span className="text-slate-400 dark:text-slate-600">|</span>
          <span className="text-slate-500 dark:text-slate-400">C99 (WASM Engine)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {!readOnly && (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/50 hover:border-rose-400 dark:hover:border-rose-500/40 border border-transparent text-slate-700 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-300 transition-colors cursor-pointer"
              title="Reset Code"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <div className="text-[11px] text-slate-500 hidden sm:block pl-2 border-l border-slate-300 dark:border-slate-800">
            <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700">Enter</kbd> to Run
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Resetting Code */}
      <ModalDialog
        isOpen={showResetConfirm}
        type="warning"
        isDestructive={true}
        title="Reset Code to Starter Template"
        message="Reset code to initial starter template? Your current changes will be lost."
        confirmText="Reset Code"
        cancelText="Cancel"
        onConfirm={() => {
          setShowResetConfirm(false);
          onReset();
        }}
        onCancel={() => setShowResetConfirm(false)}
      />

      {/* Monaco Editor Component */}
      <div className="flex-1 w-full min-h-[300px] relative">
        <Editor
          height="100%"
          language="c"
          value={code}
          theme={monacoTheme}
          onMount={handleEditorDidMount}
          onChange={(val) => onChange(val || '')}
          options={{
            readOnly,
            fontSize,
            fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            cursorBlinking: 'smooth',
            bracketPairColorization: { enabled: true },
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>
    </div>
  );
};
