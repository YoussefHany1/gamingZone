import { describe, it, expect } from 'vitest';

import {
  AI_MAX_RATE_LIMIT_WAIT_MS,
  AI_RATE_LIMIT_DEFAULT_WAIT_MS,
  AiRateLimitError,
  DEFAULT_CEREBRAS_MODELS,
  DEFAULT_GROQ_MODELS,
  DEFAULT_GROQ_MODEL,
  buildChatCompletionsRequestBody,
  defaultAiChain,
  extractChatCompletionsText,
  extractGeminiText,
  formatAiChain,
  geminiRetryDelayMs,
  isGeminiRateLimit,
  parseAiChainValue,
  parseRetryDelayMs,
  rateLimitRetryAfterMs,
  resolveAiModels,
} from './ai.shared';
import { createAiRuntime, generateAiText } from './ai';
import type { AiCallOptions } from './ai';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

const noSleep = async () => {};
const noopLog = { info: () => {}, warn: () => {} };

const baseOptions: AiCallOptions = {
  prompt: 'Return a JSON object',
  label: 'test',
  geminiSchema: { type: 'OBJECT' },
  retries: 1,
};

const bothKeys = {
  geminiKey: 'g',
  groqKey: 'q',
  cerebrasKey: null,
  groqModels: ['groq-test-model'],
};

/** A chain with a single Gemini model, so per-model tests stay focused. */
const singleGeminiChain = [
  { provider: 'gemini', model: 'gemini-test' },
  { provider: 'groq', model: 'groq-test-model' },
] as const;
describe('defaultAiChain', () => {
  it('orders gemini-2.5-flash → gemini-3.1-flash-lite → the Groq segment', () => {
    expect(
      defaultAiChain(['my-groq-model'], ['my-cerebras-model']),
    ).toEqual([
      { provider: 'gemini', model: 'gemini-2.5-flash' },
      { provider: 'gemini', model: 'gemini-3.1-flash-lite' },
      { provider: 'groq', model: 'my-groq-model' },
      { provider: 'cerebras', model: 'my-cerebras-model' },
    ]);
  });

  it('maps every Groq model into the chain segment, in order', () => {
    expect(defaultAiChain(['a', 'b'], ['c'])).toEqual([
      { provider: 'gemini', model: 'gemini-2.5-flash' },
      { provider: 'gemini', model: 'gemini-3.1-flash-lite' },
      { provider: 'groq', model: 'a' },
      { provider: 'groq', model: 'b' },
      { provider: 'cerebras', model: 'c' },
    ]);
  });

  it('uses the generative DEFAULT_GROQ_MODELS / DEFAULT_CEREBRAS_MODELS when no override is given', () => {
    const chain = defaultAiChain();
    expect(chain[2]).toEqual({ provider: 'groq', model: DEFAULT_GROQ_MODEL });
    expect(chain.slice(4)).toEqual(
      DEFAULT_CEREBRAS_MODELS.map((model) => ({ provider: 'cerebras', model })),
    );
    expect(DEFAULT_GROQ_MODELS[0]).toBe(DEFAULT_GROQ_MODEL);
  });
});

describe('parseAiChainValue', () => {
  it('treats a bare id as a Gemini model', () => {
    expect(parseAiChainValue('gemini-2.5-flash')).toEqual([
      { provider: 'gemini', model: 'gemini-2.5-flash' },
    ]);
  });

  it('splits an explicit provider entry on the FIRST slash only', () => {
    // Groq model ids themselves contain slashes.
    expect(parseAiChainValue('groq/openai/gpt-oss-120b')).toEqual([
      { provider: 'groq', model: 'openai/gpt-oss-120b' },
    ]);
    expect(parseAiChainValue('groq/meta-llama/llama-3.3-70b-versatile')).toEqual([
      { provider: 'groq', model: 'meta-llama/llama-3.3-70b-versatile' },
    ]);
    expect(parseAiChainValue('gemini/gemini-2.5-flash')).toEqual([
      { provider: 'gemini', model: 'gemini-2.5-flash' },
    ]);
  });

  it('trims entries and skips empties (trailing commas, extra spaces)', () => {
    expect(parseAiChainValue(' gemini-2.5-flash , ,groq/openai/gpt-oss-120b, ')).toEqual([
      { provider: 'gemini', model: 'gemini-2.5-flash' },
      { provider: 'groq', model: 'openai/gpt-oss-120b' },
    ]);
  });

  it('throws loudly on an unknown provider prefix (never silently degrades)', () => {
    expect(() => parseAiChainValue('openrouter/foo/bar')).toThrow(/unknown provider "openrouter"/);
  });

  it('throws on an empty model id after the provider prefix', () => {
    expect(() => parseAiChainValue('groq/')).toThrow(/empty model id/);
  });
});

