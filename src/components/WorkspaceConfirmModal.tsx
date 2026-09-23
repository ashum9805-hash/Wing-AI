import React from 'react';
import { ShieldAlert, Check, X, FileText, Table, Presentation, Calendar } from 'lucide-react';

interface WorkspaceConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  actionType: 'doc' | 'sheet' | 'slides' | 'event';
  title: string;
  details: string;
  isProcessing?: boolean;
}

export const WorkspaceConfirmModal: React.FC<WorkspaceConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  actionType,
  title,
  details,
  isProcessing = false,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (actionType) {
      case 'doc':
        return <FileText className="h-6 w-6 text-blue-400" />;
      case 'sheet':
        return <Table className="h-6 w-6 text-emerald-400" />;
      case 'slides':
        return <Presentation className="h-6 w-6 text-amber-400" />;
      case 'event':
        return <Calendar className="h-6 w-6 text-cyan-400" />;
    }
  };

  const getAppLabel = () => {
    switch (actionType) {
      case 'doc':
        return 'Google Docs';
      case 'sheet':
        return 'Google Sheets';
      case 'slides':
        return 'Google Slides';
      case 'event':
        return 'Google Calendar';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 border border-slate-700">
            {getIcon()}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Create in {getAppLabel()}?</h3>
            <p className="text-xs text-slate-400">Wing needs your explicit confirmation to proceed.</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-1.5">
          <div className="text-xs font-semibold text-slate-200">{title}</div>
          <div className="text-[11px] text-slate-400 leading-relaxed whitespace-pre-wrap">{details}</div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-xl border border-slate-800 bg-slate-800/80 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-5 py-2 text-xs font-semibold text-white hover:bg-cyan-500 transition shadow-md shadow-cyan-600/20 cursor-pointer disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            <span>{isProcessing ? 'Creating...' : `Confirm & Create`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
