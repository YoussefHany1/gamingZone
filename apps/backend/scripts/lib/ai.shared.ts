/**
 * Pure (no I/O, no env) pieces of the AI model chain used by the summary jobs
 * and any future AI-driven script. Models are tried in fallback order —
 * `gemini-2.5-flash` → `gemini-3.1-flash-lite` → Groq — and both providers are
 * OpenAI-ish JSON generators sharing the defensive parsing in
 * `articleSummary.shared.ts`.
 *
 * Split out from `ai.ts` so the request/response mapping — and, crucially, the
 * chain-selection rules — can be unit tested without `fetch`, env vars or
 * booting the Appwrite client.
 *
 * This module must stay 100% free of `process.env`: env wiring lives in
 * `lib/config`, which passes everything in (e.g. the Groq model id comes via
 * `resolveAiModels`' `defaultGroqModel` argument, not from the environment).
 */

type AiProvider = 'gemini' | 'groq' | 'cerebras';

/** Providers that have a request adapter implemented in `ai.ts`. */
const KNOWN_AI_PROVIDERS = ['gemini', 'groq', 'cerebras'] as const;

/** One stop in the fallback chain: which adapter to use, and which model id. */
interface AiModel {
  provider: AiProvider;
  model: string;
}

/** Result of a chain run — which model produced the text. */
interface AiTextResult {
  provider: AiProvider;
  model: string;
  text: string;
}

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
const CEREBRAS_CHAT_COMPLETIONS_URL = 'https://api.cerebras.ai/v1/chat/completions';

/**
 * Groq's default fallback models, best first. Must be *chat/generative* models
 * — classifier-only models (e.g. `meta-llama/llama-prompt-guard-2-*`) cannot
 * produce summaries: they answer with verdict labels like `safe`, which would
 * pass the HTTP layer and then fail JSON parsing, failing the task instead of
 * failing over. Model availability is account-specific, so override per
 * environment with `GROQ_MODELS` (or single `GROQ_MODEL`) when these aren't
 * granted to the key.
 */
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_GROQ_MODELS = [DEFAULT_GROQ_MODEL, 'openai/gpt-oss-20b'];

/**
 * Cerebras Cloud's default fallback models (OpenAI-compatible chat completions
 * with `json_object` JSON mode). Generative models only, current public
 * line-up verified against the Cerebras docs; override with `CEREBRAS_MODELS`
 * when the key's access differs.
 */
const DEFAULT_CEREBRAS_MODEL = 'gpt-oss-120b';
const DEFAULT_CEREBRAS_MODELS = [DEFAULT_CEREBRAS_MODEL, 'qwen-3.8-27b'];

const AI_TIMEOUT_MS = 25_000;
const AI_RETRIES = 3;
/**
 * Extra attempts granted on top of `retries` when a provider explicitly asks us
 * to slow down (HTTP 429 + `retryDelay`). A per-minute quota is temporary, so
 * waiting and retrying the same model beats dropping to the fallback.
 */
const AI_RATE_LIMIT_RETRIES = 2;
/**
 * Longest rate-limit wait worth honouring. A larger `retryDelay` is not a
 * momentary per-minute burst but quota exhaustion (an hour/day-scale reset),
 * where waiting would only burn the run's time budget — so the caller fails
 * over to the next model in the chain immediately instead.
 */
const AI_MAX_RATE_LIMIT_WAIT_MS = 60_000;
/** Wait used when a 429 arrives without a usable `retryDelay`. */
const AI_RATE_LIMIT_DEFAULT_WAIT_MS = 30_000;

/** Per-provider API keys actually configured (a missing key disables its models). */
interface AiProviderKeys {
  geminiKey: string | null;
  groqKey: string | null;
  cerebrasKey: string | null;
}

/**
 * Everything the AI chain needs, resolved from env by `lib/config`. Pure data —
 * `ai.shared` and `ai` never touch `process.env` themselves.
 */
interface AiProviderConfig extends AiProviderKeys {
  /** Groq model ids (env `GROQ_MODELS` / `GROQ_MODEL`); the default chain's Groq segment. */
  groqModels?: string[] | null;
  /** Cerebras model ids (env `CEREBRAS_MODELS`); the default chain's Cerebras segment. */
  cerebrasModels?: string[] | null;
  /** Raw `AI_CHAIN` env value; parsed per call via `parseAiChainValue`. */
  chainEnv?: string | null;
  /** `AI_PROVIDER` — forces a single provider (smoke tests / ops). */
  override?: AiProvider | null;
}

/**
 * The default fallback chain: the strongest flash model first, the cheaper
 * flash-lite second, then the Groq segment and finally the Cerebras segment
 * (each best first — Cerebras is a third cloud, the true last resort). Model
 * availability is account-specific, so the whole chain can be re-ordered or
 * replaced via `AI_CHAIN` without code changes.
 */
function defaultAiChain(
  groqModels: string[] = DEFAULT_GROQ_MODELS,
  cerebrasModels: string[] = DEFAULT_CEREBRAS_MODELS,
): AiModel[] {
  return [
    { provider: 'gemini', model: 'gemini-2.5-flash' },
    { provider: 'gemini', model: 'gemini-3.1-flash-lite' },
    ...groqModels.map((model) => ({ provider: 'groq' as const, model })),
    ...cerebrasModels.map((model) => ({ provider: 'cerebras' as const, model })),
  ];
}

