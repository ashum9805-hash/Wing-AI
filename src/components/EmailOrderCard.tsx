import React, { useState } from 'react';
import {
  Send,
  Save,
  CheckCircle2,
  Clock,
  Sparkles,
  Edit3,
  User,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  MailCheck,
} from 'lucide-react';
import { EmailDraft } from '../types';

interface EmailOrderCardProps {
  draft: EmailDraft;
  onSendCommand: (draft: EmailDraft) => void;
  onSaveToDrafts: (draft: EmailDraft) => void;
  onRefineDraft: (draftId: string, instruction: string) => void;
  onUpdateDraftContent: (updatedDraft: EmailDraft) => void;
  isSending?: boolean;
}

export const EmailOrderCard: React.FC<EmailOrderCardProps> = ({
  draft,
  onSendCommand,
  onSaveToDrafts,
  onRefineDraft,
  onUpdateDraftContent,
  isSending = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editSubject, setEditSubject] = useState(draft.subject);
  const [editBody, setEditBody] = useState(draft.body);
  const [editTo, setEditTo] = useState(draft.to);
  const [showSpecs, setShowSpecs] = useState(true);

  const handleSaveEdit = () => {
    onUpdateDraftContent({
      ...draft,
      to: editTo,
      subject: editSubject,
      body: editBody,
    });
    setIsEditing(false);
  };

  const isSent = draft.status === 'sent';
  const isGmailDraft = !!draft.gmailDraftId && !isSent;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl shadow-cyan-950/20 ring-1 ring-slate-800/80 transition-all">
      {/* Top Banner & Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-950/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/60">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
            Order: Email Specification
          </span>
        </div>

        <div>
          {isSent ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/80 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-800/60">
              <MailCheck className="h-3.5 w-3.5" /> Dispatched via Gmail
            </span>
          ) : isGmailDraft ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-950/80 px-2.5 py-0.5 text-xs font-semibold text-sky-300 border border-sky-800/60">
              <Check className="h-3.5 w-3.5" /> Saved in Gmail Drafts
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-950/80 px-2.5 py-0.5 text-xs font-semibold text-amber-300 border border-amber-800/60">
              <Clock className="h-3.5 w-3.5" /> Ready for your command to send
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Recipient & Subject Header */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-950/60 border border-slate-800/70 p-3">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
              <User className="h-3 w-3 text-cyan-400" /> Recipient
            </div>
            {isEditing ? (
              <input
                type="email"
                value={editTo}
                onChange={(e) => setEditTo(e.target.value)}
                className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                placeholder="recipient@example.com"
              />
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-slate-200 text-sm">
                  {draft.recipientName || 'Recipient'}
                </span>
                {draft.relationship && (
                  <span className="rounded bg-cyan-950 px-1.5 py-0.5 text-[10px] font-medium text-cyan-300 border border-cyan-800/50">
                    {draft.relationship}
                  </span>
                )}
                <span className="text-xs text-slate-400 font-mono">
                  &lt;{draft.to}&gt;
                </span>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-slate-950/60 border border-slate-800/70 p-3">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1">
              Subject Line
            </div>
            {isEditing ? (
              <input
                type="text"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            ) : (
              <p className="font-medium text-slate-200 text-sm truncate">
                {draft.subject}
              </p>
            )}
          </div>
        </div>

        {/* Specifications Verified */}
        {draft.specifications && draft.specifications.length > 0 && (
          <div className="rounded-xl bg-cyan-950/30 border border-cyan-900/40 p-3">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowSpecs(!showSpecs)}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                <span>Orders Fulfilled ({draft.specifications.length} specifications)</span>
                {draft.tone && (
                  <span className="ml-2 rounded-full bg-cyan-900/60 px-2 py-0.5 text-[10px] text-cyan-200">
                    Tone: {draft.tone}
                  </span>
                )}
              </div>
              <button className="text-cyan-400 hover:text-cyan-200">
                {showSpecs ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>

            {showSpecs && (
              <ul className="mt-2.5 grid gap-1 sm:grid-cols-2 text-xs text-slate-300">
                {draft.specifications.map((spec, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-cyan-400 font-bold">✓</span>
                    <span>{spec}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Draft Body Content */}
        <div className="relative rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Message Preview
            </span>
            {!isSent && (
              <button
                onClick={() => {
                  if (isEditing) handleSaveEdit();
                  else setIsEditing(true);
                }}
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition"
              >
                <Edit3 className="h-3 w-3" />
                <span>{isEditing ? 'Done Editing' : 'Edit In-Place'}</span>
              </button>
            )}
          </div>

          {isEditing ? (
            <textarea
              rows={6}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 p-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-sans leading-relaxed"
            />
          ) : (
            <div className="whitespace-pre-wrap text-sm text-slate-200 font-sans leading-relaxed">
              {draft.body}
            </div>
          )}
        </div>

        {/* Quick AI Refinements (when not sent) */}
        {!isSent && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-1">
              <Sparkles className="h-3 w-3 text-cyan-400" /> Refine with Wing:
            </span>
            <button
              onClick={() => onRefineDraft(draft.id, 'Make the tone more casual and friendly')}
              className="rounded-full bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              More Casual
            </button>
            <button
              onClick={() => onRefineDraft(draft.id, 'Make the email more concise and direct')}
              className="rounded-full bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              Make Shorter
            </button>
            <button
              onClick={() => onRefineDraft(draft.id, 'Polish with an executive professional tone')}
              className="rounded-full bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              More Formal
            </button>
          </div>
        )}

        {/* Action / Execution Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
          <div className="text-xs text-slate-400">
            {isSent ? (
              <span className="text-emerald-400 font-medium">
                Sent successfully at {new Date(draft.sentAt || draft.createdAt).toLocaleTimeString()}
              </span>
            ) : (
              <span>Say "Send it" or click below on your command</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isSent && (
              <>
                <button
                  onClick={() => onSaveToDrafts(draft)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
                  title="Save draft directly to your Gmail account"
                >
                  <Save className="h-3.5 w-3.5 text-sky-400" />
                  <span>Save Draft</span>
                </button>

                <button
                  onClick={() => onSendCommand(draft)}
                  disabled={isSending}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 transition hover:from-cyan-500 hover:to-sky-500 active:scale-95 disabled:opacity-50"
                >
                  <Send className={`h-3.5 w-3.5 ${isSending ? 'animate-bounce' : ''}`} />
                  <span>{isSending ? 'Dispatching...' : 'Send on My Command'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
