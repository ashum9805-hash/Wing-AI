import React, { useMemo } from 'react';
import { Sparkles, Globe } from 'lucide-react';
import { UserAuthProfile } from '../types';

interface IntroductoryHeroProps {
  user: UserAuthProfile | null;
  hasToken: boolean;
  sessionId?: string;
  onOpenVoice?: () => void;
  onOpenLive?: () => void;
  onSelectPrompt?: (prompt: string) => void;
}

interface PreservedPhrase {
  title: (name?: string) => string;
  subtitle: string;
}

const PRESERVED_PHRASES: PreservedPhrase[] = [
  {
    title: (name?: string) => (name ? `Hello, ${name}` : 'Hello there'),
    subtitle: 'Tell Wing what you need drafted, scheduled, or dispatched on command.',
  },
  {
    title: () => 'Got any ideas?',
    subtitle: 'Give Wing an order with your exact specifications, and send on your command.',
  },
  {
    title: () => 'Where should we start?',
    subtitle: 'Draft emails according to your specifications or coordinate your agenda.',
  },
  {
    title: (name?: string) => (name ? `Ready when you are, ${name}` : 'Ready when you are'),
    subtitle: 'State your order clearly or use voice to dictate your communications.',
  },
  {
    title: () => 'What would you like to accomplish?',
    subtitle: 'Draft, refine, and dispatch emails directly through your authenticated Gmail.',
  },
  {
    title: () => 'How can I help you today?',
    subtitle: 'Your autonomous executive assistant is calibrated and awaiting direct orders.',
  },
  {
    title: () => 'Standing by for your directive',
    subtitle: 'Wing executes email drafts according to your specifications and dispatches on your word.',
  },
  {
    title: () => 'At your service',
    subtitle: 'All communication channels and Gmail dispatch systems are operational.',
  },
];

export const IntroductoryHero: React.FC<IntroductoryHeroProps> = ({
  user,
  sessionId = '',
  onOpenLive,
}) => {
  const firstName = user?.displayName ? user.displayName.split(' ')[0] : undefined;

  // Whenever a person moves around new chats or opens another new chat (sessionId changes),
  // pick a preserved phrase dynamically
  const phrase = useMemo(() => {
    if (!sessionId) {
      return PRESERVED_PHRASES[0];
    }
    let hash = 0;
    for (let i = 0; i < sessionId.length; i++) {
      hash = (hash * 31 + sessionId.charCodeAt(i)) % PRESERVED_PHRASES.length;
    }
    const idx = Math.abs(hash) % PRESERVED_PHRASES.length;
    return PRESERVED_PHRASES[idx];
  }, [sessionId]);

  const titleText = phrase.title(firstName);

  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-28 text-center select-none animate-in fade-in duration-300">
      {/* AI Logo / Emblem */}
      <div className="relative mb-6 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-indigo-600 shadow-2xl shadow-cyan-500/25 ring-1 ring-cyan-400/40">
        <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500 border-2 border-slate-950"></span>
        </span>
      </div>

      {/* Main Title Phrase (Gemini style) */}
      <h2 className="text-3xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent px-4">
        {titleText}
      </h2>

      {/* Subtle Supporting Subtitle */}
      <p className="mt-3.5 max-w-lg text-sm sm:text-base text-slate-400 font-normal leading-relaxed px-4">
        {phrase.subtitle}
      </p>

      {/* Live Voice Mode Banner CTA */}
      {onOpenLive && (
        <div className="mt-6">
          <button
            onClick={onOpenLive}
            className="inline-flex items-center gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-950/40 px-4 py-2 text-xs font-semibold text-cyan-300 shadow-lg shadow-cyan-950/50 hover:bg-cyan-900/40 hover:border-cyan-400/50 transition cursor-pointer group"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
            </span>
            <Globe className="h-3.5 w-3.5 text-cyan-400" />
            <span>Launch Gemini Live Mode (🌐)</span>
          </button>
        </div>
      )}
    </div>
  );
};
