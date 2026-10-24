/**
 * Pure helpers for the `/pc-requirements` route.
 *
 * Kept separate from `pcRequirements.js` so they can be unit-tested without
 * importing `igdbClient.js` (which exits when Twitch credentials are absent).
 */

/** Hard cap on one request; Steam's batch endpoint stays small and fast. */
export const MAX_GAME_IDS = 40;

/**
 * Normalizes `?ids=1,2,3` (or an array of values) into a deduped, positive
 * integer list capped at `MAX_GAME_IDS`.
 */
export function parseGameIds(raw) {
  const text = Array.isArray(raw) ? raw.join(',') : typeof raw === 'string' ? raw : '';
  const ids = text
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  return [...new Set(ids)].slice(0, MAX_GAME_IDS);
}

/** IGDB website type for Steam store pages. */
const STEAM_WEBSITE_TYPE = 13;

/** Extracts a Steam app id from an IGDB `websites` array, or null. */
export function steamAppIdFromWebsites(websites) {
  if (!Array.isArray(websites)) return null;

  for (const site of websites) {
    if (site?.type !== STEAM_WEBSITE_TYPE || typeof site.url !== 'string') continue;
    const match = site.url.match(/store\.steampowered\.com\/app\/(\d+)/);
    if (match?.[1]) return match[1];
  }

  return null;
}

/**
 * Builds `Map<igdbId, steamAppId>` from an IGDB games payload. Games without a
 * Steam page map to `null` so the route can cache "not available" explicitly.
 */
export function mapSteamAppIds(games) {
  const byIgdbId = new Map();
  if (!Array.isArray(games)) return byIgdbId;

  for (const game of games) {
    if (!game || typeof game.id !== 'number') continue;
    byIgdbId.set(game.id, steamAppIdFromWebsites(game.websites));
  }

  return byIgdbId;
}

/**
 * Normalizes Steam's `pc_requirements` field.
 *
 * Older appids return a bare HTML string instead of the usual
 * `{ minimum, recommended }` object; both shapes are accepted. Returns null
 * when neither tier exists.
 */
export function normalizeSteamRequirements(pcRequirements) {
  if (!pcRequirements) return null;

  if (typeof pcRequirements === 'string') {
    return pcRequirements.trim()
      ? { minimum: pcRequirements, recommended: null }
      : null;
  }

  if (typeof pcRequirements !== 'object') return null;

  const minimum =
    typeof pcRequirements.minimum === 'string' && pcRequirements.minimum.trim()
      ? pcRequirements.minimum
      : null;
  const recommended =
    typeof pcRequirements.recommended === 'string' && pcRequirements.recommended.trim()
      ? pcRequirements.recommended
      : null;

  return minimum || recommended ? { minimum, recommended } : null;
}

/**
 * Parses Steam's HTML PC-requirements blob into the structured
 * `{ label, value }` rows the route returns.
 *
 * Port of `parseSpecHtml` from `@gaming-zone/utils` — the backend cannot import
 * that package (workspace-only dependency), so the label/value rows it produces
 * for the Steam fallback must stay byte-identical to the mobile/web parser.
 */
export function parseSpecHtmlToRows(html) {
  if (typeof html !== 'string') return [];

  const stripped = html.replace(/<[^>]+>/g, (tag) => {
    const lower = tag.toLowerCase();
    if (lower.startsWith('</li') || lower.startsWith('<br')) return '\n';
    return '';
  });

  const rows = [];
  stripped.split('\n').forEach((line) => {
    const clean = line
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .trim();
    if (!clean) return;

    const colonIdx = clean.indexOf(':');
    if (colonIdx <= 0) return;

    const label = clean.slice(0, colonIdx).replace(/\s*\*$/, '').trim();
    const value = clean.slice(colonIdx + 1).trim();
    if (label && value && !/additional/i.test(label)) {
      rows.push({ label, value });
    }
  });

  return rows;
}
