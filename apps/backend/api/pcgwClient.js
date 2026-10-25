/**
 * PCGamingWiki client for Windows system requirements.
 *
 * PCGamingWiki removed the structured requirements table from its Cargo API
 * (anonymous `cargoquery` answers `permissiondenied`), so requirements are
 * read from each page's `{{System requirements}}` wikitext template via the
 * anonymous `action=parse` API:
 *
 *   https://www.pcgamingwiki.com/w/api.php?action=parse&redirects=1
 *     &prop=wikitext&page=<game name>&formatversion=2&format=json
 *
 * The template carries clean parameters (`minCPU`, `minGPU2`, `minRAM`,
 * `minHD`, `minVRAM`, `rec*`, …), one invocation per OS family — this module
 * always prefers the `OSfamily = Windows` one. Alternate spec blocks
 * (`alt1*`/`alt2*`, e.g. "RT Minimum") and `*TGT` target labels are ignored.
 *
 * PCGamingWiki enforces 60 requests/minute per IP and then blocks for 60 s,
 * so every upstream call goes through the module-level serial scheduler,
 * which spaces calls ≥1.05 s apart and fails fast during a 429 cooldown.
 *
 * DEPLOYMENT: PCGamingWiki is behind Cloudflare, which answers every path
 * (API, wiki pages, even robots.txt) with a 403 "Attention Required!" page to
 * some datacenter ranges. Vercel's default `iad1` region is blocked; `fra1` is
 * not. `vercel.json` therefore pins this API's function region to `fra1`.
 * Moving the function back to a default/US region silently disables PCGW and
 * every game falls through to the Steam fallback.
 */

const PCGW_API_URL = 'https://www.pcgamingwiki.com/w/api.php';
const PCGW_TIMEOUT_MS = 4000;

/** Minimum gap between two upstream PCGamingWiki calls (60 req/min limit). */
const PCGW_MIN_GAP_MS = 1050;
/** How long a 429 (or any rate-limit response) parks the scheduler. */
const PCGW_COOLDOWN_MS = 60 * 1000;

/** Thrown when PCGamingWiki rate-limits us; the route leaves those games out of the response. */
export class PcgwRateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PcgwRateLimitError';
  }
}

/** Thrown when PCGamingWiki itself is unreachable/malformed (network, 5xx, HTML error page). */
export class PcgwUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PcgwUnavailableError';
  }
}

// ---------------------------------------------------------------------------
// Title normalization
// ---------------------------------------------------------------------------

/**
 * Strips trademark/copyright marks and collapses whitespace so IGDB titles
 * line up with PCGamingWiki page names ("Payday 2™" → "payday 2").
 */