/**
 * Parses an `AI_CHAIN` env value into models. The grammar is deliberately
 * structural, not a "has a slash" heuristic:
 *
 * - `<model-id>`            → a Gemini model (Gemini ids never contain `/`)
 * - `<provider>/<model-id>` → an explicit provider; only the FIRST slash
 *                             splits, because model ids themselves contain
 *                             slashes (`groq/openai/gpt-oss-120b`,
 *                             `groq/meta-llama/llama-3.3-70b-versatile`).
 *
 * Unknown provider prefixes and empty model ids THROW — a typo'd chain must
 * fail loudly, never silently degrade to fewer models.
 */
function parseAiChainValue(value: string): AiModel[] {
  const models: AiModel[] = [];
  for (const rawEntry of value.split(',')) {
    const entry = rawEntry.trim();
    if (!entry) continue;

    const slashIndex = entry.indexOf('/');
    if (slashIndex === -1) {
      models.push({ provider: 'gemini', model: entry });
      continue;
    }

    const prefix = entry.slice(0, slashIndex);
    const model = entry.slice(slashIndex + 1);
    if (!KNOWN_AI_PROVIDERS.includes(prefix as AiProvider)) {
      throw new Error(
        `Invalid AI_CHAIN entry "${entry}" — unknown provider "${prefix}". Use a Gemini model id ` +
          `(e.g. gemini-2.5-flash) or <provider>/<model> with provider one of: ` +
          `${KNOWN_AI_PROVIDERS.join(', ')}.`,
      );
    }
    if (!model) {
      throw new Error(`Invalid AI_CHAIN entry "${entry}" — empty model id after "${prefix}/".`);
    }
    models.push({ provider: prefix as AiProvider, model });
  }
  return models;
}

/** Chain sources, in precedence order (per-task chain > `AI_CHAIN` > default). */
interface AiChainInput {
  /** Per-task chain — highest precedence, replaces everything else. */
  chain?: AiModel[] | null;
  /** Raw `AI_CHAIN` env value — middle precedence. */
  chainEnv?: string | null;
  /** `AI_PROVIDER` override — keeps only that provider's entries. */
  override?: AiProvider | null;
}

/**
 * Ordered models to try, given what is configured:
 *
 * 1. per-task `chain`, else the `AI_CHAIN` env value, else `defaultAiChain`;
 * 2. filtered to models whose provider key is configured (missing key = skip);
 * 3. `override` keeps only that provider's entries. An override whose key is
 *    missing (or that no entry matches) yields an empty list, so the caller
 *    fails loudly instead of silently falling back to another provider.
 */
function resolveAiModels(
  input: AiChainInput,
  keys: AiProviderKeys,
  defaultGroqModels: string[] = DEFAULT_GROQ_MODELS,
  defaultCerebrasModels: string[] = DEFAULT_CEREBRAS_MODELS,
): AiModel[] {
  const requested =
    input.chain ??
    (input.chainEnv
      ? parseAiChainValue(input.chainEnv)
      : defaultAiChain(defaultGroqModels, defaultCerebrasModels));

  const hasKey = (model: AiModel): boolean => {
    if (model.provider === 'gemini') return Boolean(keys.geminiKey);
    if (model.provider === 'cerebras') return Boolean(keys.cerebrasKey);
    return Boolean(keys.groqKey);
  };

  const usable = requested.filter(hasKey);
  return input.override ? usable.filter((model) => model.provider === input.override) : usable;
}

/** Renders a chain for logs: `gemini/gemini-2.5-flash → … → groq/openai/gpt-oss-120b`. */
function formatAiChain(models: AiModel[]): string {
  return models.map((model) => `${model.provider}/${model.model}`).join(' → ');
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

/**
 * OpenAI-compatible chat-completions body in JSON mode — shared by Groq and
 * Cerebras (both implement the same request shape). `temperature` is omitted
 * when undefined.
 */
function buildChatCompletionsRequestBody(
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

/**
 * Extracts the assistant message from an OpenAI-compatible chat-completions
 * response — shared by Groq and Cerebras. `provider` is only used for error
 * messages.
 */
function extractChatCompletionsText(provider: string, data: unknown): string {
  const payload = data as {
    error?: unknown;
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (payload?.error) {
    throw new Error(`${provider} API error: ${JSON.stringify(payload.error)}`);
  }
  const text = payload?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error(`${provider} returned no text: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return text;
}

/**
 * A rate-limit failure (Gemini HTTP 429 / `RESOURCE_EXHAUSTED`). Carries the
 * wait the server asked for so the retry loop can honour it instead of
 * treating the call as terminal and switching models.
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
  KNOWN_AI_PROVIDERS,
  GEMINI_BASE_URL,
  GROQ_CHAT_COMPLETIONS_URL,
  CEREBRAS_CHAT_COMPLETIONS_URL,
  DEFAULT_GROQ_MODEL,
  DEFAULT_GROQ_MODELS,
  DEFAULT_CEREBRAS_MODEL,
  DEFAULT_CEREBRAS_MODELS,
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
  defaultAiChain,
  parseAiChainValue,
  resolveAiModels,
  formatAiChain,
  buildGeminiRequestBody,
  buildChatCompletionsRequestBody,
  extractGeminiText,
  extractChatCompletionsText,
};
export type { AiModel, AiProvider, AiProviderConfig, AiProviderKeys, AiTextResult };
