import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Send,
  Sparkles,
  Command,
  Mail,
  AlertCircle,
  Clock,
  ArrowUp,
  CheckCircle2,
  Inbox,
  Settings,
  HelpCircle,
  Info,
  Mic,
  Globe,
} from 'lucide-react';
import {
  ChatMessage,
  ContactRecord,
  EmailDraft,
  TaskItem,
  UserAuthProfile,
  OrderActionPayload,
  ChatSession,
  PersonalizationSettings,
  WorkspaceArtifact,
} from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { IntroductoryHero } from './components/IntroductoryHero';
import { ChatMessageItem } from './components/ChatMessageItem';
import { EmailConfirmModal } from './components/EmailConfirmModal';
import { WorkspaceConfirmModal } from './components/WorkspaceConfirmModal';
import { TaskDrawer } from './components/TaskDrawer';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { LiveVoiceModal } from './components/LiveVoiceModal';
import { SettingsModal } from './components/SettingsModal';
import {
  initAuth,
  googleSignIn,
  googleLogout,
  getAccessToken,
  setAccessToken,
} from './utils/googleAuth';
import {
  createGmailDraft,
  sendGmailMessage,
  fetchGoogleContacts,
} from './utils/gmailService';
import {
  createGoogleDoc,
  createGoogleSheet,
  createGoogleSlides,
  createCalendarEvent,
  listRecentWorkspaceFiles,
} from './utils/googleWorkspaceService';

// Pre-seeded relations so Wing immediately recognizes "brother", "mom", etc.
const INITIAL_CONTACTS: ContactRecord[] = [
  {
    id: 'c1',
    name: 'Dave Miller',
    email: 'dave.miller.sample@gmail.com',
    relationship: 'Brother',
    notes: 'Older brother, lives in Chicago',
  },
  {
    id: 'c2',
    name: 'Linda Miller',
    email: 'linda.miller.sample@gmail.com',
    relationship: 'Mom',
    notes: 'Family contact',
  },
  {
    id: 'c3',
    name: 'Sarah Connor',
    email: 'sarah.connor.work@example.com',
    relationship: 'Colleague',
    notes: 'Engineering Lead',
  },
];

const INITIAL_TASKS: TaskItem[] = [
  {
    id: 't1',
    title: 'Confirm travel itinerary with Dave',
    category: 'email',
    priority: 'high',
    completed: false,
    createdAt: new Date().toISOString(),
  },
];

const getGreetingMessage = (name?: string): string => {
  const hour = new Date().getHours();
  const title = name ? name.split(' ')[0] : 'Sir';
  if (hour < 12) {
    return `Good morning, ${title}. Wing is calibrated and standing by for your direct orders. All communications and Gmail dispatch systems are operational. State your specifications or give me an order whenever you're ready.`;
  } else if (hour < 17) {
    return `Good afternoon, ${title}. Wing is at your service. All executive communication channels are ready. What directive shall we execute today?`;
  } else {
    return `Good evening, ${title}. Wing is online and ready for your command. Where shall we begin?`;
  }
};

const DEFAULT_PERSONALIZATION: PersonalizationSettings = {
  customInstructions: 'Keep emails concise, polite, and directly address the recipient. Never include unnecessary filler. If specifying plans, include time and dates clearly.',
  tone: 'executive',
  senderSignature: 'Best regards',
  memories: [
    {
      id: 'mem_1',
      text: 'Brother is Dave Miller (dave.miller.sample@gmail.com).',
      category: 'contact',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mem_2',
      text: 'Prefers emails to be structured and ready for instant dispatch on command.',
      category: 'preference',
      createdAt: new Date().toISOString(),
    },
  ],
  confirmBeforeSend: true,
  autoSaveGmailDrafts: true,
  soundEffects: true,
};

const createInitialSession = (): ChatSession => {
  const id = 'sess_' + Date.now();
  return {
    id,
    title: 'New Order',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg_welcome_' + Date.now(),
        role: 'assistant',
        content: getGreetingMessage(),
        timestamp: new Date().toISOString(),
      },
    ],
  };
};

