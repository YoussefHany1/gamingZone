import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { unixDaysAgo, unixDaysFromNow, unixMonthsAgo, unixNow, unixYearsAgo } from './time.js';
const app = express();

app.use(cors());
app.use(express.json());

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set in environment.');
  process.exit(1);
}

const cacheMiddleware = (duration) => (req, res, next) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', `s-maxage=${duration}, stale-while-revalidate=59`);
  }
  next();
};

/**
 * Error carrying an HTTP status. 4xx statuses surface `err.message` to the
 * client (expected, user-fixable); 5xx are collapsed to a generic message.
 */
class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

/** Wraps an async route handler; rejections flow to the central error handler. */
const asyncRoute = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// NOTE: the central error handler (app.use with 4 params) is registered at the
// bottom of this file — Express only reaches error middleware positioned after
// the route that rejected. See near `app.get('*')`.

let cachedToken = null;

async function getAppToken() {
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

async function callIgdb(apiEndpoint, queryBody) {
  try {
    const token = await getAppToken();

    const res = await fetch(`https://api.igdb.com/v4/${apiEndpoint}`, {
      method: 'POST',
      headers: {
        'Client-ID': CLIENT_ID,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/plain',
        Accept: 'application/json',
      },
      body: queryBody,
    });

    const text = await res.text();

    if (!res.ok) {
      console.error('IGDB returned non-OK status:', res.status, res.statusText);
      console.error('IGDB response body:', text);
      throw new AppError(`IGDB API Error: ${res.status} ${res.statusText}`, 502);
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
//  Endpoints

const BASE_QUERY_FIELDS =
  'fields id, name, cover.image_id, first_release_date, total_rating, game_type';
const BASE_QUERY_WHERE = `where cover.image_id != null & game_type = (0,8,9,10)`;

// Home Page
app.get('/', (req, res) => {
  res.send(`    <html>
      <head>
        <title>Gaming Zone News</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: sans-serif; text-align: center; padding: 50px; background-color: #0c1a33; color: white; }
          .btn { background-color: #779bdd; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-top: 20px;}
        </style>
      </head>
      <body>
        <h1>Gaming Zone</h1>
        <p>All-in-one companion app designed for every gamer</p>
        
        <a href="https://play.google.com/store/apps/details?id=com.yh.gamingzone" class="btn">Download App</a>
      </body>
    </html>`);
});
// Asset Links for Android App Links (Deep Linking)
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.yh.gamingzone',
        sha256_cert_fingerprints: [
          'EB:45:4C:81:18:1C:14:1A:8A:33:70:8B:C4:A5:A5:4D:BF:FA:A2:D3:FF:32:6E:4F:82:F8:8D:9A:7B:F2:ED:85',
        ],
      },
    },
  ]);
});

