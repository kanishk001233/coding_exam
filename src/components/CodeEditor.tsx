import React, { useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { RotateCcw, Copy, Check, Terminal, Cpu } from 'lucide-react';
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

    // Define custom refined dark theme matching application palette
    monaco.editor.defineTheme('codearena-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '71717a', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'a78bfa', fontStyle: 'bold' },
        { token: 'identifier', foreground: 'f4f4f5' },
        { token: 'type', foreground: '38bdf8' },
        { token: 'string', foreground: '4ade80' },
        { token: 'number', foreground: 'fb923c' },
        { token: 'delimiter', foreground: 'a1a1aa' },
        { token: 'delimiter.parenthesis', foreground: 'c084fc' },
      ],
      colors: {
        'editor.background': '#121214',
        'editor.foreground': '#f4f4f5',
        'editorCursor.foreground': '#818cf8',
        'editor.lineHighlightBackground': '#27272a35',
        'editorLineNumber.foreground': '#52525b',
        'editorLineNumber.activeForeground': '#e4e4e7',
        'editor.selectionBackground': '#4338ca40',
        'editor.inactiveSelectionBackground': '#27272a40',
        'editorIndentGuide.background': '#27272a',
        'editorIndentGuide.activeBackground': '#3f3f46',
        'editorBracketMatch.background': '#3f3f4640',
        'editorBracketMatch.border': '#818cf8',
      },
    });

    // Define custom clean light theme
    monaco.editor.defineTheme('codearena-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '71717a', fontStyle: 'italic' },
        { token: 'keyword', foreground: '4f46e5', fontStyle: 'bold' },
        { token: 'identifier', foreground: '18181b' },
        { token: 'type', foreground: '0284c7' },
        { token: 'string', foreground: '16a34a' },
        { token: 'number', foreground: 'ea580c' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#18181b',
        'editorCursor.foreground': '#4f46e5',
        'editor.lineHighlightBackground': '#f4f4f5',
        'editorLineNumber.foreground': '#a1a1aa',
        'editorLineNumber.activeForeground': '#27272a',
        'editor.selectionBackground': '#e0e7ff',
      },
    });

    // Set initial theme
    monaco.editor.setTheme(theme === 'dark' ? 'codearena-dark' : 'codearena-light');

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

  const monacoTheme = theme === 'dark' ? 'codearena-dark' : 'codearena-light';

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#121214] border border-slate-200/90 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm transition-colors">
      {/* Editor Header Toolbar */}
      <div className="flex items-center justify-between px-3.5 sm:px-4 py-2 bg-slate-50/80 dark:bg-[#18181b]/90 border-b border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-400 select-none shrink-0">
        <div className="flex items-center gap-2 font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-bold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
            <Terminal className="w-3 h-3 text-indigo-500" />
            <span>solution.c</span>
          </div>
          <span className="text-slate-300 dark:text-zinc-700 hidden sm:inline">•</span>
          <span className="text-slate-500 dark:text-zinc-400 text-[11px] hidden sm:flex items-center gap-1">
            <Cpu className="w-3 h-3 text-zinc-400" />
            <span>C99 (WASM Engine)</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-[11px] font-medium transition-colors cursor-pointer"
            title="Copy Code to Clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {!readOnly && (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:border-rose-300 dark:hover:border-rose-500/40 border border-transparent text-slate-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 text-[11px] font-medium transition-colors cursor-pointer"
              title="Reset code to initial template"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <div className="text-[11px] text-slate-400 dark:text-zinc-500 hidden md:flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-zinc-800">
            <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded text-[10px] font-mono border border-slate-300 dark:border-zinc-700">Ctrl</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded text-[10px] font-mono border border-slate-300 dark:border-zinc-700">Enter</kbd>
            <span className="text-[10px]">to Run</span>
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
      <div className="flex-1 w-full min-h-[140px] relative bg-white dark:bg-[#121214]">
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
            fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace",
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

