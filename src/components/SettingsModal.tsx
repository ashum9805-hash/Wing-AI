import React, { useState } from 'react';
import {
  X,
  Settings,
  Brain,
  Sliders,
  Plus,
  Trash2,
  Check,
  Shield,
  Sparkles,
  RefreshCw,
  Download,
  Mail,
  User,
  ChevronDown,
  Database,
  Lock,
  Volume2,
} from 'lucide-react';
import { PersonalizationSettings, AIMemoryItem, UserAuthProfile } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PersonalizationSettings;
  onSaveSettings: (settings: PersonalizationSettings) => void;
  user: UserAuthProfile | null;
  hasToken: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

type SettingCategory = 'personalization' | 'safety' | 'account' | 'backup';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  user,
  hasToken,
  onSignIn,
  onSignOut,
}) => {
  // Store which accordion categories are currently open. Default 'personalization' open.
  const [openCategories, setOpenCategories] = useState<Record<SettingCategory, boolean>>({
    personalization: true,
    safety: false,
    account: false,
    backup: false,
  });

  const [currentSettings, setCurrentSettings] = useState<PersonalizationSettings>(settings);
  const [newMemoryText, setNewMemoryText] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState<AIMemoryItem['category']>('rule');
  const [hasSaved, setHasSaved] = useState(false);

  // Sync state if props change when opening
  React.useEffect(() => {
    if (isOpen) {
      setCurrentSettings(settings);
      setHasSaved(false);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const toggleCategory = (cat: SettingCategory) => {
    setOpenCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const handleAddMemory = () => {
    if (!newMemoryText.trim()) return;
    const newMemory: AIMemoryItem = {
      id: 'mem_' + Date.now(),
      text: newMemoryText.trim(),
      category: newMemoryCategory,
      createdAt: new Date().toISOString(),
    };
    const updated = {
      ...currentSettings,
      memories: [newMemory, ...currentSettings.memories],
    };
    setCurrentSettings(updated);
    onSaveSettings(updated);
    setNewMemoryText('');
    triggerSavedFeedback();
  };

  const handleDeleteMemory = (id: string) => {
    const updated = {
      ...currentSettings,
      memories: currentSettings.memories.filter((m) => m.id !== id),
    };
    setCurrentSettings(updated);
    onSaveSettings(updated);
    triggerSavedFeedback();
  };

  const handleUpdate = (patch: Partial<PersonalizationSettings>) => {
    const updated = { ...currentSettings, ...patch };
    setCurrentSettings(updated);
    onSaveSettings(updated);
    triggerSavedFeedback();
  };

  const triggerSavedFeedback = () => {
    setHasSaved(true);
    setTimeout(() => setHasSaved(false), 2000);
  };

  const handleExportData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentSettings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `wing-settings-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all custom memories and instructions back to defaults?')) {
      const defaults: PersonalizationSettings = {
        customInstructions: '',
        tone: 'executive',
        senderSignature: user?.displayName || '',
        memories: [
          {
            id: 'mem_default_1',
            text: 'Keep drafts professional, purposeful, and free of fluff unless specified otherwise.',
            category: 'rule',
            createdAt: new Date().toISOString(),
          },
        ],
        confirmBeforeSend: true,
        autoSaveGmailDrafts: true,
        soundEffects: true,
      };
      setCurrentSettings(defaults);
      onSaveSettings(defaults);
      triggerSavedFeedback();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-3xl max-h-[90vh] rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-cyan-950/40 overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/60 shadow-inner">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Settings
                {hasSaved && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-950/90 border border-emerald-800/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 animate-in fade-in">
                    <Check className="h-3 w-3" /> Auto-saved
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Click any setting below to expand its customizable suboptions
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            title="Close Settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body: Settings listed vertically downwards, expanding their suboptions */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 bg-slate-950/30">
          {/* ============================================================== */}
          {/* OPTION 1: PERSONALIZATION & MEMORIES */}
          {/* ============================================================== */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden transition-all shadow-sm">
            <button
              type="button"
              onClick={() => toggleCategory('personalization')}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-850 transition cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                    openCategories.personalization
                      ? 'bg-gradient-to-br from-cyan-600 to-sky-600 text-white shadow-md shadow-cyan-600/30'
                      : 'bg-slate-800 text-slate-400 group-hover:text-cyan-400'
                  }`}
                >
                  <Brain className="h-5 w-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition">
                      Personalization & Memories
                    </span>
                    {currentSettings.memories.length > 0 && (
                      <span className="rounded-full bg-cyan-950 border border-cyan-800/60 px-2 py-0.2 text-[10px] font-bold text-cyan-300">
                        {currentSettings.memories.length} saved
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 mt-0.5">
                    Manage AI memories, recurring commands, tone, and signature
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="hidden sm:inline text-[11px] text-slate-500 font-medium">
                  {openCategories.personalization ? 'Hide' : 'Customize'}
                </span>
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800/80 text-slate-400 transition-transform duration-200 group-hover:text-white ${
                    openCategories.personalization ? 'rotate-180 text-cyan-400' : 'rotate-0'
                  }`}
                >
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </button>

            {/* Suboptions appear downwards when clicked */}
            {openCategories.personalization && (
              <div className="border-t border-slate-800/80 p-4 sm:p-5 space-y-5 bg-slate-950/40 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Suboption 1: Commands to Remember */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-cyan-400" />
                      <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                        Commands To Always Remember
                      </h4>
                    </div>
                    <span className="text-[10px] rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 px-2 py-0.5">
                      Enforced on all orders
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Type explicit commands or rules that Wing must strictly remember on all tasks:
                  </p>
                  <textarea
                    value={currentSettings.customInstructions}
                    onChange={(e) => handleUpdate({ customInstructions: e.target.value })}
                    placeholder='e.g., "Keep emails under 100 words. Always address recipients directly. When drafting to family, maintain a warm tone. Sign off as Alex."'
                    rows={3}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 leading-relaxed"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-500 self-center mr-1">Quick add:</span>
                    {[
                      'Keep emails under 120 words',
                      'Always use bullet points for action items',
                      'Keep tone crisp and direct',
                      'Include clear next steps',
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          const current = currentSettings.customInstructions.trim();
                          const next = current ? `${current}\n- ${chip}` : `- ${chip}`;
                          handleUpdate({ customInstructions: next });
                        }}
                        className="rounded-lg bg-slate-800/80 border border-slate-700/60 px-2 py-1 text-[10px] text-slate-300 hover:border-cyan-500/50 hover:text-white transition cursor-pointer"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Suboption 2: AI Memory Vault */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                        <Database className="h-3.5 w-3.5 text-indigo-400" />
                        AI Memory Vault
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Specific facts or relationships Wing preserves across all conversations
                      </p>
                    </div>
                    <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2.5 py-0.5 rounded-md">
                      {currentSettings.memories.length} stored
                    </span>
                  </div>

                  {/* Add memory input */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={newMemoryCategory}
                      onChange={(e) => setNewMemoryCategory(e.target.value as any)}
                      className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="rule">Rule</option>
                      <option value="contact">Contact/Person</option>
                      <option value="preference">Preference</option>
                      <option value="general">Fact</option>
                    </select>
                    <input
                      type="text"
                      value={newMemoryText}
                      onChange={(e) => setNewMemoryText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddMemory()}
                      placeholder='Add a memory (e.g. "My brother Dave works in Chicago")'
                      className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddMemory}
                      disabled={!newMemoryText.trim()}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-40 transition shrink-0 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Remember</span>
                    </button>
                  </div>

                  {/* Memories list */}
                  <div className="space-y-2 pt-1 max-h-52 overflow-y-auto">
                    {currentSettings.memories.length === 0 ? (
                      <div className="py-5 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                        No custom memories added yet. Add a fact or person above.
                      </div>
                    ) : (
                      currentSettings.memories.map((memory) => (
                        <div
                          key={memory.id}
                          className="group flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 transition hover:border-slate-700"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                                memory.category === 'rule'
                                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800/50'
                                  : memory.category === 'contact'
                                  ? 'bg-sky-950/80 text-sky-300 border border-sky-800/50'
                                  : memory.category === 'preference'
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {memory.category}
                            </span>
                            <span className="text-xs text-slate-200 leading-tight">{memory.text}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteMemory(memory.id)}
                            className="text-slate-500 hover:text-red-400 p-1 rounded-lg opacity-60 group-hover:opacity-100 transition cursor-pointer"
                            title="Delete memory"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Suboption 3: Tone & Signature Customization */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-1.5">
                    <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Sliders className="h-3.5 w-3.5 text-cyan-400" />
                      Default Executive Tone
                    </label>
                    <p className="text-[11px] text-slate-400">Wing calibrates draft vocabulary to this cadence</p>
                    <select
                      value={currentSettings.tone}
                      onChange={(e) => handleUpdate({ tone: e.target.value as any })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none mt-1"
                    >
                      <option value="executive">Crisp & Executive (Default)</option>
                      <option value="direct">Direct & Ultra-Concise</option>
                      <option value="formal">Formal & Corporate</option>
                      <option value="friendly">Warm & Personable</option>
                    </select>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-1.5">
                    <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-cyan-400" />
                      Default Signature Line
                    </label>
                    <p className="text-[11px] text-slate-400">Appended to drafted email completions</p>
                    <input
                      type="text"
                      value={currentSettings.senderSignature}
                      onChange={(e) => handleUpdate({ senderSignature: e.target.value })}
                      placeholder='e.g., "Best regards, Alex"'
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none mt-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* OPTION 2: EXECUTION & SAFETY */}
          {/* ============================================================== */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden transition-all shadow-sm">
            <button
              type="button"
              onClick={() => toggleCategory('safety')}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-850 transition cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                    openCategories.safety
                      ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-slate-800 text-slate-400 group-hover:text-emerald-400'
                  }`}
                >
                  <Shield className="h-5 w-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition">
                    Execution & Safety
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5">
                    Send confirmations, Gmail mailbox sync, and feedback cues
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="hidden sm:inline text-[11px] text-slate-500 font-medium">
                  {openCategories.safety ? 'Hide' : 'Customize'}
                </span>
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800/80 text-slate-400 transition-transform duration-200 group-hover:text-white ${
                    openCategories.safety ? 'rotate-180 text-emerald-400' : 'rotate-0'
                  }`}
                >
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </button>

            {/* Suboptions appear downwards when clicked */}
            {openCategories.safety && (
              <div className="border-t border-slate-800/80 p-4 sm:p-5 bg-slate-950/40 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="rounded-xl border border-slate-800 bg-slate-900/80 divide-y divide-slate-800/80">
                  {/* Suboption: Require Confirmation */}
                  <div className="flex items-center justify-between p-4">
                    <div className="pr-4">
                      <h4 className="text-xs font-semibold text-white">Require Confirmation Before Dispatch</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Always display an executive inspection dialog before an email is sent through your Gmail, even on voice orders.
                      </p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center shrink-0">
                      <input
                        type="checkbox"
                        checked={currentSettings.confirmBeforeSend}
                        onChange={(e) => handleUpdate({ confirmBeforeSend: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="peer h-5 w-9 rounded-full bg-slate-800 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-slate-400 after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:bg-white peer-focus:outline-none"></div>
                    </label>
                  </div>

                  {/* Suboption: Sync Drafts to Gmail */}
                  <div className="flex items-center justify-between p-4">
                    <div className="pr-4">
                      <h4 className="text-xs font-semibold text-white">Sync Drafts to Gmail Mailbox</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Mirror all prepared email drafts directly into your connected Gmail drafts folder for offline access.
                      </p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center shrink-0">
                      <input
                        type="checkbox"
                        checked={currentSettings.autoSaveGmailDrafts}
                        onChange={(e) => handleUpdate({ autoSaveGmailDrafts: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="peer h-5 w-9 rounded-full bg-slate-800 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-slate-400 after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:bg-white peer-focus:outline-none"></div>
                    </label>
                  </div>

                  {/* Suboption: Execution Audio Feedback */}
                  <div className="flex items-center justify-between p-4">
                    <div className="pr-4">
                      <h4 className="text-xs font-semibold text-white">Execution Audio Cues</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Play subtle audio confirmations when directives complete and emails are dispatched on command.
                      </p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center shrink-0">
                      <input
                        type="checkbox"
                        checked={currentSettings.soundEffects}
                        onChange={(e) => handleUpdate({ soundEffects: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="peer h-5 w-9 rounded-full bg-slate-800 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-slate-400 after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:bg-white peer-focus:outline-none"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* OPTION 3: ACCOUNT & GOOGLE WORKSPACE */}
          {/* ============================================================== */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden transition-all shadow-sm">
            <button
              type="button"
              onClick={() => toggleCategory('account')}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-850 transition cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                    openCategories.account
                      ? 'bg-gradient-to-br from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-600/30'
                      : 'bg-slate-800 text-slate-400 group-hover:text-sky-400'
                  }`}
                >
                  <User className="h-5 w-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white group-hover:text-sky-300 transition">
                      Account & Google Workspace
                    </span>
                    {user && hasToken && (
                      <span className="rounded-full bg-emerald-950 border border-emerald-800/60 px-2 py-0.2 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                        <Check className="h-2.5 w-2.5" /> Connected
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 mt-0.5">
                    Google identity status, Gmail privileges, and Contacts sync
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="hidden sm:inline text-[11px] text-slate-500 font-medium">
                  {openCategories.account ? 'Hide' : 'Customize'}
                </span>
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800/80 text-slate-400 transition-transform duration-200 group-hover:text-white ${
                    openCategories.account ? 'rotate-180 text-sky-400' : 'rotate-0'
                  }`}
                >
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </button>

            {/* Suboptions appear downwards when clicked */}
            {openCategories.account && (
              <div className="border-t border-slate-800/80 p-4 sm:p-5 space-y-4 bg-slate-950/40 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3.5">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Google Identity & Auth Status
                  </h4>

                  {user && hasToken ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl bg-slate-950 border border-slate-800 p-3.5">
                      <div className="flex items-center gap-3">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName}
                            className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-700"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-700 font-bold text-white text-sm">
                            {user.displayName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-semibold text-white">{user.displayName}</div>
                          <div className="text-[11px] text-slate-400">{user.email}</div>
                          <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium mt-0.5">
                            <Check className="h-3 w-3" /> Authenticated & Connected
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={onSignOut}
                        className="rounded-xl bg-red-950/80 border border-red-900/60 px-3.5 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900 transition cursor-pointer"
                      >
                        Disconnect Account
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl bg-slate-950 border border-slate-800 p-3.5">
                      <div>
                        <div className="text-xs font-medium text-slate-200">No account linked</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Sign in to allow Wing to draft, save, and dispatch emails with your verified Gmail.
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={onSignIn}
                        className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100 transition shadow-sm shrink-0 cursor-pointer"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        </svg>
                        <span>Connect with Google</span>
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-300">Gmail Scopes</span>
                      <p className="text-[10px] text-slate-400">
                        Create drafts, send emails, and access messages when instructed.
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-300">Google Contacts</span>
                      <p className="text-[10px] text-slate-400">
                        Read and resolve contact email addresses directly from your Google directory.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* OPTION 4: DATA & BACKUP */}
          {/* ============================================================== */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden transition-all shadow-sm">
            <button
              type="button"
              onClick={() => toggleCategory('backup')}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-850 transition cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                    openCategories.backup
                      ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                      : 'bg-slate-800 text-slate-400 group-hover:text-purple-400'
                  }`}
                >
                  <Database className="h-5 w-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white group-hover:text-purple-300 transition">
                    Data & Backup Management
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5">
                    Export your custom memory bank or reset to default configurations
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="hidden sm:inline text-[11px] text-slate-500 font-medium">
                  {openCategories.backup ? 'Hide' : 'Customize'}
                </span>
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800/80 text-slate-400 transition-transform duration-200 group-hover:text-white ${
                    openCategories.backup ? 'rotate-180 text-purple-400' : 'rotate-0'
                  }`}
                >
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </button>

            {/* Suboptions appear downwards when clicked */}
            {openCategories.backup && (
              <div className="border-t border-slate-800/80 p-4 sm:p-5 bg-slate-950/40 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-4">
                  {/* Export suboption */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div>
                      <h4 className="text-xs font-semibold text-white">Export Memory Vault & Settings</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Download a JSON snapshot of your custom directives, memories, tone rules, and configurations.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportData}
                      className="flex items-center gap-1.5 rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition shrink-0 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Export Backup</span>
                    </button>
                  </div>

                  {/* Reset defaults suboption */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div>
                      <h4 className="text-xs font-semibold text-red-300">Reset Memory Vault</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Clear all custom directives and restore memories back to initial executive defaults.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetDefaults}
                      className="flex items-center gap-1.5 rounded-xl bg-red-950/60 border border-red-900/60 px-3.5 py-2 text-xs font-medium text-red-300 hover:bg-red-900/70 transition shrink-0 cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Reset to Defaults</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-800 bg-slate-900/95 px-5 py-3.5 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            Changes auto-save immediately to your browser storage
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-5 py-2 text-xs font-semibold text-white hover:from-cyan-500 hover:to-sky-500 transition shadow-md shadow-cyan-600/20 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
