/**
 * Batch PC-requirements endpoint: PCGamingWiki primary, Steam fallback.
 *
 * Game cards only know an IGDB id (list endpoints do not include `websites`),
 * so this route resolves requirements server-side. For each game it tries
 * PCGamingWiki first (by game name — also covers Epic/GOG-only titles), and
 * falls back to Steam's `appdetails` for games PCGamingWiki does not cover
 * that do have a Steam page. Both sources normalize to the same structured
 * `{ label, value }` rows the client-side compatibility scorer consumes.
 *
 * Response:
 *   { "<igdbId>": { minimum: Row[]|null, recommended: Row[]|null } | null }
 * where Row = { label: string, value: string }.
 *
 * A key present with `null` means "no requirements found" and is cacheable.
 * A key that is absent means the lookup failed transiently (rate limit,
 * upstream outage, or PCGW budget exhausted) and the client should retry
 * later.
 */
import {
  MAX_GAME_IDS,
  mapSteamAppIds,
  normalizeSteamRequirements,
  parseGameIds,
  parseSpecHtmlToRows,
  steamAppIdFromWebsites,
} from './pcRequirementsHelpers.js';
import { fetchPcgwRequirements } from './pcgwClient.js';

const REQUIREMENTS_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_LIMIT = 2000;
const STEAM_TIMEOUT_MS = 7000;

/**
 * PCGamingWiki lookups budgeted per invocation. Each game costs at most two
 * upstream calls (parse + one search fallback) and they run serially, so 8
 * games stay well inside the 60 req/min limit and the function's wall clock;
 * ids beyond the budget are simply left out of the response.
 */
const PCGW_MAX_GAMES = 8;

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
 * Fetches requirements for several Steam app ids in one request and returns
 * them as structured rows.
 *
 * Throws when Steam itself fails (rate limit, network, malformed body) so the
 * caller can leave those games uncached and retry on a later request.
 */
async function fetchSteamRequirementsRows(appIds) {
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
    const normalized = entry?.success
      ? normalizeSteamRequirements(entry.data?.pc_requirements)
      : null;

    byAppId.set(
      appId,
      normalized
        ? {
            minimum: normalized.minimum ? parseSpecHtmlToRows(normalized.minimum) : null,
            recommended: normalized.recommended
              ? parseSpecHtmlToRows(normalized.recommended)
              : null,
          }
        : null,
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
          fields id, name, websites.type, websites.url;
          where id = (${uncached.join(',')});
          limit ${uncached.length};
        `;
        const games = await callIgdb('games', query);

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

        // ── Pass 1: PCGamingWiki (budgeted, serial upstream) ──────────────
        const pcgwFallbackIds = [];
        let pcgwBudget = PCGW_MAX_GAMES;
        let pcgwAvailable = true;

        const steamAppIdsByGame = new Map();
        for (const game of Array.isArray(games) ? games : []) {
          if (typeof game?.id !== 'number') continue;
          steamAppIdsByGame.set(game.id, steamAppIdFromWebsites(game.websites));
        }

        const gamesById = new Map(
          (Array.isArray(games) ? games : [])
            .filter((game) => typeof game?.id === 'number')
            .map((game) => [game.id, game]),
        );

        for (const id of uncached) {
          if (!returned.has(id)) continue;
          if (!pcgwAvailable || pcgwBudget <= 0) break;

          const name = typeof gamesById.get(id)?.name === 'string' ? gamesById.get(id).name : '';
          if (!name) continue;

          try {
            const rows = await fetchPcgwRequirements(name);
            pcgwBudget -= 1;
            if (rows) {
              result[id] = {
                minimum: rows.minimum.length > 0 ? rows.minimum : null,
                recommended: rows.recommended.length > 0 ? rows.recommended : null,
              };
              writeCache(id, result[id], now);
            } else if (!steamAppIdsByGame.get(id)) {
              // No PCGW page and no Steam page either: permanent miss.
              result[id] = null;
              writeCache(id, null, now);
            } else {
              pcgwFallbackIds.push(id);
            }
          } catch {
            // Rate-limited or PCGamingWiki down: stop asking for this
            // invocation. Remaining games stay absent — the client retries
            // them later — except those already queued for Steam.
            pcgwAvailable = false;
            break;
          }
        }

        // ── Pass 2: Steam fallback (one batched appdetails call) ──────────
        const appIdToGame = new Map();
        for (const gameId of pcgwFallbackIds) {
          const appId = steamAppIdsByGame.get(gameId);
          if (appId && !appIdToGame.has(appId)) appIdToGame.set(appId, gameId);
        }

        const steamAppIds = [...appIdToGame.keys()];
        if (steamAppIds.length > 0) {
          try {
            const steam = await fetchSteamRequirementsRows(steamAppIds);
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