export function normalizePcgwTitle(name) {
  if (typeof name !== 'string') return '';
  return name
    .replace(/[™®©]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Title cleaned for search: same as normalize but case-preserving. */
function searchReadyTitle(name) {
  if (typeof name !== 'string') return '';
  return name
    .replace(/[™®©]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Wikitext cleaning + template parsing (pure, unit-tested)
// ---------------------------------------------------------------------------

/**
 * Cleans one parameter value into display text: resolves wiki links, drops
 * nested templates (`{{ii}}`), `<ref>` blocks and other HTML tags, unescapes
 * entities and collapses whitespace.
 */
function cleanWikitextValue(value) {
  return value
    // <ref>...</ref> blocks (self-closing <ref/> included) carry citations.
    .replace(/<ref\b[^>]*\/>/gi, '')
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, '')
    // [[Target|label]] → label, [[Target]] → Target.
    .replace(/\[\[(?:[^\]|\n]*\|)?([^\]|\n]*)\]\]/g, '$1')
    // Nested templates such as {{ii}} or {{Refurl|...}}.
    .replace(/\{\{[^{}]*\}\}/g, '')
    // Remaining HTML tags and wiki emphasis markers.
    .replace(/<[^>]+>/g, '')
    .replace(/'{2,5}/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Finds `{{System requirements ...}}` invocations and returns their raw
 * inner text. Uses a balanced-brace walk because parameter values can contain
 * nested `{{...}}` templates.
 */
function extractSystemRequirementsTemplates(wikitext) {
  const templates = [];
  const opener = '{{System requirements';
  let from = 0;

  for (;;) {
    const start = wikitext.indexOf(opener, from);
    if (start === -1) break;
    // Case-insensitive retry for pages that write `{{system requirements`.
    const searchFrom = start + opener.length;

    let depth = 0;
    let i = start;
    let end = -1;
    while (i < wikitext.length - 1) {
      const two = wikitext.slice(i, i + 2);
      if (two === '{{') {
        depth += 1;
        i += 2;
      } else if (two === '}}') {
        depth -= 1;
        i += 2;
        if (depth === 0) {
          end = i;
          break;
        }
      } else {
        i += 1;
      }
    }

    if (end === -1) break; // Unbalanced template; stop scanning.
    templates.push(wikitext.slice(start + 2, end - 2));
    from = end;
  }

  return templates;
}

/** Splits template inner text into `name → raw value`, nesting-aware. */
function parseTemplateParams(inner) {
  const params = new Map();
  let depth = 0;
  let inLink = false;
  let current = '';

  const flush = () => {
    const eq = current.indexOf('=');
    if (eq > 0) {
      const name = current.slice(0, eq).trim().toLowerCase();
      const value = current.slice(eq + 1);
      // First occurrence wins, matching MediaWiki's duplicate-param handling.
      if (name && !params.has(name)) params.set(name, value);
    }
    current = '';
  };

  for (let i = 0; i < inner.length; i += 1) {
    const two = inner.slice(i, i + 2);
    if (two === '{{') {
      depth += 1;
    } else if (two === '}}') {
      depth -= 1;
    } else if (two === '[[') {
      inLink = true;
    } else if (two === ']]') {
      inLink = false;
    }

    if (inner[i] === '|' && depth === 0 && !inLink) {
      flush();
      continue;
    }
    current += inner[i];
  }
  flush();

  return params;
}

/**
 * Joins the primary and alternative values of one spec ("GTX 1060" +
 * "RX 580" → "GTX 1060 or RX 580"), mirroring how Steam writes alternatives.
 * Empty values are skipped.
 */
function joinSpecs(...values) {
  const parts = values
    .map((value) => cleanWikitextValue(value ?? ''))
    .filter((value) => value.length > 0);
  return parts.length > 0 ? parts.join(' or ') : null;
}

/**
 * Single "6 GB" VRAM note appended to the GPU value. Comma lists ("3 GB
 * (Nvidia), 4 GB (AMD)") and per-vendor notes are skipped — they say nothing
 * about the *first* listed GPU.
 */
function vramSuffix(rawVram) {
  const cleaned = cleanWikitextValue(rawVram ?? '');
  if (!/^\d+\s*gb$/i.test(cleaned)) return '';
  return ` (${cleaned} VRAM)`;
}

function buildRows(params, prefix) {
  // Parameter names are lowercased by parseTemplateParams.
  const has = (name) => params.has(prefix + name);
  const raw = (name) => params.get(prefix + name) ?? '';

  const rows = [];

  const os = joinSpecs(raw('os'));
  if (os) rows.push({ label: 'OS', value: `Windows ${os}` });

  const cpu = joinSpecs(raw('cpu'), raw('cpu2'));
  if (cpu) rows.push({ label: 'Processor', value: cpu });

  const ram = joinSpecs(raw('ram'));
  if (ram) rows.push({ label: 'Memory', value: ram });

  const storage = joinSpecs(raw('hd'));
  if (storage) rows.push({ label: 'Storage', value: storage });

  const gpuBase = joinSpecs(raw('gpu'), raw('gpu2'), raw('gpu3'));
  if (gpuBase) {
    const suffix = has('vram') ? vramSuffix(raw('vram')) : '';
    rows.push({ label: 'Graphics', value: gpuBase + suffix });
  }

  const dx = joinSpecs(raw('dx'));
  if (dx) rows.push({ label: 'DirectX', value: dx });

  return rows;
}

/**
 * Extracts Windows minimum/recommended spec rows from a page's wikitext.
 *
 * Returns `{ minimum: SpecRow[], recommended: SpecRow[] }` (either tier may be
 * empty) or null when the page has no `{{System requirements}}` template at
 * all. Prefers the `OSfamily = Windows` template; falls back to the first one.
 */
export function parseSystemrequirements(wikitext) {
  if (typeof wikitext !== 'string' || wikitext.length === 0) return null;

  const templates = extractSystemRequirementsTemplates(wikitext);
  if (templates.length === 0) return null;

  const parsed = templates.map((inner) => ({
    params: parseTemplateParams(inner),
  }));

  const windows =
    parsed.find((t) => /^windows$/i.test(cleanWikitextValue(t.params.get('osfamily') ?? ''))) ??
    parsed[0];

  const minimum = buildRows(windows.params, 'min');
  const recommended = buildRows(windows.params, 'rec');

  if (minimum.length === 0 && recommended.length === 0) {
    // A template exists but carries no specs — treat as "no requirements".
    return null;
  }

  return { minimum, recommended };
}

// ---------------------------------------------------------------------------
// Rate-limited serial scheduler (module state, shared by all requests)
// ---------------------------------------------------------------------------

let schedulerChain = Promise.resolve();
let lastCallAt = 0;
let cooldownUntil = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `task` serialized, ≥PCGW_MIN_GAP_MS after the previous upstream call.
 * During a rate-limit cooldown every queued call rejects immediately with
 * `PcgwRateLimitError` instead of firing and getting the IP blocked longer.
 */
function schedule(task) {
  const run = async () => {
    const wait = cooldownUntil - Date.now();
    if (wait > 0) throw new PcgwRateLimitError('PCGamingWiki rate-limit cooldown active');

    const gap = PCGW_MIN_GAP_MS - (Date.now() - lastCallAt);
    if (gap > 0) await sleep(gap);

    lastCallAt = Date.now();
    try {
      return await task();
    } catch (error) {
      if (error?.isPcgwRateLimited) cooldownUntil = Date.now() + PCGW_COOLDOWN_MS;
      throw error;
    }
  };

  const result = schedulerChain.then(run, run);
  // Keep the chain alive regardless of individual failures.
  schedulerChain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function userAgent() {
  const contact = process.env.PCGW_CONTACT_EMAIL || 'contact@gamingzone.app';
  return `GamingZone/1.0 (https://github.com/youssefhany/gamingzone; ${contact})`;
}

/** Shared fetch wrapper; flags rate-limit responses for the scheduler. */
async function pcgwFetch(params) {
  const url = `${PCGW_API_URL}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  let response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(PCGW_TIMEOUT_MS),
      headers: { Accept: 'application/json', 'User-Agent': userAgent() },
    });
  } catch (error) {
    throw new PcgwUnavailableError(`PCGamingWiki request failed: ${error?.message}`);
  }

  if (response.status === 429) {
    const error = new PcgwRateLimitError('PCGamingWiki responded 429');
    error.isPcgwRateLimited = true;
    throw error;
  }
  if (!response.ok) {
    throw new PcgwUnavailableError(`PCGamingWiki responded ${response.status}`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new PcgwUnavailableError('PCGamingWiki returned a malformed body');
  }
  if (payload?.error?.code === 'ratetoolimited' || payload?.error?.code === 'ratelimited') {
    const error = new PcgwRateLimitError(payload.error.info || 'PCGamingWiki rate limit');
    error.isPcgwRateLimited = true;
    throw error;
  }
  return payload;
}

async function fetchWikitext(pageTitle) {
  const payload = await pcgwFetch({
    action: 'parse',
    redirects: '1',
    prop: 'wikitext',
    page: pageTitle,
  });
  if (payload.error) {
    const error = new Error(`PCGamingWiki parse error: ${payload.error.code}`);
    error.code = payload.error.code === 'missingtitle' ? 'missingtitle' : 'pcgw-error';
    throw error;
  }
  return payload.parse?.wikitext ?? '';
}

async function searchExactPageTitle(name) {
  // MediaWiki full-text search returns zero hits for characters like "™",
  // so search with the cleaned title and compare normalized forms.
  const query = searchReadyTitle(name);
  if (!query) return null;

  const payload = await pcgwFetch({
    action: 'query',
    list: 'search',
    srsearch: query,
    srlimit: '10',
  });
  const target = normalizePcgwTitle(name);
  const hits = Array.isArray(payload?.query?.search) ? payload.query.search : [];
  const hit = hits.find((item) => normalizePcgwTitle(item.title ?? '') === target);
  return hit?.title ?? null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolves one game's Windows requirements by name.
 *
 * Returns `{ minimum, recommended }` rows, or null when PCGamingWiki has no
 * page or no requirements for the game. Names are resolved through
 * `action=parse&redirects=1`; a miss falls back to search and only accepts an
 * exact (normalized) title match, so "Elden Ring" never picks up
 * "Elden Ring Nightreign".
 *
 * Failures are typed: `PcgwRateLimitError` tells the route to stop asking
 * (cooldown), `PcgwUnavailableError` that PCGamingWiki is down — both leave
 * the game out of the response so the client retries later. A `missingtitle`
 * parse error after the search fallback resolves to null (permanent).
 */
export async function fetchPcgwRequirements(name) {
  const normalized = normalizePcgwTitle(name);
  if (!normalized) return null;

  return schedule(async () => {
    let wikitext;
    try {
      wikitext = await fetchWikitext(name);
    } catch (error) {
      if (error instanceof PcgwRateLimitError || error instanceof PcgwUnavailableError) {
        throw error;
      }
      if (error?.code !== 'missingtitle') throw new PcgwUnavailableError(error?.message);

      // Not a page under that exact name: search once and accept only an
      // exact title match (redirects handled above).
      const pageTitle = await searchExactPageTitle(name);
      if (!pageTitle) return null;
      wikitext = await fetchWikitext(pageTitle);
    }

    return parseSystemrequirements(wikitext);
  });
}
