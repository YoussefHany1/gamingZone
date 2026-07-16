import { sha1Id } from '../../lib/hash';

const cleanSlug = (rawSlug: string | undefined | null, title?: string | null): string => {
  if (rawSlug) return rawSlug.toLowerCase().trim();
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');
};

const cleanGameNameForSearch = (gameName: string | undefined | null): string | undefined | null => {
  if (!gameName) return gameName;

  return String(gameName)
    .replace(/\(Steam\)\s*Giveaway/gi, '')
    .replace(/\(GOG\)\s*Giveaway/gi, '')
    .replace(/Giveaway/gi, '')
    .replace(/\(\s*\)/g, '')
    .trim()
    .replace(/\s+/g, ' ');
};

const generateDocId = (slug: string): string => sha1Id(slug);

export { cleanSlug, cleanGameNameForSearch, generateDocId };
