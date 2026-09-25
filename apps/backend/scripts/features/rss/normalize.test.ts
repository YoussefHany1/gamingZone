import { describe, it, expect } from 'vitest';
import { normalizeItems, normalizeText, FetchedContent } from './normalize';

describe('normalizeItems', () => {
  const sourceUrl = 'https://example.com';

  it('should normalize a simple XML RSS feed', () => {
    const rawFeed: FetchedContent = {
      type: 'xml',
      isModified: true,
      data: {
        rss: {
          channel: {
            item: [
              {
                title: 'Test Article 1',
                link: 'https://example.com/article1',
                description: 'Description 1',
                pubDate: new Date().toISOString(),
              },
            ],
          },
        },
      },
    };

    const normalized = normalizeItems(rawFeed, sourceUrl);
    expect(normalized).toBeDefined();
    expect(normalized?.length).toBe(1);
    expect(normalized![0].title).toBe('Test Article 1');
    expect(normalized![0].link).toBe('https://example.com/article1');
  });

  it('should return empty array for empty items', () => {
    const rawFeed: FetchedContent = {
      type: 'xml',
      isModified: true,
      data: { rss: { channel: {} } },
    };

    const normalized = normalizeItems(rawFeed, sourceUrl);
    expect(normalized).toEqual([]);
  });

  it('should fallback to string parsing when title is an object', () => {
    const rawFeed: FetchedContent = {
      type: 'xml',
      isModified: true,
      data: {
        rss: {
          channel: {
            item: [
              {
                title: { _: 'Test Object Title' },
                link: 'https://example.com/article2',
              },
            ],
          },
        },
      },
    };

    const normalized = normalizeItems(rawFeed, sourceUrl);
    expect(normalized![0].title).toBe('Test Object Title');
  });

  it('should normalize JSON Feed content, object links, and publication dates', () => {
    const rawFeed: FetchedContent = {
      type: 'json',
      isModified: true,
      data: {
        version: 'https://jsonfeed.org/version/1.1',
        items: [
          {
            id: 'json-article-1',
            title: 'JSON Article',
            url: { href: 'https://example.com/json-article?utm_source=rss#top' },
            content_html: '<p>Full article content.</p>',
            date_published: '2025-01-02T03:04:05.000Z',
            image: 'https://cdn.example.com/cover.jpg',
          },
        ],
      },
    };

    const normalized = normalizeItems(rawFeed, sourceUrl, 'source-a');

    expect(normalized).toHaveLength(1);
    expect(normalized[0].link).toBe('https://example.com/json-article');
    expect(normalized[0].description).toBe('Full article content.');
    expect(normalized[0].pubDate?.toISOString()).toBe('2025-01-02T03:04:05.000Z');
    expect(normalized[0].thumbnail).toBe('https://cdn.example.com/cover.jpg');
    expect(normalized[0].docId).toBeTruthy();
    expect(normalized[0].legacyDocId).toBeTruthy();
  });

  it('should prefer Atom alternate links and richer encoded content', () => {
    const rawFeed: FetchedContent = {
      type: 'xml',
      isModified: true,
      data: {
        feed: {
          entry: [
            {
              title: { _: 'Atom Article' },
              link: [
                { rel: 'self', href: 'https://example.com/feed-entry' },
                { rel: 'alternate', href: 'https://example.com/atom-article' },
              ],
              description: 'Short summary.',
              'content:encoded': '<p>Longer article body.</p>',
              published: { _: '2025-02-03T04:05:06.000Z' },
            },
          ],
        },
      },
    };

    const normalized = normalizeItems(rawFeed, sourceUrl);

    expect(normalized[0].link).toBe('https://example.com/atom-article');
    expect(normalized[0].description).toBe('Longer article body.');
    expect(normalized[0].pubDate?.toISOString()).toBe('2025-02-03T04:05:06.000Z');
  });

  it('should reject malformed links and keep missing dates null', () => {
    const rawFeed: FetchedContent = {
      type: 'xml',
      isModified: true,
      data: {
        rss: {
          channel: {
            item: [
              { title: 'Missing link', pubDate: '2025-01-01' },
              { title: 'Malformed link', link: 'not a url' },
              { title: 'Valid item', link: 'https://example.com/valid' },
            ],
          },
        },
      },
    };

    const normalized = normalizeItems(rawFeed, sourceUrl);

    expect(normalized).toHaveLength(1);
    expect(normalized[0].title).toBe('Valid item');
    expect(normalized[0].pubDate).toBeNull();
  });

  it('should make document IDs source-aware while retaining the legacy ID', () => {
    const rawFeed: FetchedContent = {
      type: 'xml',
      isModified: true,
      data: {
        rss: {
          channel: {
            item: [
              {
                title: 'Shared GUID',
                link: 'https://example.com/shared',
                guid: 'shared-guid',
              },
            ],
          },
        },
      },
    };

    const first = normalizeItems(rawFeed, sourceUrl, 'source-a')[0];
    const second = normalizeItems(rawFeed, sourceUrl, 'source-b')[0];

    expect(first.docId).not.toBe(second.docId);
    expect(first.legacyDocId).toBe(second.legacyDocId);
  });
});

describe('cleanHtmlText via normalizeItems', () => {
  const sourceUrl = 'https://example.com';

  it('should convert block tags and <br> into paragraph breaks', () => {
    const rawFeed: FetchedContent = {
      type: 'xml',
      isModified: true,
      data: {
        rss: {
          channel: {
            item: [
              {
                title: 'Test',
                link: 'https://example.com/article',
                description:
                  '<p>First paragraph.</p><p>Second <strong>bold</strong> paragraph.</p>Item one<br />Item two\n\nTrailing line.',
                pubDate: new Date().toISOString(),
              },
            ],
          },
        },
      },
    };

    const normalized = normalizeItems(rawFeed, sourceUrl);
    const description = normalized![0].description;
    expect(description).toContain('\n\n');
    expect(description).not.toContain('<p>');
    expect(description).not.toContain('<br');
    expect(description).toMatch(/First paragraph/);
    expect(description).toMatch(/Second bold paragraph/);
    expect(description).toMatch(/Item one\nItem two/);
    expect(description).toMatch(/Trailing line/);
  });
});

describe('normalizeText', () => {
  it('should collapse CRLF and excessive blank lines', () => {
    expect(normalizeText('a\r\nb\r\n\r\n\r\nc')).toBe('a\nb\n\nc');
  });

  it('should collapse inline whitespace but keep paragraph breaks', () => {
    expect(normalizeText('hello   world\n\n\n\nnext   line')).toBe('hello world\n\nnext line');
  });

  it('should trim leading and trailing whitespace', () => {
    expect(normalizeText('   padded   \n   text   ')).toBe('padded\ntext');
  });
});
