import "dotenv/config";
import express from "express";
import cors from "cors";
const app = express();

app.use(cors());
app.use(express.json());

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
// const MY_APP_SECRET = process.env.MY_APP_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set in environment.",
  );
  process.exit(1);
}

// if (!MY_APP_SECRET) {
//   console.warn(
//     "Warning: MY_APP_SECRET is not set in environment variables. The API is running with a default insecure key (default-insecure-key).",
//   );
// }

// const authenticateRequest = (req, res, next) => {
//   // Exclude the homepage from authentication (for Health Check purposes)
//   if (req.path === "/") return next();

//   const apiKey = req.headers["x-api-key"];

//   // Use the key from the environment or a temporary default key
//   const validKey = MY_APP_SECRET || "default-insecure-key";

//   if (!apiKey || apiKey !== validKey) {
//     return res
//       .status(403)
//       .json({ message: "Forbidden: Invalid or missing API Key" });
//   }

//   next();
// };

const cacheMiddleware = (duration) => (req, res, next) => {
  if (req.method === "GET") {
    res.setHeader(
      "Cache-Control",
      `s-maxage=${duration}, stale-while-revalidate=59`,
    );
  }
  next();
};

let cachedToken = null;

async function getAppToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 10000) {
    return cachedToken.token;
  }
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "client_credentials",
  });

  try {
    const res = await fetch(`https://id.twitch.tv/oauth2/token`, {
      method: "POST",
      body: params,
    });
    if (!res.ok) throw new Error("Failed to get token: " + res.statusText);
    const data = await res.json();
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return cachedToken.token;
  } catch (error) {
    console.error("Error getting app token:", error);
    throw error;
  }
}

async function callIgdb(apiEndpoint, queryBody) {
  try {
    const token = await getAppToken();

    const res = await fetch(`https://api.igdb.com/v4/${apiEndpoint}`, {
      method: "POST",
      headers: {
        "Client-ID": CLIENT_ID,
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
        Accept: "application/json",
      },
      body: queryBody,
    });

    const text = await res.text();

    if (!res.ok) {
      console.error("IGDB returned non-OK status:", res.status, res.statusText);
      console.error("IGDB response body:", text);
      throw new Error(
        `IGDB API Error: ${res.status} ${res.statusText} - ${text}`,
      );
    }

    // Attempt to parse JSON, with error handling
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("Failed to parse IGDB JSON response:", err);
      console.error("Raw body:", text);
      throw new Error("Failed to parse IGDB JSON response");
    }

    // Adjust cover URLs
    if (!Array.isArray(data)) return data;
    return data.map((game) => {
      if (game.cover && game.cover.url) {
        game.cover.url = `https:${game.cover.url.replace(
          "t_thumb",
          "t_cover_big",
        )}`;
      }
      return game;
    });
  } catch (error) {
    console.error("Error calling IGDB:", error);
    throw error;
  }
}
//  Endpoints

const BASE_QUERY_FIELDS =
  "fields id, name, cover.image_id, first_release_date, total_rating, game_type";
const BASE_QUERY_WHERE = `where cover.image_id != null & game_type = (0,8,9,10)`;

// Home Page
app.get("/", (req, res) => {
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
app.get("/.well-known/assetlinks.json", (req, res) => {
  res.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.yh.gamingzone",
        sha256_cert_fingerprints: [
          "EB:45:4C:81:18:1C:14:1A:8A:33:70:8B:C4:A5:A5:4D:BF:FA:A2:D3:FF:32:6E:4F:82:F8:8D:9A:7B:F2:ED:85",
        ],
      },
    },
  ]);
});

