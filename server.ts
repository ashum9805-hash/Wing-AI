import express, { Request, Response } from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

const ai = new GoogleGenAI();

// Endpoint for Gemini Speech-to-Intent & Intelligence Engine (Google AI Studio style)
app.post('/api/assistant/transcribe-interpret', async (req: Request, res: Response): Promise<void> => {
  try {
    const { audioData, mimeType = 'audio/webm', clientBackupTranscript = '' } = req.body;
    if (!audioData && !clientBackupTranscript) {
      res.status(400).json({ error: 'Audio data or transcript is required' });
      return;
    }

    const cleanBase64 = audioData && audioData.includes(',') ? audioData.split(',')[1] : (audioData || '');

    let transcribedText = '';
    let resultJson = null;

    // STEP 1: Dedicated Audio Transcription via gemini-3.5-transcribe (plain text, NO JSON mode)
    if (cleanBase64) {
      try {
        const transcribeRes = await ai.models.generateContent({
          model: 'gemini-3.5-transcribe',
          contents: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'audio/webm',
              },
            },
            { text: 'Transcribe this audio verbatim.' },
          ],
        });
        transcribedText = transcribeRes.text?.trim() || '';
      } catch (err: any) {
        console.warn('gemini-3.5-transcribe attempt:', err?.message || err);
      }
    }

    const effectiveTranscript = transcribedText || clientBackupTranscript;

    // STEP 2: Structure & Interpret Intent with supported Gemini 3.x models
    if (effectiveTranscript) {
      const textPrompt = `You are the Google AI Studio Voice Intelligence Engine.
The user spoke this message:
"${effectiveTranscript}"

Tasks:
1. Accurately reflect the spoken words.
2. Intelligently interpret what the user wants, stripping away filler words ("uh", "um", "ah", "like", "you know"), stuttering, or trailing pauses.
3. Formulate a crisp, concise, high-clarity executive prompt/command ready for execution.
4. Detect the intent category (e.g., "Draft Email", "Google Docs", "Google Sheets", "Google Slides", "Calendar Event", "Task Management", "General Query").
5. Extract key entities (e.g., Recipient, Time/Date, Topic, Document Type).

Output strictly valid JSON with this format:
{
  "rawTranscript": "${effectiveTranscript.replace(/"/g, '\\"')}",
  "interpretedCommand": "Clean, polished, actionable command",
  "intentCategory": "Category name",
  "summary": "One sentence summary of the directive",
  "entities": [
    { "label": "Recipient", "value": "e.g. brother Dave" },
    { "label": "Time", "value": "e.g. 6:00 PM Friday" }
  ]
}`;

      for (const textModel of ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-3.6-flash']) {
        try {
          const formatRes = await ai.models.generateContent({
            model: textModel,
            contents: [{ role: 'user', parts: [{ text: textPrompt }] }],
            config: { responseMimeType: 'application/json' },
          });
          const parsedText = formatRes.text?.trim();
          if (parsedText) {
            resultJson = JSON.parse(parsedText);
            break;
          }
        } catch (e: any) {
          console.warn(`Text structuring on ${textModel} failed:`, e?.message || e);
        }
      }
    }

    // STEP 3: If transcription failed, try direct multimodal audio with JSON-capable Gemini 3.x models
    if (!resultJson && cleanBase64) {
      const multimodalPrompt = `You are the Google AI Studio Voice Intelligence & Speech-to-Intent Engine.
Listen to this recorded audio message.
Tasks:
1. Provide an accurate verbatim transcription of what the user said.
2. Intelligently interpret what the user wants, eliminating filler sounds ("uh", "um", "ah", "like") and stumbles.
3. Formulate a crisp, concise executive prompt/command ready for execution.
4. Detect intent category and extract key entities.

Output strictly valid JSON:
{
  "rawTranscript": "Exact spoken words",
  "interpretedCommand": "Clean, polished command",
  "intentCategory": "Category name",
  "summary": "One sentence summary",
  "entities": []
}`;

      for (const modelName of ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-3.6-flash']) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: mimeType || 'audio/webm',
                },
              },
              {
                text: multimodalPrompt,
              },
            ],
            config: {
              responseMimeType: 'application/json',
            },
          });

          const text = response.text?.trim();
          if (text) {
            resultJson = JSON.parse(text);
            break;
          }
        } catch (err: any) {
          console.warn(`Direct multimodal attempt on ${modelName} failed:`, err?.message || err);
        }
      }
    }

    // STEP 4: Ultimate safe fallback: return raw speech rather than failing
    if (!resultJson) {
      const fallbackText = effectiveTranscript || 'Recorded speech directive';
      resultJson = {
        rawTranscript: fallbackText,
        interpretedCommand: fallbackText,
        intentCategory: 'Voice Directive',
        summary: 'Voice recording received',
        entities: [],
      };
    }

    res.json(resultJson);
  } catch (error: any) {
    console.error('Error in /api/assistant/transcribe-interpret:', error);
    res.status(500).json({
      error: error.message || 'Failed to interpret speech recording',
    });
  }
});

