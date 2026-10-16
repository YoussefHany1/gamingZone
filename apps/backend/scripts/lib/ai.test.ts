import { describe, it, expect } from 'vitest';

import {
  AI_RATE_LIMIT_DEFAULT_WAIT_MS,
  AiRateLimitError,
  DEFAULT_GROQ_MODEL,
  buildGroqRequestBody,
  extractGeminiText,
  extractGroqText,
  geminiRetryDelayMs,
  isGeminiRateLimit,
  parseRetryDelayMs,
  rateLimitRetryAfterMs,
  resolveAiProviders,
} from './ai.shared';
import { generateAiText } from './ai';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

const noSleep = async () => {};
const noopLog = { info: () => {}, warn: () => {} };

const baseOptions = {
  prompt: 'Return a JSON object',
  label: 'test',
  geminiModel: 'gemini-test',
  geminiSchema: { type: 'OBJECT' },
  groqModel: DEFAULT_GROQ_MODEL,
  retries: 1,
};

const bothKeys = { geminiKey: 'g', groqKey: 'q' };

describe('resolveAiProviders', () => {
  it('tries Gemini first, then Groq, when both keys are present', () => {
    expect(resolveAiProviders(bothKeys)).toEqual(['gemini', 'groq']);
  });

  it('uses only the provider(s) whose key is configured', () => {
    expect(resolveAiProviders({ geminiKey: null, groqKey: 'q' })).toEqual(['groq']);
    expect(resolveAiProviders({ geminiKey: 'g', groqKey: null })).toEqual(['gemini']);
    expect(resolveAiProviders({ geminiKey: null, groqKey: null })).toEqual([]);
  });

  it('AI_PROVIDER override forces a single provider', () => {
    expect(resolveAiProviders({ ...bothKeys, override: 'groq' })).toEqual(['groq']);
    expect(resolveAiProviders({ ...bothKeys, override: 'gemini' })).toEqual(['gemini']);
  });

  it('override with a missing key yields no providers (fails loudly, never silently)', () => {
    expect(resolveAiProviders({ geminiKey: 'g', groqKey: null, override: 'groq' })).toEqual([]);
  });
});

describe('buildGroqRequestBody', () => {
  it('uses JSON mode and includes the model/temperature when provided', () => {
    const body = buildGroqRequestBody('llama-3.3-70b-versatile', 'hi', 0.4) as Record<
      string,
      unknown
    >;
    expect(body).toEqual({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: 'hi' }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });
  });

  it('omits temperature when it is not set', () => {
    const body = buildGroqRequestBody('m', 'hi') as Record<string, unknown>;
    expect(body).not.toHaveProperty('temperature');
  });
});

describe('extractGroqText', () => {
  it('returns the assistant message content', () => {
    expect(extractGroqText({ choices: [{ message: { content: '{"en":"x"}' } }] })).toBe(
      '{"en":"x"}',
    );
  });

  it('throws on an error payload', () => {
    expect(() => extractGroqText({ error: { message: 'bad key' } })).toThrow(/Groq API error/);
  });

  it('throws when there is no content', () => {
    expect(() => extractGroqText({ choices: [] })).toThrow(/Groq returned no text/);
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

describe('generateAiText fallback', () => {
  it('falls back to Groq when Gemini fails', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string) => {
      calls.push(url);
      if (url.includes('generativelanguage.googleapis.com')) {
        return jsonResponse({ error: { message: 'gemini down' } }, false, 500);
      }
      return jsonResponse({ choices: [{ message: { content: '{"en":"ok"}' } }] });
    }) as unknown as typeof fetch;

    const result = await generateAiText(baseOptions, bothKeys, {
      fetchImpl,
      sleep: noSleep,
      log: noopLog,
    });

    expect(result).toEqual({ provider: 'groq', text: '{"en":"ok"}' });
    expect(calls[0]).toContain('generativelanguage.googleapis.com');
    expect(calls[1]).toContain('api.groq.com');
  });

  it('uses Groq directly when Gemini is not configured', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string) => {
      calls.push(url);
      return jsonResponse({ choices: [{ message: { content: '{"en":"ok"}' } }] });
    }) as unknown as typeof fetch;

    const result = await generateAiText(
      baseOptions,
      { geminiKey: null, groqKey: 'q' },
      {
        fetchImpl,
        sleep: noSleep,
      },
    );

    expect(result.provider).toBe('groq');
    expect(calls).toHaveLength(1);
    expect(calls[0]).not.toContain('generativelanguage');
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
      {
        fetchImpl,
        sleep: noSleep,
        log: noopLog,
      },
    );

    expect(result.provider).toBe('groq');
    expect(calls).toHaveLength(1);
    expect(calls[0]).not.toContain('generativelanguage.googleapis.com');
  });

  it('throws when every configured provider fails', async () => {
    const fetchImpl = (async () =>
      jsonResponse({ error: { message: 'down' } }, false, 500)) as unknown as typeof fetch;

    await expect(
      generateAiText(baseOptions, bothKeys, { fetchImpl, sleep: noSleep, log: noopLog }),
    ).rejects.toThrow(/All AI providers failed/);
  });

  it('throws a clear error when no provider is configured', async () => {
    await expect(
      generateAiText(
        baseOptions,
        { geminiKey: null, groqKey: null },
        { sleep: noSleep, log: noopLog },
      ),
    ).rejects.toThrow(/No AI provider is configured/);
  });
});

describe('Gemini rate-limit handling', () => {
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

  const quotaResponse = () => jsonResponse(quotaPayload, false, 429);
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

  it('waits for the retryDelay and retries Gemini instead of falling back to Groq', async () => {
    const sleeps: number[] = [];
    const calls: string[] = [];
    let geminiCalls = 0;

    const fetchImpl = (async (url: string) => {
      calls.push(url);
      if (!isGeminiCall(url)) return groqOkResponse();
      geminiCalls++;
      return geminiCalls === 1 ? quotaResponse() : geminiOkResponse();
    }) as unknown as typeof fetch;

    const result = await generateAiText(baseOptions, bothKeys, {
      fetchImpl,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      log: noopLog,
    });

    expect(result).toEqual({ provider: 'gemini', text: '{"en":"ok"}' });
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

    const result = await generateAiText(baseOptions, bothKeys, {
      fetchImpl,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      log: noopLog,
    });

    expect(result.provider).toBe('gemini');
    expect(sleeps).toEqual([AI_RATE_LIMIT_DEFAULT_WAIT_MS]);
  });

  it('falls back to Groq only once the rate-limit retries are exhausted', async () => {
    const sleeps: number[] = [];
    const fetchImpl = (async (url: string) =>
      isGeminiCall(url) ? quotaResponse() : groqOkResponse()) as unknown as typeof fetch;

    const result = await generateAiText(baseOptions, bothKeys, {
      fetchImpl,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      log: noopLog,
    });

    expect(result).toEqual({ provider: 'groq', text: '{"en":"groq"}' });
    // Two honoured waits, then the fallback — no zero-delay exponential retries.
    expect(sleeps).toEqual([23_000, 23_000]);
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

    const result = await generateAiText(baseOptions, bothKeys, {
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
