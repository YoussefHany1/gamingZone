import { describe, expect, it } from 'vitest';

import { boundArticleHtml, MAX_ARTICLE_HTML_CHARS } from './fetch';

describe('boundArticleHtml', () => {
  it('leaves ordinary article pages untouched', () => {
    const html = '<html><head><meta property="og:image" content="https://x/y.jpg"></head></html>';
    expect(boundArticleHtml(html, 'https://example.com/a')).toBe(html);
  });

  it('clips oversized pages so the JSDOM document stays bounded', () => {
    const html = '<html>'.padEnd(MAX_ARTICLE_HTML_CHARS + 5000, 'x');

    const bounded = boundArticleHtml(html, 'https://example.com/huge');

    expect(bounded).toHaveLength(MAX_ARTICLE_HTML_CHARS);
    expect(html.startsWith(bounded)).toBe(true);
  });
});