// News Details (Deep Linking)
app.get('/news-details', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Gaming Zone News</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: sans-serif; text-align: center; padding: 50px; background-color: #0c1a33; color: white; }
          .btn { background-color: #779bdd; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-top: 20px;}
        </style>
      </head>
      <body>
        <h1>Gaming Zone</h1>
        <p>لقراءة الخبر كاملاً، يرجى استخدام التطبيق.</p>
        
        <a href="https://play.google.com/store/apps/details?id=com.yh.gamingzone" class="btn">تحميل التطبيق</a>
        
        <script>
          // محاولة فتح التطبيق عبر الـ Custom Scheme
          // إذا كان التطبيق مثبتاً ولم يفتح تلقائياً، هذا السكريبت سيحاول فتحه
          window.location.href = "gaming-zone://news-details" + window.location.search;
          
          // (اختياري) يمكنك تفعيل تحويل تلقائي للمتجر بعد مدة زمنية إذا أردت
          setTimeout(function() {
            window.location.href = "https://play.google.com/store/apps/details?id=com.yh.gamingzone";
          }, 3000);
        </script>
      </body>
    </html>
  `);
});

// Top Rated
app.get('/top-rated', cacheMiddleware(3600), asyncRoute(async (req, res) => {
  const query = `
    ${BASE_QUERY_FIELDS}, genres.name;
    ${BASE_QUERY_WHERE} & total_rating_count > 20;
    sort total_rating desc;
    limit 10;
  `;
  const data = await callIgdb('games', query);
  res.json(data);
}));

// Random Game — a single, completely random game.
// No caching: every request should be able to return a different result.
app.get('/random-game', asyncRoute(async (req, res) => {
  // 1) How many games match the base filters?
  const countResult = await callIgdb('games/count', `${BASE_QUERY_WHERE};`);
  const total = Number(countResult?.count) || 0;

  // 2) Jump to a random position and grab the game sitting there.
  const offset = total > 0 ? Math.floor(Math.random() * total) : 0;

  const query = `
    ${BASE_QUERY_FIELDS}, platforms.abbreviation, platforms.name, genres.name;
    ${BASE_QUERY_WHERE};
    limit 1;
    offset ${offset};
  `;
  const data = await callIgdb('games', query);

  res.setHeader('Cache-Control', 'no-store');
  res.json(Array.isArray(data) && data.length > 0 ? data[0] : null);
}));

// Recently Released
app.get('/recently-released', cacheMiddleware(3600), asyncRoute(async (req, res) => {
  const nowTs = unixNow();
  const query = `
    ${BASE_QUERY_FIELDS}, platforms.abbreviation, platforms.name, genres.name;
    ${BASE_QUERY_WHERE} & first_release_date < ${nowTs} & total_rating_count > 5;
    sort first_release_date desc;
    limit 10;
  `;
  const data = await callIgdb('games', query);
  res.json(data);
}));

// Trending Mobile Games
app.get('/trending-mobile', cacheMiddleware(3600), asyncRoute(async (req, res) => {
  const nowTs = unixNow();
  const startTs = unixYearsAgo(2);

  const query = `
    ${BASE_QUERY_FIELDS}, platforms.abbreviation, platforms.name, genres.name;
    ${BASE_QUERY_WHERE} & platforms = (34,39) & first_release_date > ${startTs} & first_release_date < ${nowTs} & total_rating_count > 5;
    sort total_rating desc;
    limit 10;
  `;
  const data = await callIgdb('games', query);
  res.json(data);
}));

// Trending games for a specific platform (the one registered on the user's
// account). `platform` values mirror the profile options in the app.
// IGDB platform IDs: 6=PC, 48=PS4, 167=PS5, 49=Xbox One, 169=Xbox Series,
// 130=Nintendo Switch, 34=Android, 39=iOS.
const TRENDING_PLATFORM_IDS = {
  pc: [6],
  playstation: [167, 48],
  xbox: [169, 49],
  nintendo: [130],
  android: [34],
  ios: [39],
};

app.get('/trending-platform', cacheMiddleware(3600), asyncRoute(async (req, res) => {
  const key = String(req.query.platform || '').toLowerCase();
  const platformIds = TRENDING_PLATFORM_IDS[key];

  // Unknown / missing platform → nothing to show.
  if (!platformIds) {
    return res.json([]);
  }

  const nowTs = unixNow();
  const startTs = unixYearsAgo(2);

  const query = `
    ${BASE_QUERY_FIELDS}, platforms.abbreviation, platforms.name, genres.name;
    ${BASE_QUERY_WHERE} & platforms = (${platformIds.join(',')}) & first_release_date > ${startTs} & first_release_date < ${nowTs} & total_rating_count > 5;
    sort total_rating desc;
    limit 10;
  `;
  const data = await callIgdb('games', query);
  res.json(data);
}));

// Popular Right Now
app.get('/popular', cacheMiddleware(3600), asyncRoute(async (req, res) => {
  const nowTs = unixNow();
  // 6 months ago
  const startTs = unixMonthsAgo(6);

  // Fetch top 100 IDs from popularity_primitives (was 500 — reduced for performance)
  const primitivesQuery = `
    fields game_id;
    sort value desc;
    where popularity_type = 1;
    limit 100;
  `;

  const primitivesData = await callIgdb('popularity_primitives', primitivesQuery);

  if (!primitivesData || primitivesData.length === 0) {
    return res.json([]);
  }

  const gameIds = primitivesData.map((p) => p.game_id).join(',');

  const gamesQuery = `
    ${BASE_QUERY_FIELDS}, platforms.abbreviation, platforms.name;
    ${BASE_QUERY_WHERE} & id = (${gameIds}) & first_release_date > ${startTs} & first_release_date < ${nowTs};
  `;

  const gamesData = await callIgdb('games', gamesQuery);

  // Reorder games to match popularity order
  const sortedGames = primitivesData
    .map((p) => gamesData.find((g) => g.id === p.game_id))
    .filter((g) => g);

  res.json(sortedGames);
}));

// ── YouTube helper ──────────────────────────────────────────────────────────

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YT_BATCH_SIZE = 50; // YouTube allows up to 50 IDs per request

/**
 * Fetch YouTube video statistics for a list of video IDs in batches.
 * Returns a Map<videoId, { title, publishedAt, viewCount, likeCount }>
 */
async function fetchYouTubeStats(videoIds) {
  const statsMap = new Map();

  if (!YOUTUBE_API_KEY || videoIds.length === 0) return statsMap;

  // Split into batches of YT_BATCH_SIZE
  for (let i = 0; i < videoIds.length; i += YT_BATCH_SIZE) {
    const batch = videoIds.slice(i, i + YT_BATCH_SIZE);
    const idsParam = batch.join(',');
    const url =
      `https://www.googleapis.com/youtube/v3/videos` +
      `?part=snippet,statistics&id=${idsParam}&key=${YOUTUBE_API_KEY}`;

    try {
      const ytRes = await fetch(url);
      if (!ytRes.ok) {
        console.error('YouTube API error:', ytRes.status, ytRes.statusText);
        continue; // skip this batch, don't crash
      }
      const ytData = await ytRes.json();
      for (const item of ytData.items ?? []) {
        statsMap.set(item.id, {
          title: item.snippet?.title ?? null,
          publishedAt: item.snippet?.publishedAt ?? null,
          viewCount: item.statistics?.viewCount != null
            ? Number(item.statistics.viewCount)
            : null,
          likeCount: item.statistics?.likeCount != null
            ? Number(item.statistics.likeCount)
            : null,
        });
      }
    } catch (err) {
      console.error('YouTube fetch error (batch):', err);
      // continue with remaining batches
    }
  }

  return statsMap;
}

