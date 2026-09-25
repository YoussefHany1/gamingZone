import { logger } from '../../lib/logger';

import * as xml2js from 'xml2js';
import * as iconv from 'iconv-lite';
import * as jschardet from 'jschardet';
import * as he from 'he';
import type { ChromeReleaseChannel } from 'puppeteer-core';

import { withRetry } from '../../lib/http';
import { fixArabHardwareEncoding } from './encoding';
import { isBadImage } from './helpers';
import { normalizeText } from './normalize';

const parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true,
  trim: true,
});

function cleanXmlBody(body: string | Buffer | undefined | null): string {
  if (!body) return '';

  const strBody = typeof body === 'string' ? body : body.toString('utf8');
  let cleaned = strBody.replace(/&(?!(?:apos|quot|[gl]t|amp|#\d+|#x[a-f\d]+);)/gi, '&amp;');

  const invalidXmlCharacters = new RegExp(
    `[${String.fromCharCode(0)}-${String.fromCharCode(8)}${String.fromCharCode(11)}${String.fromCharCode(12)}${String.fromCharCode(14)}-${String.fromCharCode(31)}${String.fromCharCode(127)}]`,
    'g',
  );
  cleaned = cleaned.replace(invalidXmlCharacters, '');
  return cleaned;
}

type ErrorResponse = {
  status?: number;
  statusCode?: number;
};

type ErrorWithResponse = {
  response?: ErrorResponse;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getResponseStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('response' in error)) return undefined;

  const response = (error as ErrorWithResponse).response;
  return response?.status ?? response?.statusCode;
}

async function parseResponse(
  body: string,
  contentType = '',
): Promise<{ type: 'json' | 'xml'; data: unknown }> {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(body);
  } catch {
    parsedJson = undefined;
  }

  const contentTypeSaysJson = /\bjson\b/i.test(contentType);
  const parsedRecord =
    parsedJson && typeof parsedJson === 'object' && !Array.isArray(parsedJson)
      ? (parsedJson as Record<string, unknown>)
      : null;
  if (
    parsedJson !== undefined &&
    parsedJson !== null &&
    (contentTypeSaysJson || (!parsedRecord?.rss && !parsedRecord?.feed))
  ) {
    return { type: 'json', data: parsedJson };
  }

  try {
    const parsed = await parser.parseStringPromise(body);
    return { type: 'xml', data: parsed };
  } catch {
    const cleanedBody = cleanXmlBody(body);
    const parsedCleaned = await parser.parseStringPromise(cleanedBody);
    return { type: 'xml', data: parsedCleaned };
  }
}

const PUPPETEER_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu',
  '--window-size=1920,1080',
];

async function extractDescriptionFromDoc(document: Document): Promise<string | null> {
  try {
    const { Readability } = await import('@mozilla/readability');
    const reader = new Readability(document);
    const article = reader.parse();
    if (article?.textContent) return normalizeText(article.textContent);
  } catch (error: unknown) {
    logger.debug(`Readability extraction failed: ${getErrorMessage(error)}`);
  }
  return null;
}

function findImageInJsonLd(value: unknown): string | null {
  if (!value) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const image = findImageInJsonLd(item);
      if (image) return image;
    }
  }

  if (typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const image = record.image;
  if (typeof image === 'string') return image;
  if (Array.isArray(image) && typeof image[0] === 'string') return image[0];
  if (image && typeof image === 'object' && 'url' in image) {
    const url = (image as { url?: unknown }).url;
    if (typeof url === 'string') return url;
  }

  for (const nestedValue of Object.values(record)) {
    if (nestedValue && typeof nestedValue === 'object') {
      const result = findImageInJsonLd(nestedValue);
      if (result) return result;
    }
  }

  return null;
}

