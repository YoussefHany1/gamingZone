import { sha1Id } from '../../lib/hash';

export interface RssItem {
  id?: string;
  uuid?: string;
  slug?: string;
  rawId?: string;
  title?: string;
  description?: string;
  summary?: string;
  content?: string;
  'content:encoded'?: string;
  link?: any;
  url?: string;
  website?: string;
  href?: string;
  guid?: any;
  pubDate?: string | Date;
  date?: string | Date;
  publishedAt?: string | Date;
  published?: string | Date;
  updated?: string | Date;
  'dc:date'?: string | Date;
  image?: string;
  tileImage?: string;
  thumbnail?: any;
  img?: string;
  urlToImage?: string;
  'media:content'?: any;
  'media:thumbnail'?: any;
  enclosure?: any;
  [key: string]: any;
}

const safeId = (input: unknown): string => {
  if (!input) return 'unknown';

  return String(input)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
};

const resolveImageUrl = (img: unknown, baseUrl: string): string | null => {
  if (!img || typeof img !== 'string') return null;

  let finalUrl = img.trim();
  if (finalUrl.startsWith('//')) finalUrl = `https:${finalUrl}`;

  if (finalUrl.startsWith('/')) {
    try {
      const u = new URL(baseUrl);
      finalUrl = u.origin + finalUrl;
    } catch (_error) {}
  }

  if (finalUrl.startsWith('http:')) {
    finalUrl = finalUrl.replace('http:', 'https:');
  }

  if (!finalUrl.startsWith('https')) return null;
  return finalUrl;
};

const isBadImage = (url: string | null | undefined): boolean => {
  if (!url || typeof url !== 'string') return true;
  const lowerUrl = url.toLowerCase();
  
  const badKeywords = [
    'logo', 'avatar', '1x1', 'pixel', 'icon', 'favicon', 'gravatar', 
    'placeholder', 'default', 'blank', 'transparent', 'spacer', 'tracking'
  ];

  // Check generic keywords
  if (badKeywords.some(keyword => lowerUrl.includes(keyword))) {
    return true;
  }

  // Check specific destructoid / gamurs tracking domains if known
  if (lowerUrl.includes('gamurs.com') && lowerUrl.includes('logo')) {
    return true;
  }
  
  if (lowerUrl.match(/\b(1x1|icon|logo)s?\.(png|gif|jpe?g)\b/i)) {
    return true;
  }

  return false;
};

const extractThumbnail = (item: RssItem, baseUrl: string, isJson = false): string | null => {
  let img = null;
  if (isJson) {
    img = item.image || item.tileImage || item.thumbnail || item.img || item.urlToImage || null;
  } else {
    const getImgFromHtml = (html: string | undefined | null): string | null => {
      if (!html || typeof html !== 'string') return null;
      const matches =
        html.match(
          /<img[^>]+(?:data-src|data-lazy-src|data-original|data-srcset)=['"]([^'"]+)['"]/i,
        )?.[1] || html.match(/<img[^>]+src=['"]([^'"]+)['"]/i)?.[1];
      return matches || null;
    };

    const getOgImageFromHtml = (html: string | undefined | null): string | null => {
      if (!html || typeof html !== 'string') return null;
      return (
        html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1] ||
        null
      );
    };

    const getUrlFromField = (field: any): string | null => {
      if (!field) return null;
      if (typeof field === 'string') return field;
      if (Array.isArray(field)) return getUrlFromField(field[0]);
      if (typeof field === 'object') {
        return field.url || field.href || field._ || (field.$ && (field.$.url || field.$.href));
      }
      return null;
    };

    const mediaContent = item['media:content'];
    let mediaContentUrl = null;
    if (mediaContent) {
      if (Array.isArray(mediaContent)) {
        const imageObj =
          mediaContent.find((m: any) => m.medium === 'image' || m.type?.startsWith('image/')) ||
          mediaContent[0];
        mediaContentUrl = getUrlFromField(imageObj);
      } else {
        mediaContentUrl = getUrlFromField(mediaContent);
      }
    }

    const mediaThumbnail = item['media:thumbnail'] || item['media:content']?.['media:thumbnail'];
    let mediaThumbnailUrl = getUrlFromField(mediaThumbnail);

    img =
      mediaThumbnailUrl ||
      mediaContentUrl ||
      getUrlFromField(item.thumbnail) ||
      getImgFromHtml(item.description) ||
      getOgImageFromHtml(item.description) ||
      getImgFromHtml(item['content:encoded']) ||
      getOgImageFromHtml(item['content:encoded']) ||
      getUrlFromField(item.enclosure);
  }

  if (isBadImage(img)) return null;

  return resolveImageUrl(img, baseUrl);
};

const generateDocId = (item: RssItem): string => {
  const key = item.id || item.guid || item.rawId;
  if (key) return sha1Id(String(key));

  const fallback = `${item.link || ''}::${(item.title || 'unknown').trim().toLowerCase()}`;
  return sha1Id(fallback);
};

export { safeId, resolveImageUrl, extractThumbnail, generateDocId, isBadImage };
