import { getErrorMessage } from './errors';

import {
  AI_MAX_RATE_LIMIT_WAIT_MS,
  AI_RATE_LIMIT_DEFAULT_WAIT_MS,
  AI_RATE_LIMIT_RETRIES,
  AI_RETRIES,
  AI_TIMEOUT_MS,
  AiRateLimitError,
  CEREBRAS_CHAT_COMPLETIONS_URL,
  DEFAULT_CEREBRAS_MODELS,
  DEFAULT_GROQ_MODELS,
  GEMINI_BASE_URL,
  GROQ_CHAT_COMPLETIONS_URL,
  buildChatCompletionsRequestBody,
  buildGeminiRequestBody,
  extractChatCompletionsText,
  extractGeminiText,
  geminiRetryDelayMs,
  headerRetryDelayMs,
  isGeminiRateLimit,
  rateLimitRetryAfterMs,
  resolveAiModels,
} from './ai.shared';
import type {
  AiModel,
  AiProvider,
  AiProviderConfig,
  AiProviderKeys,
  AiTextResult,
} from './ai.shared';

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
  /**
   * Gemini structured-output schema. A TOP-LEVEL option shared by every
   * `gemini/*` entry in the chain (Groq uses JSON mode instead) — chain entries
   * are pure routing (`provider` + `model`) and carry no schema.
   */
  geminiSchema: Record<string, unknown>;
  /** Per-task chain override — beats the `AI_CHAIN` env and the default chain. */
  chain?: AiModel[];
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

/** Canonical id used in logs and the sticky-exhausted set: `provider/model`. */
const modelId = (model: AiModel): string => `${model.provider}/${model.model}`;

async function callGemini(
  model: AiModel,
  options: AiCallOptions,
  keys: AiProviderKeys,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<string> {
  if (!keys.geminiKey) throw new Error('GEMINI_API_KEY is not set.');

  const response = await fetchImpl(
    `${GEMINI_BASE_URL}/${model.model}:generateContent?key=${keys.geminiKey}`,
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
  // caller treat the call as failed and drop to the next model in the chain.
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
      `Gemini API error (${model.model}): HTTP ${response.status} ${JSON.stringify(data ?? null).slice(0, 200)}`,
    );
  }

  return extractGeminiText(data);
}

/** OpenAI-compatible JSON-mode request shared by Groq and Cerebras. */
async function callChatCompletionsProvider(
  provider: 'Groq' | 'Cerebras',
  url: string,
  model: AiModel,
  options: AiCallOptions,
  keys: AiProviderKeys,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<string> {
  const apiKey = provider === 'Groq' ? keys.groqKey : keys.cerebrasKey;
  if (!apiKey) throw new Error(`${provider.toUpperCase()}_API_KEY is not set.`);

  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    signal,
    body: JSON.stringify(
      buildChatCompletionsRequestBody(model.model, options.prompt, options.temperature),
    ),
  });

  return extractChatCompletionsText(provider, await response.json());
}

async function callGroq(
  model: AiModel,
  options: AiCallOptions,
  keys: AiProviderKeys,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<string> {
  return callChatCompletionsProvider(
    'Groq',
    GROQ_CHAT_COMPLETIONS_URL,
    model,
    options,
    keys,
    fetchImpl,
    signal,
  );
}

async function callCerebras(
  model: AiModel,
  options: AiCallOptions,
  keys: AiProviderKeys,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<string> {
  return callChatCompletionsProvider(
    'Cerebras',
    CEREBRAS_CHAT_COMPLETIONS_URL,
    model,
    options,
    keys,
    fetchImpl,
    signal,
  );
}

/** Adapter per provider — all share the same call signature. */
const callByProvider: Record<
  AiProvider,
  (
    model: AiModel,
    options: AiCallOptions,
    keys: AiProviderKeys,
    fetchImpl: typeof fetch,
    signal: AbortSignal,
  ) => Promise<string>
> = {
  gemini: callGemini,
  groq: callGroq,
  cerebras: callCerebras,
};

/**
 * Calls one model, retrying transient failures with exponential backoff.
 * Aborts a hung request after `timeoutMs`.
 *
 * A rate limit (`retryDelay`) is handled separately: the server's own wait is
 * honoured and the attempt does not count against `retries`, so a throttled
 * Gemini call is retried rather than immediately handing over to the next
 * model in the chain.
 */
async function callModelWithRetry(
  model: AiModel,
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
      log.info(`🤖 ${label}: trying ${modelId(model)} (attempt ${attempt}/${retries})...`);
      return await callByProvider[model.provider](
        model,
        options,
        keys,
        fetchImpl,
        controller.signal,
      );
    } catch (error: unknown) {
      const retryAfterMs = rateLimitRetryAfterMs(error);

      // Rate limits do not consume the normal retry budget: while the server
      // asks for a short wait (a per-minute burst) we wait and call the same
      // model again.
      if (retryAfterMs !== null) {
        if (retryAfterMs <= AI_MAX_RATE_LIMIT_WAIT_MS && rateLimitWaits < AI_RATE_LIMIT_RETRIES) {
          rateLimitWaits++;
          log.warn(
            `⏳ ${label}: ${modelId(model)} rate limited — waiting ${Math.round(retryAfterMs / 1000)}s before retrying ` +
              `(${rateLimitWaits}/${AI_RATE_LIMIT_RETRIES})...`,
          );
          await sleep(retryAfterMs);
          continue;
        }

        // Waiting hours is not worth the run's time budget.
        log.warn(
          `⚠️ ${label}: ${modelId(model)} quota exhausted (asked for ${Math.round(retryAfterMs / 1000)}s) — failing over.`,
        );
        throw error;
      }

      failures++;
      if (failures >= retries) throw error;
      const backoff = backoffBaseMs * 2 ** failures;
      log.warn(
        `⚠️ ${label}: ${modelId(model)} attempt ${attempt} failed: ${getErrorMessage(error)}`,
      );
      await sleep(backoff);
    } finally {
      clearTimeout(timer);
    }
  }
}

