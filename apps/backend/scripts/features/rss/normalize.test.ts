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
