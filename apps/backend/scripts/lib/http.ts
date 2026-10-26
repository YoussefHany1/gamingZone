import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from './logger';
import { getErrorMessage } from './errors';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function isRetryableError(error: unknown): boolean {
  const { response, code } = error as {
    response?: { status?: number };
    code?: string;
  };
  const status = response?.status;
  if (typeof status === 'number') {
    return isRetryableStatus(status);
  }

  return (
    code === 'ECONNABORTED' ||
    code === 'ECONNRESET' ||
    code === 'ENOTFOUND' ||
    code === 'ETIMEDOUT' ||
    code === 'EAI_AGAIN'
  );
}

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  label?: string;
}

async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 3, baseDelayMs = 400, maxDelayMs = 4000, label = 'request' } = options;

  let attempt = 0;

  while (true) {
    attempt += 1;

    try {
      return await operation();
    } catch (error: unknown) {
      const shouldRetry = attempt <= retries && isRetryableError(error);
      if (!shouldRetry) throw error;

      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      logger.warn(
        `   ⚠️ ${label} failed (attempt ${attempt}/${retries + 1}): ${getErrorMessage(error)}. Retrying in ${delay}ms...`,
      );
      await sleep(delay);
    }
  }
}

async function axiosGetWithRetry<T = unknown>(
  url: string,
  config: AxiosRequestConfig = {},
  retryOptions: RetryOptions = {},
): Promise<AxiosResponse<T>> {
  return withRetry(() => axios.get<T>(url, config), {
    label: `GET ${url}`,
    ...retryOptions,
  });
}

export { withRetry, axiosGetWithRetry };