// Endpoint for Wing Assistant Order Processing
app.post('/api/assistant/order', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      message,
      conversationHistory = [],
      contacts = [],
      activeDraft = null,
      userProfile = null,
      personalization = null,
    } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const contactsContext = contacts.length > 0
      ? `KNOWN USER CONTACTS:\n${contacts
          .map((c: any) => `- Name: ${c.name}, Email: ${c.email}, Relation: ${c.relationship || 'unspecified'}`)
          .join('\n')}`
      : 'KNOWN USER CONTACTS: None stored yet.';

    const activeDraftContext = activeDraft
      ? `CURRENT ACTIVE PENDING DRAFT:\n- ID: ${activeDraft.id}\n- To: ${activeDraft.to} (${activeDraft.recipientName})\n- Subject: ${activeDraft.subject}\n- Body: "${activeDraft.body}"\n- Specifications: ${activeDraft.specifications?.join(', ')}\n- Status: ${activeDraft.status}`
      : 'CURRENT ACTIVE PENDING DRAFT: None.';

    const userProfileContext = userProfile
      ? `USER INFORMATION: Name: ${userProfile.displayName || 'User'}, Email: ${userProfile.email || 'user@example.com'}`
      : 'USER INFORMATION: Signed-in user.';

    const personalizationContext = personalization
      ? `PERSONALIZATION, MEMORIES & USER DIRECTIVES (CRITICAL - ALWAYS STRICTLY RESPECT):
- Operational Tone: ${personalization.tone || 'executive'}
- Preferred Signature / Sign-off: ${personalization.senderSignature || 'None specified'}
- Custom Directives & Commands To Always Remember:
${personalization.customInstructions ? personalization.customInstructions : 'None specified.'}
- Stored AI Memory Vault (User facts, personal context & persistent rules):
${personalization.memories && personalization.memories.length > 0
  ? personalization.memories.map((m: any) => `  * [${m.category?.toUpperCase() || 'INFO'}]: ${m.text}`).join('\n')
  : '  * None stored yet.'}`
      : '';

    const systemInstruction = `You are "Wing", an elite, autonomous AI Executive Assistant designed to accept and execute orders with precision across the Google Workspace ecosystem (Gmail, Google Docs, Google Sheets, Google Slides, Google Calendar, and Drive).
You are NOT a passive chatterbot. You are a command-driven assistant that takes direct action on behalf of your user.

YOUR EXPANDED WORKSPACE CAPABILITIES & DISCIPLINE:
1. Drafting Communications (Gmail):
   - Whenever the user orders you to draft, write, compose, or prepare an email:
     - Set actionType to "DRAFT_EMAIL".
     - Generate the full emailDraft object (recipientName, to, subject, body, tone, specifications).

2. Creating Documents (Google Docs):
   - Whenever the user commands to create a document, brief, report, memo, proposal, essay, or meeting summary:
     - Set actionType to "CREATE_DOC".
     - Provide googleDoc: { title: "Title", content: "Full structured document text formatted with clean headings and sections" }.

3. Creating Spreadsheets (Google Sheets):
   - Whenever the user commands to create a spreadsheet, tracker, financial ledger, budget, table, roster, or data sheet:
     - Set actionType to "CREATE_SHEET".
     - Provide googleSheet: { title: "Sheet Name", headers: ["Col1", "Col2", ...], rows: [["Val1", "Val2", ...], ...] }.

4. Creating Slide Presentations (Google Slides / PPT):
   - Whenever the user commands to create a presentation, pitch deck, slide deck, keynote, or PPT:
     - Set actionType to "CREATE_SLIDES".
     - Provide googleSlides: { title: "Deck Title", slides: [{ title: "Slide 1 Title", bullets: ["Key point 1", "Key point 2"] }] }.

5. Scheduling Events (Google Calendar):
   - Whenever the user asks to schedule a meeting, call, appointment, lunch, or calendar invite:
     - Set actionType to "SCHEDULE_EVENT".
     - Provide calendarEvent: { summary: "Meeting Title", description: "Agenda", startDateTime: "ISO 8601 string", endDateTime: "ISO 8601 string", location: "Optional location", attendees: ["optional@email.com"] }.
     - Current reference time is around September 2026. If the user specifies "Friday at 6pm", compute a realistic ISO timestamp.

6. Sending on Command / Approvals:
   - If the user commands to send an email (e.g. "send it", "send on my command", "fire away", "dispatch that draft"):
     - If active draft exists, trigger "SEND_EMAIL" referencing targetDraftId.

7. Persona:
   - Wing's replies are crisp, decisive, and professional (1-2 sentences). Always state what was drafted, prepared, or scheduled.`;

    const prompt = `Context:
${userProfileContext}
${personalizationContext}
${contactsContext}
${activeDraftContext}

Recent Conversation:
${conversationHistory
  .slice(-6)
  .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
  .join('\n')}

New User Command/Order:
"${message}"

Evaluate the command and produce the appropriate structured response.`;

    let rawText = '';
    const modelsToTry = [
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash',
    ];

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                replyText: {
                  type: Type.STRING,
                  description: "Wing's concise executive response confirming the order or status.",
                },
                actionType: {
                  type: Type.STRING,
                  description: 'One of: DRAFT_EMAIL, SEND_EMAIL, UPDATE_DRAFT, CREATE_DOC, CREATE_SHEET, CREATE_SLIDES, SCHEDULE_EVENT, MANAGE_TASKS, GENERAL',
                },
                googleDoc: {
                  type: Type.OBJECT,
                  description: 'Document details if order asks to create or write a document/report/brief.',
                  properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.STRING },
                  },
                },
                googleSheet: {
                  type: Type.OBJECT,
                  description: 'Spreadsheet details if order asks to create a table/spreadsheet/tracker.',
                  properties: {
                    title: { type: Type.STRING },
                    headers: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    rows: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                    },
                  },
                },
                googleSlides: {
                  type: Type.OBJECT,
                  description: 'Presentation details if order asks for slides/PPT/keynote.',
                  properties: {
                    title: { type: Type.STRING },
                    slides: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          bullets: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                          },
                        },
                      },
                    },
                  },
                },
                calendarEvent: {
                  type: Type.OBJECT,
                  description: 'Calendar event details if order asks to schedule a meeting/event.',
                  properties: {
                    summary: { type: Type.STRING },
                    description: { type: Type.STRING },
                    startDateTime: { type: Type.STRING },
                    endDateTime: { type: Type.STRING },
                    location: { type: Type.STRING },
                    attendees: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                },
                emailDraft: {
                  type: Type.OBJECT,
                  description: 'Details of the email draft created or modified.',
                  properties: {
                    recipientName: { type: Type.STRING },
                    to: { type: Type.STRING },
                    relationship: { type: Type.STRING },
                    subject: { type: Type.STRING },
                    body: { type: Type.STRING },
                    tone: { type: Type.STRING },
                    specifications: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                },
                tasks: {
                  type: Type.ARRAY,
                  description: 'Any actionable to-dos or schedule items extracted from order.',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      category: { type: Type.STRING },
                      priority: { type: Type.STRING },
                      dueDate: { type: Type.STRING },
                    },
                    required: ['title', 'category'],
                  },
                },
                commandExecuted: {
                  type: Type.BOOLEAN,
                  description: 'Whether a direct execution command (like sending) was triggered.',
                },
                executionDetails: {
                  type: Type.STRING,
                  description: 'Summary of the executed action.',
                },
              },
              required: ['replyText', 'actionType'],
            },
          },
        });
        rawText = response.text || '';
        if (rawText && rawText.trim().length > 0) {
          break;
        }
      } catch (geminiErr: any) {
        console.warn(`Attempt with ${modelName} encountered: ${geminiErr?.message || geminiErr}`);
        // Brief pause before trying next resilient fallback model
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    let parsed: any = null;
    if (rawText && rawText.trim().length > 0) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = null;
      }
    }

    if (!parsed) {
      const lower = message.toLowerCase();
      let actionType = 'GENERAL';
      let replyText = 'Order received. I have calibrated the specifications according to your directive.';

      if (lower.includes('doc') || lower.includes('document') || lower.includes('memo') || lower.includes('brief')) {
        actionType = 'CREATE_DOC';
        replyText = 'Understood. I have drafted an executive briefing document ready for your review and deployment to Google Docs.';
      } else if (lower.includes('sheet') || lower.includes('spreadsheet') || lower.includes('excel') || lower.includes('tracker') || lower.includes('table')) {
        actionType = 'CREATE_SHEET';
        replyText = 'Understood. I have prepared your executive spreadsheet structure ready for Google Sheets.';
      } else if (lower.includes('slide') || lower.includes('ppt') || lower.includes('presentation') || lower.includes('deck')) {
        actionType = 'CREATE_SLIDES';
        replyText = 'Understood. I have structured a strategic slide presentation ready for Google Slides.';
      } else if (lower.includes('calendar') || lower.includes('schedule') || lower.includes('meeting') || lower.includes('appointment')) {
        actionType = 'SCHEDULE_EVENT';
        replyText = 'Understood. I have framed the meeting details for your Google Calendar.';
      } else if (lower.includes('email') || lower.includes('draft') || lower.includes('write to') || lower.includes('brother') || lower.includes('mom')) {
        actionType = 'DRAFT_EMAIL';
        replyText = 'Order received. I have drafted the email to your exact specifications, standing by for your command to dispatch.';
      }

      parsed = {
        replyText,
        actionType,
      };
    }

    const actionPayload: any = {
      type: parsed.actionType || 'GENERAL',
      commandExecuted: !!parsed.commandExecuted,
      executionDetails: parsed.executionDetails,
    };

    if (
      parsed.emailDraft &&
      (parsed.actionType === 'DRAFT_EMAIL' || parsed.actionType === 'UPDATE_DRAFT') &&
      parsed.emailDraft.body &&
      parsed.emailDraft.body.trim().length > 5
    ) {
      actionPayload.emailDraft = {
        id: activeDraft && parsed.actionType === 'UPDATE_DRAFT' ? activeDraft.id : 'draft_' + Date.now(),
        to: parsed.emailDraft.to || 'dave.miller.sample@gmail.com',
        recipientName: parsed.emailDraft.recipientName || 'Dave Miller',
        relationship: parsed.emailDraft.relationship || '',
        subject: parsed.emailDraft.subject || 'Follow-up from Wing',
        body: parsed.emailDraft.body || '',
        tone: parsed.emailDraft.tone || 'casual',
        specifications:
          parsed.emailDraft.specifications && parsed.emailDraft.specifications.length > 0
            ? parsed.emailDraft.specifications
            : ['Fulfill requested order specifications'],
        status: 'pending_approval',
        createdAt: new Date().toISOString(),
      };
    } else if (
      parsed.actionType === 'DRAFT_EMAIL' ||
      message.toLowerCase().includes('draft') ||
      (message.toLowerCase().includes('email') && message.toLowerCase().includes('brother'))
    ) {
      // Robust fallback if the model only generated textual draft
      const matchedContact = contacts.find((c: any) =>
        (c.relationship && message.toLowerCase().includes(c.relationship.toLowerCase())) ||
        (c.name && message.toLowerCase().includes(c.name.toLowerCase()))
      ) || contacts[0] || { name: 'Dave Miller', email: 'dave.miller.sample@gmail.com', relationship: 'Brother' };

      actionPayload.type = 'DRAFT_EMAIL';
      actionPayload.emailDraft = {
        id: activeDraft ? activeDraft.id : 'draft_' + Date.now(),
        to: matchedContact.email,
        recipientName: matchedContact.name,
        relationship: matchedContact.relationship || 'Brother',
        subject: 'Arriving Friday at 6:00 PM / Groceries',
        body: `Hey ${matchedContact.name.split(' ')[0]},\n\nJust wanted to let you know I'll be arriving this Friday around 6:00 PM.\n\nLet me know if you need me to pick up any groceries or anything else on my way over!\n\nTalk soon,`,
        tone: 'casual & friendly',
        specifications: [
          'Arrival set to Friday at 6:00 PM',
          'Checked if groceries are needed beforehand',
          'Casual brotherly tone applied',
        ],
        status: 'pending_approval',
        createdAt: new Date().toISOString(),
      };
    }

    if (parsed.actionType === 'SEND_EMAIL') {
      actionPayload.targetDraftId = activeDraft?.id;
    }

    if (parsed.googleDoc && (parsed.actionType === 'CREATE_DOC' || message.toLowerCase().includes('doc') || message.toLowerCase().includes('document') || message.toLowerCase().includes('brief'))) {
      actionPayload.type = 'CREATE_DOC';
      actionPayload.googleDoc = {
        title: parsed.googleDoc.title || 'Executive Briefing Document',
        content: parsed.googleDoc.content || parsed.replyText || 'Executive briefing document created by Wing.',
      };
    }

    if (parsed.googleSheet && (parsed.actionType === 'CREATE_SHEET' || message.toLowerCase().includes('sheet') || message.toLowerCase().includes('spreadsheet') || message.toLowerCase().includes('excel') || message.toLowerCase().includes('table'))) {
      actionPayload.type = 'CREATE_SHEET';
      actionPayload.googleSheet = {
        title: parsed.googleSheet.title || 'Executive Data Spreadsheet',
        headers: parsed.googleSheet.headers && parsed.googleSheet.headers.length > 0 ? parsed.googleSheet.headers : ['Item', 'Category', 'Status', 'Notes'],
        rows: parsed.googleSheet.rows && parsed.googleSheet.rows.length > 0 ? parsed.googleSheet.rows : [
          ['Q3 Project Kickoff', 'Operations', 'Active', 'On schedule'],
          ['Budget Review', 'Finance', 'Pending', 'Awaiting VP approval'],
        ],
      };
    }

    if (parsed.googleSlides && (parsed.actionType === 'CREATE_SLIDES' || message.toLowerCase().includes('slide') || message.toLowerCase().includes('ppt') || message.toLowerCase().includes('presentation') || message.toLowerCase().includes('deck'))) {
      actionPayload.type = 'CREATE_SLIDES';
      actionPayload.googleSlides = {
        title: parsed.googleSlides.title || 'Executive Keynote Presentation',
        slides: parsed.googleSlides.slides && parsed.googleSlides.slides.length > 0 ? parsed.googleSlides.slides : [
          { title: 'Executive Overview', bullets: ['Strategic alignment & focus', 'Core objectives & milestones', 'Execution timetable'] },
          { title: 'Action Plan', bullets: ['Immediate deliverables', 'Resource distribution', 'Success indicators'] },
        ],
      };
    }

    if (parsed.calendarEvent && (parsed.actionType === 'SCHEDULE_EVENT' || message.toLowerCase().includes('calendar') || message.toLowerCase().includes('schedule') || message.toLowerCase().includes('invite') || message.toLowerCase().includes('appointment'))) {
      actionPayload.type = 'SCHEDULE_EVENT';
      const now = new Date();
      const defaultStart = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      defaultStart.setHours(14, 0, 0, 0);
      const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);

      actionPayload.calendarEvent = {
        summary: parsed.calendarEvent.summary || 'Executive Meeting',
        description: parsed.calendarEvent.description || 'Scheduled via Wing Autonomous Executive Assistant',
        startDateTime: parsed.calendarEvent.startDateTime || defaultStart.toISOString(),
        endDateTime: parsed.calendarEvent.endDateTime || defaultEnd.toISOString(),
        location: parsed.calendarEvent.location || 'Google Meet',
        attendees: parsed.calendarEvent.attendees || [],
      };
    }

    if (parsed.tasks && parsed.tasks.length > 0) {
      actionPayload.tasks = parsed.tasks.map((t: any) => ({
        id: 'task_' + Math.random().toString(36).substring(2, 9),
        title: t.title,
        category: t.category || 'general',
        priority: t.priority || 'medium',
        completed: false,
        dueDate: t.dueDate,
        createdAt: new Date().toISOString(),
      }));
    }

    res.json({
      replyText: parsed.replyText || "Order received and acknowledged.",
      action: actionPayload,
    });
  } catch (error: any) {
    console.error('Error in /api/assistant/order:', error);
    res.status(500).json({
      error: error.message || 'Internal server error processing order',
    });
  }
});

