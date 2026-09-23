import React, { useState } from 'react';
import {
  X,
  Inbox,
  Users,
  CheckSquare,
  Plus,
  Trash2,
  Send,
  MailCheck,
  Clock,
  ExternalLink,
  UserPlus,
  RefreshCw,
  FolderOpen,
  FileText,
  Table,
  Presentation,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { ContactRecord, EmailDraft, TaskItem, WorkspaceArtifact } from '../types';

interface TaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'orders' | 'contacts' | 'tasks' | 'workspace';
  onChangeTab: (tab: 'orders' | 'contacts' | 'tasks' | 'workspace') => void;
  drafts: EmailDraft[];
  contacts: ContactRecord[];
  tasks: TaskItem[];
  workspaceArtifacts?: WorkspaceArtifact[];
  onSelectDraft: (draft: EmailDraft) => void;
  onAddContact: (contact: Omit<ContactRecord, 'id'>) => void;
  onDeleteContact: (id: string) => void;
  onToggleTask: (id: string) => void;
  onAddTask: (title: string, category?: string) => void;
  onSyncGoogleContacts?: () => void;
  isSyncingContacts?: boolean;
  onSyncWorkspaceFiles?: () => void;
  isSyncingWorkspace?: boolean;
  onQuickOrder?: (prompt: string) => void;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onChangeTab,
  drafts,
  contacts,
  tasks,
  workspaceArtifacts = [],
  onSelectDraft,
  onAddContact,
  onDeleteContact,
  onToggleTask,
  onAddTask,
  onSyncGoogleContacts,
  isSyncingContacts = false,
  onSyncWorkspaceFiles,
  isSyncingWorkspace = false,
  onQuickOrder,
}) => {
  // New contact form state
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactRelation, setNewContactRelation] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);

  // New task input state
  const [newTaskInput, setNewTaskInput] = useState('');

  if (!isOpen) return null;

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName || !newContactEmail) return;
    onAddContact({
      name: newContactName,
      email: newContactEmail,
      relationship: newContactRelation || undefined,
    });
    setNewContactName('');
    setNewContactEmail('');
    setNewContactRelation('');
    setShowAddContact(false);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    onAddTask(newTaskInput.trim());
    setNewTaskInput('');
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/60">
              <Inbox className="h-4 w-4" />
            </span>
            <h2 className="text-base font-bold text-white">Assistant Hub</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-2">
          <button
            onClick={() => onChangeTab('orders')}
            className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-semibold transition ${
              activeTab === 'orders'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Inbox className="h-3.5 w-3.5" />
            <span>Orders ({drafts.length})</span>
          </button>
          <button
            onClick={() => onChangeTab('contacts')}
            className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-semibold transition ${
              activeTab === 'contacts'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Contacts ({contacts.length})</span>
          </button>
          <button
            onClick={() => onChangeTab('tasks')}
            className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-semibold transition ${
              activeTab === 'tasks'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>Tasks ({tasks.filter((t) => !t.completed).length})</span>
          </button>
          <button
            onClick={() => onChangeTab('workspace')}
            className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-semibold transition ${
              activeTab === 'workspace'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span>Workspace</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* TAB 1: ORDERS & EMAILS */}
          {activeTab === 'orders' && (
            <div className="space-y-3">
              {drafts.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No orders generated yet. Order Wing to draft an email (e.g. "Draft an email for my brother...") to begin.
                </div>
              ) : (
                drafts.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => onSelectDraft(d)}
                    className="group cursor-pointer rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 transition hover:border-cyan-800/80 hover:bg-slate-950"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-white">
                          {d.recipientName}
                        </span>
                        {d.relationship && (
                          <span className="rounded bg-cyan-950 px-1.5 py-0.5 text-[9px] font-medium text-cyan-300">
                            {d.relationship}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px]">
                        {d.status === 'sent' ? (
                          <span className="text-emerald-400 flex items-center gap-0.5">
                            <MailCheck className="h-3 w-3" /> Sent
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-0.5">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        )}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-300 truncate">
                      {d.subject}
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                      {d.body}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: CONTACTS & RELATIONS */}
          {activeTab === 'contacts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Wing resolves relationships like "brother" automatically.
                </span>
                <div className="flex items-center gap-1.5">
                  {onSyncGoogleContacts && (
                    <button
                      onClick={onSyncGoogleContacts}
                      disabled={isSyncingContacts}
                      className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-300 hover:text-white"
                      title="Sync from Google Contacts"
                    >
                      <RefreshCw className={`h-3 w-3 ${isSyncingContacts ? 'animate-spin' : ''}`} />
                      <span>Sync</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddContact(!showAddContact)}
                    className="flex items-center gap-1 rounded-lg bg-cyan-600/30 border border-cyan-500/40 px-2.5 py-1 text-xs font-medium text-cyan-300 hover:bg-cyan-600/50"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Add contact form */}
              {showAddContact && (
                <form onSubmit={handleCreateContact} className="rounded-xl border border-slate-700 bg-slate-950 p-3 space-y-2.5">
                  <div className="text-xs font-semibold text-white">Add Known Relation</div>
                  <input
                    type="text"
                    placeholder="Name (e.g., Dave Miller)"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    required
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <input
                    type="email"
                    placeholder="Email (e.g., dave@example.com)"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    required
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <input
                    type="text"
                    placeholder="Relationship / Role (e.g., Brother, Boss, Mom)"
                    value={newContactRelation}
                    onChange={(e) => setNewContactRelation(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddContact(false)}
                      className="rounded-lg px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-cyan-600 px-3 py-1 text-xs font-semibold text-white hover:bg-cyan-500"
                    >
                      Save Relation
                    </button>
                  </div>
                </form>
              )}

              {/* Contacts list */}
              <div className="space-y-2">
                {contacts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-white">{c.name}</span>
                        {c.relationship && (
                          <span className="rounded bg-cyan-950 px-1.5 py-0.2 text-[10px] font-medium text-cyan-300 border border-cyan-800/40">
                            {c.relationship}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">{c.email}</div>
                    </div>
                    <button
                      onClick={() => onDeleteContact(c.id)}
                      className="text-slate-500 hover:text-red-400 p-1 transition"
                      title="Remove contact"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: TASKS & TO-DOS */}
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              <form onSubmit={handleCreateTask} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add quick to-do or reminder..."
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-500 transition"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </form>

              {tasks.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  No tasks tracked yet. Order Wing with "Remind me to..." or add tasks above.
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => onToggleTask(task.id)}
                      className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer transition ${
                        task.completed
                          ? 'border-slate-900 bg-slate-950/40 opacity-60'
                          : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => {}}
                        className="mt-0.5 h-3.5 w-3.5 rounded border-slate-700 text-cyan-600 focus:ring-cyan-500"
                      />
                      <div className="flex-1">
                        <p
                          className={`text-xs ${
                            task.completed ? 'line-through text-slate-500' : 'text-slate-200'
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.dueDate && (
                          <span className="text-[10px] text-cyan-400 mt-0.5 inline-block">
                            Due: {task.dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: GOOGLE WORKSPACE */}
          {activeTab === 'workspace' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Docs, Sheets, Slides, Calendar & Drive.
                </span>
                {onSyncWorkspaceFiles && (
                  <button
                    onClick={onSyncWorkspaceFiles}
                    disabled={isSyncingWorkspace}
                    className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1 text-[11px] font-medium text-cyan-400 hover:border-cyan-800/80 transition cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${isSyncingWorkspace ? 'animate-spin' : ''}`} />
                    <span>Sync Drive</span>
                  </button>
                )}
              </div>

              {/* Quick Directives */}
              {onQuickOrder && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Quick Directives</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => onQuickOrder('Draft an executive briefing memo in Google Docs')}
                      className="flex items-center gap-2 rounded-lg border border-blue-900/40 bg-blue-950/30 p-2 text-left text-xs text-blue-200 hover:bg-blue-900/40 transition cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">New Doc Memo</span>
                    </button>
                    <button
                      onClick={() => onQuickOrder('Create an executive quarterly budget tracker in Google Sheets')}
                      className="flex items-center gap-2 rounded-lg border border-emerald-900/40 bg-emerald-950/30 p-2 text-left text-xs text-emerald-200 hover:bg-emerald-900/40 transition cursor-pointer"
                    >
                      <Table className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">New Sheet</span>
                    </button>
                    <button
                      onClick={() => onQuickOrder('Generate a 3-slide strategy presentation deck in Google Slides')}
                      className="flex items-center gap-2 rounded-lg border border-amber-900/40 bg-amber-950/30 p-2 text-left text-xs text-amber-200 hover:bg-amber-900/40 transition cursor-pointer"
                    >
                      <Presentation className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">New Slide Deck</span>
                    </button>
                    <button
                      onClick={() => onQuickOrder('Schedule a strategy sync meeting on my Google Calendar for tomorrow at 2 PM')}
                      className="flex items-center gap-2 rounded-lg border border-cyan-900/40 bg-cyan-950/30 p-2 text-left text-xs text-cyan-200 hover:bg-cyan-900/40 transition cursor-pointer"
                    >
                      <Calendar className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">Schedule Meeting</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Workspace Artifacts List */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Active Workspace Files ({workspaceArtifacts.length})
                </span>

                {workspaceArtifacts.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-500 rounded-xl border border-dashed border-slate-800 p-4">
                    No Google Workspace files generated in this session yet. Order Wing to create a document, spreadsheet, or slides deck to begin.
                  </div>
                ) : (
                  workspaceArtifacts.map((artifact) => {
                    const getIcon = () => {
                      switch (artifact.type) {
                        case 'doc':
                          return <FileText className="h-4 w-4 text-blue-400" />;
                        case 'sheet':
                          return <Table className="h-4 w-4 text-emerald-400" />;
                        case 'slides':
                          return <Presentation className="h-4 w-4 text-amber-400" />;
                        case 'event':
                          return <Calendar className="h-4 w-4 text-cyan-400" />;
                        default:
                          return <FolderOpen className="h-4 w-4 text-slate-400" />;
                      }
                    };

                    return (
                      <div
                        key={artifact.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                            {getIcon()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-200 truncate">{artifact.title}</p>
                            <p className="text-[10px] text-slate-400 truncate">{artifact.description}</p>
                          </div>
                        </div>
                        <a
                          href={artifact.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-cyan-400 hover:bg-slate-700 transition shrink-0"
                        >
                          <span>Open</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
