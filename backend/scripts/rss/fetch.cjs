const xml2js = require("xml2js");
const iconv = require("iconv-lite");
const jschardet = require("jschardet");
const he = require("he");

const { withRetry } = require("../lib/http.cjs");
const { fixArabHardwareEncoding } = require("./encoding.cjs");

const parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true,
  trim: true,
});

function cleanXmlBody(body) {
  if (!body) return "";

  let cleaned = body.replace(
    /&(?!(?:apos|quot|[gl]t|amp|#\d+|#x[a-f\d]+);)/gi,
    "&amp;",
  );

  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return cleaned;
}

async function parseResponse(body) {
  let parsedJson = null;
  try {
    parsedJson = JSON.parse(body);
  } catch (_error) {}

  if (parsedJson && !parsedJson.rss && !parsedJson.feed) {
    return { type: "json", data: parsedJson };
  }

  try {
    const parsed = await parser.parseStringPromise(body);
    return { type: "xml", data: parsed };
  } catch (_error) {
    const cleanedBody = cleanXmlBody(body);
    const parsedCleaned = await parser.parseStringPromise(cleanedBody);
    return { type: "xml", data: parsedCleaned };
  }
}

async function fetchOgImage(url) {
  try {
    const { gotScraping } = await import("got-scraping");
    const response = await withRetry(
      () =>
        gotScraping({
          url,
          timeout: { request: 15000 },
          headerGeneratorOptions: {
            devices: ["mobile", "desktop"],
            locales: ["en-US", "ar"],
          },
        }),
      { label: `OG fetch (${url})`, retries: 2 },
    );

    const body = response.body;
    if (!body || typeof body !== "string") return null;

    // Find all meta and link tags in the document body
    const tags = body.match(/<(?:meta|link)\s+[^>]*>/gi) || [];
    const images = {};

    for (const tag of tags) {
      // Extract property, name, itemprop, or rel attribute value
      const propMatch = tag.match(/(?:property|name|itemprop|rel)\s*=\s*["']([^"']+)["']/i);
      // Extract content or href attribute value
      const contentMatch = tag.match(/(?:content|href)\s*=\s*["']([^"']+)["']/i);

      if (propMatch && contentMatch) {
        const key = propMatch[1].toLowerCase().trim();
        const val = he.decode(contentMatch[1].trim());
        if (val) {
          images[key] = val;
        }
      }
    }

    // Prioritize the best image candidate
    const candidateKeys = [
      "og:image",
      "og:image:secure_url",
      "twitter:image",
      "twitter:image:src",
      "image",
      "image_src",
      "thumbnail",
    ];

    for (const key of candidateKeys) {
      if (images[key]) {
        return images[key];
      }
    }

    return null;
  } catch (error) {
    console.warn(
      `      ⚠️ Failed to fetch OG image for ${url}: ${error.message}`,
    );
    return null;
  }
}

async function fetchWithPuppeteer(url) {
  let browser = null;

  try {
    const puppeteer = require("puppeteer");
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--window-size=1920,1080",
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    );

    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    });

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    if (!response) throw new Error("Puppeteer: No response received");

    const buffer = await response.buffer();
    const bodyString = url.includes("arabhardware")
      ? fixArabHardwareEncoding(buffer)
      : buffer.toString("utf8");

    return parseResponse(bodyString);
  } catch (error) {
    throw new Error(`Puppeteer failed: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

async function fetchFeed(url, timeout) {
  try {
    const { gotScraping } = await import("got-scraping");
    const { CookieJar } = await import("tough-cookie");
    const cookieJar = new CookieJar(null, { looseMode: true });

    const response = await withRetry(
      () =>
        gotScraping({
          url,
          timeout: { request: timeout },
          cookieJar,
          headerGeneratorOptions: { locales: ["ar", "en-US"] },
          maxRedirects: 5,
          responseType: "buffer",
        }),
      { label: `RSS fetch (${url})` },
    );

    const buffer = response.body;
    let bodyString = "";

    if (url.includes("arabhardware")) {
      console.log("      🔧 Applying ArabHardware encoding fix...");
      bodyString = fixArabHardwareEncoding(buffer);
    } else {
      bodyString = buffer.toString("utf8");
      const hasArabic = /[\u0600-\u06FF]/.test(bodyString);

      if (!hasArabic) {
        const detected = jschardet.detect(buffer);
        if (detected?.encoding && detected.encoding !== "UTF-8") {
          try {
            bodyString = iconv.decode(buffer, detected.encoding);
          } catch (_error) {
            console.warn("Encoding detection failed, using UTF-8");
          }
        }
      }
    }

    bodyString = cleanXmlBody(bodyString);
    return parseResponse(bodyString);
  } catch (error) {
    const isRedirectLoop =
      error.message.includes("Redirected") ||
      error.response?.statusCode === 301;
    const isBlocked =
      error.response?.statusCode === 403 || error.response?.statusCode === 503;
    const isCookieError = error.message.includes(
      "Cookie not in this host's domain",
    );

    if (isRedirectLoop || isBlocked || isCookieError) {
      console.log(`      ⚠️ Switching to Puppeteer for ${url}...`);
      return fetchWithPuppeteer(url);
    }

    throw new Error(`Fetch failed: ${error.message}`);
  }
}

module.exports = {
  fetchFeed,
  fetchOgImage,
};
