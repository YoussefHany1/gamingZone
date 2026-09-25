import { sha1Id } from '../../lib/hash';

export interface RssItem {
  id?: string | number;
  uuid?: string;
  slug?: string;
  rawId?: string;
  title?: unknown;
  description?: unknown;
  summary?: unknown;
  content?: unknown;
  content_html?: unknown;
  content_text?: unknown;
  'content:encoded'?: unknown;
  link?: unknown;
  url?: unknown;
  website?: unknown;
  href?: unknown;
  external_url?: unknown;
  canonical_url?: unknown;
  permalink?: unknown;
  guid?: unknown;
  pubDate?: unknown;
  date?: unknown;
  date_published?: unknown;
  date_modified?: unknown;
  publishedAt?: unknown;
  published?: unknown;
  updated?: unknown;
  'dc:date'?: unknown;
  image?: unknown;
  tileImage?: unknown;
  thumbnail?: unknown;
  img?: unknown;
  urlToImage?: unknown;
  'media:content'?: unknown;
  'media:thumbnail'?: unknown;
  enclosure?: unknown;
  [key: string]: unknown;
}

const safeId = (input: unknown): string => {
  if (!input) return 'unknown';

  return String(input)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
};

const getTextValue = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();

  if (Array.isArray(value)) {
    for (const entry of value) {
      const text = getTextValue(entry);
      if (text) return text;
    }
    return '';
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['_', 'value', 'text', 'content']) {
      if (key in record) {
        const text = getTextValue(record[key]);
        if (text) return text;
      }
    }
  }

  return '';
};

const getUrlFromField = (value: unknown): string | null => {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);

  if (Array.isArray(value)) {
    for (const entry of value) {
      const url = getUrlFromField(entry);
      if (url) return url;
    }
    return null;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['_', 'url', 'href', 'link', 'permalink']) {
      if (key in record) {
        const url = getUrlFromField(record[key]);
        if (url) return url;
      }
    }

    if (record.$ && typeof record.$ === 'object') {
      return getUrlFromField(record.$);
    }
  }

  return null;
};

const getFieldAttribute = (value: unknown, key: string): string => {
  if (!value || typeof value !== 'object') return '';

  const record = value as Record<string, unknown>;
  const direct = getTextValue(record[key]);
  if (direct) return direct;

  if (record.$ && typeof record.$ === 'object') {
    return getTextValue((record.$ as Record<string, unknown>)[key]);
  }

  return '';
};

const TRACKING_PARAMETER = /^(utm_.+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|ref|referrer)$/i;

const normalizeUrl = (value: unknown, baseUrl?: string): string | null => {
  const rawUrl = getUrlFromField(value);
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl, baseUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

    url.hash = '';
    for (const key of Array.from(url.searchParams.keys())) {
      if (TRACKING_PARAMETER.test(key)) url.searchParams.delete(key);
    }

    return url.toString();
  } catch {
    return null;
  }
};

const resolveImageUrl = (img: unknown, baseUrl: string): string | null => {
  const normalized = normalizeUrl(img, baseUrl);
  if (!normalized) return null;

  return normalized.replace(/^http:/i, 'https:');
};

const isBadImage = (url: string | null | undefined): boolean => {
  if (!url || typeof url !== 'string') return true;
  const lowerUrl = url.toLowerCase();
  const badKeywords = [
    'logo',
    'avatar',
    '1x1',
    'pixel',
    'icon',
    'favicon',
    'gravatar',
    'placeholder',
    'default',
    'blank',
    'transparent',
    'spacer',
    'tracking',
  ];

  return badKeywords.some((keyword) => lowerUrl.includes(keyword));
};

const isImageField = (value: unknown): boolean => {
  const type = getFieldAttribute(value, 'type').toLowerCase();
  const medium = getFieldAttribute(value, 'medium').toLowerCase();

  if (medium || type) return medium === 'image' || type.startsWith('image/');

  const url = getUrlFromField(value);
  if (!url) return false;

  try {
    return /\.(?:avif|gif|jpe?g|png|svg|webp)(?:$|[?#])/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
};

const getImageFromHtml = (html: unknown): string | null => {
  const text = getTextValue(html);
  if (!text) return null;

  return (
    text.match(
      /<img[^>]+(?:data-src|data-lazy-src|data-original|data-srcset)=['"]([^'"]+)['"]/i,
    )?.[1] ||
    text.match(/<img[^>]+src=['"]([^'"]+)['"]/i)?.[1] ||
    null
  );
};

const getOgImageFromHtml = (html: unknown): string | null => {
  const text = getTextValue(html);
  if (!text) return null;

  return (
    text.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    text.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1] ||
    null
  );
};

const extractThumbnail = (item: RssItem, baseUrl: string, isJson = false): string | null => {
  let image: unknown;

  if (isJson) {
    image =
      item.image ||
      item.tileImage ||
      item.thumbnail ||
      item.img ||
      item.urlToImage ||
      getImageFromHtml(item.content_html) ||
      getImageFromHtml(item.description);
  } else {
    const mediaContentValues = Array.isArray(item['media:content'])
      ? item['media:content']
      : item['media:content']
        ? [item['media:content']]
        : [];
    const mediaContent = mediaContentValues.find((value) => isImageField(value));
    const mediaThumbnail = item['media:thumbnail'] || mediaContent?.['media:thumbnail'];
    const enclosure = item.enclosure;

    image =
      getUrlFromField(mediaThumbnail) ||
      getUrlFromField(mediaContent) ||
      getUrlFromField(item.thumbnail) ||
      getImageFromHtml(item.description) ||
      getOgImageFromHtml(item.description) ||
      getImageFromHtml(item['content:encoded']) ||
      getOgImageFromHtml(item['content:encoded']) ||
      getImageFromHtml(item.content) ||
      (isImageField(enclosure) ? getUrlFromField(enclosure) : null);
  }

  if (isBadImage(typeof image === 'string' ? image : getUrlFromField(image))) return null;

  return resolveImageUrl(image, baseUrl);
};

const generateDocId = (item: RssItem, sourceIdentity?: string): string => {
  const link = normalizeUrl(item.link || item.url || item.website || item.href || item.permalink);
  const identity =
    getTextValue(item.id) ||
    getTextValue(item.uuid) ||
    getTextValue(item.guid) ||
    getTextValue(item.rawId);
  const rawKey = sourceIdentity
    ? link ||
      identity ||
      `${item.link || ''}::${getTextValue(item.title || 'unknown')
        .trim()
        .toLowerCase()}`
    : identity ||
      link ||
      `${item.link || ''}::${getTextValue(item.title || 'unknown')
        .trim()
        .toLowerCase()}`;
  const key = normalizeUrl(rawKey) || getTextValue(rawKey);
  const source = sourceIdentity ? getTextValue(sourceIdentity) : '';

  return sha1Id(source ? `${source}::${key}` : key);
};

export {
  safeId,
  getTextValue,
  getUrlFromField,
  normalizeUrl,
  resolveImageUrl,
  extractThumbnail,
  generateDocId,
  isBadImage,
};
