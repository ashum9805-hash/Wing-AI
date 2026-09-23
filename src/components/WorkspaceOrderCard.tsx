import React, { useState } from 'react';
import {
  FileText,
  Table,
  Presentation,
  Calendar,
  ExternalLink,
  CheckCircle,
  Loader2,
  Sparkles,
  MapPin,
  Clock,
  Users,
} from 'lucide-react';
import { OrderActionPayload, WorkspaceArtifact } from '../types';

interface WorkspaceOrderCardProps {
  orderAction: OrderActionPayload;
  onExecuteWorkspaceAction: (
    type: 'doc' | 'sheet' | 'slides' | 'event',
    payload: any
  ) => Promise<WorkspaceArtifact | null>;
  isExecuting?: boolean;
}

export const WorkspaceOrderCard: React.FC<WorkspaceOrderCardProps> = ({
  orderAction,
  onExecuteWorkspaceAction,
  isExecuting = false,
}) => {
  const [createdArtifact, setCreatedArtifact] = useState<WorkspaceArtifact | null>(
    orderAction.workspaceArtifact || null
  );
  const [localExecuting, setLocalExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { googleDoc, googleSheet, googleSlides, calendarEvent } = orderAction;

  const handleExecute = async (type: 'doc' | 'sheet' | 'slides' | 'event', payload: any) => {
    try {
      setLocalExecuting(true);
      setError(null);
      const artifact = await onExecuteWorkspaceAction(type, payload);
      if (artifact) {
        setCreatedArtifact(artifact);
      }
    } catch (err: any) {
      setError(err.message || 'Execution failed. Please ensure you are signed in with Google.');
    } finally {
      setLocalExecuting(false);
    }
  };

  const busy = isExecuting || localExecuting;

  // Render Google Doc Card
  if (googleDoc) {
    return (
      <div className="w-full rounded-2xl border border-blue-900/60 bg-slate-900/90 p-4 space-y-3 shadow-lg shadow-blue-950/20">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-950 text-blue-400 border border-blue-800/60">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white tracking-wide uppercase">Google Docs</span>
              <span className="text-[10px] text-slate-400 ml-2">Ready to create</span>
            </div>
          </div>
          {createdArtifact && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-950 border border-emerald-800/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              <CheckCircle className="h-3 w-3" /> Created in Drive
            </span>
          )}
        </div>

        <div>
          <h4 className="text-sm font-bold text-white">{googleDoc.title}</h4>
          <div className="mt-2 max-h-36 overflow-y-auto rounded-xl bg-slate-950/80 p-3 text-xs text-slate-300 font-mono whitespace-pre-wrap border border-slate-800/60">
            {googleDoc.content}
          </div>
        </div>

        {error && <div className="text-xs text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-900/50">{error}</div>}

        <div className="flex items-center justify-between pt-1">
          {createdArtifact ? (
            <a
              href={createdArtifact.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open in Google Docs</span>
            </a>
          ) : (
            <button
              onClick={() => handleExecute('doc', googleDoc)}
              disabled={busy}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:from-blue-500 hover:to-indigo-500 transition disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              <span>{busy ? 'Creating Document...' : 'Create Google Doc'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Render Google Sheet Card
  if (googleSheet) {
    return (
      <div className="w-full rounded-2xl border border-emerald-900/60 bg-slate-900/90 p-4 space-y-3 shadow-lg shadow-emerald-950/20">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/60">
              <Table className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white tracking-wide uppercase">Google Sheets</span>
              <span className="text-[10px] text-slate-400 ml-2">Ready to generate</span>
            </div>
          </div>
          {createdArtifact && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-950 border border-emerald-800/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              <CheckCircle className="h-3 w-3" /> Live Spreadsheet
            </span>
          )}
        </div>

        <div>
          <h4 className="text-sm font-bold text-white">{googleSheet.title}</h4>
          <div className="mt-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
            <table className="w-full text-left text-xs text-slate-300">
              {googleSheet.headers && (
                <thead className="bg-slate-900 text-[11px] font-semibold text-slate-200 border-b border-slate-800">
                  <tr>
                    {googleSheet.headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 border-r border-slate-800 last:border-r-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {googleSheet.rows?.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-slate-800/50 last:border-b-0 hover:bg-slate-900/40">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-1.5 border-r border-slate-800/50 last:border-r-0 text-slate-300">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {error && <div className="text-xs text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-900/50">{error}</div>}

        <div className="flex items-center justify-between pt-1">
          {createdArtifact ? (
            <a
              href={createdArtifact.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open in Google Sheets</span>
            </a>
          ) : (
            <button
              onClick={() => handleExecute('sheet', googleSheet)}
              disabled={busy}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white hover:from-emerald-500 hover:to-teal-500 transition disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Table className="h-3.5 w-3.5" />}
              <span>{busy ? 'Generating Spreadsheet...' : 'Create Google Sheet'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Render Google Slides Card
  if (googleSlides) {
    return (
      <div className="w-full rounded-2xl border border-amber-900/60 bg-slate-900/90 p-4 space-y-3 shadow-lg shadow-amber-950/20">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-950 text-amber-400 border border-amber-800/60">
              <Presentation className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white tracking-wide uppercase">Google Slides</span>
              <span className="text-[10px] text-slate-400 ml-2">Deck outline ready</span>
            </div>
          </div>
          {createdArtifact && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-950 border border-emerald-800/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              <CheckCircle className="h-3 w-3" /> Presentation Created
            </span>
          )}
        </div>

        <div>
          <h4 className="text-sm font-bold text-white">{googleSlides.title}</h4>
          <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
            {googleSlides.slides?.map((slide, idx) => (
              <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">
                <span className="text-[11px] font-semibold text-amber-300">Slide {idx + 1}: {slide.title}</span>
                <ul className="mt-1 list-disc list-inside text-xs text-slate-300 space-y-0.5">
                  {slide.bullets.map((b, bIdx) => (
                    <li key={bIdx}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {error && <div className="text-xs text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-900/50">{error}</div>}

        <div className="flex items-center justify-between pt-1">
          {createdArtifact ? (
            <a
              href={createdArtifact.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500 transition shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open in Google Slides</span>
            </a>
          ) : (
            <button
              onClick={() => handleExecute('slides', googleSlides)}
              disabled={busy}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2 text-xs font-semibold text-white hover:from-amber-500 hover:to-orange-500 transition disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Presentation className="h-3.5 w-3.5" />}
              <span>{busy ? 'Generating Slides...' : 'Create Google Slides'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Render Google Calendar Card
  if (calendarEvent) {
    const startFormatted = new Date(calendarEvent.startDateTime).toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const endFormatted = new Date(calendarEvent.endDateTime).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div className="w-full rounded-2xl border border-cyan-900/60 bg-slate-900/90 p-4 space-y-3 shadow-lg shadow-cyan-950/20">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/60">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white tracking-wide uppercase">Google Calendar</span>
              <span className="text-[10px] text-slate-400 ml-2">Appointment prepared</span>
            </div>
          </div>
          {createdArtifact && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-950 border border-emerald-800/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              <CheckCircle className="h-3 w-3" /> Scheduled on Calendar
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <h4 className="text-sm font-bold text-white">{calendarEvent.summary}</h4>
          <div className="flex items-center gap-2 text-xs text-cyan-300">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{startFormatted} – {endFormatted}</span>
          </div>
          {calendarEvent.location && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{calendarEvent.location}</span>
            </div>
          )}
          {calendarEvent.description && (
            <p className="text-xs text-slate-300 pt-1 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
              {calendarEvent.description}
            </p>
          )}
          {calendarEvent.attendees && calendarEvent.attendees.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
              <Users className="h-3 w-3 text-slate-500" />
              <span>Invitees: {calendarEvent.attendees.join(', ')}</span>
            </div>
          )}
        </div>

        {error && <div className="text-xs text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-900/50">{error}</div>}

        <div className="flex items-center justify-between pt-1">
          {createdArtifact ? (
            <a
              href={createdArtifact.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 transition shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open in Google Calendar</span>
            </a>
          ) : (
            <button
              onClick={() => handleExecute('event', calendarEvent)}
              disabled={busy}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-4 py-2 text-xs font-semibold text-white hover:from-cyan-500 hover:to-sky-500 transition disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
              <span>{busy ? 'Scheduling Event...' : 'Schedule on Google Calendar'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Fallback for general workspace artifact
  if (orderAction.workspaceArtifact) {
    const artifact = orderAction.workspaceArtifact;
    return (
      <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase">{artifact.title}</span>
          </div>
          <a
            href={artifact.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-cyan-400 hover:underline"
          >
            <span>Open</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        {artifact.description && <p className="text-xs text-slate-400">{artifact.description}</p>}
      </div>
    );
  }

  return null;
};
