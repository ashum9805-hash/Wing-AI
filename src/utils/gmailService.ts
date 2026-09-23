import { ContactRecord, EmailDraft } from '../types';
import { getAccessToken } from './googleAuth';

/**
 * Encodes a message in standard RFC 2822 format to Base64URL
 */
function createRawEmail(to: string, subject: string, bodyText: string, fromEmail?: string): string {
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const messageParts = [
    fromEmail ? `From: ${fromEmail}` : '',
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    bodyText,
  ].filter(Boolean);

  const rawMessage = messageParts.join('\r\n');
  // Base64URL encoding (replace + with -, / with _, and strip =)
  return btoa(unescape(encodeURIComponent(rawMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Save an email as a draft in the user's real Gmail account
 */
export async function createGmailDraft(
  draft: Pick<EmailDraft, 'to' | 'subject' | 'body'>
): Promise<{ draftId: string; threadId?: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const raw = createRawEmail(draft.to, draft.subject, draft.body);
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        raw,
      },
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to create Gmail draft (${response.status})`);
  }

  const data = await response.json();
  return {
    draftId: data.id,
    threadId: data.message?.threadId,
  };
}

/**
 * Send an email directly through the user's real Gmail account
 */
export async function sendGmailMessage(
  email: Pick<EmailDraft, 'to' | 'subject' | 'body'>
): Promise<{ messageId: string; threadId?: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const raw = createRawEmail(email.to, email.subject, email.body);
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to send email via Gmail (${response.status})`);
  }

  const data = await response.json();
  return {
    messageId: data.id,
    threadId: data.threadId,
  };
}

/**
 * Fetch contacts from Google People API to enable Wing to know contacts by name/relation
 */
export async function fetchGoogleContacts(): Promise<ContactRecord[]> {
  const token = await getAccessToken();
  if (!token) {
    return [];
  }

  try {
    const response = await fetch(
      'https://people.googleapis.com/v1/people/me/connections?pageSize=100&personFields=names,emailAddresses,relations',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.warn('Contacts fetch returned status', response.status);
      return [];
    }

    const data = await response.json();
    if (!data.connections || !Array.isArray(data.connections)) {
      return [];
    }

    return data.connections
      .map((person: any) => {
        const name = person.names?.[0]?.displayName || 'Unnamed Contact';
        const email = person.emailAddresses?.[0]?.value;
        const relation = person.relations?.[0]?.type || '';
        if (!email) return null;
        return {
          id: person.resourceName || Math.random().toString(),
          name,
          email,
          relationship: relation,
        };
      })
      .filter((c: ContactRecord | null): c is ContactRecord => c !== null);
  } catch (err) {
    console.warn('Error fetching Google contacts:', err);
    return [];
  }
}
