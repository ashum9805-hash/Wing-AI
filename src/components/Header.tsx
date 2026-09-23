import React from 'react';
import { Sparkles, PanelLeft } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  isProcessing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  isSidebarOpen = true,
  isProcessing = false,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 py-2.5 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Sidebar toggle + Brand */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white transition"
              title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-indigo-500 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/30">
              <Sparkles className="h-4 w-4 text-white" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-slate-950"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white font-sans">
                  Wing
                </h1>
                <span className="hidden sm:inline-block rounded-full bg-cyan-950/80 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-800/60">
                  Autonomous Executive
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Clean, uncluttered right area - status only when processing */}
        {isProcessing && (
          <div className="flex items-center gap-2 rounded-full bg-cyan-950/70 border border-cyan-800/50 px-3 py-1 text-xs text-cyan-300 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>Executing directive...</span>
          </div>
        )}
      </div>
    </header>
  );
};