describe('resolveAiModels', () => {
  const allKeys = { geminiKey: 'g', groqKey: 'q', cerebrasKey: 'c' };

  it('returns the default chain (gemini → groq segment → cerebras segment) when nothing is set', () => {
    expect(
      resolveAiModels({}, allKeys, ['groq-test-model'], ['cerebras-test-model']),
    ).toEqual([
      { provider: 'gemini', model: 'gemini-2.5-flash' },
      { provider: 'gemini', model: 'gemini-3.1-flash-lite' },
      { provider: 'groq', model: 'groq-test-model' },
      { provider: 'cerebras', model: 'cerebras-test-model' },
    ]);
  });

  it('honours custom default Groq/Cerebras models without touching process.env', () => {
    const keys = { geminiKey: null, groqKey: 'q', cerebrasKey: 'c' };
    expect(resolveAiModels({}, keys, ['custom-groq-model'], ['custom-cerebras-model'])).toEqual([
      { provider: 'groq', model: 'custom-groq-model' },
      { provider: 'cerebras', model: 'custom-cerebras-model' },
    ]);
  });

  it('keeps only the models whose provider key is configured', () => {
    expect(resolveAiModels({}, allKeys, ['groq-test-model'], ['cerebras-test-model'])).toEqual([
      { provider: 'gemini', model: 'gemini-2.5-flash' },
      { provider: 'gemini', model: 'gemini-3.1-flash-lite' },
      { provider: 'groq', model: 'groq-test-model' },
      { provider: 'cerebras', model: 'cerebras-test-model' },
    ]);
    expect(
      resolveAiModels({}, { geminiKey: null, groqKey: 'q', cerebrasKey: null }, ['groq-test-model'], ['cerebras-test-model']),
    ).toEqual([{ provider: 'groq', model: 'groq-test-model' }]);
    expect(
      resolveAiModels({}, { geminiKey: 'g', groqKey: null, cerebrasKey: null }, ['groq-test-model'], ['cerebras-test-model']),
    ).toEqual([
      { provider: 'gemini', model: 'gemini-2.5-flash' },
      { provider: 'gemini', model: 'gemini-3.1-flash-lite' },
    ]);
    expect(
      resolveAiModels({}, { geminiKey: 'g', groqKey: null, cerebrasKey: 'c' }, ['groq-test-model'], ['cerebras-test-model']),
    ).toEqual([
      { provider: 'gemini', model: 'gemini-2.5-flash' },
      { provider: 'gemini', model: 'gemini-3.1-flash-lite' },
      { provider: 'cerebras', model: 'cerebras-test-model' },
    ]);
    expect(
      resolveAiModels({}, { geminiKey: null, groqKey: null, cerebrasKey: null }, ['groq-test-model'], ['cerebras-test-model']),
    ).toEqual([]);
  });

  it('prefers the per-task chain over the AI_CHAIN env and the default', () => {
    const models = resolveAiModels(
      { chain: [{ provider: 'groq', model: 'task-model' }], chainEnv: 'gemini-9' },
      allKeys,
    );
    expect(models).toEqual([{ provider: 'groq', model: 'task-model' }]);
  });

  it('prefers the AI_CHAIN env over the default chain', () => {
    expect(resolveAiModels({ chainEnv: 'gemini-9' }, allKeys)).toEqual([
      { provider: 'gemini', model: 'gemini-9' },
    ]);
  });

  it('AI_PROVIDER override keeps only that provider entries (Gemini keeps both)', () => {
    expect(resolveAiModels({ override: 'groq' }, allKeys, ['groq-test-model'])).toEqual([
      { provider: 'groq', model: 'groq-test-model' },
    ]);
    expect(resolveAiModels({ override: 'cerebras' }, allKeys, ['groq-test-model'], ['cerebras-test-model'])).toEqual([
      { provider: 'cerebras', model: 'cerebras-test-model' },
    ]);
    expect(resolveAiModels({ override: 'gemini' }, allKeys, ['groq-test-model'])).toEqual([
      { provider: 'gemini', model: 'gemini-2.5-flash' },
      { provider: 'gemini', model: 'gemini-3.1-flash-lite' },
    ]);
  });

  it('override with a missing key yields no models (fails loudly, never silently)', () => {
    expect(
      resolveAiModels(
        { override: 'groq' },
        { geminiKey: 'g', groqKey: null, cerebrasKey: null },
        ['groq-test-model'],
      ),
    ).toEqual([]);
  });

  it('throws on a malformed AI_CHAIN value', () => {
    expect(() =>
      resolveAiModels({ chainEnv: 'openrouter/foo' }, allKeys),
    ).toThrow(/Invalid AI_CHAIN entry/);
  });
});

