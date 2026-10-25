/**
 * Batch PC-requirements endpoint: PCGamingWiki primary, Steam fallback.
 *
 * Game cards only know an IGDB id (list endpoints do not include `websites`),
 * so this route resolves requirements server-side. For each game it tries
 * PCGamingWiki first (by game name — also covers Epic/GOG-only titles), and
 * falls back to Steam's `appdetails` for games PCGamingWiki does not cover,
 * cannot serve (it is Cloudflare-blocked in some regions, see `pcgwClient.js`)
 * or has no requirements for, as long as they have a Steam page. Both sources
 * normalize to the same structured `{ label, value }` rows the client-side
 * compatibility scorer consumes.
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
} from './pcRequirementsHelpers.js';
import { fetchPcgwRequirements } from './pcgwClient.js';

const REQUIREMENTS_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_LIMIT = 2000;
const STEAM_TIMEOUT_MS = 6000;
/** Steam allows a few concurrent app-detail lookups; more risks rate limiting. */
const STEAM_CONCURRENCY = 4;
/**
 * Wall-clock budget for the Steam fallback. A hung or rate-limited Steam must
 * not hold the response past the clients' request timeout; unresolved games
 * stay absent from the response so they are retried on a later request.
 */
const STEAM_PASS_BUDGET_MS = 6000;
/**
 * Tail budget for the Steam lookups that only become known after the PCGW
 * pass (games PCGW has no page for). It starts once the PCGW pass is done, so
 * it is kept short enough to stay inside the clients' request timeout.
 */
const STEAM_MISS_BUDGET_MS = 3000;

/**
 * PCGamingWiki lookups budgeted per invocation. Each game costs at most two
 * upstream calls (parse + one search fallback) and they run serially, so 6
 * games stay well inside the 60 req/min limit and the clients' request timeout.
 * Ids beyond the budget are not looked up on PCGamingWiki this time; they go
 * straight to the Steam fallback when they have a Steam page.
 */
const PCGW_MAX_GAMES = 6;
/**
 * Wall-clock budget for the PCGW pass. Slow titles (every page miss also costs
 * a search call) must not push the response past the clients' timeout; the
 * remaining games go to the Steam fallback instead.
 */
const PCGW_BUDGET_MS = 5000;

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
 * Fetches one app id's requirements and normalizes them to row lists.
 *
 * `appdetails` rejects multi-app-id requests (`400` + a bare `null` body), so
 * each game needs its own call. `filters=basic` is used because
 * `filters=pc_requirements` is broken upstream (`{ success: true, data: [] }`),
 * while `basic` still carries the `pc_requirements` block.
 *
 * Throws when Steam itself fails (rate limit, network, malformed body) so the
 * caller can leave that game uncached and retry on a later request. Resolves
 * to `null` when Steam simply has no requirements for the game.
 */
