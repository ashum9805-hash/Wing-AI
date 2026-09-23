import React from 'react';
import { Sparkles, User, CheckCircle2, Clock, Mail } from 'lucide-react';
import { ChatMessage, EmailDraft, WorkspaceArtifact } from '../types';
import { EmailOrderCard } from './EmailOrderCard';
import { WorkspaceOrderCard } from './WorkspaceOrderCard';

interface ChatMessageItemProps {
  message: ChatMessage;
  onSendCommand: (draft: EmailDraft) => void;
  onSaveToDrafts: (draft: EmailDraft) => void;
  onRefineDraft: (draftId: string, instruction: string) => void;
  onUpdateDraftContent: (draft: EmailDraft) => void;
  onExecuteWorkspaceAction?: (
    type: 'doc' | 'sheet' | 'slides' | 'event',
    payload: any
  ) => Promise<WorkspaceArtifact | null>;
  isSending?: boolean;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onSendCommand,
  onSaveToDrafts,
  onRefineDraft,
  onUpdateDraftContent,
  onExecuteWorkspaceAction,
  isSending = false,
}) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full gap-3 py-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-sky-500 text-white shadow-md shadow-cyan-600/20 ring-1 ring-cyan-400/40">
          <Sparkles className="h-4 w-4" />
        </div>
      )}

      {/* Message Body & Interactive Cards */}
      <div className={`flex max-w-3xl flex-col space-y-2.5 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Text bubble */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
              : 'border border-slate-800 bg-slate-900/90 text-slate-200 shadow-sm'
          }`}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>

        {/* Interactive Email Order Card if attached */}
        {message.orderAction?.emailDraft && (
          <div className="w-full min-w-[300px] sm:min-w-[500px]">
            <EmailOrderCard
              draft={message.orderAction.emailDraft}
              onSendCommand={onSendCommand}
              onSaveToDrafts={onSaveToDrafts}
              onRefineDraft={onRefineDraft}
              onUpdateDraftContent={onUpdateDraftContent}
              isSending={isSending}
            />
          </div>
        )}

        {/* Google Workspace Order Card (Docs, Sheets, Slides, Calendar) */}
        {message.orderAction &&
          (message.orderAction.googleDoc ||
            message.orderAction.googleSheet ||
            message.orderAction.googleSlides ||
            message.orderAction.calendarEvent ||
            message.orderAction.workspaceArtifact) &&
          onExecuteWorkspaceAction && (
            <div className="w-full min-w-[300px] sm:min-w-[500px]">
              <WorkspaceOrderCard
                orderAction={message.orderAction}
                onExecuteWorkspaceAction={onExecuteWorkspaceAction}
              />
            </div>
          )}

        {/* Task Items list if attached */}
        {message.orderAction?.tasks && message.orderAction.tasks.length > 0 && (
          <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
              <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              <span>Orders Logged to Tasks</span>
            </div>
            <div className="space-y-1.5">
              {message.orderAction.tasks.map((task, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg bg-slate-950/60 p-2 text-xs text-slate-200 border border-slate-800/60"
                >
                  <span className="text-cyan-400 font-bold">✓</span>
                  <span className="font-medium">{task.title}</span>
                  {task.dueDate && (
                    <span className="ml-auto text-[10px] text-slate-400">
                      Due: {task.dueDate}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-slate-500">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
};