async function fetchArticleDataWithPuppeteer(url: string) {
  let browser = null;
  try {
    const puppeteer = await import('puppeteer');
    browser = await puppeteer.launch({
      headless: true,
      args: PUPPETEER_LAUNCH_ARGS,
      channel: 'msedge' as unknown as ChromeReleaseChannel,
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    );
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const html = await page.content();
    const { JSDOM } = await import('jsdom');
    const dom = new JSDOM(html, { url });

    const fullDescription = await extractDescriptionFromDoc(dom.window.document);

    const imageCandidates = await page.evaluate(() => {
      const candidates: string[] = [];
      const metaKeys = [
        "meta[property='og:image']",
        "meta[property='og:image:secure_url']",
        "meta[name='twitter:image']",
        "meta[name='twitter:image:src']",
        "meta[itemprop='image']",
        "link[rel='image_src']",
      ];
      for (const selector of metaKeys) {
        const el = document.querySelector(selector);
        const val = el ? el.getAttribute('content') || el.getAttribute('href') : null;
        if (val) candidates.push(val);
      }

      const ldScripts = document.querySelectorAll("script[type='application/ld+json']");
      for (const script of ldScripts) {
        try {
          const parsed = JSON.parse(script.textContent || '{}');
          const findImage = (value: unknown): string | null => {
            if (!value) return null;
            if (Array.isArray(value)) {
              for (const entry of value) {
                const image = findImage(entry);
                if (image) return image;
              }
            }
            if (typeof value === 'object') {
              const record = value as Record<string, unknown>;
              if (typeof record.image === 'string') return record.image;
              if (Array.isArray(record.image) && typeof record.image[0] === 'string') {
                return record.image[0];
              }
              if (
                record.image &&
                typeof record.image === 'object' &&
                'url' in record.image &&
                typeof (record.image as { url?: unknown }).url === 'string'
              ) {
                return (record.image as { url: string }).url;
              }
              for (const nestedValue of Object.values(record)) {
                if (nestedValue && typeof nestedValue === 'object') {
                  const image = findImage(nestedValue);
                  if (image) return image;
                }
              }
            }
            return null;
          };
          const image = findImage(parsed);
          if (image) candidates.push(image);
        } catch {
          continue;
        }
      }

      const articleImg = document.querySelector(
        'article img, .post-content img, .entry-content img',
      ) as HTMLImageElement | null;
      if (articleImg) candidates.push(articleImg.src);

      return candidates;
    });

    let finalImageUrl = null;
    for (const img of imageCandidates) {
      if (img && typeof img === 'string' && !isBadImage(img)) {
        finalImageUrl = img;
        break;
      }
    }

    return { imageUrl: finalImageUrl, fullDescription };
  } catch (error: unknown) {
    logger.warn(`      ⚠️ Puppeteer OG fetch failed for ${url}: ${getErrorMessage(error)}`);
    return { imageUrl: null, fullDescription: null };
  } finally {
    if (browser) await browser.close();
  }
}

async function fetchArticleData(url: string) {
  try {
    const { gotScraping } = await import('got-scraping');
    const response = await withRetry(
      () =>
        gotScraping({
          url,
          timeout: { request: 15000 },
          headerGeneratorOptions: {
            devices: ['mobile', 'desktop'],
            locales: ['en-US', 'ar'],
          },
        }),
      { label: `OG fetch (${url})`, retries: 2 },
    );

    const body = response.body;
    if (!body || typeof body !== 'string') {
      logger.info(
        `      ⚠️ gotScraping returned invalid body for ${url}. Switching to Puppeteer...`,
      );
      return fetchArticleDataWithPuppeteer(url);
    }

    const { JSDOM } = await import('jsdom');
    const dom = new JSDOM(body, { url });
    const fullDescription = await extractDescriptionFromDoc(dom.window.document);

    // Try to extract from JSON-LD
    const ldScripts = dom.window.document.querySelectorAll("script[type='application/ld+json']");
    for (const script of ldScripts) {
      try {
        const parsed = JSON.parse(script.textContent || '{}');
        const image = findImageInJsonLd(parsed);
        if (image && typeof image === 'string' && !isBadImage(image)) {
          return { imageUrl: image, fullDescription };
        }
      } catch (error: unknown) {
        logger.debug(`JSON-LD parse failed: ${getErrorMessage(error)}`);
      }
    }

    // Find all meta and link tags using JSDOM
    const tags = dom.window.document.querySelectorAll('meta, link');
    const images: Record<string, string> = {};

    for (const tag of tags) {
      const key =
        tag.getAttribute('property') ||
        tag.getAttribute('name') ||
        tag.getAttribute('itemprop') ||
        tag.getAttribute('rel');
      const val = tag.getAttribute('content') || tag.getAttribute('href');

      if (key && val) {
        const decodedVal = he.decode(val.trim());
        if (decodedVal) {
          images[key.toLowerCase().trim()] = decodedVal;
        }
      }
    }

    // Prioritize the best image candidate
    const candidateKeys = [
      'og:image',
      'og:image:secure_url',
      'twitter:image',
      'twitter:image:src',
      'image',
      'image_src',
      'thumbnail',
    ];

    for (const key of candidateKeys) {
      if (images[key] && !isBadImage(images[key])) {
        return { imageUrl: images[key], fullDescription };
      }
    }

    // Fall back to Puppeteer if gotScraping worked but didn't find meta images
    logger.info(`      ⚠️ No OG image found in static body for ${url}. Switching to Puppeteer...`);
    const fallback = await fetchArticleDataWithPuppeteer(url);
    return {
      imageUrl: fallback.imageUrl,
      fullDescription: fallback.fullDescription || fullDescription,
    };
  } catch (error: unknown) {
    logger.info(
      `      ⚠️ Failed to fetch OG image for ${url} with gotScraping: ${getErrorMessage(error)}. Switching to Puppeteer...`,
    );
    return fetchArticleDataWithPuppeteer(url);
  }
}

async function fetchWithPuppeteer(url: string) {
  let browser = null;

  try {
    const puppeteer = await import('puppeteer');
    browser = await puppeteer.launch({
      headless: true,
      args: PUPPETEER_LAUNCH_ARGS,
      channel: 'chrome',
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    );

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    });

    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    if (!response) throw new Error('Puppeteer: No response received');

    const buffer = await response.buffer();
    const bodyString = url.includes('arabhardware')
      ? fixArabHardwareEncoding(buffer)
      : buffer.toString('utf8');

    return parseResponse(bodyString);
  } catch (error: unknown) {
    throw new Error(`Puppeteer failed: ${getErrorMessage(error)}`, { cause: error });
  } finally {
    if (browser) await browser.close();
  }
}

