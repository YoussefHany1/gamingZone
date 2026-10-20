/**
 * Shared IGDB (Twitch) API client.
 *
 * Extracted from index.js so the linked-accounts module and the main router
 * both resolve IGDB through one place. Includes the app-token cache and the
 * global 4 req/sec-aware handling (429 single retry).
 */
import 'dotenv/config';

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set in environment.');
  process.exit(1);
}

/**
 * Error carrying an HTTP status. 4xx statuses surface `err.message` to the
 * client (expected, user-fixable); 5xx are collapsed to a generic message.
 */
export class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

let cachedToken = null;

export async function getAppToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 10000) {
    return cachedToken.token;
  }
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'client_credentials',
  });

  try {
    const res = await fetch(`https://id.twitch.tv/oauth2/token`, {
      method: 'POST',
      body: params,
    });
    if (!res.ok) throw new Error('Failed to get token: ' + res.statusText);
    const data = await res.json();
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return cachedToken.token;
  } catch (error) {
    console.error('Error getting app token:', error);
    throw error;
  }
}

/** Sleep helper for rate-limit pacing. */
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function postIgdb(apiEndpoint, queryBody) {
  const token = await getAppToken();

  return fetch(`https://api.igdb.com/v4/${apiEndpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': CLIENT_ID,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
      Accept: 'application/json',
    },
    body: queryBody,
  });
}

/**
 * Wraps an async route handler; rejections flow to the central error handler.
 */
export const asyncRoute = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Calls an IGDB endpoint. On HTTP 429 the request is retried once after a
 * short randomized back-off — callers are expected to pace their chunks
 * (≤4 req/sec), this only absorbs an occasional contention blip when several
 * serverless instances run concurrently.
 */
export async function callIgdb(apiEndpoint, queryBody) {
  let response = await postIgdb(apiEndpoint, queryBody);

  if (response.status === 429) {
    const jitter = Math.floor(Math.random() * 300);
    await sleep(1000 + jitter);
    response = await postIgdb(apiEndpoint, queryBody);
  }

  try {
    const text = await response.text();

    if (!response.ok) {
      console.error('IGDB returned non-OK status:', response.status, response.statusText);
      console.error('IGDB response body:', text);
      throw new AppError(`IGDB API Error: ${response.status} ${response.statusText}`, 502);
    }

    // Attempt to parse JSON, with error handling
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error('Failed to parse IGDB JSON response:', err);
      console.error('Raw body:', text);
      throw new AppError('Failed to parse IGDB JSON response', 502);
    }

    // Adjust cover URLs
    if (!Array.isArray(data)) return data;
    return data.map((game) => {
      if (game.cover && game.cover.url) {
        game.cover.url = `https:${game.cover.url.replace('t_thumb', 't_cover_big')}`;
      }
      return game;
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Error calling IGDB:', error);
    throw new AppError('Failed to reach IGDB', 502);
  }
}
