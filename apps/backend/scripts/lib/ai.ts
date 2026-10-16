import { getErrorMessage } from './errors';

import {
  AI_MAX_RATE_LIMIT_WAIT_MS,
  AI_RATE_LIMIT_DEFAULT_WAIT_MS,
  AI_RATE_LIMIT_RETRIES,
  AI_RETRIES,
  AI_TIMEOUT_MS,
  AiRateLimitError,
  GEMINI_BASE_URL,
  GROQ_CHAT_COMPLETIONS_URL,
  buildGeminiRequestBody,
  buildGroqRequestBody,
  extractGeminiText,
  extractGroqText,
  geminiRetryDelayMs,
  headerRetryDelayMs,
  isGeminiRateLimit,
  rateLimitRetryAfterMs,
  resolveAiProviders,
} from './ai.shared';
import type { AiProvider, AiProviderKeys } from './ai.shared';

/**
 * Minimal logger surface so this module stays free of `pino` (and therefore
 * importable from unit tests). Callers pass the real `logger`.
 */
interface AiLog {
  info(message: string): void;
  warn(message: string): void;
}

interface AiCallOptions {
  prompt: string;
  /** Gemini model id, e.g. `gemini-3.1-flash-lite`. */
  geminiModel: string;
  /** Gemini structured-output schema (Groq uses JSON mode instead). */
  geminiSchema: Record<string, unknown>;
  /** Groq model id, e.g. `llama-3.3-70b-versatile`. */
  groqModel: string;
  /** Short label used in logs, e.g. `article summary`. */
  label?: string;
  temperature?: number;
  retries?: number;
  timeoutMs?: number;
}

interface AiDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  log?: AiLog;
  /** Base for exponential backoff between retries (ms). */
  backoffBaseMs?: number;
}

const NOOP_LOG: AiLog = { info: () => {}, warn: () => {} };

async function callGemini(
  options: AiCallOptions,
  keys: AiProviderKeys,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<string> {
  if (!keys.geminiKey) throw new Error('GEMINI_API_KEY is not set.');

  const response = await fetchImpl(
    `${GEMINI_BASE_URL}/${options.geminiModel}:generateContent?key=${keys.geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify(
        buildGeminiRequestBody(options.prompt, options.geminiSchema, options.temperature),
      ),
    },
  );

  const data: unknown = await response.json().catch(() => undefined);

  // A per-minute quota is not a terminal failure: Google reports exactly how
  // long the caller should wait, so surface that wait instead of letting the
  // caller treat the call as failed and drop to the Groq fallback.
  if (isGeminiRateLimit(response.status, data)) {
    const retryAfterMs =
      geminiRetryDelayMs(data) ??
      headerRetryDelayMs(response.headers) ??
      AI_RATE_LIMIT_DEFAULT_WAIT_MS;
    throw new AiRateLimitError(
      `Gemini rate limited (HTTP ${response.status})${data ? `: ${JSON.stringify(data).slice(0, 200)}` : ''}`,
      retryAfterMs,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Gemini API error: HTTP ${response.status} ${JSON.stringify(data ?? null).slice(0, 200)}`,
    );
  }

  return extractGeminiText(data);
}

