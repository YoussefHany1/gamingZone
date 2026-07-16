import { describe, it, expect } from 'vitest';
import { normalizeItems, FetchedContent } from './normalize';

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
});
