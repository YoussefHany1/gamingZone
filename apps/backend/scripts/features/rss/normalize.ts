import striptags from 'striptags';
import he from 'he';

import {
  extractThumbnail,
  generateDocId,
  getTextValue,
  getUrlFromField,
  normalizeUrl,
  RssItem,
} from './helpers';

type UnknownRecord = Record<string, unknown>;

export interface FetchedContent {
  type?: 'json' | 'xml';
  data?: unknown;
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
  pubDate: Date | null;
  docId?: string;
  legacyDocId?: string;
}

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function getJsonRawItems(data: unknown): RssItem[] {
  if (Array.isArray(data)) return data as RssItem[];

  const record = asRecord(data);
  if (!record) return [];

  const candidateKeys = ['items', 'articles', 'results', 'posts', 'news', 'data', 'entries'];
  for (const key of candidateKeys) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate as RssItem[];
  }

  return [];
}

function firstText(values: unknown[]): string {
  for (const value of values) {
    const text = getTextValue(value);
    if (text) return text;
  }
  return '';
}

function getRelation(value: unknown): string {
  const record = asRecord(value);
  return record ? getTextValue(record.rel).toLowerCase() : '';
}

function getLinkFromValue(value: unknown, sourceUrl: string): string | null {
  const values = Array.isArray(value) ? value : [value];
  const source = normalizeUrl(sourceUrl);
  const orderedValues = [...values].sort((left, right) => {
    const leftRelation = getRelation(left);
    const rightRelation = getRelation(right);
    const leftScore = !leftRelation || leftRelation === 'alternate' ? 0 : 1;
    const rightScore = !rightRelation || rightRelation === 'alternate' ? 0 : 1;
    return leftScore - rightScore;
  });

  for (const candidate of orderedValues) {
    const rawLink = getUrlFromField(candidate);
    if (!rawLink || /\s/.test(rawLink)) continue;

    const link = normalizeUrl(candidate, sourceUrl);
    if (link && link !== source) return link;
  }

  return null;
}

function getItemLink(item: RssItem, sourceUrl: string): string | null {
  const linkFields = [
    'link',
    'url',
    'website',
    'href',
    'external_url',
    'canonical_url',
    'permalink',
  ];

  for (const field of linkFields) {
    const link = getLinkFromValue(item[field], sourceUrl);
    if (link) return link;
  }

  return getLinkFromValue(item.guid, sourceUrl);
}

function getDescription(item: RssItem): string {
  const candidates = [
    item['content:encoded'],
    item.content_html,
    item.content_text,
    item.description,
    item.summary,
    item.body,
    item.content,
  ];
  let description = '';

  for (const candidate of candidates) {
    const text = cleanHtmlText(candidate);
    if (text.length > description.length) description = text;
  }

  return description;
}

function parseDate(value: unknown): Date | null {
  let date: Date;

  if (value instanceof Date) {
    date = new Date(value.getTime());
  } else if (typeof value === 'number') {
    date = new Date(value);
  } else {
    const text = getTextValue(value);
    if (!text) return null;
    date = new Date(text);
  }

  return Number.isNaN(date.getTime()) ? null : date;
}

function getPublicationDate(item: RssItem): Date | null {
  const values = [
    item.pubDate,
    item.date_published,
    item.publishedAt,
    item.date,
    item.published,
    item['dc:date'],
    item.updated,
    item.date_modified,
  ];

  for (const value of values) {
    const date = parseDate(value);
    if (date) return date;
  }

  return null;
}

function getIdentity(item: RssItem, link: string): string {
  return (
    getTextValue(item.id) ||
    getTextValue(item.uuid) ||
    getTextValue(item.guid) ||
    getTextValue(item.rawId) ||
    link
  );
}

function createNormalizedArticle(
  item: RssItem,
  sourceUrl: string,
  isJson: boolean,
): NormalizedArticle | null {
  const link = getItemLink(item, sourceUrl);
  if (!link) return null;

  const title = firstText([item.title, item.name, item.headline]);
  if (!title) return null;

  const description = getDescription(item);
  const identity = getIdentity(item, link);

  return {
    title,
    description,
    link,
    thumbnail: extractThumbnail(item, link, isJson),
    guid: identity,
    rawId: identity,
    pubDate: getPublicationDate(item),
  };
}

function normalizeJsonItems(data: unknown, sourceUrl: string): NormalizedArticle[] {
  return getJsonRawItems(data)
    .map((item) => createNormalizedArticle(item, sourceUrl, true))
    .filter((item): item is NormalizedArticle => item !== null);
}

function cleanHtmlText(html: unknown): string {
  const text = getTextValue(html);
  if (!text) return '';

  const structured = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|th|td|ul|ol|blockquote)>/gi, '\n\n')
    .replace(/<(p|div|h[1-6]|li|tr|th|td|ul|ol|blockquote)[^>]*>/gi, '\n\n');

  return normalizeText(he.decode(striptags(structured)));
}

export function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/ *\n */g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeXmlItems(parsedData: unknown, sourceUrl: string): NormalizedArticle[] {
  const root = asRecord(parsedData);
  if (!root) return [];

  const rss = asRecord(root.rss);
  const channel =
    asRecord(rss?.channel) || asRecord(root.feed) || asRecord(root['rdf:RDF']) || root;
  const candidateItems: unknown = channel.item || channel.entry || channel.items || [];
  const rawItems = (Array.isArray(candidateItems) ? candidateItems : [candidateItems]) as RssItem[];
  if (rawItems.length === 0) return [];

  return rawItems
    .map((item) => createNormalizedArticle(item, sourceUrl, false))
    .filter((item): item is NormalizedArticle => item !== null);
}

function normalizeItems(
  fetchedContent: FetchedContent,
  sourceUrl: string,
  sourceIdentity = sourceUrl,
): NormalizedArticle[] {
  if (!fetchedContent) return [];

  const items =
    fetchedContent.type === 'json'
      ? normalizeJsonItems(fetchedContent.data, sourceUrl)
      : normalizeXmlItems(fetchedContent.data, sourceUrl);
  const sourceKey = sourceIdentity || sourceUrl;

  return items.map((item) => {
    const docId = generateDocId(item as RssItem, sourceKey);
    const legacyDocId = sourceKey ? generateDocId(item as RssItem) : undefined;

    return {
      ...item,
      docId,
      ...(legacyDocId && legacyDocId !== docId ? { legacyDocId } : {}),
    };
  });
}

export { normalizeItems };
