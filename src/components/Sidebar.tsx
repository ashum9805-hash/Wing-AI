import React, { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  Inbox,
  Users,
  CheckSquare,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Check,
  Command,
  Settings,
  FolderOpen,
} from 'lucide-react';
import { ChatSession, UserAuthProfile } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
  onOpenDrawer: (tab: 'orders' | 'contacts' | 'tasks' | 'workspace') => void;
  onOpenSettings: () => void;
  pendingOrdersCount: number;
  contactsCount: number;
  tasksCount: number;
  workspaceCount?: number;
  user: UserAuthProfile | null;
  hasToken: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onOpenDrawer,
  onOpenSettings,
  pendingOrdersCount,
  contactsCount,
  tasksCount,
  workspaceCount = 0,
  user,
  hasToken,
  onSignIn,
  onSignOut,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExecutiveControlsOpen, setIsExecutiveControlsOpen] = useState(false);

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-800/80 bg-slate-950 transition-all duration-300 ease-in-out md:static ${
          isOpen ? 'w-72 translate-x-0' : '-translate-x-full md:w-0 md:translate-x-0 md:overflow-hidden md:border-r-0'
        }`}
      >
        {/* Brand & New Chat Bar */}
        <div className="flex flex-col border-b border-slate-800/80 p-4">
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-sky-500 text-white shadow-md shadow-cyan-600/30 ring-1 ring-cyan-400/40">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-white tracking-wide">
                  Wing
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-cyan-400">
                  Autonomous Executive
                </span>
              </div>
            </div>

            <button
              onClick={onToggle}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-white transition md:hidden"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* New Chat / Order Button */}
          <button
            onClick={onNewSession}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-md shadow-cyan-600/20 hover:from-cyan-500 hover:to-sky-500 active:scale-98 transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Direct Order</span>
          </button>
        </div>

        {/* Quick Hub Navigation - Collapsible Accordion */}
        <div className="px-3 pt-2.5 pb-2 border-b border-slate-800/60">
          <button
            type="button"
            onClick={() => setIsExecutiveControlsOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-slate-300 hover:text-white hover:bg-slate-900/60 transition group cursor-pointer"
            title={isExecutiveControlsOpen ? 'Collapse executive controls' : 'Expand executive controls'}
          >
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 group-hover:text-cyan-300 transition">
                Executive Controls
              </span>
              {pendingOrdersCount > 0 && !isExecutiveControlsOpen && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-slate-950">
                  {pendingOrdersCount}
                </span>
              )}
            </div>
            <ChevronDown
              className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 group-hover:text-slate-200 ${
                isExecutiveControlsOpen ? 'rotate-180 text-cyan-400' : 'rotate-0'
              }`}
            />
          </button>

          {/* Collapsible Dropdown Content */}
          {isExecutiveControlsOpen && (
            <div className="mt-1 space-y-1 pl-1 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
              <button
                onClick={() => onOpenDrawer('orders')}
                className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-900 hover:text-white transition group"
              >
                <span className="flex items-center gap-2">
                  <Inbox className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Orders & Drafts</span>
                </span>
                {pendingOrdersCount > 0 ? (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-slate-950">
                    {pendingOrdersCount}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">0</span>
                )}
              </button>

              <button
                onClick={() => onOpenDrawer('contacts')}
                className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-900 hover:text-white transition group"
              >
                <span className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-sky-400" />
                  <span>Contacts & Relations</span>
                </span>
                <span className="text-[10px] text-slate-400">{contactsCount}</span>
              </button>

              <button
                onClick={() => onOpenDrawer('tasks')}
                className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-900 hover:text-white transition group"
              >
                <span className="flex items-center gap-2">
                  <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Action Directives</span>
                </span>
                <span className="text-[10px] text-slate-400">{tasksCount}</span>
              </button>

              <button
                onClick={() => onOpenDrawer('workspace')}
                className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-900 hover:text-white transition group"
              >
                <span className="flex items-center gap-2">
                  <FolderOpen className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Google Workspace</span>
                </span>
                <span className="text-[10px] text-slate-400">{workspaceCount}</span>
              </button>
            </div>
          )}
        </div>

        {/* Search Session Filter */}
        {sessions.length > 2 && (
          <div className="px-3 pt-3 pb-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg bg-slate-900/80 border border-slate-800 py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>
        )}

        {/* Sessions / Chat History List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
            <span>Recent Orders</span>
            <span>{filteredSessions.length}</span>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="px-2 py-4 text-center text-xs text-slate-400">
              No orders found
            </div>
          ) : (
            filteredSessions.map((s) => {
              const isActive = s.id === activeSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => onSelectSession(s.id)}
                  className={`group relative flex items-center justify-between rounded-xl px-2.5 py-2 text-xs cursor-pointer transition ${
                    isActive
                      ? 'bg-slate-900 text-cyan-300 font-medium border border-cyan-800/40'
                      : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden pr-2">
                    <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span className="truncate">{s.title || 'Untitled Order'}</span>
                  </div>

                  {sessions.length > 1 && (
                    <button
                      onClick={(e) => onDeleteSession(s.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition rounded"
                      title="Delete thread"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom User Profile, Sign-In & Settings */}
        <div className="border-t border-slate-800/80 p-3 bg-slate-950/60">
          {user && hasToken ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 overflow-hidden flex-1 rounded-xl bg-slate-900/70 p-2 border border-slate-800/80">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="h-7 w-7 rounded-lg object-cover ring-1 ring-slate-700 shrink-0"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-700 text-xs font-bold text-white shrink-0">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col overflow-hidden min-w-0">
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    {user.displayName}
                  </span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 truncate">
                    <Check className="h-2.5 w-2.5 shrink-0" /> Gmail Ready
                  </span>
                </div>
              </div>

              {/* Sign out button */}
              <button
                onClick={onSignOut}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-red-400 transition"
                title="Sign out from Google"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>

              {/* Settings gear icon on bottom right corner */}
              <button
                onClick={onOpenSettings}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-cyan-400 transition"
                title="Settings & Personalization"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Sign-in button on bottom left corner */}
              <button
                onClick={onSignIn}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition overflow-hidden"
                title="Sign in with Google"
              >
                <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span className="truncate">Sign In</span>
              </button>

              {/* Gear icon right next to it in bottom right corner */}
              <button
                onClick={onOpenSettings}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-cyan-400 transition"
                title="Settings & Personalization"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