async function fetchSteamAppRows(appId) {
  const url =
    'https://store.steampowered.com/api/appdetails' +
    `?appids=${appId}&filters=basic&cc=US`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(STEAM_TIMEOUT_MS),
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Steam appdetails responded ${response.status} for app ${appId}`);
  }

  const payload = await response.json();

  // Steam answers a bare `null` body when it rate-limits the caller. Without
  // this guard that would look like "no requirements" and get cached for a day.
  const entry = payload?.[appId];
  if (!entry || typeof entry !== 'object') {
    throw new Error('Steam appdetails returned an empty body (rate limited?)');
  }

  const normalized = entry.success
    ? normalizeSteamRequirements(entry.data?.pc_requirements)
    : null;
  if (!normalized) return null;

  return {
    minimum: normalized.minimum ? parseSpecHtmlToRows(normalized.minimum) : null,
    recommended: normalized.recommended ? parseSpecHtmlToRows(normalized.recommended) : null,
  };
}

/**
 * Resolves Steam requirements for `gameIds` (a few lookups in parallel) and
 * returns `Map<igdbId, value>`. A present `null` means Steam has no
 * requirements for that game (cacheable); a missing key means the lookup
 * failed or ran out of budget and the game should be retried later.
 */
async function fetchSteamRequirementsForGames(gameIds, steamAppIdsByGame, deadline) {
  const byGameId = new Map();
  const appIdToGame = new Map();
  for (const gameId of gameIds) {
    const appId = steamAppIdsByGame.get(gameId);
    if (appId && !appIdToGame.has(appId)) appIdToGame.set(appId, gameId);
  }

  const entries = [...appIdToGame];
  for (let i = 0; i < entries.length; i += STEAM_CONCURRENCY) {
    if (Date.now() >= deadline) break;

    const batch = entries.slice(i, i + STEAM_CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(([appId]) => fetchSteamAppRows(appId)),
    );

    settled.forEach((outcome, index) => {
      const [appId, gameId] = batch[index];
      if (outcome.status === 'fulfilled') {
        byGameId.set(gameId, outcome.value);
      } else {
        console.warn(
          'pc-requirements: Steam lookup failed',
          { appId, error: outcome.reason?.message },
        );
      }
    });
  }

  return byGameId;
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

        // ── Pass 1: classify PCGamingWiki candidates ─────────────────────
        // PCGamingWiki lookups are serialized (~1.05 s apart, 60 req/min
        // limit), so only the first PCGW_MAX_GAMES games are looked up there.
        // Every other game with a Steam page goes to the fallback.
        const steamAppIdsByGame = mapSteamAppIds(games);

        const gamesById = new Map(
          (Array.isArray(games) ? games : [])
            .filter((game) => typeof game?.id === 'number')
            .map((game) => [game.id, game]),
        );

        const pcgwIds = [];
        const overflowSteamIds = [];

        for (const id of uncached) {
          if (!returned.has(id)) continue;

          const name =
            typeof gamesById.get(id)?.name === 'string' ? gamesById.get(id).name : '';
          if (name && pcgwIds.length < PCGW_MAX_GAMES) {
            pcgwIds.push(id);
          } else if (steamAppIdsByGame.get(id)) {
            overflowSteamIds.push(id);
          }
        }

        // Start the Steam fallback for the overflow right away: it runs while
        // the serial PCGW pass below is waiting, so the two do not add up.
        const steamDeadline = Date.now() + STEAM_PASS_BUDGET_MS;
        const overflowSteamPromise = fetchSteamRequirementsForGames(
          overflowSteamIds,
          steamAppIdsByGame,
          steamDeadline,
        );

        // ── Pass 2: PCGamingWiki ──────────────────────────────────────────
        const steamMissIds = [];
        let pcgwBudget = pcgwIds.length;
        const pcgwDeadline = Date.now() + PCGW_BUDGET_MS;

        for (const id of pcgwIds) {
          if (pcgwBudget <= 0 || Date.now() >= pcgwDeadline) {
            if (steamAppIdsByGame.get(id)) steamMissIds.push(id);
            continue;
          }

          const name = gamesById.get(id)?.name ?? '';
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
              steamMissIds.push(id);
            }
          } catch (error) {
            // Upstream trouble (Cloudflare block, rate limit, outage): stop
            // spending PCGW calls this invocation, but keep falling back to
            // Steam for this game and every game after it.
            pcgwBudget = 0;
            console.warn(
              'pc-requirements: PCGamingWiki lookup failed',
              { name, error: error?.message },
            );
            if (steamAppIdsByGame.get(id)) steamMissIds.push(id);
          }
        }

        // ── Pass 3: Steam fallback results ────────────────────────────────
        for (const [gameId, value] of await overflowSteamPromise) {
          result[gameId] = value;
          writeCache(gameId, value, now);
        }

        if (steamMissIds.length > 0) {
          const missed = await fetchSteamRequirementsForGames(
            steamMissIds,
            steamAppIdsByGame,
            Date.now() + STEAM_MISS_BUDGET_MS,
          );
          for (const [gameId, value] of missed) {
            result[gameId] = value;
            writeCache(gameId, value, now);
          }
        }
      }

      res.json(result);
    }),
  );
}
