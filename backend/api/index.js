import "dotenv/config";
import express from "express";
import cors from "cors";
const app = express();

app.use(cors());
app.use(express.json());

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const MY_APP_SECRET = process.env.MY_APP_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set in environment.",
  );
  process.exit(1);
}

if (!MY_APP_SECRET) {
  console.warn(
    "Warning: MY_APP_SECRET is not set in environment variables. The API is running with a default insecure key (default-insecure-key).",
  );
}

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
const now = new Date();
const endTimestamp = Math.floor(now.getTime() / 1000); // time now

// 6 months ago
const pastDate = new Date();
pastDate.setMonth(pastDate.getMonth() - 6);
const startTimestamp = Math.floor(pastDate.getTime() / 1000);

// 20 years ago
const nostalgiaDate = new Date();
nostalgiaDate.setFullYear(nostalgiaDate.getFullYear() - 20);
const nostalgiaTimestamp = Math.floor(nostalgiaDate.getTime() / 1000);

//  Endpoints

const currentTimestamp = Math.floor(Date.now() / 1000);
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
        "An error occurred on the server while fteching data. Please try again later.",
    });
  }
});

// Recently Released
app.get("/recently-released", cacheMiddleware(3600), async (req, res) => {
  try {
    const query = `
      ${BASE_QUERY_FIELDS}, platforms.abbreviation, platforms.name, genres.name;
      ${BASE_QUERY_WHERE} & first_release_date < ${currentTimestamp} & total_rating_count > 5;
      sort first_release_date desc;
      limit 10;
    `;
    const data = await callIgdb("games", query);
    res.json(data);
  } catch (error) {
    res.status(500).json({
      message:
        "An error occurred on the server while fteching data. Please try again later.",
    });
  }
});

// Coming Soon
app.get("/coming-soon", cacheMiddleware(3600), async (req, res) => {
  try {
    const query = `
      ${BASE_QUERY_FIELDS}, platforms.abbreviation, platforms.name, hypes;
      ${BASE_QUERY_WHERE} & first_release_date > ${currentTimestamp};
      sort first_release_date asc;
      limit 10;
    `;
    const data = await callIgdb("games", query);
    res.json(data);
  } catch (error) {
    res.status(500).json({
      message:
        "An error occurred on the server while fteching data. Please try again later.",
    });
  }
});

// Most Anticipated
app.get("/most-anticipated", cacheMiddleware(3600), async (req, res) => {
  try {
    const query = `
      ${BASE_QUERY_FIELDS};
      ${BASE_QUERY_WHERE} & first_release_date > ${currentTimestamp} & hypes > 0;
      sort hypes desc;
      limit 10;
    `;
    const data = await callIgdb("games", query);
    res.json(data);
  } catch (error) {
    res.status(500).json({
      message:
        "An error occurred on the server while fteching data. Please try again later.",
    });
  }
});

// Popular Right Now
app.get("/popular", cacheMiddleware(3600), async (req, res) => {
  try {
    // Fetch IDs from popularity_primitives
    const primitivesQuery = `
      fields game_id;
      sort value desc;
      where popularity_type = 1;
      limit 500;
    `;

    // Request the IDs
    const primitivesData = await callIgdb(
      "popularity_primitives",
      primitivesQuery,
    );

    if (!primitivesData || primitivesData.length === 0) {
      return res.json([]);
    }

    // Extract IDs from the results
    const gameIds = primitivesData.map((p) => p.game_id).join(",");

    // Use the IDs to fetch full game details
    const gamesQuery = `
      ${BASE_QUERY_FIELDS}, platforms.abbreviation, platforms.name;
      ${BASE_QUERY_WHERE} & id = (${gameIds}) & first_release_date > ${startTimestamp} & first_release_date < ${endTimestamp};
    `;

    const gamesData = await callIgdb("games", gamesQuery);

    // Reorder games to match popularity order
    const sortedGames = primitivesData
      .map((p) => gamesData.find((g) => g.id === p.game_id))
      .filter((g) => g); // Filter out any undefined results

    res.json(sortedGames);
  } catch (error) {
    res.status(500).json({
      message:
        "An error occurred on the server while fteching data. Please try again later.",
    });
  }
});

// Nostalgia Corner
app.get("/nostalgia-corner", cacheMiddleware(3600), async (req, res) => {
  try {
    const query = `
${BASE_QUERY_FIELDS}, platforms.abbreviation, platforms.name;
${BASE_QUERY_WHERE} & first_release_date < ${nostalgiaTimestamp} & total_rating > 70;
sort total_rating_count desc;
limit 50;
    `;
    const data = await callIgdb("games", query);
    res.json(data);
  } catch (error) {
    res.status(500).json({
      message:
        "An error occurred on the server while fteching data. Please try again later.",
    });
  }
});

app.get("/search", cacheMiddleware(300), async (req, res) => {
  try {
    // search query parameter
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ message: 'Search query "q" is required' });
    }

    // clean the search query to prevent IGDB query issues
    const safeQuery = q.replace(/"/g, '\\"');

    const query = `
      ${BASE_QUERY_FIELDS};
      search "${safeQuery}";
      limit 50;
    `;
    const data = await callIgdb("games", query);
    res.json(data);
  } catch (error) {
    res.status(500).json({
      message:
        "An error occurred on the server while fteching data. Please try again later.",
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
        "An error occurred on the server while fteching data. Please try again later.",
    });
  }
});

// invalid route handler (404)
app.get("*", (req, res) => {
  res.redirect(
    "https://play.google.com/store/apps/details?id=com.yh.gamingzone",
  );
});
export default app;
