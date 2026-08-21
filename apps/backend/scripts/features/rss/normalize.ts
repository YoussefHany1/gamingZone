import striptags from 'striptags';
import he from 'he';

import { generateDocId, extractThumbnail, RssItem } from './helpers';

export interface FetchedContent {
  type?: 'json' | 'xml';
  data?: any;
  isModified: boolean;
  etag?: string;
  lastModified?: string;
}

export interface NormalizedArticle {
  title: string;
  description: string;
  link: string;
  thumbnail: string | null;
  guid: string;
  rawId?: string;
  pubDate: Date | string;
  docId?: string;
}

function getJsonRawItems(data: any): RssItem[] {
  if (Array.isArray(data)) return data;

  const candidateKeys = ['items', 'articles', 'results', 'posts', 'news', 'data', 'entries'];

  for (const key of candidateKeys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  return [];
}

function normalizeJsonItems(data: any, sourceUrl: string): NormalizedArticle[] {
  const rawItems = getJsonRawItems(data);

  return rawItems.map((item, index) => {
    const title = item.title || item.name || item.headline || 'No Title';
    const desc = item.description || item.body || item.summary || item.content || '';
    const link = item.link || item.url || item.website || item.href || null;

    const uniqueKey =
      item.id ||
      item.uuid ||
      item.slug ||
      (link && link !== sourceUrl ? link : null) ||
      `${sourceUrl}::${index}::${title}`;

    return {
      title,
      description: cleanHtmlText(desc),
      link: link || sourceUrl,
      thumbnail: extractThumbnail(item, sourceUrl, true),
      guid: String(uniqueKey),
      rawId: String(uniqueKey),
      pubDate: item.pubDate || item.date || item.publishedAt || new Date(),
    };
  });
}

function cleanHtmlText(html: any): string {
  if (!html) return '';
  const spaced = String(html)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li|tr|th|td|ul|ol|blockquote)>/gi, ' ')
    .replace(/<(p|div|h[1-6]|li|tr|th|td|ul|ol|blockquote)[^>]*>/gi, ' ');
  return he.decode(striptags(spaced)).replace(/\s+/g, ' ').trim();
}

function normalizeXmlItems(parsedData: any, sourceUrl: string): NormalizedArticle[] {
  if (!parsedData) return [];
  const channel = parsedData.rss?.channel || parsedData.feed || parsedData;
  let rawItems: RssItem[] = channel.item || channel.entry || [];
  if (!Array.isArray(rawItems)) rawItems = [rawItems];

  const items: NormalizedArticle[] = [];

  rawItems.forEach((item) => {
    const link =
      item.link?._ ||
      item.link ||
      (typeof item.link === 'object' && item.link.href) ||
      item.guid?._ ||
      item.guid;

    if (!link) return;

    const descriptionRaw = item.description || item.summary || '';
    const pubDateRaw = item.pubDate || item['dc:date'] || item.published || item.updated;
    const pubDate = pubDateRaw ? new Date(pubDateRaw as string | number | Date) : new Date();

    items.push({
      title: typeof item.title === 'string' ? item.title : (item.title as any)?._ || 'No Title',
      description: cleanHtmlText(descriptionRaw),
      link,
      thumbnail: extractThumbnail(item, sourceUrl, false),
      guid: (typeof item.guid === 'string' ? item.guid : item.guid?._) || link,
      pubDate,
    });
  });

  return items;
}

function normalizeItems(fetchedContent: FetchedContent, sourceUrl: string): NormalizedArticle[] {
  if (!fetchedContent) return [];
  const items =
    fetchedContent.type === 'json'
      ? normalizeJsonItems(fetchedContent.data, sourceUrl)
      : normalizeXmlItems(fetchedContent.data, sourceUrl);

  return items.map((item) => ({
    ...item,
    docId: generateDocId(item as RssItem),
  }));
}

export { normalizeItems };