async function callGroq(
  options: AiCallOptions,
  keys: AiProviderKeys,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<string> {
  if (!keys.groqKey) throw new Error('GROQ_API_KEY is not set.');

  const response = await fetchImpl(GROQ_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${keys.groqKey}`,
    },
    signal,
    body: JSON.stringify(
      buildGroqRequestBody(options.groqModel, options.prompt, options.temperature),
    ),
  });

  return extractGroqText(await response.json());
}

/**
 * Calls one provider, retrying transient failures with exponential backoff.
 * Aborts a hung request after `timeoutMs`.
 *
 * A rate limit (`retryDelay`) is handled separately: the server's own wait is
 * honoured and the attempt does not count against `retries`, so a throttled
 * Gemini call is retried rather than immediately handing over to Groq.
 */
async function callProviderWithRetry(
  provider: AiProvider,
  options: AiCallOptions,
  keys: AiProviderKeys,
  fetchImpl: typeof fetch,
  log: AiLog,
  sleep: (ms: number) => Promise<void>,
  retries: number,
  timeoutMs: number,
  backoffBaseMs: number,
): Promise<string> {
  const label = options.label ?? 'AI request';
  let failures = 0;
  let rateLimitWaits = 0;

  while (true) {
    const attempt = failures + 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      log.info(`🤖 ${label}: trying ${provider} (attempt ${attempt}/${retries})...`);
      return provider === 'gemini'
        ? await callGemini(options, keys, fetchImpl, controller.signal)
        : await callGroq(options, keys, fetchImpl, controller.signal);
    } catch (error: unknown) {
      const retryAfterMs = rateLimitRetryAfterMs(error);

      // Rate limits do not consume the normal retry budget: while the server
      // asks for a short wait (a per-minute burst) we wait and call the same
      // provider again.
      if (retryAfterMs !== null) {
        if (retryAfterMs <= AI_MAX_RATE_LIMIT_WAIT_MS && rateLimitWaits < AI_RATE_LIMIT_RETRIES) {
          rateLimitWaits++;
          log.warn(
            `⏳ ${label}: ${provider} rate limited — waiting ${Math.round(retryAfterMs / 1000)}s before retrying ` +
              `(${rateLimitWaits}/${AI_RATE_LIMIT_RETRIES})...`,
          );
          await sleep(retryAfterMs);
          continue;
        }

        // Waiting hours is not worth the run's time budget.
        log.warn(
          `⚠️ ${label}: ${provider} quota exhausted (asked for ${Math.round(retryAfterMs / 1000)}s) — failing over.`,
        );
        throw error;
      }

      failures++;
      if (failures >= retries) throw error;
      const backoff = backoffBaseMs * 2 ** failures;
      log.warn(`⚠️ ${label}: ${provider} attempt ${attempt} failed: ${getErrorMessage(error)}`);
      await sleep(backoff);
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Generates JSON text using the first configured provider that succeeds:
 * Gemini, then Groq. Returns the raw text plus the provider that produced it —
 * parsing/validation is the caller's job.
 *
 * Throws only when no provider is configured or every configured provider
 * fails (the last error is surfaced).
 */
async function generateAiText(
  options: AiCallOptions,
  keys: AiProviderKeys,
  deps: AiDeps = {},
): Promise<{ provider: AiProvider; text: string }> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const log = deps.log ?? NOOP_LOG;
  const sleep = deps.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const retries = Math.max(1, options.retries ?? AI_RETRIES);
  const timeoutMs = options.timeoutMs ?? AI_TIMEOUT_MS;
  const backoffBaseMs = deps.backoffBaseMs ?? 1_000;
  const label = options.label ?? 'AI request';

  const providers = resolveAiProviders({
    geminiKey: keys.geminiKey,
    groqKey: keys.groqKey,
    override: keys.override ?? null,
  });

  if (providers.length === 0) {
    throw new Error('No AI provider is configured — set GEMINI_API_KEY and/or GROQ_API_KEY.');
  }

  let lastError: unknown;
  for (const provider of providers) {
    try {
      const text = await callProviderWithRetry(
        provider,
        options,
        keys,
        fetchImpl,
        log,
        sleep,
        retries,
        timeoutMs,
        backoffBaseMs,
      );
      return { provider, text };
    } catch (error: unknown) {
      lastError = error;
      log.warn(`⚠️ ${label}: ${provider} failed: ${getErrorMessage(error)}`);
    }
  }

  throw new Error(`All AI providers failed for ${label}: ${getErrorMessage(lastError)}`);
}

export { generateAiText };
export type { AiCallOptions, AiDeps, AiLog };
