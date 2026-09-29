import React, { useState, useRef } from 'react';
import { uploadQuestionImage } from '../lib/storageHelper';
import { Image as ImageIcon, Upload, Trash2, ExternalLink, Loader2, Link, Check, AlertCircle } from 'lucide-react';

interface QuestionMediaUploadProps {
  imageUrl?: string;
  onChange: (url: string) => void;
  label?: string;
  helperText?: string;
}

export const QuestionMediaUpload: React.FC<QuestionMediaUploadProps> = ({
  imageUrl = '',
  onChange,
  label = 'Problem Diagram / Image / GIF (Optional)',
  helperText = 'Upload a diagram, flowchart, or animated GIF to Supabase "images" bucket, or enter a direct URL.',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [manualUrl, setManualUrl] = useState(imageUrl);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File) => {
    setUploadError(null);
    setIsUploading(true);

    try {
      const res = await uploadQuestionImage(file);
      if (res.success && res.url) {
        onChange(res.url);
        setManualUrl(res.url);
      } else {
        setUploadError(res.error || 'Upload failed. Please try again.');
      }
    } catch (err: any) {
      setUploadError(err.message || 'An unexpected error occurred during upload.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleApplyManualUrl = () => {
    onChange(manualUrl.trim());
    setShowUrlInput(false);
  };

  const handleRemove = () => {
    onChange('');
    setManualUrl('');
    setUploadError(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
          <span>{label}</span>
        </label>

        <button
          type="button"
          onClick={() => {
            setManualUrl(imageUrl);
            setShowUrlInput(!showUrlInput);
          }}
          className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Link className="w-3 h-3" />
          <span>{showUrlInput ? 'Hide URL Input' : 'Paste Image/GIF URL'}</span>
        </button>
      </div>

      {showUrlInput && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://example.com/diagram.gif or https://...supabase.co/.../image.png"
              className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
            <button
              type="button"
              onClick={handleApplyManualUrl}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileChange(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {imageUrl ? (
        /* Preview with Remove action */
        <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-16 h-16 rounded-lg bg-slate-900/10 dark:bg-black/40 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden shrink-0 group relative">
              <img
                src={imageUrl}
                alt="Question Diagram Preview"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23f43f5e" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
                }}
              />
            </div>

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Media Attached
                </span>
                <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-bold uppercase">
                  {imageUrl.endsWith('.gif') || imageUrl.includes('.gif') ? 'GIF Animation' : 'Image Diagram'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-sm sm:max-w-md font-mono" title={imageUrl}>
                {imageUrl}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Open full image in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="text-[11px]">View Full</span>
            </a>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 hover:bg-indigo-200 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Replace image"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="text-[11px]">Change</span>
            </button>

            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Remove attached image"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[11px]">Remove</span>
            </button>
          </div>
        </div>
      ) : (
        /* Drag & Drop Upload Zone */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40'
              : 'border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-slate-100/50 dark:hover:bg-slate-900/50'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Uploading to Supabase "images" bucket...
              </span>
              <span className="text-[10px] text-slate-500">Please wait a moment</span>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Upload className="w-5 h-5" />
              </div>

              <div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                  Click to upload image or GIF
                </span>{' '}
                <span className="text-xs text-slate-500 dark:text-slate-400">or drag and drop</span>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  PNG, JPG, GIF, WebP, SVG (Max 15MB) • Uploaded directly to Supabase storage
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {uploadError && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {!imageUrl && !uploadError && helperText && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {helperText}
        </p>
      )}
    </div>
  );
};
