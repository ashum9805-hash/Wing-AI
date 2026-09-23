export type OrderActionType =
  | 'DRAFT_EMAIL'
  | 'SEND_EMAIL'
  | 'UPDATE_DRAFT'
  | 'SEARCH_CONTACTS'
  | 'MANAGE_TASKS'
  | 'SCHEDULE_REMINDER'
  | 'CREATE_DOC'
  | 'CREATE_SHEET'
  | 'CREATE_SLIDES'
  | 'SCHEDULE_EVENT'
  | 'BROWSE_WORKSPACE'
  | 'GENERAL';

export type DraftStatus = 'draft' | 'pending_approval' | 'sending' | 'sent' | 'cancelled';

export interface EmailDraft {
  id: string;
  to: string;
  recipientName: string;
  relationship?: string;
  subject: string;
  body: string;
  tone?: string;
  specifications: string[];
  status: DraftStatus;
  gmailDraftId?: string;
  gmailMessageId?: string;
  createdAt: string;
  sentAt?: string;
  error?: string;
}

export interface ContactRecord {
  id: string;
  name: string;
  email: string;
  relationship?: string;
  phone?: string;
  notes?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  category: 'email' | 'schedule' | 'general' | 'followup';
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  dueDate?: string;
  createdAt: string;
}

export interface WorkspaceArtifact {
  id: string;
  type: 'doc' | 'sheet' | 'slides' | 'event' | 'drive_file';
  title: string;
  url: string;
  description?: string;
  details?: string;
  createdAt: string;
}

export interface CalendarEventPayload {
  id?: string;
  summary: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  attendees?: string[];
  htmlLink?: string;
}

export interface GoogleDocPayload {
  id?: string;
  title: string;
  content: string;
  htmlLink?: string;
}

export interface GoogleSheetPayload {
  id?: string;
  title: string;
  headers?: string[];
  rows?: string[][];
  htmlLink?: string;
}

export interface GoogleSlidesPayload {
  id?: string;
  title: string;
  slides?: Array<{ title: string; bullets: string[] }>;
  htmlLink?: string;
}

export interface OrderActionPayload {
  type: OrderActionType;
  emailDraft?: EmailDraft;
  tasks?: TaskItem[];
  commandExecuted?: boolean;
  executionDetails?: string;
  targetDraftId?: string;
  workspaceArtifact?: WorkspaceArtifact;
  calendarEvent?: CalendarEventPayload;
  googleDoc?: GoogleDocPayload;
  googleSheet?: GoogleSheetPayload;
  googleSlides?: GoogleSlidesPayload;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  orderAction?: OrderActionPayload;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  activeDraft?: EmailDraft | null;
}

export interface AssistantApiResponse {
  replyText: string;
  action: OrderActionPayload;
}

export interface UserAuthProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

export interface AIMemoryItem {
  id: string;
  text: string;
  category: 'rule' | 'contact' | 'preference' | 'general';
  createdAt: string;
}

export interface PersonalizationSettings {
  customInstructions: string;
  tone: 'executive' | 'direct' | 'formal' | 'friendly';
  senderSignature: string;
  memories: AIMemoryItem[];
  confirmBeforeSend: boolean;
  autoSaveGmailDrafts: boolean;
  soundEffects: boolean;
}
