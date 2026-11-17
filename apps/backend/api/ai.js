/**
 * AI chat proxy — the server-side half of the in-app gaming assistant.
 *
 * Provider keys (Gemini / Groq) must never ship inside the mobile bundle:
 * anything in the APK can be extracted, and a leaked key means a drained
 * quota. The mobile app therefore sends only the conversation history plus a
 * Firebase ID token, and this endpoint does the rest with admin privileges:
 *
 *   1. verify the caller (Bearer token → `req.authUid`, revoked tokens rejected)
 *   2. read the caller's profile + game lists from Firestore (server-side, so
 *      the mobile client needs no direct provider calls at all)
 *   3. build the personalised system prompt
 *   4. call Gemini 2.5 Flash, falling back to Groq (same strategy the app used
 *      to run client-side), and return `{ text, model }`
 *
 * Response shape is identical to the previous client-side implementation, so
 * the hook consuming it (`useAIChat`) keeps its contract unchanged.
 */
import { getAdmin } from './firebaseAdmin.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Input guards: the client already limits history to the last 10 messages and
// content to chat-message lengths; the server enforces the same bounds so a
// crafted request cannot inflate provider costs.
const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;
const ALLOWED_ROLES = new Set(['user', 'assistant']);

/** Port of the mobile `NotificationService.getTopicName` sanitisation (same ids). */
function sanitizeSegment(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9-_.~%]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Requires `Authorization: Bearer <Firebase ID token>`; attaches `req.authUid`.
 * Same contract as the social middleware: `verifyIdToken(token, true)` also
 * rejects revoked sessions.
 */
function requireAuth(AppError) {
  return async (req, _res, next) => {
    const admin = await getAdmin();
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
    if (!token || !admin) {
      return next(new AppError('Authorization header with a Firebase ID token is required', 401));
    }
    try {
      const decoded = await admin.auth.verifyIdToken(token, true);
      req.authUid = decoded.uid;
      next();
    } catch (err) {
      console.warn('[ai] verifyIdToken failed:', err?.code ?? err?.message ?? err);
      return next(new AppError('Invalid or expired session token', 401));
    }
  };
}

/**
 * Builds the personalised context block from the caller's profile and game
 * lists. Read with admin privileges so the (now stricter) client rules never
 * matter here. Failures degrade to an empty context — a generic answer beats
 * a failed request.
 */
async function getUserGamesContext(admin, uid) {
  try {
    const userRef = admin.firestore.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() ?? {} : {};

    let context = 'User Profile Information:\n';
    context += `- Name: ${userData.displayName || 'Gamer'}\n`;
    if (userData.country) context += `- Country: ${userData.country}\n`;
    if (userData.platform) context += `- Preferred Platform: ${userData.platform}\n`;
    if (userData.gender) context += `- Gender: ${userData.gender}\n`;
    if (userData.dob) context += `- Date of Birth: ${userData.dob}\n`;

    context += '\nUser Games Lists:\n';

    const listsSnap = await userRef.collection('lists').get();
    if (listsSnap.empty) {
      context += '(User has no custom game lists yet)\n';
      return context;
    }

    for (const listDoc of listsSnap.docs) {
      const listName = listDoc.data()?.name || listDoc.id;
      const gamesSnap = await listDoc.ref.collection('games').get();
      if (gamesSnap.empty) {
        context += `- ${listName}: (Empty)\n`;
      } else {
        const games = gamesSnap.docs.map((g) => g.data()?.name).filter(Boolean).join(', ');
        context += `- ${listName}: ${games}\n`;
      }
    }

    return context;
  } catch (err) {
    console.warn('[ai] context build failed:', err?.message ?? err);
    return '';
  }
}

/** Calls Gemini 2.5 Flash. Throws with the upstream status on failure. */
async function callGemini(messages) {
  if (!GEMINI_API_KEY) throw new Error('Missing Gemini API Key');

  const geminiMessages = messages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({ contents: geminiMessages }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini Error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

/** Calls Groq llama-3.1-8b-instant. Throws with the upstream status on failure. */
async function callGroq(messages) {
  if (!GROQ_API_KEY) throw new Error('Missing Groq API Key');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq Error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Mounts the AI endpoints. `AppError`/`asyncRoute` are injected by index.js so
 * this module does not import from the entry point (which would be circular).
 */
export function registerAiRoutes(app, { AppError, asyncRoute }) {
  const auth = requireAuth(AppError);

  app.post(
    '/ai/chat',
    auth,
    asyncRoute(async (req, res) => {
      const history = req.body?.history;

      if (!Array.isArray(history) || history.length === 0) {
        throw new AppError('history must be a non-empty array of messages', 400);
      }
      if (history.length > MAX_HISTORY_MESSAGES) {
        throw new AppError(`history is limited to ${MAX_HISTORY_MESSAGES} messages`, 400);
      }
      for (const msg of history) {
        if (!msg || !ALLOWED_ROLES.has(msg.role) || typeof msg.content !== 'string') {
          throw new AppError('each message must have role "user" or "assistant" and string content', 400);
        }
        if (msg.content.length > MAX_MESSAGE_LENGTH) {
          throw new AppError(`message content is limited to ${MAX_MESSAGE_LENGTH} characters`, 400);
        }
      }

      const admin = await getAdmin();
      if (!admin) {
        throw new AppError('AI service is not configured', 500);
      }

      const gamesContext = await getUserGamesContext(admin, req.authUid);

      const systemPrompt = {
        role: 'system',
        content: `You are a friendly and knowledgeable AI assistant in a mobile app called "Gaming Zone".
Your sole purpose is to discuss video games, gaming news, recommendations, hardware, and e-sports.
Do NOT answer questions outside the domain of video games. If asked about something else, politely decline and steer the conversation back to gaming.

Here is the context about the current user (Use this information to personalize your answers. For example, recommend games available on their preferred platform, related to games they play, or acknowledge their favorites):
${gamesContext}`,
      };

      const payload = [systemPrompt, ...history];

      // Strategy: Gemini -> Groq (unchanged from the previous client behaviour).
      try {
        const text = await callGemini(payload);
        res.setHeader('Cache-Control', 'no-store');
        res.json({ text, model: 'Gemini' });
      } catch (errGemini) {
        console.warn('[ai] Gemini failed, trying Groq:', errGemini?.message ?? errGemini);
        try {
          const text = await callGroq(payload);
          res.setHeader('Cache-Control', 'no-store');
          res.json({ text, model: 'Groq Llama-3' });
        } catch (errGroq) {
          console.error('[ai] All AI providers failed.', errGroq);
          throw new AppError('All AI providers are currently unavailable.', 502);
        }
      }
    }),
  );
}