export default function App() {
  // Authentication state
  const [user, setUser] = useState<UserAuthProfile | null>(null);
  const [hasToken, setHasToken] = useState<boolean>(false);

  // Sessions & Chat history
  const [sessions, setSessions] = useState<ChatSession[]>([createInitialSession()]);
  const [activeSessionId, setActiveSessionId] = useState<string>(sessions[0].id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Active inputs & processing
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Orders, Drafts & Contacts
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [activeDraft, setActiveDraft] = useState<EmailDraft | null>(null);
  const [contacts, setContacts] = useState<ContactRecord[]>(INITIAL_CONTACTS);
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);

  // Modals & Drawers
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [draftToConfirm, setDraftToConfirm] = useState<EmailDraft | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'orders' | 'contacts' | 'tasks' | 'workspace'>('orders');
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [liveVoiceOpen, setLiveVoiceOpen] = useState(false);
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Google Workspace state
  const [workspaceArtifacts, setWorkspaceArtifacts] = useState<WorkspaceArtifact[]>(() => {
    try {
      const stored = localStorage.getItem('wing_workspace_artifacts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isSyncingWorkspace, setIsSyncingWorkspace] = useState(false);
  const [workspaceModalState, setWorkspaceModalState] = useState<{
    isOpen: boolean;
    actionType: 'doc' | 'sheet' | 'slides' | 'event';
    title: string;
    details: string;
    payload: any;
    resolve?: (val: WorkspaceArtifact | null) => void;
  }>({
    isOpen: false,
    actionType: 'doc',
    title: '',
    details: '',
    payload: null,
  });
  const [isExecutingWorkspace, setIsExecutingWorkspace] = useState(false);

  // Settings & AI Personalization / Memories
  const [personalizationSettings, setPersonalizationSettings] = useState<PersonalizationSettings>(() => {
    try {
      const stored = localStorage.getItem('wing_personalization_settings');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load stored personalization settings', e);
    }
    return DEFAULT_PERSONALIZATION;
  });

  const handleSavePersonalizationSettings = (newSettings: PersonalizationSettings) => {
    setPersonalizationSettings(newSettings);
    try {
      localStorage.setItem('wing_personalization_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to save personalization settings to localStorage', e);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get current active session
  const currentSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const currentMessages = currentSession ? currentSession.messages : [];

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (authUser, token) => {
        setUser({
          uid: authUser.uid,
          email: authUser.email || '',
          displayName: authUser.displayName || 'User',
          photoURL: authUser.photoURL || undefined,
        });
        setHasToken(true);
      },
      () => {
        // Not authenticated
        setHasToken(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, isProcessing]);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.profile);
        setHasToken(true);
        showToast(`Connected as ${result.profile.email}`, 'success');
        // Fetch contacts
        await handleSyncGoogleContacts();
      }
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      showToast('Authentication cancelled or failed.', 'error');
    }
  };

  // Google Sign-Out
  const handleGoogleSignOut = async () => {
    try {
      await googleLogout();
      setUser(null);
      setHasToken(false);
      showToast('Signed out of Google Workspace.', 'info');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Sync Google Contacts
  const handleSyncGoogleContacts = async () => {
    setIsSyncingContacts(true);
    try {
      const googleContacts = await fetchGoogleContacts();
      if (googleContacts.length > 0) {
        setContacts((prev) => {
          const map = new Map(prev.map((c) => [c.email.toLowerCase(), c]));
          googleContacts.forEach((gc) => {
            if (!map.has(gc.email.toLowerCase())) {
              map.set(gc.email.toLowerCase(), gc);
            }
          });
          return Array.from(map.values());
        });
        showToast(`Synced ${googleContacts.length} contacts from Google.`, 'success');
      }
    } catch (err) {
      console.warn('Sync contacts error:', err);
    } finally {
      setIsSyncingContacts(false);
    }
  };

  // Sync Google Workspace Drive Files
  const handleSyncWorkspaceFiles = async () => {
    setIsSyncingWorkspace(true);
    try {
      let token = await getAccessToken();
      if (!token) {
        showToast('Please sign in to Google to sync Drive files.', 'info');
        const signResult = await googleSignIn();
        if (!signResult?.accessToken) return;
        setUser(signResult.profile);
        setHasToken(true);
        token = signResult.accessToken;
      }

      const files = await listRecentWorkspaceFiles(token);
      if (files.length > 0) {
        setWorkspaceArtifacts((prev) => {
          const map = new Map(prev.map((f) => [f.id, f]));
          files.forEach((f) => {
            if (!map.has(f.id)) map.set(f.id, f);
          });
          const merged = Array.from(map.values());
          try {
            localStorage.setItem('wing_workspace_artifacts', JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
        showToast(`Synced ${files.length} Google Workspace files from Drive.`, 'success');
      } else {
        showToast('No recent Workspace files found in Drive.', 'info');
      }
    } catch (err: any) {
      console.warn('Sync workspace files error:', err);
      showToast('Could not sync Drive files.', 'error');
    } finally {
      setIsSyncingWorkspace(false);
    }
  };

  // Initiate workspace action (opens mandatory confirmation modal)
  const handleExecuteWorkspaceAction = async (
    type: 'doc' | 'sheet' | 'slides' | 'event',
    payload: any
  ): Promise<WorkspaceArtifact | null> => {
    let token = await getAccessToken();
    if (!token) {
      showToast('Please connect your Google Workspace account to proceed.', 'info');
      const signResult = await googleSignIn();
      if (!signResult?.accessToken) {
        showToast('Authentication cancelled.', 'error');
        return null;
      }
      setUser(signResult.profile);
      setHasToken(true);
      token = signResult.accessToken;
    }

    return new Promise((resolve) => {
      let title = '';
      let details = '';

      if (type === 'doc') {
        title = payload.title || 'Executive Document';
        details = `Wing will create a new Google Doc in your Google Drive titled "${title}".`;
      } else if (type === 'sheet') {
        title = payload.title || 'Executive Spreadsheet';
        details = `Wing will create a new Google Sheet with ${payload.headers?.length || 0} columns and ${payload.rows?.length || 0} rows of data.`;
      } else if (type === 'slides') {
        title = payload.title || 'Executive Presentation';
        details = `Wing will create a new Google Slides presentation deck in your Google Drive.`;
      } else if (type === 'event') {
        title = payload.summary || 'Executive Event';
        details = `Wing will schedule this meeting on your Google Calendar starting ${new Date(payload.startDateTime).toLocaleString()}.`;
      }

      setWorkspaceModalState({
        isOpen: true,
        actionType: type,
        title,
        details,
        payload,
        resolve,
      });
    });
  };

  // User confirmed action in modal
  const handleConfirmWorkspaceExecution = async () => {
    const { actionType, payload, resolve } = workspaceModalState;
    setIsExecutingWorkspace(true);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Authentication token expired. Please sign in again.');

      let artifact: WorkspaceArtifact;
      if (actionType === 'doc') {
        artifact = await createGoogleDoc(token, payload.title, payload.content);
        showToast(`Created Google Doc: "${artifact.title}"`, 'success');
      } else if (actionType === 'sheet') {
        artifact = await createGoogleSheet(token, payload.title, payload.headers, payload.rows);
        showToast(`Created Google Sheet: "${artifact.title}"`, 'success');
      } else if (actionType === 'slides') {
        artifact = await createGoogleSlides(token, payload.title, payload.slides);
        showToast(`Created Google Slides: "${artifact.title}"`, 'success');
      } else {
        artifact = await createCalendarEvent(token, payload);
        showToast(`Scheduled on Google Calendar: "${artifact.title}"`, 'success');
      }

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#06b6d4', '#3b82f6', '#10b981'],
      });

      setWorkspaceArtifacts((prev) => {
        const updated = [artifact, ...prev];
        try {
          localStorage.setItem('wing_workspace_artifacts', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      if (resolve) resolve(artifact);
      setWorkspaceModalState((prev) => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      console.error('Workspace execution error:', err);
      showToast(`Error: ${err.message || 'Execution failed'}`, 'error');
      if (resolve) resolve(null);
    } finally {
      setIsExecutingWorkspace(false);
    }
  };

  // Create a brand new session with introductory phrase
  const handleNewSession = () => {
    const newSession: ChatSession = {
      id: 'sess_' + Date.now(),
      title: 'New Order',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 'msg_welcome_' + Date.now(),
          role: 'assistant',
          content: getGreetingMessage(user?.displayName),
          timestamp: new Date().toISOString(),
        },
      ],
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setActiveDraft(null);
    showToast('New order session opened.', 'info');
  };

  // Delete a session
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      // If only one, recreate blank
      handleNewSession();
      return;
    }
    const filtered = sessions.filter((s) => s.id !== sessionId);
    setSessions(filtered);
    if (activeSessionId === sessionId) {
      setActiveSessionId(filtered[0].id);
    }
    showToast('Session removed.', 'info');
  };

  // Core Order Dispatcher
  const handleProcessOrder = async (orderText: string) => {
    if (!orderText.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: orderText.trim(),
      timestamp: new Date().toISOString(),
    };

    // Auto title session from first user order
    const isFirstUserMessage = currentMessages.filter((m) => m.role === 'user').length === 0;
    const cleanTitle =
      orderText.length > 28 ? orderText.slice(0, 26).trim() + '...' : orderText.trim();

    // Update active session with user message
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            title: isFirstUserMessage ? cleanTitle : s.title,
            updatedAt: new Date().toISOString(),
            messages: [...s.messages, userMessage],
          };
        }
        return s;
      })
    );

    setInputText('');
    setIsProcessing(true);

    try {
      const res = await fetch('/api/assistant/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: orderText.trim(),
          conversationHistory: currentMessages.slice(-8),
          contacts,
          activeDraft,
          userProfile: user,
          personalization: personalizationSettings,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const actionPayload: OrderActionPayload = data.action || { type: 'GENERAL' };

      // If an email draft was created or updated
      if (actionPayload.emailDraft) {
        const newDraft = actionPayload.emailDraft;
        setActiveDraft(newDraft);
        setDrafts((prev) => {
          const index = prev.findIndex((d) => d.id === newDraft.id);
          if (index >= 0) {
            const copy = [...prev];
            copy[index] = newDraft;
            return copy;
          }
          return [newDraft, ...prev];
        });
      }

      // If user ordered to send the draft
      if (actionPayload.type === 'SEND_EMAIL') {
        const target = activeDraft || drafts.find((d) => d.id === actionPayload.targetDraftId) || drafts[0];
        if (target) {
          // Open mandatory confirmation modal
          setDraftToConfirm(target);
          setConfirmModalOpen(true);
        }
      }

      // If new tasks were extracted
      if (actionPayload.tasks && actionPayload.tasks.length > 0) {
        setTasks((prev) => [...actionPayload.tasks!, ...prev]);
      }

      // Append Wing's response to current session
      const assistantMessage: ChatMessage = {
        id: 'msg_' + (Date.now() + 1),
        role: 'assistant',
        content: data.replyText,
        timestamp: new Date().toISOString(),
        orderAction: actionPayload,
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              updatedAt: new Date().toISOString(),
              messages: [...s.messages, assistantMessage],
              activeDraft: actionPayload.emailDraft || s.activeDraft,
            };
          }
          return s;
        })
      );
    } catch (err: any) {
      console.error('Order processing error:', err);
      const errorMessage: ChatMessage = {
        id: 'msg_err_' + Date.now(),
        role: 'assistant',
        content: `Apologies, I encountered an issue executing that order: ${err.message || 'Network error'}. Please command me again.`,
        timestamp: new Date().toISOString(),
      };
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: [...s.messages, errorMessage],
            };
          }
          return s;
        })
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Open confirmation modal for sending
  const handleRequestSendDraft = (draft: EmailDraft) => {
    setDraftToConfirm(draft);
    setConfirmModalOpen(true);
  };

  // Executing the actual send upon user confirmation
  const handleConfirmSendEmail = async () => {
    if (!draftToConfirm) return;

    setIsSendingEmail(true);

    try {
      const token = await getAccessToken();

      if (!token) {
        // Prompt Google Sign in
        showToast('Please sign in to Google to send via your Gmail account.', 'info');
        const signResult = await googleSignIn();
        if (!signResult) {
          setIsSendingEmail(false);
          return;
        }
        setUser(signResult.profile);
        setHasToken(true);
      }

      // Dispatch via Gmail API
      const sendResult = await sendGmailMessage({
        to: draftToConfirm.to,
        subject: draftToConfirm.subject,
        body: draftToConfirm.body,
      });

      const updatedDraft: EmailDraft = {
        ...draftToConfirm,
        status: 'sent',
        gmailMessageId: sendResult.messageId,
        sentAt: new Date().toISOString(),
      };

      // Update state
      setDrafts((prev) => prev.map((d) => (d.id === updatedDraft.id ? updatedDraft : d)));
      setActiveDraft(null);
      setConfirmModalOpen(false);

      // Celebration confetti for successful executive execution!
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 },
      });

      showToast(`Email dispatched to ${updatedDraft.to} via Gmail!`, 'success');

      // Add assistant confirmation message to current session
      const confirmMsg: ChatMessage = {
        id: 'msg_' + Date.now(),
        role: 'assistant',
        content: `Order executed. The email to ${updatedDraft.recipientName} (${updatedDraft.to}) has been dispatched successfully via your Gmail account.`,
        timestamp: new Date().toISOString(),
        orderAction: {
          type: 'SEND_EMAIL',
          emailDraft: updatedDraft,
          commandExecuted: true,
          executionDetails: `Sent message ID: ${sendResult.messageId}`,
        },
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: [...s.messages, confirmMsg],
            };
          }
          return s;
        })
      );
    } catch (err: any) {
      console.error('Send email error:', err);
      showToast(`Error sending email: ${err.message}`, 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Save to Gmail Drafts
  const handleSaveToDrafts = async (draft: EmailDraft) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        showToast('Please sign in to Google to save into Gmail drafts.', 'info');
        const signResult = await googleSignIn();
        if (!signResult) return;
        setUser(signResult.profile);
        setHasToken(true);
      }

      const res = await createGmailDraft({
        to: draft.to,
        subject: draft.subject,
        body: draft.body,
      });

      const updatedDraft: EmailDraft = {
        ...draft,
        gmailDraftId: res.draftId,
      };

      setDrafts((prev) => prev.map((d) => (d.id === updatedDraft.id ? updatedDraft : d)));
      if (activeDraft?.id === updatedDraft.id) {
        setActiveDraft(updatedDraft);
      }

      showToast('Saved directly to your Gmail Drafts!', 'success');
    } catch (err: any) {
      console.error('Save to drafts error:', err);
      showToast(`Failed to save draft: ${err.message}`, 'error');
    }
  };

  // Refine draft through Wing
  const handleRefineDraft = (draftId: string, instruction: string) => {
    const target = drafts.find((d) => d.id === draftId) || activeDraft;
    if (target) {
      handleProcessOrder(`Tweak the current email draft to ${target.recipientName}: ${instruction}`);
    }
  };

  // Update draft content from in-place editor
  const handleUpdateDraftContent = (updatedDraft: EmailDraft) => {
    setDrafts((prev) => prev.map((d) => (d.id === updatedDraft.id ? updatedDraft : d)));
    if (activeDraft?.id === updatedDraft.id) {
      setActiveDraft(updatedDraft);
    }
    // Update also in session chat messages
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: s.messages.map((msg) => {
              if (msg.orderAction?.emailDraft?.id === updatedDraft.id) {
                return {
                  ...msg,
                  orderAction: {
                    ...msg.orderAction,
                    emailDraft: updatedDraft,
                  },
                };
              }
              return msg;
            }),
          };
        }
        return s;
      })
    );
    showToast('Draft updated.', 'info');
  };

  const handleToggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleAddTask = (title: string, category = 'general') => {
    const newTask: TaskItem = {
      id: 'task_' + Date.now(),
      title,
      category: category as any,
      priority: 'medium',
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
    showToast('Task added.', 'info');
  };

  const handleAddContact = (c: Omit<ContactRecord, 'id'>) => {
    const newContact: ContactRecord = {
      ...c,
      id: 'c_' + Date.now(),
    };
    setContacts((prev) => [newContact, ...prev]);
    showToast(`Added ${c.name} (${c.relationship || 'Contact'})`, 'success');
  };

  const handleDeleteContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    showToast('Contact removed.', 'info');
  };

  const pendingDraftsCount = drafts.filter((d) => d.status === 'pending_approval' || d.status === 'draft').length;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden">
      {/* Sidebar: Sessions, Quick Links, Google Auth */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          setActiveSessionId(id);
          const sess = sessions.find((s) => s.id === id);
          if (sess?.activeDraft) setActiveDraft(sess.activeDraft);
        }}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onOpenDrawer={(tab) => {
          setDrawerTab(tab);
          setDrawerOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        pendingOrdersCount={pendingDraftsCount}
        contactsCount={contacts.length}
        tasksCount={tasks.filter((t) => !t.completed).length}
        workspaceCount={workspaceArtifacts.length}
        user={user}
        hasToken={hasToken}
        onSignIn={handleGoogleSignIn}
        onSignOut={handleGoogleSignOut}
      />

      {/* Main Workspace Column */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          isProcessing={isProcessing}
        />

        {/* Floating Notification Toast */}
        {notification && (
          <div
            className={`fixed bottom-24 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-xl border animate-in slide-in-from-bottom-3 duration-200 ${
              notification.type === 'success'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : notification.type === 'error'
                ? 'bg-red-950 text-red-300 border-red-800'
                : 'bg-slate-900 text-slate-200 border-slate-700'
            }`}
          >
            {notification.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            {notification.type === 'error' && <AlertCircle className="h-4 w-4 text-red-400" />}
            {notification.type === 'info' && <Info className="h-4 w-4 text-cyan-400" />}
            <span>{notification.text}</span>
          </div>
        )}

        {/* Main Conversation & Orders Area */}
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto max-w-4xl space-y-4">
            {/* Clean Gemini-style introductory hero on front of newly created chat */}
            {currentMessages.filter((m) => m.role === 'user').length === 0 ? (
              <IntroductoryHero
                user={user}
                hasToken={hasToken}
                sessionId={activeSessionId}
                onOpenVoice={() => setVoiceModalOpen(true)}
                onOpenLive={() => setLiveVoiceOpen(true)}
                onSelectPrompt={handleProcessOrder}
              />
            ) : (
              /* Messages Stream */
              currentMessages.map((message) => (
                <ChatMessageItem
                  key={message.id}
                  message={message}
                  onSendCommand={handleRequestSendDraft}
                  onSaveToDrafts={handleSaveToDrafts}
                  onRefineDraft={handleRefineDraft}
                  onUpdateDraftContent={handleUpdateDraftContent}
                  onExecuteWorkspaceAction={handleExecuteWorkspaceAction}
                  isSending={isSendingEmail}
                />
              ))
            )}

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="flex items-center gap-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/60 animate-pulse">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-xs text-slate-400">
                  <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
                  <span>Wing is processing your order & preparing specifications...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Command Input Bar */}
        <footer className="border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-md px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (inputText.trim()) {
                  handleProcessOrder(inputText);
                }
              }}
              className="relative flex items-center"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask anything"
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 py-3.5 pl-4 pr-24 sm:pr-28 text-sm text-slate-100 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 shadow-inner"
                disabled={isProcessing}
              />

              <div className="absolute right-2 flex items-center gap-1.5">
                {/* Voice-to-text dictation button */}
                <button
                  type="button"
                  onClick={() => setVoiceModalOpen(!voiceModalOpen)}
                  title={voiceModalOpen ? 'Voice dictation active...' : 'Voice-to-text dictation (Speech to text)'}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition cursor-pointer ${
                    voiceModalOpen
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse'
                      : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                  }`}
                >
                  <Mic className="h-4 w-4" />
                </button>

                {!inputText.trim() ? (
                  /* The Live Mode button occupies the send button's place until anything is typed, using the 🌐 logo */
                  <button
                    type="button"
                    onClick={() => setLiveVoiceOpen(true)}
                    title="Launch Gemini Live Mode (🌐)"
                    className="relative flex h-9.5 w-9.5 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-sky-500 text-white shadow-md shadow-cyan-600/30 transition-all hover:from-cyan-500 hover:to-sky-400 active:scale-95 group cursor-pointer border border-cyan-400/30"
                  >
                    <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border border-slate-950"></span>
                    </span>
                    <Globe className="h-4.5 w-4.5 transition group-hover:scale-110 text-cyan-50" />
                  </button>
                ) : (
                  /* Instantly morphs to Send button when text is written */
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="flex h-9.5 w-9.5 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 text-white shadow-md shadow-cyan-600/25 transition-all hover:from-cyan-500 hover:to-sky-500 active:scale-95 disabled:opacity-30 cursor-pointer"
                    title="Send Order"
                  >
                    <ArrowUp className="h-4.5 w-4.5" />
                  </button>
                )}
              </div>
            </form>

            <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                Drafts comply with your exact specifications & require your command to send.
              </span>
              <span className="hidden sm:inline">
                Gemini Live Voice & Google Workspace Integrated
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Mandatory Email Send Confirmation Modal */}
      <EmailConfirmModal
        isOpen={confirmModalOpen}
        draft={draftToConfirm}
        senderEmail={user?.email}
        onConfirm={handleConfirmSendEmail}
        onCancel={() => setConfirmModalOpen(false)}
        isSending={isSendingEmail}
      />

      {/* Assistant Hub Slide-Over Drawer */}
      <TaskDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={drawerTab}
        onChangeTab={setDrawerTab}
        drafts={drafts}
        contacts={contacts}
        tasks={tasks}
        workspaceArtifacts={workspaceArtifacts}
        onSelectDraft={(d) => {
          setActiveDraft(d);
          setDrawerOpen(false);
          showToast(`Selected draft for ${d.recipientName}`, 'info');
        }}
        onAddContact={handleAddContact}
        onDeleteContact={handleDeleteContact}
        onToggleTask={handleToggleTask}
        onAddTask={handleAddTask}
        onSyncGoogleContacts={handleSyncGoogleContacts}
        isSyncingContacts={isSyncingContacts}
        onSyncWorkspaceFiles={handleSyncWorkspaceFiles}
        isSyncingWorkspace={isSyncingWorkspace}
        onQuickOrder={(prompt) => {
          setDrawerOpen(false);
          handleProcessOrder(prompt);
        }}
      />

      {/* Mandatory User Confirmation for Google Workspace Creation */}
      <WorkspaceConfirmModal
        isOpen={workspaceModalState.isOpen}
        actionType={workspaceModalState.actionType}
        title={workspaceModalState.title}
        details={workspaceModalState.details}
        onConfirm={handleConfirmWorkspaceExecution}
        onClose={() => {
          if (workspaceModalState.resolve) workspaceModalState.resolve(null);
          setWorkspaceModalState((prev) => ({ ...prev, isOpen: false }));
        }}
        isProcessing={isExecutingWorkspace}
      />

      {/* Google AI Studio Voice Intelligence Modal */}
      <VoiceAssistantModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onSendCommand={handleProcessOrder}
        onInsertToInput={(text) => {
          setInputText(text);
          showToast('Voice directive placed into type bar', 'info');
        }}
        isProcessing={isProcessing}
      />

      {/* Gemini Live Voice Mode Modal */}
      <LiveVoiceModal
        isOpen={liveVoiceOpen}
        onClose={() => setLiveVoiceOpen(false)}
        onExecuteDirective={handleProcessOrder}
        userName={user?.displayName || 'Executive'}
      />

      {/* Settings & Personalization Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={personalizationSettings}
        onSaveSettings={handleSavePersonalizationSettings}
        user={user}
        hasToken={hasToken}
        onSignIn={handleGoogleSignIn}
        onSignOut={handleGoogleSignOut}
      />
    </div>
  );
}
