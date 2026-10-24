/**
 * Batch Steam PC-requirements endpoint.
 *
 * Game cards only know an IGDB id (list endpoints do not include `websites`),
 * so this route resolves the Steam app id server-side and fetches every game's
 * requirements in one Steam `appdetails` call. The response keeps Steam's raw
 * HTML: parsing lives in `@gaming-zone/utils` and is shared with mobile/web.
 *
 * Response:
 *   { "<igdbId>": { minimum: string|null, recommended: string|null } | null }
 *
 * A key present with `null` means "no Steam page / no requirements" and is
 * cacheable. A key that is absent means the lookup failed transiently and the
 * client should retry later.
 */
import {
  MAX_GAME_IDS,
  mapSteamAppIds,
  normalizeSteamRequirements,
  parseGameIds,
} from './pcRequirementsHelpers.js';

const REQUIREMENTS_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_LIMIT = 2000;
const STEAM_TIMEOUT_MS = 7000;

/** IGDB id → cached result. `null` means "resolved, but nothing to show". */
const requirementsCache = new Map();

function readCache(id, now) {
  const entry = requirementsCache.get(id);
  if (!entry || entry.expiresAt <= now) {
    requirementsCache.delete(id);
    return undefined;
  }
  return entry.value;
}

function writeCache(id, value, now) {
  requirementsCache.set(id, { value, expiresAt: now + REQUIREMENTS_TTL_MS });
  if (requirementsCache.size > CACHE_LIMIT) {
    const oldestKey = requirementsCache.keys().next().value;
    if (oldestKey !== undefined) requirementsCache.delete(oldestKey);
  }
}

/**
 * Fetches requirements for several Steam app ids in one request.
 *
 * Throws when Steam itself fails (rate limit, network, malformed body) so the
 * caller can leave those games uncached and retry on a later request.
 */
async function fetchSteamRequirements(appIds) {
  const url =
    'https://store.steampowered.com/api/appdetails' +
    `?appids=${appIds.join(',')}&filters=pc_requirements&cc=US`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(STEAM_TIMEOUT_MS),
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Steam appdetails responded ${response.status}`);
  }

  const payload = await response.json();
  const byAppId = new Map();

  for (const appId of appIds) {
    const entry = payload?.[appId];
    byAppId.set(
      appId,
      entry?.success ? normalizeSteamRequirements(entry.data?.pc_requirements) : null,
    );
  }

  return byAppId;
}

export function registerPcRequirementsRoutes(app, { AppError, asyncRoute, callIgdb }) {
  app.get(
    '/pc-requirements',
    asyncRoute(async (req, res) => {
      res.setHeader(
        'Cache-Control',
        's-maxage=86400, stale-while-revalidate=3600',
      );

      const ids = parseGameIds(req.query.ids);
      if (ids.length === 0) {
        throw new AppError(
          `ids must be 1-${MAX_GAME_IDS} comma-separated IGDB ids`,
          400,
        );
      }

      const now = Date.now();
      const result = {};
      const uncached = [];

      for (const id of ids) {
        const cached = readCache(id, now);
        if (cached !== undefined) result[id] = cached;
        else uncached.push(id);
      }

      if (uncached.length > 0) {
        const query = `
          fields id, websites.type, websites.url;
          where id = (${uncached.join(',')});
          limit ${uncached.length};
        `;
        const games = await callIgdb('games', query);
        const appIdsByGame = mapSteamAppIds(games);

        // IGDB ids that do not exist are permanently empty, not transient.
        const returned = new Set(
          (Array.isArray(games) ? games : [])
            .map((game) => game?.id)
            .filter((id) => typeof id === 'number'),
        );
        for (const id of uncached) {
          if (!returned.has(id)) {
            result[id] = null;
            writeCache(id, null, now);
          }
        }

        const appIdToGame = new Map();
        for (const [gameId, appId] of appIdsByGame) {
          if (appId) appIdToGame.set(appId, gameId);
          else if (returned.has(gameId)) {
            result[gameId] = null;
            writeCache(gameId, null, now);
          }
        }

        const steamAppIds = [...appIdToGame.keys()];
        if (steamAppIds.length > 0) {
          try {
            const steam = await fetchSteamRequirements(steamAppIds);
            for (const [appId, gameId] of appIdToGame) {
              if (!steam.has(appId)) continue;
              const value = steam.get(appId) ?? null;
              result[gameId] = value;
              writeCache(gameId, value, now);
            }
          } catch (error) {
            // Leave these games absent from the response: the client retries
            // them later instead of caching a wrong "no requirements".
            console.warn('pc-requirements: Steam lookup failed', error?.message);
          }
        }
      }

      res.json(result);
    }),
  );
}
