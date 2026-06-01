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

async function fetchOgImageWithPuppeteer(url) {
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
      ],
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    );
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const imgUrl = await page.evaluate(() => {
      const metaKeys = [
        "meta[property='og:image']",
        "meta[property='og:image:secure_url']",
        "meta[name='twitter:image']",
        "meta[name='twitter:image:src']",
        "meta[itemprop='image']",
        "link[rel='image_src']"
      ];
      for (const selector of metaKeys) {
        const el = document.querySelector(selector);
        const val = el ? (el.getAttribute("content") || el.getAttribute("href")) : null;
        if (val) return val;
      }

      const ldScripts = document.querySelectorAll("script[type='application/ld+json']");
      for (const script of ldScripts) {
        try {
          const parsed = JSON.parse(script.textContent);
          const findImage = (obj) => {
            if (!obj) return null;
            if (Array.isArray(obj)) {
              for (const item of obj) {
                const res = findImage(item);
                if (res) return res;
              }
            }
            if (typeof obj === "object") {
              if (obj.image) {
                if (typeof obj.image === "string") return obj.image;
                if (Array.isArray(obj.image) && typeof obj.image[0] === "string") return obj.image[0];
                if (typeof obj.image === "object" && obj.image.url) return obj.image.url;
              }
              for (const key of Object.keys(obj)) {
                if (typeof obj[key] === "object") {
                  const res = findImage(obj[key]);
                  if (res) return res;
                }
              }
            }
            return null;
          };
          const image = findImage(parsed);
          if (image) return image;
        } catch (_) {}
      }

      const articleImg = document.querySelector("article img, .post-content img, .entry-content img");
      if (articleImg) return articleImg.src;

      return null;
    });

    return imgUrl;
  } catch (error) {
    console.warn(`      ⚠️ Puppeteer OG fetch failed for ${url}: ${error.message}`);
    return null;
  } finally {
    if (browser) await browser.close();
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
    if (!body || typeof body !== "string") {
      console.log(`      ⚠️ gotScraping returned invalid body for ${url}. Switching to Puppeteer...`);
      return fetchOgImageWithPuppeteer(url);
    }

    // Try to extract from JSON-LD
    const jsonLdMatches = body.match(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const jsonLdScript of jsonLdMatches) {
      try {
        const jsonContent = jsonLdScript.replace(/<script\s+[^>]*>|<\/script>/gi, "").trim();
        const parsed = JSON.parse(jsonContent);
        
        const findImageInLd = (obj) => {
          if (!obj) return null;
          if (Array.isArray(obj)) {
            for (const item of obj) {
              const res = findImageInLd(item);
              if (res) return res;
            }
          }
          if (typeof obj === "object") {
            if (obj.image) {
              if (typeof obj.image === "string") return obj.image;
              if (Array.isArray(obj.image) && typeof obj.image[0] === "string") return obj.image[0];
              if (typeof obj.image === "object" && obj.image.url) return obj.image.url;
            }
            for (const key of Object.keys(obj)) {
              if (typeof obj[key] === "object") {
                const res = findImageInLd(obj[key]);
                if (res) return res;
              }
            }
          }
          return null;
        };

        const image = findImageInLd(parsed);
        if (image && typeof image === "string") {
          return image;
        }
      } catch (_e) {}
    }

    // Find all meta and link tags in the document body
    const tags = body.match(/<(?:meta|link)\s+[^>]*>/gi) || [];
    const images = {};

    for (const tag of tags) {
      const attrRegex = /(\w+)\s*=\s*["']([^"']*)["']/gi;
      let match;
      const attrs = {};
      while ((match = attrRegex.exec(tag)) !== null) {
        attrs[match[1].toLowerCase()] = match[2];
      }

      const key = attrs.property || attrs.name || attrs.itemprop || attrs.rel;
      const val = attrs.content || attrs.href;

      if (key && val) {
        const decodedVal = he.decode(val.trim());
        if (decodedVal) {
          images[key.toLowerCase().trim()] = decodedVal;
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

    // Fall back to Puppeteer if gotScraping worked but didn't find meta images
    console.log(`      ⚠️ No OG image found in static body for ${url}. Switching to Puppeteer...`);
    return fetchOgImageWithPuppeteer(url);
  } catch (error) {
    console.log(`      ⚠️ Failed to fetch OG image for ${url} with gotScraping: ${error.message}. Switching to Puppeteer...`);
    return fetchOgImageWithPuppeteer(url);
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
