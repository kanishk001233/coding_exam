import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react';

export type ModalType = 'info' | 'warning' | 'error' | 'success' | 'confirm';

export interface ModalDialogProps {
  isOpen: boolean;
  type?: ModalType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export const ModalDialog: React.FC<ModalDialogProps> = ({
  isOpen,
  type = 'info',
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false,
  loadingText = 'Submitting...',
  onConfirm,
  onCancel,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (isLoading) return;
    if (onConfirm) onConfirm();
    if (onClose && !isLoading) onClose();
  };

  const handleCancel = () => {
    if (isLoading) return;
    if (onCancel) onCancel();
    if (onClose) onClose();
  };

  const renderIcon = () => {
    if (isLoading) {
      return <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />;
    }
    switch (type) {
      case 'warning':
      case 'confirm':
        return <AlertTriangle className={`w-6 h-6 ${isDestructive ? 'text-rose-500' : 'text-amber-500'}`} />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-rose-500" />;
      case 'success':
        return <CheckCircle2 className="w-6 h-6 text-emerald-500" />;
      case 'info':
      default:
        return <Info className="w-6 h-6 text-indigo-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
            {renderIcon()}
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              {title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="space-y-0.5 flex-1">
              <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                {loadingText}
              </p>
              <div className="w-full bg-indigo-200 dark:bg-indigo-900 rounded-full h-1 overflow-hidden">
                <div className="bg-indigo-600 dark:bg-indigo-400 h-1 rounded-full animate-pulse w-full"></div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          {(type === 'confirm' || onCancel) && (
            <button
              type="button"
              disabled={isLoading}
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            disabled={isLoading}
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
