import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDatabases, mockFetchArticleData } = vi.hoisted(() => ({
  mockDatabases: {
    createDocument: vi.fn(),
    getDocument: vi.fn(),
    updateDocument: vi.fn(),
    listDocuments: vi.fn(),
    deleteDocument: vi.fn(),
  },
  mockFetchArticleData: vi.fn(),
}));

vi.mock('../../lib/appwrite', () => ({
  createAppwriteDatabases: () => mockDatabases,
}));

vi.mock('../../lib/firebaseAdmin', () => ({
  initFirebaseAdmin: () => ({ admin: null, enabled: false, error: null, appName: null }),
  firebaseAppFor: () => null,
}));

vi.mock('./fetch', () => ({
  fetchFeed: vi.fn(),
  fetchArticleData: mockFetchArticleData,
}));

import { createArticle, DEFAULT_ARTICLE_BATCH_SIZE } from './rss.service';

import type { NormalizedArticle } from './normalize';

const sourceData = {
  rssUrl: 'https://example.com/feed.xml',
  category: 'news',
  name: 'Example',
  docId: 'source-1',
  raw: { image: null, language: 'en' },
};

function makeItem(overrides: Partial<NormalizedArticle> = {}): NormalizedArticle {
  return {
    title: 'A brand new article',
    description: 'Feed teaser text.',
    link: 'https://example.com/a-brand-new-article',
    thumbnail: null,
    guid: 'guid-1',
    pubDate: new Date('2026-10-16T00:00:00Z'),
    docId: 'doc-1',
    ...overrides,
  };
}

const notFound = () => Object.assign(new Error('Not found'), { code: 404 });

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchArticleData.mockResolvedValue({ imageUrl: null, fullDescription: null });
  mockDatabases.createDocument.mockResolvedValue({ $id: 'doc-1' });
});

describe('createArticle', () => {
  it('keeps the per-source article concurrency low', () => {
    // Each concurrent article holds a page body plus a JSDOM document, so a
    // large batch is what tipped the 512 MB runtime over.
    expect(DEFAULT_ARTICLE_BATCH_SIZE).toBeLessThanOrEqual(3);
  });

  it('skips the page fetch when the article is already stored', async () => {
    mockDatabases.getDocument.mockResolvedValue({ $id: 'doc-1' });

    await expect(createArticle(sourceData, makeItem())).resolves.toBe('skipped');

    expect(mockFetchArticleData).not.toHaveBeenCalled();
    expect(mockDatabases.createDocument).not.toHaveBeenCalled();
  });

  it('recognises an article stored under its legacy id', async () => {
    const item = makeItem({ legacyDocId: 'legacy-1' });
    mockDatabases.getDocument
      .mockRejectedValueOnce(notFound())
      .mockResolvedValueOnce({ $id: 'legacy-1' });

    await expect(createArticle(sourceData, item)).resolves.toBe('skipped');

    expect(mockDatabases.getDocument).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.anything(),
      'doc-1',
    );
    expect(mockDatabases.getDocument).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.anything(),
      'legacy-1',
    );
    expect(mockFetchArticleData).not.toHaveBeenCalled();
  });

  it('fetches and creates when the article is genuinely new', async () => {
    mockDatabases.getDocument.mockRejectedValue(notFound());
    mockFetchArticleData.mockResolvedValue({
      imageUrl: 'https://cdn.example.com/hero.jpg',
      fullDescription: 'The full article body.',
    });

    await expect(createArticle(sourceData, makeItem())).resolves.toBe('created');

    expect(mockFetchArticleData).toHaveBeenCalledWith('https://example.com/a-brand-new-article');

    const [databaseId, collectionId, documentId, payload] =
      mockDatabases.createDocument.mock.calls[0];
    expect(databaseId).toBeTruthy();
    expect(collectionId).toBeTruthy();
    expect(documentId).toBe('doc-1');
    expect(payload).toMatchObject({
      title: 'A brand new article',
      description: 'The full article body.',
      guid: 'guid-1',
      siteName: 'Example',
      category: 'news',
    });
    expect(payload.thumbnail).toContain('cdn.example.com');
  });

  it('falls back to the feed description when enrichment fails', async () => {
    mockDatabases.getDocument.mockRejectedValue(notFound());
    mockFetchArticleData.mockRejectedValue(new Error('boom'));

    await expect(createArticle(sourceData, makeItem())).resolves.toBe('created');

    expect(mockDatabases.createDocument.mock.calls[0][3]).toMatchObject({
      description: 'Feed teaser text.',
      thumbnail: null,
    });
  });

  it('still creates the article when the existence check errors', async () => {
    // A lookup failure is not proof of absence, so the article must not be lost.
    mockDatabases.getDocument.mockRejectedValue(Object.assign(new Error('boom'), { code: 503 }));

    await expect(createArticle(sourceData, makeItem())).resolves.toBe('created');

    expect(mockFetchArticleData).toHaveBeenCalled();
  });

  it('reports a duplicate write as an existing article', async () => {
    // The write races another run: the existence check missed it, the insert
    // loses, and the document is found on the second lookup.
    mockDatabases.getDocument
      .mockRejectedValueOnce(notFound())
      .mockResolvedValueOnce({ $id: 'doc-1', link: 'https://example.com/a-brand-new-article' });
    mockDatabases.createDocument.mockRejectedValue(
      Object.assign(new Error('conflict'), { code: 409 }),
    );

    await expect(createArticle(sourceData, makeItem())).resolves.toBe('exists');
  });
});
