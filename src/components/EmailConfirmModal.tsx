import React from 'react';
import { AlertTriangle, Send, X, Mail, ShieldAlert } from 'lucide-react';
import { EmailDraft } from '../types';

interface EmailConfirmModalProps {
  isOpen: boolean;
  draft: EmailDraft | null;
  senderEmail?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSending: boolean;
}

export const EmailConfirmModal: React.FC<EmailConfirmModalProps> = ({
  isOpen,
  draft,
  senderEmail,
  onConfirm,
  onCancel,
  isSending,
}) => {
  if (!isOpen || !draft) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-cyan-950/50 ring-1 ring-slate-700/80">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Confirm Email Dispatch
              </h3>
              <p className="text-xs text-slate-400">
                Wing requires your explicit authorization before transmitting this email.
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            disabled={isSending}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Email Summary Details */}
        <div className="my-4 space-y-3">
          <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Sending From:</span>
              <span className="font-mono text-cyan-300 font-semibold truncate max-w-[240px]">
                {senderEmail || 'Your authenticated Gmail'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">To Recipient:</span>
              <span className="font-medium text-white">
                {draft.recipientName} &lt;{draft.to}&gt;
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Subject:</span>
              <span className="font-medium text-slate-200 truncate max-w-[240px]">
                {draft.subject}
              </span>
            </div>
          </div>

          {/* Message excerpt preview */}
          <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/90 p-3 text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
            {draft.body}
          </div>

          <p className="text-[11px] text-amber-300/90 flex items-center gap-1.5 bg-amber-950/30 border border-amber-900/40 p-2.5 rounded-lg">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span>
              This operation will permanently dispatch an email to the recipient on your behalf.
            </span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={isSending}
            className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            Cancel & Keep Draft
          </button>
          <button
            onClick={onConfirm}
            disabled={isSending}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 hover:from-cyan-500 hover:to-sky-500 active:scale-95 disabled:opacity-50 transition"
          >
            <Send className={`h-3.5 w-3.5 ${isSending ? 'animate-spin' : ''}`} />
            <span>{isSending ? 'Transmitting via Gmail...' : 'Confirm & Send Email'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