describe('formatAiChain', () => {
  it('renders the chain for logs', () => {
    expect(formatAiChain(defaultAiChain(['g-model'], ['c-model']))).toBe(
      'gemini/gemini-2.5-flash → gemini/gemini-3.1-flash-lite → groq/g-model → cerebras/c-model',
    );
  });
});

describe('buildChatCompletionsRequestBody', () => {
  it('uses JSON mode and includes the model/temperature when provided', () => {
    const body = buildChatCompletionsRequestBody(
      'llama-3.3-70b-versatile',
      'hi',
      0.4,
    ) as Record<string, unknown>;
    expect(body).toEqual({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: 'hi' }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });
  });

  it('omits temperature when it is not set', () => {
    const body = buildChatCompletionsRequestBody('m', 'hi') as Record<string, unknown>;
    expect(body).not.toHaveProperty('temperature');
  });
});

describe('extractChatCompletionsText', () => {
  it('returns the assistant message content', () => {
    expect(
      extractChatCompletionsText('Groq', { choices: [{ message: { content: '{"en":"x"}' } }] }),
    ).toBe('{"en":"x"}');
  });

  it('throws on an error payload, naming the provider', () => {
    expect(() => extractChatCompletionsText('Groq', { error: { message: 'bad key' } })).toThrow(
      /Groq API error/,
    );
    expect(() => extractChatCompletionsText('Cerebras', { error: { message: 'bad key' } })).toThrow(
      /Cerebras API error/,
    );
  });

  it('throws when there is no content', () => {
    expect(() => extractChatCompletionsText('Cerebras', { choices: [] })).toThrow(
      /Cerebras returned no text/,
    );
  });
});

describe('extractGeminiText', () => {
  it('returns the first candidate text', () => {
    const data = { candidates: [{ content: { parts: [{ text: '{"en":"x"}' }] } }] };
    expect(extractGeminiText(data)).toBe('{"en":"x"}');
  });

  it('throws on an error payload and on missing text', () => {
    expect(() => extractGeminiText({ error: { message: 'nope' } })).toThrow(/Gemini API error/);
    expect(() => extractGeminiText({ candidates: [] })).toThrow(/Gemini returned no text/);
  });
});