// News Details (Deep Linking)
app.get("/news-details", (req, res) => {
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
app.get("/top-rated", cacheMiddleware(3600), async (req, res) => {
  try {
    const query = `
      ${BASE_QUERY_FIELDS}, genres.name;
      ${BASE_QUERY_WHERE} & total_rating_count > 20;
      sort total_rating desc;
      limit 10;
    `;
    const data = await callIgdb("games", query);
    res.json(data);
  } catch (error) {
    res.status(500).json({
      message:
        "An error occurred on the server while fetching data. Please try again later.",
    });
  }
});

// Recently Released
app.get("/recently-released", cacheMiddleware(3600), async (req, res) => {
  try {
    const nowTs = Math.floor(Date.now() / 1000);
    const query = `
      ${BASE_QUERY_FIELDS}, platforms.abbreviation, platforms.name, genres.name;
      ${BASE_QUERY_WHERE} & first_release_date < ${nowTs} & total_rating_count > 5;
      sort first_release_date desc;
      limit 10;
    `;
    const data = await callIgdb("games", query);
    res.json(data);
  } catch (error) {
    res.status(500).json({
      message:
        "An error occurred on the server while fetching data. Please try again later.",
    });
  }
});

// Trending Mobile Games
app.get("/trending-mobile", cacheMiddleware(3600), async (req, res) => {
  try {
    const nowTs = Math.floor(Date.now() / 1000);
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 2);
    const startTs = Math.floor(pastDate.getTime() / 1000);

    const query = `
      ${BASE_QUERY_FIELDS}, platforms.abbreviation, platforms.name, genres.name;
      ${BASE_QUERY_WHERE} & platforms = (34,39) & first_release_date > ${startTs} & first_release_date < ${nowTs} & total_rating_count > 5;
      sort total_rating desc;
      limit 10;
    `;
    const data = await callIgdb("games", query);
    res.json(data);
  } catch (error) {
    res.status(500).json({
      message:
        "An error occurred on the server while fetching data. Please try again later.",
    });
  }
});

// Popular Right Now
app.get("/popular", cacheMiddleware(3600), async (req, res) => {
  try {
    const nowTs = Math.floor(Date.now() / 1000);
    // 6 months ago
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 6);
    const startTs = Math.floor(pastDate.getTime() / 1000);

    // Fetch top 100 IDs from popularity_primitives (was 500 — reduced for performance)
    const primitivesQuery = `
      fields game_id;
      sort value desc;
      where popularity_type = 1;
      limit 100;
    `;

    const primitivesData = await callIgdb(
      "popularity_primitives",
      primitivesQuery,
    );

    if (!primitivesData || primitivesData.length === 0) {
      return res.json([]);
    }

    const gameIds = primitivesData.map((p) => p.game_id).join(",");

    const gamesQuery = `
      ${BASE_QUERY_FIELDS}, platforms.abbreviation, platforms.name;
      ${BASE_QUERY_WHERE} & id = (${gameIds}) & first_release_date > ${startTs} & first_release_date < ${nowTs};
    `;

    const gamesData = await callIgdb("games", gamesQuery);

    // Reorder games to match popularity order
    const sortedGames = primitivesData
      .map((p) => gamesData.find((g) => g.id === p.game_id))
      .filter((g) => g);

    res.json(sortedGames);
  } catch (error) {
    res.status(500).json({
      message:
        "An error occurred on the server while fetching data. Please try again later.",
    });
  }
});

// Latest Trailers
app.get("/latest-trailers", cacheMiddleware(3600), async (req, res) => {
  try {
    const nowTs = Math.floor(Date.now() / 1000);
    const query = `
      ${BASE_QUERY_FIELDS}, videos.name, videos.video_id, screenshots.image_id;
      ${BASE_QUERY_WHERE} & videos != null & screenshots != null & first_release_date < ${nowTs};
      sort first_release_date desc;
      limit 10;
    `;
    const data = await callIgdb("games", query);
    res.json(data);
  } catch (error) {
    res.status(500).json({
      message:
        "An error occurred on the server while fetching data. Please try again later.",
    });
  }
});

// Coming Soon
app.get("/coming-soon", cacheMiddleware(3600), async (req, res) => {
  try {
    const nowTs = Math.floor(Date.now() / 1000);
    const query = `
      ${BASE_QUERY_FIELDS}, platforms.abbreviation, platforms.name, hypes;
      ${BASE_QUERY_WHERE} & first_release_date > ${nowTs};
      sort first_release_date asc;
      limit 10;
    `;
    const data = await callIgdb("games", query);
    res.json(data);
  } catch (error) {
    res.status(500).json({
      message:
        "An error occurred on the server while fetching data. Please try again later.",
    });
  }
});