// Most Viewed Recent Trailers
// NOTE: endpoint name kept as /latest-trailers to avoid breaking the frontend.
app.get('/latest-trailers', cacheMiddleware(3600), asyncRoute(async (req, res) => {
  // ── 1. Fetch candidate games from IGDB ──────────────────────────────────
  // We pull more candidates than needed so the YouTube filter+sort has room
  // to work with. Widening the IGDB window to 6 months gives good coverage.
  const nowTs = unixNow();
  const startTs = unixMonthsAgo(6);

  const query = `
    ${BASE_QUERY_FIELDS}, videos.name, videos.video_id, screenshots.image_id;
    ${BASE_QUERY_WHERE} & videos != null & screenshots != null & first_release_date > ${startTs} & first_release_date < ${nowTs};
    sort total_rating_count desc;
    limit 50;
  `;
  const igdbGames = await callIgdb('games', query);

  if (!igdbGames || igdbGames.length === 0) {
    return res.json([]);
  }

  // ── 2. Extract unique video IDs ─────────────────────────────────────────
  const seenVideoIds = new Set();
  // Map: videoId → game (keep first occurrence only)
  const videoToGame = new Map();

  for (const game of igdbGames) {
    if (!Array.isArray(game.videos)) continue;
    for (const v of game.videos) {
      if (!v.video_id || seenVideoIds.has(v.video_id)) continue;
      seenVideoIds.add(v.video_id);
      videoToGame.set(v.video_id, { game, videoName: v.name ?? null });
    }
  }

  const uniqueVideoIds = [...seenVideoIds];

  // ── 3. Fetch YouTube stats (batched) ────────────────────────────────────
  const statsMap = await fetchYouTubeStats(uniqueVideoIds);

  // ── 4. Filter: published within the last 30 days ────────────────────────
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const candidates = [];
  for (const [videoId, ytStats] of statsMap) {
    // Skip if no publishedAt (deleted / private)
    if (!ytStats.publishedAt) continue;
    const publishedMs = new Date(ytStats.publishedAt).getTime();
    if (publishedMs < thirtyDaysAgo) continue;
    // Skip if viewCount missing
    if (ytStats.viewCount === null) continue;

    const entry = videoToGame.get(videoId);
    if (!entry) continue;

    candidates.push({
      videoId,
      ytStats,
      game: entry.game,
      videoName: entry.videoName,
    });
  }

  // ── 5. Sort by viewCount DESC, deduplicate by game, take top 10 ──────────
  // A game may have multiple trailers that passed the filter (e.g. Wolverine ×3).
  // After sorting, keep only the highest-viewed trailer per game.
  candidates.sort((a, b) => b.ytStats.viewCount - a.ytStats.viewCount);
  const seenGameIds = new Set();
  const deduped = [];
  for (const c of candidates) {
    const gid = c.game.id;
    if (seenGameIds.has(gid)) continue;
    seenGameIds.add(gid);
    deduped.push(c);
  }
  const top10 = deduped.slice(0, 10);

  // ── 6. Build response (backward-compatible shape + YouTube fields) ───────
  // Each item mirrors the IGDB game object but replaces videos[] with a
  // single "trailer" object so the frontend doesn't need to change.
  const result = top10.map(({ videoId, ytStats, game, videoName }) => ({
    ...game,
    // Flatten to a single trailer so frontend can use it directly
    trailer: {
      video_id: videoId,
      name: videoName ?? ytStats.title,
      youtube_title: ytStats.title,
      published_at: ytStats.publishedAt,
      view_count: ytStats.viewCount,
      like_count: ytStats.likeCount,
    },
  }));

  res.json(result);
}));

// Coming Soon
app.get('/coming-soon', cacheMiddleware(3600), asyncRoute(async (req, res) => {
  const nowTs = unixNow();
  const query = `
    ${BASE_QUERY_FIELDS}, platforms.abbreviation, platforms.name, hypes;
    ${BASE_QUERY_WHERE} & first_release_date > ${nowTs};
    sort first_release_date asc;
    limit 10;
  `;
  const data = await callIgdb('games', query);
  res.json(data);
}));

// Most Anticipated
app.get('/most-anticipated', cacheMiddleware(3600), asyncRoute(async (req, res) => {
  const nowTs = unixNow();
  const query = `
    ${BASE_QUERY_FIELDS};
    ${BASE_QUERY_WHERE} & first_release_date > ${nowTs} & hypes > 0;
    sort hypes desc;
    limit 10;
  `;
  const data = await callIgdb('games', query);
  res.json(data);
}));

// Nostalgia Corner
app.get('/nostalgia-corner', cacheMiddleware(3600), asyncRoute(async (req, res) => {
  const nostalgiaTs = unixYearsAgo(20);
  const query = `
    ${BASE_QUERY_FIELDS}, platforms.abbreviation, platforms.name;
    ${BASE_QUERY_WHERE} & first_release_date < ${nostalgiaTs} & total_rating > 70;
    sort total_rating_count desc;
    limit 50;
  `;
  const data = await callIgdb('games', query);
  res.json(data);
}));

// Release Calendar — every game releasing inside the [from, to] window
// (Unix seconds, inclusive), one flat date-ascending list so the client can
// bucket games per UTC day. The window is clamped to 62 days and the result
// capped at 500 games.
app.get('/release-calendar', cacheMiddleware(3600), asyncRoute(async (req, res) => {
  const nowTs = unixNow();
  let from = parseInt(req.query.from, 10);
  if (isNaN(from)) from = unixDaysAgo(7);
  let to = parseInt(req.query.to, 10);
  if (isNaN(to)) to = unixDaysFromNow(30);

  const MAX_DAYS = 62;
  if (to - from > MAX_DAYS * 86400) to = from + MAX_DAYS * 86400;

  const query = `
    ${BASE_QUERY_FIELDS}, platforms.abbreviation, platforms.name, hypes;
    ${BASE_QUERY_WHERE} & first_release_date >= ${from} & first_release_date <= ${to};
    sort first_release_date asc;
    limit 500;
  `;
  const data = await callIgdb('games', query);
  res.json(data);
}));