describe('generateAiText chain fallback', () => {
  it('walks gemini-2.5-flash → gemini-3.1-flash-lite → the Groq segment', async () => {
    const calls: string[] = [];
    const groqBodies: Array<{ model?: string }> = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push(url);
      if (url.includes('api.groq.com')) {
        groqBodies.push(JSON.parse(String(init?.body ?? '{}')));
      }
      return jsonResponse({ error: { message: 'down' } }, false, 500);
    }) as unknown as typeof fetch;

    await expect(
      generateAiText(baseOptions, bothKeys, { fetchImpl, sleep: noSleep, log: noopLog }),
    ).rejects.toThrow(/All AI models failed/);

    expect(calls[0]).toContain('/gemini-2.5-flash:generateContent');
    expect(calls[1]).toContain('/gemini-3.1-flash-lite:generateContent');
    expect(calls[2]).toContain('api.groq.com');
    // The Groq segment honours every configured Groq model, best first.
    expect(groqBodies).toEqual([expect.objectContaining({ model: 'groq-test-model' })]);
  });

  it('fails over to the next Gemini model on quota exhaustion without waiting', async () => {
    const calls: string[] = [];
    const sleeps: number[] = [];
    const fetchImpl = (async (url: string) => {
      calls.push(url);
      if (url.includes('gemini-2.5-flash')) {
        return jsonResponse(
          {
            error: {
              code: 429,
              status: 'RESOURCE_EXHAUSTED',
              message: 'Quota exceeded',
              details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '3600s' }],
            },
          },
          false,
          429,
        );
      }
      return jsonResponse({ candidates: [{ content: { parts: [{ text: '{"en":"ok"}' }] } }] });
    }) as unknown as typeof fetch;

    const result = await generateAiText(baseOptions, bothKeys, {
      fetchImpl,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      log: noopLog,
    });

    // An hour-long reset cannot be waited out: one attempt on 2.5-flash, then
    // straight to flash-lite — no sleep, no Groq call.
    expect(result).toEqual({ provider: 'gemini', model: 'gemini-3.1-flash-lite', text: '{"en":"ok"}' });
    expect(calls).toHaveLength(2);
    expect(sleeps).toEqual([]);
  });

  it('uses Groq directly when Gemini is not configured', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string) => {
      calls.push(url);
      return jsonResponse({ choices: [{ message: { content: '{"en":"ok"}' } }] });
    }) as unknown as typeof fetch;

    const result = await generateAiText(
      baseOptions,
      { geminiKey: null, groqKey: 'q', cerebrasKey: null, groqModels: ['groq-test-model'] },
      { fetchImpl, sleep: noSleep },
    );

    expect(result).toEqual({ provider: 'groq', model: 'groq-test-model', text: '{"en":"ok"}' });
    expect(calls).toHaveLength(1);
    expect(calls[0]).not.toContain('generativelanguage');
  });

  it('walks the full chain, ending on Cerebras when everything else fails', async () => {
    const cerebrasBodies: Array<{ model?: string; response_format?: unknown }> = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      if (url.includes('api.cerebras.ai')) {
        cerebrasBodies.push(JSON.parse(String(init?.body ?? '{}')));
        return jsonResponse({ choices: [{ message: { content: '{"en":"cerebras"}' } }] });
      }
      return jsonResponse({ error: { message: 'down' } }, false, 500);
    }) as unknown as typeof fetch;

    const result = await generateAiText(
      baseOptions,
      {
        geminiKey: 'g',
        groqKey: 'q',
        cerebrasKey: 'c',
        groqModels: ['groq-test-model'],
        cerebrasModels: ['cerebras-test-model'],
      },
      { fetchImpl, sleep: noSleep, log: noopLog },
    );

    expect(result).toEqual({
      provider: 'cerebras',
      model: 'cerebras-test-model',
      text: '{"en":"cerebras"}',
    });
    // Cerebras is called with the same OpenAI-style JSON-mode body.
    expect(cerebrasBodies).toEqual([
      expect.objectContaining({
        model: 'cerebras-test-model',
        response_format: { type: 'json_object' },
      }),
    ]);
  });

  it('skips the Cerebras segment entirely when its key is not configured', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string) => {
      calls.push(url);
      return jsonResponse({ error: { message: 'down' } }, false, 500);
    }) as unknown as typeof fetch;

    await expect(
      generateAiText(
        baseOptions,
        {
          geminiKey: 'g',
          groqKey: 'q',
          cerebrasKey: null,
          groqModels: ['groq-test-model'],
        },
        { fetchImpl, sleep: noSleep, log: noopLog },
      ),
    ).rejects.toThrow(/All AI models failed/);

    expect(calls.some((url) => url.includes('api.cerebras.ai'))).toBe(false);
  });

  it('fails over within the Groq segment when one Groq model fails', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push(url);
      const body = JSON.parse(String(init?.body ?? '{}')) as { model?: string };
      if (url.includes('generativelanguage') || body.model === 'groq-a') {
        return jsonResponse({ error: { message: 'down' } }, false, 500);
      }
      return jsonResponse({ choices: [{ message: { content: '{"en":"ok"}' } }] });
    }) as unknown as typeof fetch;

    const result = await generateAiText(
      baseOptions,
      { geminiKey: 'g', groqKey: 'q', cerebrasKey: null, groqModels: ['groq-a', 'groq-b'] },
      { fetchImpl, sleep: noSleep, log: noopLog },
    );

    expect(result).toEqual({ provider: 'groq', model: 'groq-b', text: '{"en":"ok"}' });
    const groqCalls = calls.filter((url) => url.includes('api.groq.com'));
    expect(groqCalls).toHaveLength(2);
  });

  it('honours a per-task chain that overrides the AI_CHAIN env', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string) => {
      calls.push(url);
      return jsonResponse({ candidates: [{ content: { parts: [{ text: '{"en":"ok"}' }] } }] });
    }) as unknown as typeof fetch;

    const result = await generateAiText(
      { ...baseOptions, chain: [{ provider: 'gemini', model: 'gemini-task-model' }] },
      { ...bothKeys, chainEnv: 'gemini-9' },
      { fetchImpl, sleep: noSleep },
    );

    expect(result.model).toBe('gemini-task-model');
    expect(calls[0]).toContain('/gemini-task-model:generateContent');
  });

  it('honours the AI_CHAIN env when no per-task chain is given', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string) => {
      calls.push(url);
      return jsonResponse({ candidates: [{ content: { parts: [{ text: '{"en":"ok"}' }] } }] });
    }) as unknown as typeof fetch;

    const result = await generateAiText(
      baseOptions,
      { ...bothKeys, chainEnv: 'gemini/gemini-9 , groq/openai/gpt-oss-120b' },
      { fetchImpl, sleep: noSleep },
    );

    expect(result.model).toBe('gemini-9');
    expect(calls[0]).toContain('/gemini-9:generateContent');
  });

  it('honours the AI_PROVIDER=groq override even when a Gemini key exists', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string) => {
      calls.push(url);
      return jsonResponse({ choices: [{ message: { content: '{"en":"ok"}' } }] });
    }) as unknown as typeof fetch;

    const result = await generateAiText(
      baseOptions,
      { ...bothKeys, override: 'groq' },
      { fetchImpl, sleep: noSleep, log: noopLog },
    );

    expect(result.provider).toBe('groq');
    expect(calls).toHaveLength(1);
    expect(calls[0]).not.toContain('generativelanguage.googleapis.com');
  });

  it('throws when every configured model fails', async () => {
    const fetchImpl = (async () =>
      jsonResponse({ error: { message: 'down' } }, false, 500)) as unknown as typeof fetch;

    await expect(
      generateAiText(baseOptions, bothKeys, { fetchImpl, sleep: noSleep, log: noopLog }),
    ).rejects.toThrow(/All AI models failed/);
  });

  it('throws a clear error when no provider is configured', async () => {
    await expect(
      generateAiText(
        baseOptions,
        { geminiKey: null, groqKey: null, cerebrasKey: null },
        { sleep: noSleep, log: noopLog },
      ),
    ).rejects.toThrow(/No AI provider is configured/);
  });
});

