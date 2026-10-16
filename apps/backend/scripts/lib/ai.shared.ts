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
/**
 * Extra attempts granted on top of `retries` when a provider explicitly asks us
 * to slow down (HTTP 429 + `retryDelay`). A per-minute quota is temporary, so
 * waiting and retrying the same provider beats dropping to the fallback.
 */
const AI_RATE_LIMIT_RETRIES = 2;
/** Upper bound on a single rate-limit wait, so a bogus hint cannot stall a run. */
const AI_MAX_RATE_LIMIT_WAIT_MS = 65_000;
/** Wait used when a 429 arrives without a usable `retryDelay`. */
const AI_RATE_LIMIT_DEFAULT_WAIT_MS = 30_000;

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

/**
 * A provider rate-limit failure (Gemini HTTP 429 / `RESOURCE_EXHAUSTED`).
 * Carries the wait the server asked for so the retry loop can honour it
 * instead of treating the call as terminal and switching providers.
 */
class AiRateLimitError extends Error {
  readonly retryAfterMs: number;

  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = 'AiRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Wait requested by a rate-limit error, or `null` for any other failure.
 *
 * Duck-typed as well as `instanceof`-checked: a bundler can inline this module
 * into more than one chunk, which would break a pure `instanceof` test.
 */
function rateLimitRetryAfterMs(error: unknown): number | null {
  if (error instanceof AiRateLimitError) return error.retryAfterMs;
  if (typeof error === 'object' && error !== null) {
    const record = error as { name?: unknown; retryAfterMs?: unknown };
    if (record.name === 'AiRateLimitError' && typeof record.retryAfterMs === 'number') {
      return record.retryAfterMs;
    }
  }
  return null;
}

/**
 * Parses a Google `RetryInfo.retryDelay` duration string (e.g. `"23s"`,
 * `"1.5s"`) into milliseconds. Anything else yields `null`.
 */
function parseRetryDelayMs(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d+(?:\.\d+)?)s$/i.exec(value.trim());
  if (!match) return null;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds * 1000) : null;
}

/** `retryDelay` from a Gemini error payload's `RetryInfo` detail, if present. */
function geminiRetryDelayMs(data: unknown): number | null {
  const error = (data as { error?: { details?: unknown } } | undefined)?.error;
  if (!error || !Array.isArray(error.details)) return null;

  for (const detail of error.details) {
    const delay = parseRetryDelayMs((detail as { retryDelay?: unknown } | null)?.retryDelay);
    if (delay !== null) return delay;
  }
  return null;
}

/** True when a Gemini response is a quota/rate-limit rejection. */
function isGeminiRateLimit(status: number, data: unknown): boolean {
  if (status === 429) return true;
  const error = (data as { error?: { code?: unknown; status?: unknown } } | undefined)?.error;
  return error?.code === 429 || error?.status === 'RESOURCE_EXHAUSTED';
}

/** `Retry-After` (seconds) when a provider sends the hint as a header instead. */
function headerRetryDelayMs(
  headers: { get?: (name: string) => string | null } | undefined,
): number | null {
  const raw = headers?.get?.('retry-after');
  if (!raw) return null;
  const seconds = Number(raw.trim());
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds * 1000) : null;
}

export {
  AI_PROVIDERS,
  GEMINI_BASE_URL,
  GROQ_CHAT_COMPLETIONS_URL,
  DEFAULT_GROQ_MODEL,
  AI_TIMEOUT_MS,
  AI_RETRIES,
  AI_RATE_LIMIT_RETRIES,
  AI_MAX_RATE_LIMIT_WAIT_MS,
  AI_RATE_LIMIT_DEFAULT_WAIT_MS,
  AiRateLimitError,
  rateLimitRetryAfterMs,
  parseRetryDelayMs,
  geminiRetryDelayMs,
  isGeminiRateLimit,
  headerRetryDelayMs,
  resolveAiProviders,
  buildGeminiRequestBody,
  buildGroqRequestBody,
  extractGeminiText,
  extractGroqText,
};
export type { AiProvider, AiProviderKeys };