// Search with stable, page-independent ordering.
//
// Pagination strategy:
//  - Browse filters (year/genre/platform): IGDB `sort` is applied engine-side
//    and we stream `limit 50 / offset N` straight off that ordered stream.
//  - Text `q` with relevance (default): IGDB's native search ordering, also
//    streamed off the engine's order.
//  - Text `q` with a non-relevance `sort`: IGDB forbids `sort` alongside the
//    `search` keyword, so we pull the full bounded match set (≤ 500, IGDB's
//    hard limit) in ONE relevance query, sort that whole set once in Node
//    (stable, with an `id` tie-break), then slice the requested page. Sorting
//    a single snapshot instead of per-page kills the old cross-page
//    reordering bug.
app.get('/search', cacheMiddleware(300), asyncRoute(async (req, res) => {
  const { q, year, genre, platform, sort, page } = req.query;

  // At least one of q, year, genre, or platform must be provided
  if (!q && !year && !genre && !platform) {
    throw new AppError('At least one filter (q, year, genre, or platform) is required', 400);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const offset = (pageNum - 1) * 50;
  const PAGE_SIZE = 50;
  const MAX_MATCHES = 500;

  // Always include genres and platforms in fields so client can display them
  const fields = `${BASE_QUERY_FIELDS}, genres.name, platforms.name, platforms.abbreviation`;

  // Build WHERE clauses
  const whereClauses = ['cover.image_id != null', 'game_type = (0,8,9,10)'];

  // Year filter: convert to Unix timestamp range
  if (year) {
    const y = parseInt(year, 10);
    if (!isNaN(y)) {
      const start = Math.floor(new Date(y, 0, 1).getTime() / 1000);
      const end = Math.floor(new Date(y + 1, 0, 1).getTime() / 1000) - 1;
      whereClauses.push(`first_release_date >= ${start}`, `first_release_date <= ${end}`);
    }
  }

  // Genre filter: match by genre name
  if (genre) {
    const safeGenre = genre.replace(/"/g, '\\"');
    whereClauses.push(`genres.name = "${safeGenre}"`);
  }

  // Platform filter: match by platform name
  if (platform) {
    const safePlatform = platform.replace(/"/g, '\\"');
    whereClauses.push(`platforms.name = "${safePlatform}"`);
  }

  const whereStr = whereClauses.join(' & ');

  const sortField =
    sort === 'title' ? 'name'
    : sort === 'release_date' ? 'first_release_date'
    : sort === 'rating' ? 'total_rating'
    : null;
  const sortDir = sortField === 'name' ? 'asc' : 'desc';

  let data;

  if (q) {
    const safeQ = q.replace(/"/g, '\\"');

    if (!sortField) {
      // Relevance — IGDB's own ordering; page straight off the engine.
      data = await callIgdb('games', `
        ${fields};
        search "${safeQ}";
        where ${whereStr};
        limit ${PAGE_SIZE};
        offset ${offset};
      `);
    } else {
      // Non-relevance sort — fetch the bounded relevance match set once
      // (≤ 500), sort the full set once, then slice the requested page.
      const matches = await callIgdb('games', `
        fields id;
        search "${safeQ}";
        where ${whereStr};
        limit ${MAX_MATCHES};
      `);

      data = [...matches]
        .sort((a, b) => {
          const av = a[sortField] ?? (sortDir === 'asc' ? Infinity : -Infinity);
          const bv = b[sortField] ?? (sortDir === 'asc' ? Infinity : -Infinity);
          if (av !== bv) return sortDir === 'asc' ? av - bv : bv - av;
          return a.id - b.id; // stable tie-break for identical keys
        })
        .slice(offset, offset + PAGE_SIZE);
    }
  } else {
    // Browse/filter only — IGDB handles the sort engine-side.
    const serverSort = sortField ? `sort ${sortField} ${sortDir};` : 'sort total_rating desc;';
    const ratingFilter =
      sortField === 'name' || sortField === 'first_release_date' ? '' : '& total_rating_count > 0';
    data = await callIgdb('games', `
      ${fields};
      where ${whereStr} ${ratingFilter};
      ${serverSort}
      limit ${PAGE_SIZE};
      offset ${offset};
    `);
  }

  res.json(data);
}));

// Fetch Multiple Games by IDs
app.get('/games', cacheMiddleware(3600), asyncRoute(async (req, res) => {
  const { ids } = req.query;

  if (!ids) {
    throw new AppError('Game IDs are required', 400);
  }

  // Always include genres and platforms in fields so client can display them.
  // similar_games is needed by the mobile "Recommended for You" engine, which
  // builds its candidate list from the similar_games of the user's top games.
  const fields = `${BASE_QUERY_FIELDS}, genres.name, platforms.name, platforms.abbreviation, similar_games.name, similar_games.cover.image_id`;
  const whereStr = `cover.image_id != null & game_type = (0,8,9,10) & id = (${ids})`;

  const query = `
    ${fields};
    where ${whereStr};
    limit 50;
  `;

  const data = await callIgdb('games', query);
  res.json(data);
}));

// Game Details
app.get('/game-details', cacheMiddleware(3600), asyncRoute(async (req, res) => {
  const { id } = req.query;

  if (!id) {
    throw new AppError('Game ID is required', 400);
  }

  // Define two queries "Game" and "TimeToBeat"
  const query = `
    query games "Game" {
      fields id, name, cover.image_id, cover.url, first_release_date, total_rating, total_rating_count, summary, dlcs, game_type, multiplayer_modes, remakes, remasters, screenshots.image_id, release_dates.human, platforms.abbreviation, websites.type, websites.url, genres.name, game_modes.name, language_supports.language.name, language_supports.language_support_type.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, game_engines.name, videos.name, videos.video_id, collection.name, similar_games.name, similar_games.cover.image_id, collections.games.name, collections.games.cover.image_id, age_ratings.organization, age_ratings.rating_category;
      where id = ${id};
      limit 1;
    };
    
    query game_time_to_beats "TimeToBeat" {
      fields normally, hastily, completely, game_id;
      where game_id = ${id};
    };
  `;

  // Call "multiquery" endpoint
  const data = await callIgdb('multiquery', query);

  const gameResult = data.find((item) => item.name === 'Game');
  const timeResult = data.find((item) => item.name === 'TimeToBeat');

  // Extract the game object
  let game = gameResult && gameResult.result.length > 0 ? gameResult.result[0] : null;

  // Extract the time data
  const timeToBeat = timeResult && timeResult.result.length > 0 ? timeResult.result[0] : null;

  if (game) {
    // Fix the cover URL manually here
    if (game.cover && game.cover.url) {
      game.cover.url = `https:${game.cover.url.replace('t_thumb', 't_cover_big')}`;
    }

    // Merge time data into the game object
    if (timeToBeat) {
      // Remove id and game_id from time data
      delete timeToBeat.id;
      delete timeToBeat.game_id;

      game.game_time_to_beats = timeToBeat;
    } else {
      game.game_time_to_beats = null;
    }
  }

  res.json(game);
}));

// Search for game by name to get IGDB ID (used for free games section in the app)
app.get('/search-game-id', cacheMiddleware(3600), asyncRoute(async (req, res) => {
  const { name } = req.query;

  if (!name) {
    throw new AppError('Game name is required', 400);
  }

  const safeQuery = name.replace(/"/g, '\\"');

  const query = `
    fields id, name;
    search "${safeQuery}";
    limit 1;
  `;

  const data = await callIgdb('games', query);

  if (data && data.length > 0) {
    res.json({ igdb_id: data[0].id });
  } else {
    res.json({ igdb_id: null });
  }
}));

// Gaming Events
app.get('/events', cacheMiddleware(3600), asyncRoute(async (req, res) => {
  const nowTs = unixNow();
  // Fetch events from the last 30 days and future
  const thirtyDaysAgo = unixDaysAgo(3);
  const query = `
    fields name, start_time, end_time, time_zone, event_logo.image_id, live_stream_url,
           description,
           games.name, games.cover.image_id,
           videos.name, videos.video_id,
           event_networks.url, event_networks.network_type;
    where end_time > ${thirtyDaysAgo};
    sort start_time asc;
    limit 15;
  `;
  const data = await callIgdb('events', query);
  res.json(data);
}));

// ======= STEAM INTEGRATION =======

const STEAM_API_KEY = process.env.STEAM_API_KEY;

// Get Steam Top Sellers and map to IGDB
app.get('/steam-top-sellers', cacheMiddleware(3600), asyncRoute(async (req, res) => {
  const steamRes = await fetch('https://store.steampowered.com/api/featuredcategories/');
  const steamData = await steamRes.json();

  const topSellersItems = steamData?.top_sellers?.items || [];
  const appIds = topSellersItems.map((item) => `"${item.id}"`);

  if (appIds.length === 0) {
    return res.json([]);
  }

  // 1) Find IGDB game IDs from Steam appIds
  const extQuery = `
    fields game, uid;
    where uid = (${appIds.join(',')});
    limit 50;
  `;
  const extGames = await callIgdb('external_games', extQuery);
  const gameIds = extGames
    .map((e) => e.game)
    .filter((id) => id)
    .join(',');

  if (!gameIds) {
    return res.json([]);
  }

  // 2) Get full game details from IGDB
  const query = `
    ${BASE_QUERY_FIELDS}, platforms.abbreviation, platforms.name, genres.name;
    ${BASE_QUERY_WHERE} & id = (${gameIds});
    limit 50;
  `;
  const igdbGames = await callIgdb('games', query);

  // 3) Reorder based on Steam's top sellers list to maintain rank
  const sortedGames = [];
  const addedIds = new Set();

  for (const appIdStr of appIds) {
    const cleanId = appIdStr.replace(/"/g, '');
    const extMatch = extGames.find((e) => e.uid === cleanId);
    if (extMatch) {
      const game = igdbGames.find((g) => g.id === extMatch.game);
      if (game && !addedIds.has(game.id)) {
        sortedGames.push(game);
        addedIds.add(game.id);
      }
    }
  }

  res.json(sortedGames);
}));

// Resolve Steam Vanity URL to 64-bit Steam ID
app.get('/steam/resolve', asyncRoute(async (req, res) => {
  const { vanityurl } = req.query;
  if (!vanityurl) throw new AppError('vanityurl is required', 400);
  if (!STEAM_API_KEY) throw new AppError('STEAM_API_KEY is not configured', 500);

  const response = await fetch(
    `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${STEAM_API_KEY}&vanityurl=${vanityurl}`,
  );
  const data = await response.json();

  if (data?.response?.success === 1) {
    res.json({ steamid: data.response.steamid });
  } else {
    throw new AppError('Steam user not found.', 404);
  }
}));

// Get User's Owned Steam Games
app.get('/steam/owned-games', asyncRoute(async (req, res) => {
  const { steamid } = req.query;
  if (!steamid) throw new AppError('steamid is required', 400);
  if (!STEAM_API_KEY) throw new AppError('STEAM_API_KEY is not configured', 500);

  const response = await fetch(
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamid}&format=json&include_appinfo=1`,
  );
  const data = await response.json();

  if (data?.response?.games) {
    const playedGames = data.response.games.filter((game) => Number(game.playtime_forever) > 0);
    res.json({ games: playedGames });
  } else if (Object.keys(data?.response || {}).length === 0) {
    // Empty response usually indicates a private profile
    throw new AppError('Profile is private or has no games.', 403);
  } else {
    throw new AppError('Could not retrieve games.', 404);
  }
}));

// Get User's Steam Wishlist AppIDs
app.get('/steam/wishlist', asyncRoute(async (req, res) => {
  const { steamid } = req.query;
  if (!steamid) throw new AppError('steamid is required', 400);
  if (!STEAM_API_KEY) throw new AppError('STEAM_API_KEY is not configured', 500);

  const response = await fetch(
    `https://api.steampowered.com/IWishlistService/GetWishlist/v1/?key=${STEAM_API_KEY}&steamid=${steamid}`,
  );
  const data = await response.json();

  const rawItems = data?.response?.items;
  const wishlistAppIds = Array.isArray(rawItems)
    ? rawItems
        .map((item) => Number(item?.appid))
        .filter((appid) => Number.isFinite(appid) && appid > 0)
    : [];

  res.json({ appIds: wishlistAppIds });
}));

// Map Steam AppIDs to IGDB Game Details
app.post('/steam/map-to-igdb', asyncRoute(async (req, res) => {
  const { appIds } = req.body;
  if (!appIds || !Array.isArray(appIds) || appIds.length === 0) {
    throw new AppError('Array of appIds is required', 400);
  }

  // Batching to avoid IGDB payload limits (50-100 per request is good)
  const BATCH_SIZE = 50;
  const promises = [];

  for (let i = 0; i < appIds.length; i += BATCH_SIZE) {
    const batchIds = appIds.slice(i, i + BATCH_SIZE);
    const formattedIds = batchIds.map((id) => `"${id}"`).join(',');

    const query = `
fields uid, game.id, game.name, game.cover.image_id, game.first_release_date;
where uid = (${formattedIds});
limit 500;
    `;

    console.log('==> IGDB Query:', query);
    console.log('==> Batch IDs:', batchIds);
    promises.push(callIgdb('external_games', query));
  }

  // Run in chunks of 4 concurrent requests to respect IGDB 4 req/sec limit
  // while still being much faster than 1 by 1.
  const allMappedGames = [];
  for (let i = 0; i < promises.length; i += 4) {
    const chunk = promises.slice(i, i + 4);
    const results = await Promise.all(chunk);

    for (const data of results) {
      if (Array.isArray(data)) {
        const games = data
          .filter((e) => e.game != null)
          .map((e) => ({
            steam_appid: Number(e.uid),
            id: e.game.id,
            name: e.game.name,
            cover_image_id: e.game.cover?.image_id || null,
            release_date: e.game.first_release_date
              ? new Date(e.game.first_release_date * 1000).getFullYear().toString()
              : '',
          }));
        allMappedGames.push(...games);
      }
    }

    // Sleep for 250ms to ensure we don't bombard IGDB too heavily (safe rate limit buffer)
    if (i + 4 < promises.length) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  res.json(allMappedGames);
}));

// ======= PLAYSTATION STORE INTEGRATION =======

// Search PlayStation Store for a game's price
// Usage: GET /psn/search?query=Spider-Man&country=US
// country defaults to US. Other examples: GB, EG, DE, FR, SA
app.get('/psn/search', cacheMiddleware(3600), asyncRoute(async (req, res) => {
  const { query, country = 'US' } = req.query;

  if (!query) {
    throw new AppError('query parameter is required', 400);
  }

  // Modern PlayStation Network Universal Search API
  const psnSearchUrl = `https://m.np.playstation.com/api/search/v1/universalSearch?searchTerm=${encodeURIComponent(query)}&countryCode=${country}&languageCode=en&pageSize=10&searchDomains=ConceptGameWeb`;

  const response = await fetch(psnSearchUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!response.ok) {
    throw new AppError(
      `PlayStation Store returned status ${response.status}. Try a different country code.`,
      502,
    );
  }

  const data = await response.json();
  const rawResults = data?.domainResponses?.[0]?.results ?? [];

  const results = rawResults
    .map((item) => {
      const meta = item?.conceptProductMetadata;
      if (!meta) return null;

      const skus = meta.skus ?? [];
      const sku =
        skus.find((s) => s.type === 'STANDARD' && s.price > 0) ??
        skus.find((s) => s.price > 0) ??
        skus[0];

      if (!sku || sku.price == null) return null;

      const normalPriceNum = sku.price / 100;
      let salePriceNum = normalPriceNum;
      let isOnSale = false;

      // Check active promotional discounts
      if (meta.offers?.osls && meta.offers?.skuRelevancy) {
        const relevantOffers =
          meta.offers.skuRelevancy.find((r) => r.skuId === sku.id)?.offerAvailability ?? [];
        const now = new Date();

        for (const rel of relevantOffers) {
          if (rel.startDate && new Date(rel.startDate) > now) continue;
          if (rel.endDate && new Date(rel.endDate) < now) continue;

          const oslStr = meta.offers.osls.find((o) => o.includes(rel.offerId));
          if (!oslStr) continue;

          try {
            const osl = JSON.parse(oslStr);
            // Skip subscription entitlements (PS Plus Game Catalog)
            if (
              osl.qualification?.criteria?.entitledTo ||
              osl.display?.branding?.includes('PS_PLUS') ||
              osl.metadata?.id?.startsWith('SUB')
            ) {
              continue;
            }

            const discount = osl.reward?.itemReward?.discount;
            if (discount?.pricepoints?.[0]?.retail != null) {
              const discountedPrice = discount.pricepoints[0].retail / 100;
              if (discountedPrice < salePriceNum && discountedPrice > 0) {
                salePriceNum = discountedPrice;
                isOnSale = true;
              }
            } else if (discount?.percent?.retail != null) {
              const percent = discount.percent.retail;
              const discountedPrice =
                Math.round(normalPriceNum * (1 - percent / 100) * 100) / 100;
              if (discountedPrice < salePriceNum && discountedPrice > 0) {
                salePriceNum = discountedPrice;
                isOnSale = true;
              }
            }
          } catch (_e) {
            // Ignore parse errors on malformed offer strings
          }
        }
      }

      const masterImage =
        meta.media?.images?.find(
          (i) => i.type === 'GAMEHUB_COVER_ART' || i.type === 'MASTER',
        ) ?? meta.media?.images?.[0];

      const countryLower = (meta.country || country || 'us').toLowerCase();
      const productUrl = meta.id
        ? `https://store.playstation.com/${countryLower}/product/${meta.id}`
        : `https://store.playstation.com/${countryLower}/concept/${meta.conceptId}`;

      return {
        id: meta.id ?? (meta.conceptId ? String(meta.conceptId) : null),
        name: meta.name ?? null,
        imageUrl: masterImage?.url ?? null,
        price: `${salePriceNum.toFixed(2)}`,
        originalPrice: isOnSale ? `${normalPriceNum.toFixed(2)}` : null,
        isOnSale,
        url: productUrl,
        contentType: meta.topCategory ?? null,
        platforms: meta.targetPlatforms ?? [],
      };
    })
    .filter(Boolean);

  res.json({ query, country, results });
}));

// ======= XBOX / MICROSOFT STORE INTEGRATION =======

/** Lowercased title with trademarks and punctuation stripped, for fuzzy store matching. */
const normalizeStoreTitle = (title) =>
  String(title ?? '')
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Ranks DisplayCatalog autosuggest hits against the game title:
 * exact title > title prefix > title contains; "Game" products beat
 * DLC/apps; language packs never win.
 */
const pickBestXboxProduct = (candidates, normalizedQuery) => {
  let best = null;
  let bestScore = 0;
  for (const product of candidates) {
    if (/language pack/i.test(product.Title)) continue;
    const title = normalizeStoreTitle(product.Title);
    let score = 0;
    if (title === normalizedQuery) score = 100;
    else if (title.startsWith(normalizedQuery)) score = 80;
    else if (title.includes(normalizedQuery)) score = 60;
    if (score === 0) continue;
    if (product.Type === 'Game') score += 10;
    if (score > bestScore) {
      bestScore = score;
      best = product;
    }
  }
  return best;
};

// Search the Microsoft Store (Xbox) for a game's price.
// Usage: GET /xbox/search?query=Halo Infinite&market=US
app.get('/xbox/search', cacheMiddleware(3600), asyncRoute(async (req, res) => {
  const { query, market = 'US' } = req.query;

  if (!query) {
    throw new AppError('query parameter is required', 400);
  }

  // DisplayCatalog autosuggest finds the store product ID for the title.
  const suggestUrl = `https://displaycatalog.mp.microsoft.com/v7.0/productFamilies/autosuggest?market=${encodeURIComponent(market)}&languages=en-us&query=${encodeURIComponent(query)}&topProducts=10&productFamilyNames=Games,Apps&platformdependencyname=Windows.Xbox`;
  const suggestResponse = await fetch(suggestUrl);
  if (!suggestResponse.ok) {
    throw new AppError(`Xbox autosuggest request failed with status ${suggestResponse.status}`, 502);
  }
  const suggestData = await suggestResponse.json();

  // Flatten Results[].Products[] into a ranked candidate list.
  const candidates = [];
  for (const result of suggestData?.Results ?? []) {
    for (const product of result?.Products ?? []) {
      if (product?.ProductId && product?.Title) {
        candidates.push(product);
      }
    }
  }
  const best = pickBestXboxProduct(candidates, normalizeStoreTitle(query));
  if (!best) {
    return res.json({ query, market, results: [] });
  }

  // The Details payload is hundreds of KB; only the price block is kept.
  const productUrl = `https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${encodeURIComponent(best.ProductId)}&market=${encodeURIComponent(market)}&languages=en-us&fieldsTemplate=Details&actionFilter=Browse`;
  const productResponse = await fetch(productUrl);
  if (!productResponse.ok) {
    throw new AppError(`Xbox product lookup failed with status ${productResponse.status}`, 502);
  }
  const productData = await productResponse.json();

  const product = productData?.Products?.[0];
  const availabilities = (product?.DisplaySkuAvailabilities ?? []).flatMap(
    (sku) => sku?.Availabilities ?? [],
  );
  // Prices are major units (59.99). ListPrice is what the buyer pays;
  // MSRP stays at the pre-discount level during sales.
  const price = availabilities
    .map((availability) => availability?.OrderManagementData?.Price)
    .find((p) => p && typeof p.ListPrice === 'number');

  if (!price) {
    return res.json({ query, market, results: [] });
  }

  const listPrice = Number(price.ListPrice);
  const msrp = typeof price.MSRP === 'number' ? Number(price.MSRP) : null;
  const isOnSale = msrp !== null && listPrice < msrp;

  res.json({
    query,
    market,
    results: [{
      name: product?.LocalizedProperties?.[0]?.ProductTitle ?? best.Title ?? null,
      price: listPrice.toFixed(2),
      originalPrice: isOnSale ? msrp.toFixed(2) : null,
      isOnSale,
      url: `https://apps.microsoft.com/detail/${best.ProductId}`,
    }],
  });
}));

// ======= NINTENDO STORE INTEGRATION =======

// Nintendo exposes no official pricing API, so this endpoint assembles one:
// 1. When the caller passes the game's IGDB Nintendo product URL, the page
//    itself supplies the NSUID (image paths) plus a JSON-LD fallback price.
// 2. Otherwise the public store index is searched by title for the NSUID.
// The NSUID then unlocks the (unofficial) eShop price API.
// Usage: GET /nintendo/search?query=Zelda&url=https://www.nintendo.com/us/store/products/...&country=US
const NINTENDO_ALGOLIA_APP_ID = 'U3B6GR4UA3';
const NINTENDO_ALGOLIA_API_KEY = 'a29c6927638bfd8cee23993e51e721c9';
const NINTENDO_ALGOLIA_INDEX = 'store_all_products_en_us';

/** Browser-like headers; Nintendo's edge rejects header-less serverless fetches. */
const NINTENDO_PAGE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

/** Fetches live prices for a Nintendo NSUID from the eShop price API (USD). */
const fetchNintendoPrices = async (nsuid, country) => {
  const priceUrl = `https://ec.nintendo.com/v1/price?country=${encodeURIComponent(country)}&lang=en&ids=${encodeURIComponent(nsuid)}`;
  const priceResponse = await fetch(priceUrl, { headers: NINTENDO_PAGE_HEADERS });
  if (!priceResponse.ok) return null;
  const priceData = await priceResponse.json();
  const entry = priceData?.prices?.[0];
  const regular = entry?.regular_price;
  const discount = entry?.discount_price;
  if (!regular?.amount) return null;

  const regularAmount = Number(regular.amount);
  const saleAmount = discount?.amount ? Number(discount.amount) : null;
  const isOnSale = saleAmount !== null && saleAmount < regularAmount;

  return {
    price: (isOnSale ? saleAmount : regularAmount).toFixed(2),
    originalPrice: isOnSale ? regularAmount.toFixed(2) : null,
    isOnSale,
  };
};

/** Pulls the NSUID out of a Nintendo store product page (image paths / embedded state). */
const extractNintendoNsuid = (html) => {
  const match =
    // CDN image paths like /store/software/switch/<nsuid>/ (or /v/software/switch/…).
    html.match(/\/software\/switch\/(\d{13,14})\//) ||
    html.match(/"nsuid"\s*:\s*"?(\d{13,14})/);
  return match ? match[1] : null;
};

/** Pulls the JSON-LD offers price out of a Nintendo store product page. */
const extractNintendoJsonLdPrice = (html) => {
  // Tag carries extra attributes in practice (e.g. data-next-head="").
  const blocks =
    html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g) ?? [];
  for (const block of blocks) {
    const json = block
      .replace(/^<script[^>]*>/, '')
      .replace(/<\/script>$/, '');
    try {
      const parsed = JSON.parse(json);
      const source = Array.isArray(parsed) ? parsed[0] : parsed;
      const offers = source?.offers;
      const amount = Number(offers?.price);
      if (offers?.priceCurrency === 'USD' && Number.isFinite(amount)) {
        return { amount, url: typeof offers.url === 'string' ? offers.url : null };
      }
    } catch { /* skip malformed blocks */ }
  }
  return null;
};

/**
 * Searches Nintendo's public store index (Algolia). The keys are public /
 * search-only and occasionally rotate, and the DSN host can be unreachable
 * from some serverless regions — the plain host is tried as a fallback.
 * Returns the raw hits (possibly empty).
 */
const searchNintendoIndex = async (searchQuery) => {
  const hosts = [
    `${NINTENDO_ALGOLIA_APP_ID}-dsn.algolia.net`,
    `${NINTENDO_ALGOLIA_APP_ID}.algolia.net`,
  ];
  for (const host of hosts) {
    try {
      const response = await fetch(`https://${host}/1/indexes/${NINTENDO_ALGOLIA_INDEX}/query`, {
        method: 'POST',
        headers: {
          'X-Algolia-API-Key': NINTENDO_ALGOLIA_API_KEY,
          'X-Algolia-Application-Id': NINTENDO_ALGOLIA_APP_ID,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery, hitsPerPage: 10 }),
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data?.hits)) return data.hits;
      }
    } catch (error) {
      console.warn(`Nintendo store index search failed on ${host}:`, error?.message);
    }
  }
  return [];
};

app.get('/nintendo/search', cacheMiddleware(3600), asyncRoute(async (req, res) => {
  const { query, url, country = 'US' } = req.query;

  if (!query && !url) {
    throw new AppError('query or url parameter is required', 400);
  }

  let nsuid = null;
  let pageUrl = null;
  let jsonLdPrice = null;
  let algoliaPrice = null;

  // Path 1: the game's own Nintendo product page (from IGDB's websites list).
  // Host check guards against fetching arbitrary caller-supplied URLs.
  if (url && /^https:\/\/(www\.)?nintendo\.com\//.test(url) && /\/store\/products\//.test(url)) {
    try {
      const pageResponse = await fetch(url, { headers: NINTENDO_PAGE_HEADERS });
      if (pageResponse.ok) {
        const html = await pageResponse.text();
        nsuid = extractNintendoNsuid(html);
        jsonLdPrice = extractNintendoJsonLdPrice(html);
        pageUrl = url;
      }
    } catch (error) {
      console.warn('Nintendo product page fetch failed:', error?.message);
    }
  }

  // Path 2: title search via the public store index (also covers games IGDB
  // has no Nintendo website for). The index carries US prices of its own, so
  // it doubles as a price source when the eShop price API is unreachable.
  if (query && (!nsuid || !jsonLdPrice)) {
    const hits = await searchNintendoIndex(query);
    const normalizedQuery = normalizeStoreTitle(query);
    const significantWords = normalizedQuery.split(' ').filter((w) => w.length > 3);

    // Exact title first, then prefix, then all-significant-words. Anything
    // matching nothing is discarded — a wrong price is worse than none.
    const matches = hits
      .map((h) => {
        const title = normalizeStoreTitle(h?.title ?? h?.name);
        if (!title) return null;
        if (title === normalizedQuery) return { h, exact: true };
        if (title.startsWith(normalizedQuery) || normalizedQuery.startsWith(title)) {
          return { h, exact: false };
        }
        if (significantWords.length && significantWords.every((w) => title.includes(w))) {
          return { h, exact: false };
        }
        return null;
      })
      .filter(Boolean);

    const match = matches.find((m) => m.exact) ?? matches[0] ?? null;
    const hit = match?.h ?? null;
    if (hit) {
      // NSUID shape: 14 digits starting with 7, scanned out of the raw
      // hit because the index schema is not under our control.
      const hitNsuid = JSON.stringify(hit).match(/7\d{13}/);
      nsuid = nsuid ?? (hitNsuid ? hitNsuid[0] : null);

      // US prices in major units (index is en-us). A $0 price only counts
      // for an exact title match — free-to-start demos must not win a
      // fuzzy match and render as a free game.
      const hitPrice = hit.price;
      const hitIsExact = Boolean(match?.exact);
      if (typeof hitPrice?.finalPrice === 'number') {
        const current =
          typeof hitPrice.salePrice === 'number' ? hitPrice.salePrice : hitPrice.finalPrice;
        const original =
          typeof hitPrice.regPrice === 'number' && hitPrice.regPrice > current
            ? hitPrice.regPrice
            : null;
        if (current > 0 || hitIsExact) {
          algoliaPrice = {
            price: current.toFixed(2),
            originalPrice: original !== null ? original.toFixed(2) : null,
            isOnSale: original !== null,
          };
        }
      }

      const hitUrl = typeof hit.url === 'string' ? hit.url : null;
      if (hitUrl && !pageUrl) {
        pageUrl = hitUrl.startsWith('/')
          ? `https://www.nintendo.com${hitUrl}`
          : (/^https:\/\/(www\.)?nintendo\.com\//.test(hitUrl) ? hitUrl : null);
      }
    }
  }

  let result = null;
  if (nsuid) {
    try {
      result = await fetchNintendoPrices(nsuid, country);
    } catch (error) {
      console.warn('Nintendo eShop price lookup failed:', error?.message);
    }
  }

  // Fallback 1: the store index's own US price snapshot.
  if (!result && algoliaPrice) {
    result = algoliaPrice;
  }

  // Fallback 2: the JSON-LD price embedded in the product page itself.
  if (!result && jsonLdPrice) {
    result = {
      price: jsonLdPrice.amount.toFixed(2),
      originalPrice: null,
      isOnSale: false,
    };
    if (!pageUrl && jsonLdPrice.url) {
      pageUrl = jsonLdPrice.url.startsWith('/')
        ? `https://www.nintendo.com${jsonLdPrice.url}`
        : jsonLdPrice.url;
    }
  }

  res.json({
    query: query ?? null,
    country,
    results: result
      ? [{
          name: query ?? null,
          price: result.price,
          originalPrice: result.originalPrice,
          isOnSale: result.isOnSale,
          url: pageUrl,
        }]
      : [],
  });
}));

// invalid route handler (404)
app.get('*', (req, res) => {
  res.redirect('https://play.google.com/store/apps/details?id=com.yh.gamingzone');
});

// Central error handler — positioned after every route so Express reaches it
// when a route rejects (asyncRoute) or throws synchronously.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const status = err instanceof AppError ? err.status : 500;
  if (status >= 500) {
    console.error('Unhandled error:', err);
  } else {
    console.warn('Request error:', err.message);
  }
  res.status(status).json({
    message:
      status >= 500
        ? 'An error occurred on the server while fetching data. Please try again later.'
        : err.message,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});