interface NormalizedDeps {
  fetchImpl: typeof fetch;
  log: AiLog;
  sleep: (ms: number) => Promise<void>;
  backoffBaseMs: number;
}

function normalizeDeps(deps: AiDeps): NormalizedDeps {
  return {
    fetchImpl: deps.fetchImpl ?? fetch,
    log: deps.log ?? NOOP_LOG,
    sleep: deps.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms))),
    backoffBaseMs: deps.backoffBaseMs ?? 1_000,
  };
}

/**
 * Resolves the effective chain for one call: per-task `chain` > `AI_CHAIN` env
 * > default chain, filtered to configured provider keys (can throw on a
 * malformed `AI_CHAIN` — that must fail loudly, not silently shrink).
 */
function resolveModels(chain: AiModel[] | undefined, keys: AiProviderConfig): AiModel[] {
  return resolveAiModels(
    { chain: chain ?? null, chainEnv: keys.chainEnv ?? null, override: keys.override ?? null },
    { geminiKey: keys.geminiKey, groqKey: keys.groqKey, cerebrasKey: keys.cerebrasKey },
    keys.groqModels ?? DEFAULT_GROQ_MODELS,
    keys.cerebrasModels ?? DEFAULT_CEREBRAS_MODELS,
  );
}

function assertModelsAvailable(models: AiModel[]): void {
  if (models.length === 0) {
    throw new Error(
      'No AI provider is configured — set GEMINI_API_KEY and/or GROQ_API_KEY (or fix AI_CHAIN).',
    );
  }
}

/**
 * Walks the chain until one model succeeds. A model whose failure is a
 * quota-family error (429 / `RESOURCE_EXHAUSTED`, burst or exhausted
 * rate-limit retries) is added to `exhausted` so a sticky runtime skips it on
 * later calls; transient failures (timeouts, 5xx after full retries) do NOT
 * demote a model.
 */
async function runChain(
  models: AiModel[],
  options: AiCallOptions,
  keys: AiProviderConfig,
  deps: NormalizedDeps,
  exhausted: Set<string>,
): Promise<AiTextResult> {
  const label = options.label ?? 'AI request';
  const retries = Math.max(1, options.retries ?? AI_RETRIES);
  const timeoutMs = options.timeoutMs ?? AI_TIMEOUT_MS;
  let lastError: unknown;

  for (const model of models) {
    if (exhausted.has(modelId(model))) {
      deps.log.info(`⏭️ Skipping ${modelId(model)} (quota exhausted earlier in this run)`);
      continue;
    }

    try {
      const text = await callModelWithRetry(
        model,
        options,
        keys,
        deps.fetchImpl,
        deps.log,
        deps.sleep,
        retries,
        timeoutMs,
        deps.backoffBaseMs,
      );
      return { provider: model.provider, model: model.model, text };
    } catch (error: unknown) {
      lastError = error;
      deps.log.warn(`⚠️ ${label}: ${modelId(model)} failed: ${getErrorMessage(error)}`);
      if (rateLimitRetryAfterMs(error) !== null) exhausted.add(modelId(model));
    }
  }

  if (lastError === undefined) {
    throw new Error(
      `Every model in the chain is quota-exhausted for this run (${label}) — ` +
        'add a model to AI_CHAIN or wait for the quota to reset.',
    );
  }
  throw new Error(`All AI models failed for ${label}: ${getErrorMessage(lastError)}`);
}

/**
 * Generates JSON text using the first model in the chain that succeeds.
 * Stateless one-shot: no memory between calls. See `createAiRuntime` for the
 * run-scoped variant that remembers quota-exhausted models.
 *
 * Returns the raw text plus the provider/model that produced it — parsing and
 * validation are the caller's job. Throws only when nothing is configured or
 * every configured model fails (the last error is surfaced).
 */
async function generateAiText(
  options: AiCallOptions,
  keys: AiProviderConfig,
  deps: AiDeps = {},
): Promise<AiTextResult> {
  const models = resolveModels(options.chain, keys);
  assertModelsAvailable(models);
  return runChain(models, options, keys, normalizeDeps(deps), new Set());
}

/**
 * A run-scoped AI entrypoint: every `generate` call shares one memory of
 * quota-exhausted models. Create ONE runtime per job run (in
 * `runGenerateWeeklySummary`, `runBackfillArticleSummaries`, …) and thread it
 * through every AI call, so a model that failed over on quota is not retried
 * on the next call — an article backfill makes hundreds of calls and must not
 * pay one wasted 429 round-trip per call.
 */
interface AiRuntime {
  generate(options: AiCallOptions): Promise<AiTextResult>;
}

function createAiRuntime(keys: AiProviderConfig, deps: AiDeps = {}): AiRuntime {
  // Fail fast at job start when nothing is usable: chain availability depends
  // only on which provider keys are configured, so this check covers any
  // per-call chain too. Also surfaces a malformed `AI_CHAIN` immediately.
  assertModelsAvailable(resolveModels(undefined, keys));

  const normalized = normalizeDeps(deps);
  const exhausted = new Set<string>();

  return {
    generate(options: AiCallOptions): Promise<AiTextResult> {
      const models = resolveModels(options.chain, keys);
      assertModelsAvailable(models);
      return runChain(models, options, keys, normalized, exhausted);
    },
  };
}

export { generateAiText, createAiRuntime };
export type { AiCallOptions, AiDeps, AiLog, AiRuntime };
