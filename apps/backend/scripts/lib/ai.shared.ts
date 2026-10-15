/**
 * Pure (no I/O, no env) pieces of the AI provider chain used by the summary
 * jobs. Gemini is tried first, Groq is the fallback; both are OpenAI-ish JSON
 * generators and share the defensive parsing in `articleSummary.shared.ts`.
 *
 * Split out from `ai.ts` so the request/response mapping — and, crucially, the
 * provider-selection rules — can be unit tested without `fetch`, env vars or
 * booting the Appwrite client.
 */

type AiProvider = 'gemini' | 'groq';

/** Providers in fallback order. */
const AI_PROVIDERS = ['gemini', 'groq'] as const;

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Groq's default fallback model. Must be a *chat/generative* model —
 * classifier-only models (e.g. `meta-llama/llama-prompt-guard-2-*`) cannot
 * produce summaries. Model availability is account-specific, so override per
 * environment with `GROQ_MODEL` when the default isn't granted to the key.
 */
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';

const AI_TIMEOUT_MS = 25_000;
const AI_RETRIES = 3;

interface AiProviderKeys {
  geminiKey: string | null;
  groqKey: string | null;
  /** `AI_PROVIDER` — forces a single provider (smoke tests / ops). */
  override?: AiProvider | null;
}

/**
 * Ordered list of providers to try, given which API keys are configured.
 *
 * `override` (env `AI_PROVIDER`) forces a single provider so the Groq path can
 * be exercised without unsetting `GEMINI_API_KEY`. When an override is set but
 * its key is missing the list is empty, so the caller fails loudly instead of
 * silently falling back to the other provider.
 */
function resolveAiProviders(keys: AiProviderKeys): AiProvider[] {
  const override = keys.override ?? null;
  if (override === 'gemini') return keys.geminiKey ? ['gemini'] : [];
  if (override === 'groq') return keys.groqKey ? ['groq'] : [];

  return AI_PROVIDERS.filter((provider) =>
    provider === 'gemini' ? Boolean(keys.geminiKey) : Boolean(keys.groqKey),
  );
}

/** Gemini `generateContent` body. `temperature` is omitted when undefined. */
function buildGeminiRequestBody(
  prompt: string,
  schema: Record<string, unknown>,
  temperature?: number,
): Record<string, unknown> {
  const generationConfig: Record<string, unknown> = {
    response_mime_type: 'application/json',
    // Omitting `required`: a single missing language must not invalidate an
    // otherwise usable response (the caller parses defensively).
    responseSchema: schema,
  };
  if (temperature !== undefined) generationConfig.temperature = temperature;

  return {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig,
  };
}

/** Groq OpenAI-compatible chat-completions body (JSON mode). */
function buildGroqRequestBody(
  model: string,
  prompt: string,
  temperature?: number,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  };
  if (temperature !== undefined) body.temperature = temperature;
  return body;
}

function extractGeminiText(data: unknown): string {
  const payload = data as {
    error?: unknown;
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  if (payload?.error) {
    throw new Error(`Gemini API error: ${JSON.stringify(payload.error)}`);
  }
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(`Gemini returned no text: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return text;
}

function extractGroqText(data: unknown): string {
  const payload = data as {
    error?: unknown;
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (payload?.error) {
    throw new Error(`Groq API error: ${JSON.stringify(payload.error)}`);
  }
  const text = payload?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error(`Groq returned no text: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return text;
}

export {
  AI_PROVIDERS,
  GEMINI_BASE_URL,
  GROQ_CHAT_COMPLETIONS_URL,
  DEFAULT_GROQ_MODEL,
  AI_TIMEOUT_MS,
  AI_RETRIES,
  resolveAiProviders,
  buildGeminiRequestBody,
  buildGroqRequestBody,
  extractGeminiText,
  extractGroqText,
};
export type { AiProvider, AiProviderKeys };
