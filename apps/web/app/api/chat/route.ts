import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;

interface ChatCompletionMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequestBody {
  history?: unknown;
}

function parseHistory(raw: unknown): ChatCompletionMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (msg): msg is { role: unknown; content: unknown } =>
        typeof msg === "object" && msg !== null,
    )
    .filter(
      (msg): msg is ChatCompletionMessage =>
        (msg.role === "user" || msg.role === "assistant" || msg.role === "system") &&
        typeof msg.content === "string" &&
        msg.content.trim().length > 0,
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((msg) => ({
      role: msg.role,
      // Enforce a sane per-message cap so a single request cannot blow up tokens
      content: msg.content.slice(0, MAX_MESSAGE_LENGTH),
    }));
}

// In-memory cache for user game context (avoids re-querying Firestore on every chat message)
const userContextCache = new Map<string, { data: string; ts: number }>();
const CONTEXT_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function buildUserGamesContext(uid: string): Promise<string> {
  // Return cached context if still fresh
  const cached = userContextCache.get(uid);
  if (cached && Date.now() - cached.ts < CONTEXT_TTL_MS) {
    return cached.data;
  }

  try {
    const db = getAdminDb();
    const userDocSnap = await db.collection("users").doc(uid).get();
    const userData = userDocSnap.data() || {};

    let gamesContext = "User Profile Information:\n";
    gamesContext += `- Name: ${userData.displayName || "Gamer"}\n`;
    if (userData.country) gamesContext += `- Country: ${userData.country}\n`;
    if (userData.platform) gamesContext += `- Preferred Platform: ${userData.platform}\n`;
    if (userData.gender) gamesContext += `- Gender: ${userData.gender}\n`;

    gamesContext += "\nUser Games Lists:\n";
    const listsSnap = await db.collection("users").doc(uid).collection("lists").get();
    if (listsSnap.empty) {
      gamesContext += "(User has no custom game lists yet)\n";
      userContextCache.set(uid, { data: gamesContext, ts: Date.now() });
      return gamesContext;
    }

    // Fetch all sub-collections in parallel instead of sequentially (fixes N+1)
    const listsWithGames = await Promise.all(
      listsSnap.docs.map(async (listDoc) => {
        const listName = listDoc.data().name || listDoc.id;
        const gamesSnap = await listDoc.ref.collection("games").get();
        return { listName, gamesSnap };
      }),
    );

    for (const { listName, gamesSnap } of listsWithGames) {
      if (!gamesSnap.empty) {
        const games = gamesSnap.docs
          .map((g) => (g.data().name as string | undefined) ?? "")
          .filter(Boolean)
          .join(", ");
        gamesContext += `- ${listName}: ${games}\n`;
      } else {
        gamesContext += `- ${listName}: (Empty)\n`;
      }
    }

    // Store in cache before returning
    userContextCache.set(uid, { data: gamesContext, ts: Date.now() });
    return gamesContext;
  } catch (e) {
    console.error("Error fetching context:", e);
    return "User Profile Information: (unavailable)\n";
  }
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate via the Firebase session cookie or a Bearer ID token —
    //    never trust a client-supplied uid, it would allow reading other
    //    users' data.
    const sessionCookie = request.headers
      .get("cookie")
      ?.split(/;\s*/)
      .find((c) => c.startsWith("__session="))
      ?.split("=")
      .slice(1)
      .join("=");

    const bearerToken = request.headers
      .get("authorization")
      ?.match(/^Bearer\s+(.+)$/i)?.[1];

    let uid: string | null = null;
    try {
      if (sessionCookie) {
        uid = (await getAdminAuth().verifySessionCookie(sessionCookie, true)).uid;
      } else if (bearerToken) {
        uid = (await getAdminAuth().verifyIdToken(bearerToken)).uid;
      }
    } catch {
      uid = null;
    }

    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Validate the request body
    const body = (await request.json().catch(() => null)) as ChatRequestBody | null;
    const history = parseHistory(body?.history);

    if (history.length === 0) {
      return NextResponse.json({ error: "Missing or invalid history" }, { status: 400 });
    }

    const gamesContext = await buildUserGamesContext(uid);

    const systemPrompt: ChatCompletionMessage = {
      role: "system",
      content: `You are a friendly and knowledgeable AI assistant in a web app called "Gaming Zone".
Your sole purpose is to discuss video games, gaming news, recommendations, hardware, and e-sports.
Do NOT answer questions outside the domain of video games. If asked about something else, politely decline and steer the conversation back to gaming.

Here is the context about the current user (Use this information to personalize your answers. For example, recommend games available on their preferred platform, related to games they play, or acknowledge their favorites):
${gamesContext}`,
    };

    const payload: ChatCompletionMessage[] = [systemPrompt, ...history];

    try {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) throw new Error("Missing Gemini Key");

      // Map history for Gemini format
      const geminiMessages = payload.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: geminiMessages }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini failed:", response.status, errorText);
        throw new Error("Gemini failed");
      }

      const data = await response.json();
      const text: string | undefined =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error("Gemini returned an empty response");

      return NextResponse.json({ text, model: "Gemini" });
    } catch {
      console.log("Falling back to Groq...");

      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) {
        return NextResponse.json({ error: "AI providers unavailable" }, { status: 500 });
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: payload,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Groq failed:", response.status, errorText);
        return NextResponse.json({ error: "All AI providers failed" }, { status: 500 });
      }

      const data = await response.json();
      const text: string | undefined = data?.choices?.[0]?.message?.content;

      if (!text) {
        return NextResponse.json({ error: "All AI providers failed" }, { status: 500 });
      }

      return NextResponse.json({ text, model: "Groq Llama-3" });
    }
  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