async function fetchFeed(
  url: string,
  timeout: number,
  cacheHeaders: { etag?: string | null; lastModified?: string | null } = {},
) {
  try {
    const { gotScraping } = await import('got-scraping');
    const { CookieJar } = await import('tough-cookie');
    const cookieJar = new CookieJar(undefined, { looseMode: true });

    const headers: Record<string, string> = {};
    if (cacheHeaders.etag) headers['If-None-Match'] = cacheHeaders.etag;
    if (cacheHeaders.lastModified) headers['If-Modified-Since'] = cacheHeaders.lastModified;

    const response = await withRetry(
      () =>
        gotScraping({
          url,
          timeout: { request: timeout },
          cookieJar,
          headers,
          headerGeneratorOptions: { locales: ['ar', 'en-US'] },
          maxRedirects: 5,
          responseType: 'buffer',
        }),
      { label: `RSS fetch (${url})` },
    );

    const buffer = response.body;
    const newEtag = response.headers.etag;
    const newLastModified = response.headers['last-modified'];
    let bodyString = '';

    if (url.includes('arabhardware')) {
      logger.info('      🔧 Applying ArabHardware encoding fix...');
      bodyString = fixArabHardwareEncoding(buffer);
    } else {
      bodyString = buffer.toString('utf8');
      const hasArabic = /[\u0600-\u06FF]/.test(bodyString);

      if (!hasArabic) {
        const detected = jschardet.detect(buffer);
        if (detected?.encoding && detected.encoding !== 'UTF-8') {
          try {
            bodyString = iconv.decode(buffer, detected.encoding);
          } catch {
            logger.warn('Encoding detection failed, using UTF-8');
          }
        }
      }
    }

    bodyString = cleanXmlBody(bodyString);
    const contentType = Array.isArray(response.headers['content-type'])
      ? response.headers['content-type'][0]
      : response.headers['content-type'];
    const parsed = await parseResponse(bodyString, contentType);
    return { ...parsed, isModified: true, etag: newEtag, lastModified: newLastModified };
  } catch (error: unknown) {
    const status = getResponseStatus(error);
    if (status === 304) {
      logger.info(`      💤 304 Not Modified for ${url}`);
      return { isModified: false };
    }

    const isRedirectLoop = getErrorMessage(error).includes('Redirected') || status === 301;
    const isBlocked = status === 403 || status === 503;
    const isCookieError = getErrorMessage(error).includes("Cookie not in this host's domain");

    if (isRedirectLoop || isBlocked || isCookieError) {
      logger.info(`      ⚠️ Switching to Puppeteer for ${url}...`);
      const parsed = await fetchWithPuppeteer(url);
      return { ...parsed, isModified: true };
    }

    throw new Error(`Fetch failed: ${getErrorMessage(error)}`, { cause: error });
  }
}

export { fetchFeed, fetchArticleData };
