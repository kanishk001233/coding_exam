import React, { useRef } from 'react';
import { List, ListOrdered, Indent, Outdent, Sparkles } from 'lucide-react';

interface AlgorithmEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
  helperText?: string;
  badgeText?: string;
}

export const AlgorithmEditor: React.FC<AlgorithmEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write the step-by-step algorithm, approach, or logic for this problem (e.g. 1. Initialize variables, 2. Iterate array, 3. Return result)...',
  rows = 4,
  label = 'Algorithm / Solution Approach (Optional)',
  helperText = 'Auto-formats numbering (1, 2, 3) and bullets (•) with smart indentation on Enter / Tab as in MS Word',
  badgeText = 'Shown to students inside AI Code Assist',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value: currentVal } = textarea;

    // Handle Tab and Shift+Tab for Indent / Outdent
    if (e.key === 'Tab') {
      e.preventDefault();
      const isShift = e.shiftKey;

      const lineStart = currentVal.lastIndexOf('\n', selectionStart - 1) + 1;
      let lineEnd = currentVal.indexOf('\n', selectionEnd);
      if (lineEnd === -1) lineEnd = currentVal.length;

      const selectedBlock = currentVal.substring(lineStart, lineEnd);
      const lines = selectedBlock.split('\n');

      if (isShift) {
        // Outdent (remove up to 4 leading spaces or 2 spaces or tab)
        const outdentedLines = lines.map((line) => {
          if (line.startsWith('    ')) return line.substring(4);
          if (line.startsWith('  ')) return line.substring(2);
          if (line.startsWith('\t')) return line.substring(1);
          if (line.startsWith(' ')) return line.substring(1);
          return line;
        });
        const replacement = outdentedLines.join('\n');
        const diff = selectedBlock.length - replacement.length;

        const nextValue =
          currentVal.substring(0, lineStart) + replacement + currentVal.substring(lineEnd);
        onChange(nextValue);

        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = Math.max(lineStart, selectionStart - (selectedBlock.startsWith(' ') ? 1 : 0));
            textareaRef.current.selectionEnd = Math.max(lineStart, selectionEnd - diff);
          }
        });
      } else {
        // Indent (add 4 spaces)
        const indentedLines = lines.map((line) => '    ' + line);
        const replacement = indentedLines.join('\n');
        const diff = replacement.length - selectedBlock.length;

        const nextValue =
          currentVal.substring(0, lineStart) + replacement + currentVal.substring(lineEnd);
        onChange(nextValue);

        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = selectionStart + 4;
            textareaRef.current.selectionEnd = selectionEnd + diff;
          }
        });
      }
      return;
    }

    // Handle Enter for Word-like auto-numbering and auto-bullet continuation
    if (e.key === 'Enter') {
      const lineStart = currentVal.lastIndexOf('\n', selectionStart - 1) + 1;
      const currentLine = currentVal.substring(lineStart, selectionStart);

      // 1. Numbered List: e.g. "   1. " or "1. "
      const numMatch = currentLine.match(/^(\s*)(\d+)\.\s*(.*)$/);
      if (numMatch) {
        e.preventDefault();
        const indent = numMatch[1];
        const num = parseInt(numMatch[2], 10);
        const content = numMatch[3].trim();

        if (!content) {
          // Empty item - cancel numbering (MS Word behavior)
          if (indent.length >= 4) {
            const replacement = indent.substring(4) + `${num}. `;
            const nextValue =
              currentVal.substring(0, lineStart) + replacement + currentVal.substring(selectionStart);
            onChange(nextValue);
            requestAnimationFrame(() => {
              if (textareaRef.current) {
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
                  lineStart + replacement.length;
              }
            });
          } else {
            // Remove the bullet/number entirely
            const nextValue = currentVal.substring(0, lineStart) + currentVal.substring(selectionStart);
            onChange(nextValue);
            requestAnimationFrame(() => {
              if (textareaRef.current) {
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd = lineStart;
              }
            });
          }
        } else {
          // Continue numbered list with next integer
          const nextNum = num + 1;
          const insert = `\n${indent}${nextNum}. `;
          const nextValue =
            currentVal.substring(0, selectionStart) + insert + currentVal.substring(selectionEnd);
          onChange(nextValue);
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
                selectionStart + insert.length;
            }
          });
        }
        return;
      }

      // 2. Bullet List: e.g. "   • " or "   - " or "   * "
      const bulletMatch = currentLine.match(/^(\s*)([•\-\*])\s*(.*)$/);
      if (bulletMatch) {
        e.preventDefault();
        const indent = bulletMatch[1];
        const bulletChar = '•';
        const content = bulletMatch[3].trim();

        if (!content) {
          // Empty item - cancel bullet (MS Word behavior)
          if (indent.length >= 4) {
            const replacement = indent.substring(4) + `${bulletChar} `;
            const nextValue =
              currentVal.substring(0, lineStart) + replacement + currentVal.substring(selectionStart);
            onChange(nextValue);
            requestAnimationFrame(() => {
              if (textareaRef.current) {
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
                  lineStart + replacement.length;
              }
            });
          } else {
            const nextValue = currentVal.substring(0, lineStart) + currentVal.substring(selectionStart);
            onChange(nextValue);
            requestAnimationFrame(() => {
              if (textareaRef.current) {
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd = lineStart;
              }
            });
          }
        } else {
          // Continue bullet list
          const insert = `\n${indent}${bulletChar} `;
          const nextValue =
            currentVal.substring(0, selectionStart) + insert + currentVal.substring(selectionEnd);
          onChange(nextValue);
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
                selectionStart + insert.length;
            }
          });
        }
        return;
      }
    }
  };

  // Toolbar Actions
  const applyBulletList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value: currentVal } = textarea;
    const lineStart = currentVal.lastIndexOf('\n', selectionStart - 1) + 1;
    let lineEnd = currentVal.indexOf('\n', selectionEnd);
    if (lineEnd === -1) lineEnd = currentVal.length;

    const selectedBlock = currentVal.substring(lineStart, lineEnd);
    const lines = selectedBlock.split('\n');

    const allBulleted = lines.every((l) => /^\s*•\s+/.test(l));

    const updatedLines = lines.map((line) => {
      if (allBulleted) {
        return line.replace(/^(\s*)•\s+/, '$1');
      } else {
        // Strip any existing numbers or dash bullets and add bullet
        const cleaned = line.replace(/^(\s*)(?:\d+\.\s+|[•\-\*]\s+)/, '$1');
        const indentMatch = line.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : '';
        const text = cleaned.trimStart();
        return `${indent}• ${text || ''}`;
      }
    });

    const replacement = updatedLines.join('\n');
    const nextValue =
      currentVal.substring(0, lineStart) + replacement + currentVal.substring(lineEnd);
    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = lineStart;
      textarea.selectionEnd = lineStart + replacement.length;
    });
  };

  const applyNumberedList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value: currentVal } = textarea;
    const lineStart = currentVal.lastIndexOf('\n', selectionStart - 1) + 1;
    let lineEnd = currentVal.indexOf('\n', selectionEnd);
    if (lineEnd === -1) lineEnd = currentVal.length;

    const selectedBlock = currentVal.substring(lineStart, lineEnd);
    const lines = selectedBlock.split('\n');

    const allNumbered = lines.every((l) => /^\s*\d+\.\s+/.test(l));

    let counter = 1;
    const updatedLines = lines.map((line) => {
      if (allNumbered) {
        return line.replace(/^(\s*)\d+\.\s+/, '$1');
      } else {
        const cleaned = line.replace(/^(\s*)(?:\d+\.\s+|[•\-\*]\s+)/, '$1');
        const indentMatch = line.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : '';
        const text = cleaned.trimStart();
        const res = `${indent}${counter}. ${text || ''}`;
        counter++;
        return res;
      }
    });

    const replacement = updatedLines.join('\n');
    const nextValue =
      currentVal.substring(0, lineStart) + replacement + currentVal.substring(lineEnd);
    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = lineStart;
      textarea.selectionEnd = lineStart + replacement.length;
    });
  };

  const applyIndent = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value: currentVal } = textarea;
    const lineStart = currentVal.lastIndexOf('\n', selectionStart - 1) + 1;
    let lineEnd = currentVal.indexOf('\n', selectionEnd);
    if (lineEnd === -1) lineEnd = currentVal.length;

    const selectedBlock = currentVal.substring(lineStart, lineEnd);
    const lines = selectedBlock.split('\n');
    const indentedLines = lines.map((l) => '    ' + l);
    const replacement = indentedLines.join('\n');

    const nextValue =
      currentVal.substring(0, lineStart) + replacement + currentVal.substring(lineEnd);
    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = selectionStart + 4;
      textarea.selectionEnd = selectionEnd + (replacement.length - selectedBlock.length);
    });
  };

  const applyOutdent = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value: currentVal } = textarea;
    const lineStart = currentVal.lastIndexOf('\n', selectionStart - 1) + 1;
    let lineEnd = currentVal.indexOf('\n', selectionEnd);
    if (lineEnd === -1) lineEnd = currentVal.length;

    const selectedBlock = currentVal.substring(lineStart, lineEnd);
    const lines = selectedBlock.split('\n');
    const outdentedLines = lines.map((line) => {
      if (line.startsWith('    ')) return line.substring(4);
      if (line.startsWith('  ')) return line.substring(2);
      if (line.startsWith('\t')) return line.substring(1);
      if (line.startsWith(' ')) return line.substring(1);
      return line;
    });
    const replacement = outdentedLines.join('\n');

    const nextValue =
      currentVal.substring(0, lineStart) + replacement + currentVal.substring(lineEnd);
    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = Math.max(lineStart, selectionStart - 4);
      textarea.selectionEnd = Math.max(lineStart, selectionEnd - (selectedBlock.length - replacement.length));
    });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between flex-wrap gap-1">
        <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>{label}</span>
        </label>
        {badgeText && (
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
            {badgeText}
          </span>
        )}
      </div>

      {/* MS Word Style Toolbar & Editor Card */}
      <div className="rounded-xl border border-slate-300 dark:border-zinc-800 bg-slate-50 dark:bg-[#09090b] overflow-hidden focus-within:border-indigo-500 transition-colors">
        {/* Formatting Toolbar */}
        <div className="px-2.5 py-1.5 bg-slate-100 dark:bg-[#121214] border-b border-slate-200 dark:border-zinc-800/80 flex items-center justify-between flex-wrap gap-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={applyNumberedList}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              title="Numbered List (1, 2, 3...) — Auto-increments on Enter"
            >
              <ListOrdered className="w-3.5 h-3.5 text-indigo-500" />
              <span>Numbered</span>
            </button>

            <button
              type="button"
              onClick={applyBulletList}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              title="Bullet List (•) — Continues on Enter"
            >
              <List className="w-3.5 h-3.5 text-indigo-500" />
              <span>Bullets</span>
            </button>

            <div className="w-px h-4 bg-slate-300 dark:bg-zinc-700 mx-1" />

            <button
              type="button"
              onClick={applyIndent}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              title="Increase Indent (Tab) — Indent current or selected lines"
            >
              <Indent className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span className="hidden sm:inline">Indent</span>
            </button>

            <button
              type="button"
              onClick={applyOutdent}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              title="Decrease Indent (Shift+Tab) — Outdent current or selected lines"
            >
              <Outdent className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span className="hidden sm:inline">Outdent</span>
            </button>
          </div>

          <div className="text-[10px] text-slate-400 dark:text-zinc-500 hidden md:flex items-center gap-2">
            <span>Enter = Next Item</span>
            <span>•</span>
            <span>Tab = Indent</span>
            <span>•</span>
            <span>Shift+Tab = Outdent</span>
          </div>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 bg-transparent border-0 text-xs font-mono text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-0 resize-y leading-relaxed"
        />
      </div>

      {helperText && (
        <p className="text-[11px] text-slate-500 dark:text-zinc-400">
          {helperText}
        </p>
      )}
    </div>
  );
};