// Most Anticipated
app.get("/most-anticipated", cacheMiddleware(3600), async (req, res) => {
  try {
    const nowTs = Math.floor(Date.now() / 1000);
    const query = `
      ${BASE_QUERY_FIELDS};
      ${BASE_QUERY_WHERE} & first_release_date > ${nowTs} & hypes > 0;
      sort hypes desc;
      limit 10;
    `;
    const data = await callIgdb("games", query);
    res.json(data);
  } catch (error) {
    res.status(500).json({
      message:
        "An error occurred on the server while fetching data. Please try again later.",
    });
  }
});

// Nostalgia Corner
app.get("/nostalgia-corner", cacheMiddleware(3600), async (req, res) => {
  try {
    const nostalgiaDate = new Date();
    nostalgiaDate.setFullYear(nostalgiaDate.getFullYear() - 20);
    const nostalgiaTs = Math.floor(nostalgiaDate.getTime() / 1000);
    const query = `
      ${BASE_QUERY_FIELDS}, platforms.abbreviation, platforms.name;
      ${BASE_QUERY_WHERE} & first_release_date < ${nostalgiaTs} & total_rating > 70;
      sort total_rating_count desc;
      limit 50;
    `;
    const data = await callIgdb("games", query);
    res.json(data);
  } catch (error) {
    res.status(500).json({
      message:
        "An error occurred on the server while fetching data. Please try again later.",
    });
  }
});

app.get("/search", cacheMiddleware(300), async (req, res) => {
  try {
    const { q, year, genre, platform, sort } = req.query;

    // At least one of q, year, genre, or platform must be provided
    if (!q && !year && !genre && !platform) {
      return res
        .status(400)
        .json({
          message:
            "At least one filter (q, year, genre, or platform) is required",
        });
    }

    // Always include genres and platforms in fields so client can display them
    const fields = `${BASE_QUERY_FIELDS}, genres.name, platforms.name, platforms.abbreviation`;

    // Build WHERE clauses
    const whereClauses = ["cover.image_id != null", "game_type = (0,8,9,10)"];

    // Year filter: convert to Unix timestamp range
    if (year) {
      const y = parseInt(year, 10);
      if (!isNaN(y)) {
        const start = Math.floor(new Date(y, 0, 1).getTime() / 1000);
        const end = Math.floor(new Date(y + 1, 0, 1).getTime() / 1000) - 1;
        whereClauses.push(`first_release_date >= ${start}`);
        whereClauses.push(`first_release_date <= ${end}`);
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

    const whereStr = whereClauses.join(" & ");

    let igdbQuery;

    if (q) {
      // IGDB does NOT allow `sort` when using the `search` keyword.
      // Fetch in relevance order; sort is applied in Node.js below.
      const safeQ = q.replace(/"/g, '\\"');
      igdbQuery = `
        ${fields};
        search "${safeQ}";
        where ${whereStr};
        limit 50;
      `;
    } else {
      // Browse/filter only — server-side sort is fine here.
      let serverSort;
      if (sort === "title") {
        serverSort = "sort name asc;";
      } else if (sort === "release_date") {
        serverSort = "sort first_release_date desc;";
      } else {
        serverSort = "sort total_rating desc;";
      }
      const ratingFilter =
        sort === "title" || sort === "release_date"
          ? ""
          : "& total_rating_count > 0";
      igdbQuery = `
        ${fields};
        where ${whereStr} ${ratingFilter};
        ${serverSort}
        limit 50;
      `;
    }

    let data = await callIgdb("games", igdbQuery);

    // For text search, IGDB can't sort — so we do it here in Node
    if (q && sort && sort !== "relevance") {
      data = [...data].sort((a, b) => {
        if (sort === "title") return (a.name ?? "").localeCompare(b.name ?? "");
        if (sort === "release_date")
          return (b.first_release_date ?? 0) - (a.first_release_date ?? 0);
        if (sort === "rating")
          return (b.total_rating ?? 0) - (a.total_rating ?? 0);
        return 0;
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message:
        "An error occurred on the server while fetching data. Please try again later.",
    });
  }
});

// Game Details
app.get("/game-details", cacheMiddleware(3600), async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ message: "Game ID is required" });
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
    const data = await callIgdb("multiquery", query);

    const gameResult = data.find((item) => item.name === "Game");
    const timeResult = data.find((item) => item.name === "TimeToBeat");

    // Extract the game object
    let game =
      gameResult && gameResult.result.length > 0 ? gameResult.result[0] : null;

    // Extract the time data
    const timeToBeat =
      timeResult && timeResult.result.length > 0 ? timeResult.result[0] : null;

    if (game) {
      // Fix the cover URL manually here
      if (game.cover && game.cover.url) {
        game.cover.url = `https:${game.cover.url.replace(
          "t_thumb",
          "t_cover_big",
        )}`;
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
  } catch (error) {
    res.status(500).json({
      message:
        "An error occurred on the server while fetching data. Please try again later.",
    });
  }
});

// Search for game by name to get IGDB ID (used for free games section in the app)
app.get("/search-game-id", cacheMiddleware(3600), async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ message: "Game name is required" });
    }

    const safeQuery = name.replace(/"/g, '\\"');

    const query = `
      fields id, name;
      search "${safeQuery}";
      limit 1;
    `;

    const data = await callIgdb("games", query);

    if (data && data.length > 0) {
      res.json({ igdb_id: data[0].id });
    } else {
      res.json({ igdb_id: null });
    }
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while searching for game.",
    });
  }
});