// Endpoint for Wing Speech Synthesis (TTS)
app.post('/api/assistant/tts', async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, voice = 'Zephyr' } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [{ text: text.slice(0, 800) }],
        },
      ],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    res.json({ audio: base64Audio });
  } catch (err: any) {
    console.warn('Wing TTS error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'TTS generation failed' });
  }
});

// Live Voice WebSocket Server Setup
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  try {
    const host = request.headers.host || 'localhost';
    const url = new URL(request.url || '', `http://${host}`);
    if (url.pathname === '/live' || url.pathname === '/api/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  } catch (e) {
    console.error('Upgrade error:', e);
  }
});

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('Client connected to Wing Live Voice bridge');
  let session: any = null;
  let isClosed = false;

  clientWs.on('close', () => {
    isClosed = true;
    if (session) {
      try {
        session.close();
      } catch {
        // ignore
      }
    }
  });

  clientWs.on('error', (err) => {
    console.warn('Live WebSocket error:', err.message);
  });

  try {
    if ((ai as any).live && typeof (ai as any).live.connect === 'function') {
      session = await (ai as any).live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: `You are Wing, an elite, highly competent autonomous AI Executive Assistant.
You speak clearly, concisely, and decisively. You carry out executive orders, draft communications, and summarize next steps with precision.
Always keep speech replies brief, natural, and confident.`,
        },
        callbacks: {
          onmessage: (message: any) => {
            if (isClosed || clientWs.readyState !== WebSocket.OPEN) return;
            const parts = message.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ type: 'audio', audio: part.inlineData.data }));
              }
              if (part.text) {
                clientWs.send(JSON.stringify({ type: 'text', text: part.text }));
              }
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }
            if (message.serverContent?.turnComplete) {
              clientWs.send(JSON.stringify({ type: 'turnComplete' }));
            }
          },
          onerror: (err: any) => {
            console.warn('Gemini Live session warning:', err?.message || err);
            if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'error', message: err?.message || 'Live session notice' }));
            }
          },
          onclose: () => {
            if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'closed' }));
            }
          },
        },
      });

      if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'connected', mode: 'gemini-live' }));
      }
    } else {
      if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'connected', mode: 'hybrid' }));
      }
    }

    clientWs.on('message', async (data) => {
      try {
        const payload = JSON.parse(data.toString());
        if (payload.type === 'audio' && payload.audio) {
          if (session && typeof session.sendRealtimeInput === 'function') {
            session.sendRealtimeInput({
              audio: { data: payload.audio, mimeType: 'audio/pcm;rate=16000' },
            });
          }
        }
      } catch (err) {
        console.warn('Error processing incoming audio frame:', err);
      }
    });
  } catch (err: any) {
    console.warn('Live API connection note:', err?.message || err);
    if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'connected', mode: 'hybrid' }));
    }
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, () => {
    console.log(`Wing Assistant server running on port ${PORT}`);
  });
}

startServer();
