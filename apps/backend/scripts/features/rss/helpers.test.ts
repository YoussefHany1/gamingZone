import { describe, it, expect } from 'vitest';
import { safeId, resolveImageUrl, extractThumbnail, generateDocId } from './helpers';

describe('RSS Helpers', () => {
  describe('safeId', () => {
    it('should generate a consistent ID for the same URL', () => {
      const url1 = 'https://example.com/article/1';
      const url2 = 'https://example.com/article/2';

      expect(safeId(url1)).toBe(safeId(url1));
      expect(safeId(url1)).not.toBe(safeId(url2));
    });
  });

  describe('resolveImageUrl', () => {
    it('should resolve absolute paths correctly', () => {
      expect(resolveImageUrl('https://example.com/img.jpg', 'https://source.com')).toBe(
        'https://example.com/img.jpg',
      );
    });

    it('should resolve relative paths against the source URL', () => {
      expect(resolveImageUrl('/assets/img.jpg', 'https://example.com')).toBe(
        'https://example.com/assets/img.jpg',
      );
    });

    it('should return null for invalid URLs', () => {
      expect(resolveImageUrl('not a url', 'not a source')).toBeNull();
    });
  });

  describe('extractThumbnail', () => {
    it('should extract thumbnail from media:thumbnail', () => {
      const item = {
        'media:thumbnail': { $: { url: 'https://example.com/thumb.jpg' } },
      };
      expect(extractThumbnail(item, 'https://example.com')).toBe('https://example.com/thumb.jpg');
    });

    it('should extract thumbnail from enclosure if type is image', () => {
      const item = {
        enclosure: { $: { url: 'https://example.com/enclosure.jpg', type: 'image/jpeg' } },
      };
      expect(extractThumbnail(item, 'https://example.com')).toBe(
        'https://example.com/enclosure.jpg',
      );
    });
  });

  describe('generateDocId', () => {
    it('should generate a sha1 hash for the docId', () => {
      const item = { guid: 'unique-article-id-123' };
      const result = generateDocId(item);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(10);
    });
  });
});