// Gaming Events
app.get("/events", cacheMiddleware(3600), async (req, res) => {
  try {
    const nowTs = Math.floor(Date.now() / 1000);
    const query = `
      fields name, start_time, end_time, time_zone, event_logo.image_id, live_stream_url,
             description,
             games.name, games.cover.image_id,
             videos.name, videos.video_id,
             event_networks.url, event_networks.network_type;
      where start_time > ${nowTs};
      sort start_time asc;
      limit 15;
    `;
    const data = await callIgdb("events", query);
    res.json(data);
  } catch (error) {
    res.status(500).json({
      message:
        "An error occurred on the server while fetching data. Please try again later.",
    });
  }
});

// ======= STEAM INTEGRATION =======

const STEAM_API_KEY = process.env.STEAM_API_KEY;

// Get Steam Top Sellers and map to IGDB
app.get("/steam-top-sellers", cacheMiddleware(3600), async (req, res) => {
  try {
    const steamRes = await fetch("https://store.steampowered.com/api/featuredcategories/");
    const steamData = await steamRes.json();
    
    const topSellersItems = steamData?.top_sellers?.items || [];
    const appIds = topSellersItems.map(item => `"${item.id}"`);
    
    if (appIds.length === 0) {
      return res.json([]);
    }

    // 1) Find IGDB game IDs from Steam appIds
    const extQuery = `
      fields game, uid;
      where uid = (${appIds.join(",")});
      limit 50;
    `;
    const extGames = await callIgdb("external_games", extQuery);
    const gameIds = extGames.map(e => e.game).filter(id => id).join(",");

    if (!gameIds) {
      return res.json([]);
    }

    // 2) Get full game details from IGDB
    const query = `
      ${BASE_QUERY_FIELDS}, platforms.abbreviation, platforms.name, genres.name;
      ${BASE_QUERY_WHERE} & id = (${gameIds});
      limit 50;
    `;
    const igdbGames = await callIgdb("games", query);

    // 3) Reorder based on Steam's top sellers list to maintain rank
    const sortedGames = [];
    const addedIds = new Set();
    
    for (const appIdStr of appIds) {
      const cleanId = appIdStr.replace(/"/g, '');
      const extMatch = extGames.find(e => e.uid === cleanId);
      if (extMatch) {
        const game = igdbGames.find(g => g.id === extMatch.game);
        if (game && !addedIds.has(game.id)) {
          sortedGames.push(game);
          addedIds.add(game.id);
        }
      }
    }

    res.json(sortedGames);
  } catch (error) {
    console.error("Steam Top Sellers Error:", error);
    res.status(500).json({
      message: "An error occurred while fetching Steam top sellers.",
    });
  }
});

// Resolve Steam Vanity URL to 64-bit Steam ID
app.get("/steam/resolve", async (req, res) => {
  try {
    const { vanityurl } = req.query;
    if (!vanityurl)
      return res.status(400).json({ message: "vanityurl is required" });
    if (!STEAM_API_KEY)
      return res
        .status(500)
        .json({ message: "STEAM_API_KEY is not configured" });

    const response = await fetch(
      `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${STEAM_API_KEY}&vanityurl=${vanityurl}`,
    );
    const data = await response.json();

    if (data?.response?.success === 1) {
      res.json({ steamid: data.response.steamid });
    } else {
      res.status(404).json({ message: "Steam user not found." });
    }
  } catch (error) {
    console.error("Steam Resolve Error:", error);
    res.status(500).json({ message: "Error resolving Steam ID." });
  }
});

// Get User's Owned Steam Games
app.get("/steam/owned-games", async (req, res) => {
  try {
    const { steamid } = req.query;
    if (!steamid)
      return res.status(400).json({ message: "steamid is required" });
    if (!STEAM_API_KEY)
      return res
        .status(500)
        .json({ message: "STEAM_API_KEY is not configured" });

    const response = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamid}&format=json&include_appinfo=1`,
    );
    const data = await response.json();

    if (data?.response?.games) {
      const playedGames = data.response.games.filter(
        (game) => Number(game.playtime_forever) > 0,
      );
      res.json({ games: playedGames });
    } else if (Object.keys(data?.response || {}).length === 0) {
      // Empty response usually indicates a private profile
      res.status(403).json({ message: "Profile is private or has no games." });
    } else {
      res.status(404).json({ message: "Could not retrieve games." });
    }
  } catch (error) {
    res.status(500).json({ message: "Error retrieving owned games." });
  }
});

// Get User's Steam Wishlist AppIDs
app.get("/steam/wishlist", async (req, res) => {
  try {
    const { steamid } = req.query;
    if (!steamid)
      return res.status(400).json({ message: "steamid is required" });
    if (!STEAM_API_KEY)
      return res
        .status(500)
        .json({ message: "STEAM_API_KEY is not configured" });

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
  } catch (error) {
    console.error("Steam Wishlist Error:", error);
    res.status(500).json({ message: "Error retrieving wishlist." });
  }
});

// Map Steam AppIDs to IGDB Game Details
app.post("/steam/map-to-igdb", async (req, res) => {
  try {
    const { appIds } = req.body;
    if (!appIds || !Array.isArray(appIds) || appIds.length === 0) {
      return res.status(400).json({ message: "Array of appIds is required" });
    }

    // Batching to avoid IGDB payload limits (50-100 per request is good)
    const BATCH_SIZE = 50;
    const promises = [];

    for (let i = 0; i < appIds.length; i += BATCH_SIZE) {
      const batchIds = appIds.slice(i, i + BATCH_SIZE);
      const formattedIds = batchIds.map((id) => `"${id}"`).join(",");

      const query = `
  fields uid, game.id, game.name, game.cover.image_id, game.first_release_date;
  where uid = (${formattedIds});
  limit 500;
      `;

      console.log("==> IGDB Query:", query);
      console.log("==> Batch IDs:", batchIds);
      promises.push(callIgdb("external_games", query));
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
                ? new Date(e.game.first_release_date * 1000)
                    .getFullYear()
                    .toString()
                : "",
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
  } catch (error) {
    console.error("IGDB Mapping Error:", error);
    res.status(500).json({ message: "Error mapping Steam games to IGDB." });
  }
});

// invalid route handler (404)
app.get("*", (req, res) => {
  res.redirect(
    "https://play.google.com/store/apps/details?id=com.yh.gamingzone",
  );
});
export default app;
