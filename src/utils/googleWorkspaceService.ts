import { WorkspaceArtifact, CalendarEventPayload, GoogleDocPayload, GoogleSheetPayload, GoogleSlidesPayload } from '../types';

/**
 * Creates a new Google Doc with title and content using Docs API v1
 */
export async function createGoogleDoc(
  accessToken: string,
  title: string,
  content: string
): Promise<WorkspaceArtifact> {
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(`Failed to create Google Doc: ${errData.error?.message || createRes.statusText}`);
  }

  const docData = await createRes.json();
  const documentId = docData.documentId;

  // Insert initial content if provided
  if (content && content.trim().length > 0) {
    try {
      await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: content + '\n',
              },
            },
          ],
        }),
      });
    } catch (e) {
      console.warn('Doc created, but content insertion failed', e);
    }
  }

  const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;

  return {
    id: documentId,
    type: 'doc',
    title: title || 'Untitled Document',
    url: docUrl,
    description: `Google Doc created with ${content.length} characters of initial draft.`,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Creates a new Google Spreadsheet with optional headers and rows using Sheets API v4
 */
export async function createGoogleSheet(
  accessToken: string,
  title: string,
  headers: string[] = [],
  rows: string[][] = []
): Promise<WorkspaceArtifact> {
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: title || 'Untitled Spreadsheet' },
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(`Failed to create Google Sheet: ${errData.error?.message || createRes.statusText}`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;

  // If table headers or rows provided, populate values starting at A1
  const allValues = [];
  if (headers && headers.length > 0) {
    allValues.push(headers);
  }
  if (rows && rows.length > 0) {
    allValues.push(...rows);
  }

  if (allValues.length > 0) {
    try {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: 'A1',
            majorDimension: 'ROWS',
            values: allValues,
          }),
        }
      );
    } catch (e) {
      console.warn('Sheet created, but value population failed', e);
    }
  }

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return {
    id: spreadsheetId,
    type: 'sheet',
    title: title || 'Untitled Spreadsheet',
    url: sheetUrl,
    description: `Google Sheet generated with ${headers.length} columns and ${rows.length} rows.`,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Creates a new Google Slides presentation using Slides API v1
 */
export async function createGoogleSlides(
  accessToken: string,
  title: string,
  slides: Array<{ title: string; bullets: string[] }> = []
): Promise<WorkspaceArtifact> {
  const createRes = await fetch('https://slides.googleapis.com/v1/presentations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: title || 'Executive Presentation',
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(`Failed to create Google Slides: ${errData.error?.message || createRes.statusText}`);
  }

  const presData = await createRes.json();
  const presentationId = presData.presentationId;
  const slideUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;

  return {
    id: presentationId,
    type: 'slides',
    title: title || 'Executive Presentation',
    url: slideUrl,
    description: `Google Slides deck generated with presentation deck template.`,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Schedules an event on primary Google Calendar using Calendar API v3
 */
export async function createCalendarEvent(
  accessToken: string,
  event: CalendarEventPayload
): Promise<WorkspaceArtifact> {
  const startObj = event.startDateTime.includes('T')
    ? { dateTime: event.startDateTime }
    : { dateTime: new Date(event.startDateTime).toISOString() };

  const endObj = event.endDateTime.includes('T')
    ? { dateTime: event.endDateTime }
    : { dateTime: new Date(event.endDateTime).toISOString() };

  const payload: any = {
    summary: event.summary,
    description: event.description || '',
    start: startObj,
    end: endObj,
  };

  if (event.location) {
    payload.location = event.location;
  }

  if (event.attendees && event.attendees.length > 0) {
    payload.attendees = event.attendees.map((email) => ({ email }));
  }

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(`Failed to create Google Calendar event: ${errData.error?.message || res.statusText}`);
  }

  const eventData = await res.json();
  const htmlLink = eventData.htmlLink || 'https://calendar.google.com';

  return {
    id: eventData.id,
    type: 'event',
    title: event.summary,
    url: htmlLink,
    description: `Scheduled on Google Calendar for ${new Date(event.startDateTime).toLocaleString()}`,
    details: event.location ? `Location: ${event.location}` : undefined,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Lists upcoming Google Calendar events
 */
export async function listUpcomingEvents(accessToken: string): Promise<any[]> {
  const now = new Date().toISOString();
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
      now
    )}&maxResults=10&singleEvents=true&orderBy=startTime`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return data.items || [];
}

/**
 * Searches and lists recent Google Drive / Workspace files
 */
export async function listRecentWorkspaceFiles(accessToken: string): Promise<WorkspaceArtifact[]> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?pageSize=15&fields=files(id,name,mimeType,webViewLink,createdTime,modifiedTime)&orderBy=modifiedTime desc`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  const files = data.files || [];

  return files.map((f: any) => {
    let type: WorkspaceArtifact['type'] = 'drive_file';
    if (f.mimeType?.includes('document')) type = 'doc';
    else if (f.mimeType?.includes('spreadsheet')) type = 'sheet';
    else if (f.mimeType?.includes('presentation')) type = 'slides';

    return {
      id: f.id,
      type,
      title: f.name,
      url: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
      description: f.mimeType?.replace('application/vnd.google-apps.', 'Google ') || 'Workspace File',
      createdAt: f.createdTime || new Date().toISOString(),
    };
  });
}
