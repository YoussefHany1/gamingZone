const axios = require("axios");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function isRetryableError(error) {
  const status = error?.response?.status;
  if (typeof status === "number") {
    return isRetryableStatus(status);
  }

  const code = error?.code;
  return (
    code === "ECONNABORTED" ||
    code === "ECONNRESET" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT" ||
    code === "EAI_AGAIN"
  );
}

async function withRetry(operation, options = {}) {
  const {
    retries = 3,
    baseDelayMs = 400,
    maxDelayMs = 4000,
    label = "request",
  } = options;

  let attempt = 0;

  while (true) {
    attempt += 1;

    try {
      return await operation();
    } catch (error) {
      const shouldRetry = attempt <= retries && isRetryableError(error);
      if (!shouldRetry) throw error;

      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      console.warn(
        `   ⚠️ ${label} failed (attempt ${attempt}/${retries + 1}): ${error.message}. Retrying in ${delay}ms...`,
      );
      await sleep(delay);
    }
  }
}

async function axiosGetWithRetry(url, config = {}, retryOptions = {}) {
  return withRetry(() => axios.get(url, config), {
    label: `GET ${url}`,
    ...retryOptions,
  });
}

module.exports = {
  withRetry,
  axiosGetWithRetry,
};