describe('Gemini rate-limit handling', () => {
  // A single-Gemini-model chain keeps these tests focused on the wait-vs-
  // fail-over rules rather than the chain walk (covered above).
  const options = { ...baseOptions, chain: [...singleGeminiChain] };

  const quotaPayload = {
    error: {
      code: 429,
      status: 'RESOURCE_EXHAUSTED',
      message: 'Quota exceeded',
      details: [
        { '@type': 'type.googleapis.com/google.rpc.Help', links: [] },
        { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '23s' },
      ],
    },
  };

  const quotaResponseWith = (retryDelay: string) =>
    jsonResponse(
      {
        error: {
          code: 429,
          status: 'RESOURCE_EXHAUSTED',
          message: 'Quota exceeded',
          details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay }],
        },
      },
      false,
      429,
    );
  const quotaResponse = () => quotaResponseWith('23s');
  const geminiOkResponse = () =>
    jsonResponse({ candidates: [{ content: { parts: [{ text: '{"en":"ok"}' }] } }] });
  const groqOkResponse = () =>
    jsonResponse({ choices: [{ message: { content: '{"en":"groq"}' } }] });

  const isGeminiCall = (url: string) => url.includes('generativelanguage.googleapis.com');

  it('parses RetryInfo retryDelay durations', () => {
    expect(geminiRetryDelayMs(quotaPayload)).toBe(23_000);
    expect(parseRetryDelayMs('1.5s')).toBe(1_500);
    // A bare number is ambiguous (milliseconds? seconds?) so it is rejected.
    expect(parseRetryDelayMs('23')).toBeNull();
    expect(parseRetryDelayMs(23)).toBeNull();
    expect(parseRetryDelayMs('0s')).toBeNull();
    expect(parseRetryDelayMs(null)).toBeNull();
    expect(geminiRetryDelayMs({ error: { details: [] } })).toBeNull();
    expect(geminiRetryDelayMs({ error: { message: 'not a quota error' } })).toBeNull();
  });

  it('recognises a rate limit from the status code or the payload', () => {
    expect(isGeminiRateLimit(429, {})).toBe(true);
    expect(isGeminiRateLimit(200, quotaPayload)).toBe(true);
    expect(isGeminiRateLimit(500, { error: { message: 'down' } })).toBe(false);
  });

  it('round-trips the requested wait through the error type', () => {
    expect(rateLimitRetryAfterMs(new AiRateLimitError('limited', 5_000))).toBe(5_000);
    expect(rateLimitRetryAfterMs(new Error('other'))).toBeNull();
    expect(rateLimitRetryAfterMs(undefined)).toBeNull();
  });

  it('waits for the retryDelay and retries the same model instead of failing over', async () => {
    const sleeps: number[] = [];
    const calls: string[] = [];
    let geminiCalls = 0;

    const fetchImpl = (async (url: string) => {
      calls.push(url);
      if (!isGeminiCall(url)) return groqOkResponse();
      geminiCalls++;
      return geminiCalls === 1 ? quotaResponse() : geminiOkResponse();
    }) as unknown as typeof fetch;

    const result = await generateAiText(options, bothKeys, {
      fetchImpl,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      log: noopLog,
    });

    expect(result).toEqual({ provider: 'gemini', model: 'gemini-test', text: '{"en":"ok"}' });
    expect(sleeps).toEqual([23_000]);
    expect(calls.every(isGeminiCall)).toBe(true);
  });

  it('waits the conservative default when a 429 carries no retryDelay', async () => {
    const sleeps: number[] = [];
    let geminiCalls = 0;

    const fetchImpl = (async (url: string) => {
      if (!isGeminiCall(url)) return groqOkResponse();
      geminiCalls++;
      return geminiCalls === 1
        ? jsonResponse({ error: { code: 429, message: 'quota' } }, false, 429)
        : geminiOkResponse();
    }) as unknown as typeof fetch;

    const result = await generateAiText(options, bothKeys, {
      fetchImpl,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      log: noopLog,
    });

    expect(result.provider).toBe('gemini');
    expect(sleeps).toEqual([AI_RATE_LIMIT_DEFAULT_WAIT_MS]);
  });

  it('fails over to the next model only once the rate-limit retries are exhausted', async () => {
    const sleeps: number[] = [];
    const fetchImpl = (async (url: string) =>
      isGeminiCall(url) ? quotaResponse() : groqOkResponse()) as unknown as typeof fetch;

    const result = await generateAiText(options, bothKeys, {
      fetchImpl,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      log: noopLog,
    });

    expect(result).toEqual({ provider: 'groq', model: 'groq-test-model', text: '{"en":"groq"}' });
    // Two honoured waits, then the fallback — no zero-delay exponential retries.
    expect(sleeps).toEqual([23_000, 23_000]);
  });

  it('fails over immediately when the wait means quota exhaustion, not a burst', async () => {
    const sleeps: number[] = [];
    let geminiCalls = 0;

    const fetchImpl = (async (url: string) => {
      if (!isGeminiCall(url)) return groqOkResponse();
      geminiCalls++;
      return quotaResponseWith('3600s');
    }) as unknown as typeof fetch;

    const result = await generateAiText(options, bothKeys, {
      fetchImpl,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      log: noopLog,
    });

    // An hour-long reset cannot be waited out: one attempt, no sleeping, and
    // straight to the fallback instead of burning the run's time budget.
    expect(result.provider).toBe('groq');
    expect(geminiCalls).toBe(1);
    expect(sleeps).toEqual([]);
  });

  it('honours the wait at the burst threshold and fails over past it', async () => {
    const runWith = async (retryDelay: string) => {
      const sleeps: number[] = [];
      let geminiCalls = 0;

      const fetchImpl = (async (url: string) => {
        if (!isGeminiCall(url)) return groqOkResponse();
        geminiCalls++;
        return geminiCalls === 1 ? quotaResponseWith(retryDelay) : geminiOkResponse();
      }) as unknown as typeof fetch;

      const result = await generateAiText(options, bothKeys, {
        fetchImpl,
        sleep: async (ms) => {
          sleeps.push(ms);
        },
        log: noopLog,
      });

      return { provider: result.provider, sleeps, geminiCalls };
    };

    const thresholdSeconds = AI_MAX_RATE_LIMIT_WAIT_MS / 1000;

    await expect(runWith(`${thresholdSeconds}s`)).resolves.toEqual({
      provider: 'gemini',
      sleeps: [AI_MAX_RATE_LIMIT_WAIT_MS],
      geminiCalls: 2,
    });
    await expect(runWith(`${thresholdSeconds + 1}s`)).resolves.toEqual({
      provider: 'groq',
      sleeps: [],
      geminiCalls: 1,
    });
  });

  it('uses the Retry-After header when the body has no retryDelay', async () => {
    const sleeps: number[] = [];
    let geminiCalls = 0;

    const fetchImpl = (async (url: string) => {
      if (!isGeminiCall(url)) return groqOkResponse();
      geminiCalls++;
      if (geminiCalls > 1) return geminiOkResponse();
      return {
        ok: false,
        status: 429,
        headers: { get: (name: string) => (name === 'retry-after' ? '7' : null) },
        json: async () => ({ error: { code: 429, status: 'RESOURCE_EXHAUSTED' } }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const result = await generateAiText(options, bothKeys, {
      fetchImpl,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      log: noopLog,
    });

    expect(result.provider).toBe('gemini');
    expect(sleeps).toEqual([7_000]);
  });
});

describe('createAiRuntime sticky quota failover', () => {
  const quotaExhaustedResponse = () =>
    jsonResponse(
      {
        error: {
          code: 429,
          status: 'RESOURCE_EXHAUSTED',
          message: 'Quota exceeded',
          details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '3600s' }],
        },
      },
      false,
      429,
    );
  const geminiOkResponse = () =>
    jsonResponse({ candidates: [{ content: { parts: [{ text: '{"en":"ok"}' }] } }] });

  it('skips a quota-exhausted model on later calls in the same run', async () => {
    const calls: string[] = [];
    const infos: string[] = [];
    const fetchImpl = (async (url: string) => {
      calls.push(url);
      if (url.includes('gemini-2.5-flash')) return quotaExhaustedResponse();
      return geminiOkResponse();
    }) as unknown as typeof fetch;

    const ai = createAiRuntime(bothKeys, {
      fetchImpl,
      sleep: noSleep,
      log: { info: (message) => infos.push(message), warn: () => {} },
    });

    // Call 1: 2.5-flash is quota-exhausted (hour-scale reset → immediate
    // failover), flash-lite succeeds.
    const first = await ai.generate(baseOptions);
    expect(first).toEqual({ provider: 'gemini', model: 'gemini-3.1-flash-lite', text: '{"en":"ok"}' });
    expect(calls[0]).toContain('gemini-2.5-flash');

    // Call 2: the dead model is skipped (and logged), not retried.
    calls.length = 0;
    infos.length = 0;
    const second = await ai.generate(baseOptions);
    expect(second.model).toBe('gemini-3.1-flash-lite');
    expect(calls.some((url) => url.includes('gemini-2.5-flash'))).toBe(false);
    expect(infos.some((message) => /⏭️ Skipping gemini\/gemini-2\.5-flash/.test(message))).toBe(
      true,
    );
  });

  it('keeps runtimes independent — another run still tries the exhausted model', async () => {
    const fetchImpl = (async (url: string) => {
      if (url.includes('gemini-2.5-flash')) return quotaExhaustedResponse();
      return geminiOkResponse();
    }) as unknown as typeof fetch;

    const runtimeA = createAiRuntime(bothKeys, { fetchImpl, sleep: noSleep, log: noopLog });
    const firstA = await runtimeA.generate(baseOptions);
    expect(firstA.model).toBe('gemini-3.1-flash-lite');

    const callsB: string[] = [];
    const fetchImplB = (async (url: string) => {
      callsB.push(url);
      return geminiOkResponse();
    }) as unknown as typeof fetch;
    const runtimeB = createAiRuntime(bothKeys, { fetchImpl: fetchImplB, sleep: noSleep, log: noopLog });

    const firstB = await runtimeB.generate(baseOptions);
    // Runtime B has its own memory: 2.5-flash is attempted first again.
    expect(firstB.model).toBe('gemini-2.5-flash');
    expect(callsB[0]).toContain('gemini-2.5-flash');
  });

  it('does NOT demote a model for transient (non-quota) failures', async () => {
    let primaryCalls = 0;
    const fetchImpl = (async (url: string) => {
      if (url.includes('gemini-2.5-flash')) {
        primaryCalls++;
        if (primaryCalls === 1) return jsonResponse({ error: { message: 'down' } }, false, 500);
        return geminiOkResponse();
      }
      return geminiOkResponse();
    }) as unknown as typeof fetch;

    const ai = createAiRuntime(bothKeys, { fetchImpl, sleep: noSleep, log: noopLog });

    // Call 1: transient 500 exhausts retries (retries: 1) → fail over.
    const first = await ai.generate(baseOptions);
    expect(first.model).toBe('gemini-3.1-flash-lite');

    // Call 2: the primary is tried again and succeeds — not marked exhausted.
    const second = await ai.generate(baseOptions);
    expect(second.model).toBe('gemini-2.5-flash');
    expect(primaryCalls).toBe(2);
  });

  it('fails clearly when every model in the chain is quota-exhausted', async () => {
    // A Gemini-only chain: when the last model dies on quota there is nothing
    // left, so the runtime must throw a loud error instead of a confusing one.
    const options: AiCallOptions = {
      ...baseOptions,
      chain: [
        { provider: 'gemini', model: 'gemini-2.5-flash' },
        { provider: 'gemini', model: 'gemini-3.1-flash-lite' },
      ],
    };
    const fetchImpl = (async () => quotaExhaustedResponse()) as unknown as typeof fetch;

    const ai = createAiRuntime(bothKeys, { fetchImpl, sleep: noSleep, log: noopLog });

    // Call 1: both Gemini models fail over on quota → nothing left to try.
    await expect(ai.generate(options)).rejects.toThrow(/All AI models failed/);

    // Call 2: every model is skipped → an even clearer quota error.
    await expect(ai.generate(options)).rejects.toThrow(/quota-exhausted/);
  });

  it('still succeeds via a lower model after Gemini quota death (does not over-error)', async () => {
    const fetchImpl = (async (url: string) => {
      if (url.includes('api.groq.com')) {
        return jsonResponse({ choices: [{ message: { content: '{"en":"groq"}' } }] });
      }
      return quotaExhaustedResponse();
    }) as unknown as typeof fetch;

    const ai = createAiRuntime(bothKeys, { fetchImpl, sleep: noSleep, log: noopLog });

    // Call 1: both Gemini models die on quota; Groq saves the run.
    const first = await ai.generate(baseOptions);
    expect(first).toEqual({ provider: 'groq', model: 'groq-test-model', text: '{"en":"groq"}' });

    // Call 2: the Gemini models are skipped, Groq answers again — no error.
    const second = await ai.generate(baseOptions);
    expect(second.provider).toBe('groq');
  });
});
