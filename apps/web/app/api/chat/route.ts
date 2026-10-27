import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;

// Rate limiting / quotas (in-memory; for prod prefer Redis shared store)
const rateLimitMinute = new Map<string, { count: number; reset: number }>();
const rateLimitHour = new Map<string, { count: number; reset: number }>();
const dailyReq = new Map<string, { count: number; reset: number }>();
const dailyTokens = new Map<string, { used: number; reset: number }>();

// Token estimation margins per model (tunable via env after ratio logging)
const DEFAULT_TOKEN_MARGIN = 1.18;
const MODEL_TOKEN_MARGIN: Record<string, number> = {
  "gemini-2.5-flash": Number(process.env.TOKEN_MARGIN_GEMINI || "1.15"),
  "llama-3.1-8b-instant": Number(process.env.TOKEN_MARGIN_GROQ || "1.18"),
};

// Ratio logging samples (in-memory ring buffer for hot tuning)
const tokenEstSamples: Array<{
  model: string;
  estimatedRaw: number;
  estimatedWithMargin: number;
  actual: number;
  ratio: number; // estimatedRaw / actual
  marginUsed: number;
  locale?: string;
  ts: number;
}> = [];
const MAX_SAMPLES = 500;

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

function utcDayKey(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function endOfUtcDayMs(d = new Date()) {
  const e = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
  return e.getTime();
}

function estimateTokens(text: string) {
  // Chars/4 heuristic as baseline; margin applied per-model
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

function getModelMargin(model: string) {
  return MODEL_TOKEN_MARGIN[model] ?? DEFAULT_TOKEN_MARGIN;
}

function logTokenEstimation(sample: Omit<(typeof tokenEstSamples)[number], "ts"> & { ts?: number }) {
  const s = { ...sample, ts: sample.ts ?? Date.now() };
  tokenEstSamples.push(s);
  if (tokenEstSamples.length > MAX_SAMPLES) {
    tokenEstSamples.shift();
  }
  // Structured log for log drains
  try {
    console.log(
      JSON.stringify({
        type: "token_estimation",
        ...s,
      }),
    );
  } catch {
    // ignore
  }
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

    const now = Date.now();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rlKey = `chat:${uid}`;
    const ipKey = `chat:ip:${ip}`;

    // Minute rate limit
    const m = rateLimitMinute.get(rlKey);
    if (m && now < m.reset && m.count >= 10) {
      const retryAfter = Math.ceil((m.reset - now) / 1000);
      return NextResponse.json(
        { error: "Rate limited", code: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }
    if (!m || now >= m.reset) {
      rateLimitMinute.set(rlKey, { count: 1, reset: now + 60_000 });
    } else {
      m.count++;
    }

    // Hourly rate limit
    const h = rateLimitHour.get(rlKey);
    if (h && now < h.reset && h.count >= 60) {
      const retryAfter = Math.ceil((h.reset - now) / 1000);
      return NextResponse.json(
        { error: "Rate limited", code: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }
    if (!h || now >= h.reset) {
      rateLimitHour.set(rlKey, { count: 1, reset: now + 3600_000 });
    } else {
      h.count++;
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

    // Token estimation for gating
    const day = utcDayKey(new Date());
    const dayEnd = endOfUtcDayMs(new Date());
    const dailyReqLimit = Number(process.env.CHAT_DAILY_REQ_LIMIT || "50");
    const dailyTokenLimit = Number(process.env.CHAT_DAILY_TOKEN_LIMIT || "250000");

    const dr = dailyReq.get(`${rlKey}:d:${day}`);
    if (dr && now < dr.reset && dr.count >= dailyReqLimit) {
      const retryAfter = Math.ceil((dr.reset - now) / 1000);
      return NextResponse.json(
        { error: "Daily request quota exceeded", code: "daily_quota_exceeded" },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }
    if (!dr || now >= dr.reset) {
      dailyReq.set(`${rlKey}:d:${day}`, { count: 1, reset: dayEnd });
    } else {
      dr.count++;
    }

    // Estimate tokens for payload
    const payloadText = payload.map((m) => m.content).join("\n");
    const estimatedRaw = estimateTokens(payloadText);
    const geminiModel = "gemini-2.5-flash";
    const groqModel = "llama-3.1-8b-instant";
    const marginG = getModelMargin(geminiModel);
    const estimatedWithMarginG = Math.ceil(estimatedRaw * marginG);

    const dt = dailyTokens.get(`${rlKey}:t:${day}`);
    const usedTokens = dt && now < dt.reset ? dt.used : 0;
    if (estimatedWithMarginG > dailyTokenLimit - usedTokens) {
      const retryAfter = Math.ceil((dayEnd - now) / 1000);
      return NextResponse.json(
        { error: "Daily token quota exceeded", code: "daily_quota_exceeded" },
        { status: 429, headers: { "Retry-After": String(retryAfter), "X-TokenLimit-Remaining": String(Math.max(0, dailyTokenLimit - usedTokens)) } },
      );
    }

    try {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) throw new Error("Missing Gemini Key");

      // Map history for Gemini format
      const geminiMessages = payload.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
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

      // Reconcile with actual usage
      const usage = (data as any)?.usageMetadata;
      const actualTokens = Number(usage?.totalTokenCount || 0);
      if (actualTokens > 0) {
        const ratio = estimatedRaw > 0 ? estimatedRaw / actualTokens : 1;
        logTokenEstimation({
          model: geminiModel,
          estimatedRaw,
          estimatedWithMargin: estimatedWithMarginG,
          actual: actualTokens,
          ratio,
          marginUsed: marginG,
        });
        const dtt = dailyTokens.get(`${rlKey}:t:${day}`);
        if (!dtt || now >= dtt.reset) {
          dailyTokens.set(`${rlKey}:t:${day}`, { used: actualTokens, reset: dayEnd });
        } else {
          dtt.used += actualTokens;
        }
      } else {
        // Fallback: charge estimated with margin
        const dtt = dailyTokens.get(`${rlKey}:t:${day}`);
        const charge = estimatedWithMarginG;
        if (!dtt || now >= dtt.reset) {
          dailyTokens.set(`${rlKey}:t:${day}`, { used: charge, reset: dayEnd });
        } else {
          dtt.used += charge;
        }
      }

      return NextResponse.json({ text, model: "Gemini" });
    } catch {
      console.log("Falling back to Groq...");

      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) {
        return NextResponse.json({ error: "AI providers unavailable" }, { status: 500 });
      }

      const marginGroq = getModelMargin(groqModel);
      const estimatedWithMarginGroq = Math.ceil(estimatedRaw * marginGroq);
      const dt2 = dailyTokens.get(`${rlKey}:t:${day}`);
      const usedTokens2 = dt2 && now < dt2.reset ? dt2.used : 0;
      if (estimatedWithMarginGroq > dailyTokenLimit - usedTokens2) {
        const retryAfter = Math.ceil((dayEnd - now) / 1000);
        return NextResponse.json(
          { error: "Daily token quota exceeded", code: "daily_quota_exceeded" },
          { status: 429, headers: { "Retry-After": String(retryAfter), "X-TokenLimit-Remaining": String(Math.max(0, dailyTokenLimit - usedTokens2)) } },
        );
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: groqModel,
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

      const usageGroq = (data as any)?.usage;
      const actualTokensG = Number(usageGroq?.total_tokens || 0);
      if (actualTokensG > 0) {
        const ratioG = estimatedRaw > 0 ? estimatedRaw / actualTokensG : 1;
        logTokenEstimation({
          model: groqModel,
          estimatedRaw,
          estimatedWithMargin: estimatedWithMarginGroq,
          actual: actualTokensG,
          ratio: ratioG,
          marginUsed: marginGroq,
        });
        const dttg = dailyTokens.get(`${rlKey}:t:${day}`);
        if (!dttg || now >= dttg.reset) {
          dailyTokens.set(`${rlKey}:t:${day}`, { used: actualTokensG, reset: dayEnd });
        } else {
          dttg.used += actualTokensG;
        }
      } else {
        const dttg = dailyTokens.get(`${rlKey}:t:${day}`);
        const chargeG = estimatedWithMarginGroq;
        if (!dttg || now >= dttg.reset) {
          dailyTokens.set(`${rlKey}:t:${day}`, { used: chargeG, reset: dayEnd });
        } else {
          dttg.used += chargeG;
        }
      }

      return NextResponse.json({ text, model: "Groq Llama-3" });
    }
  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
