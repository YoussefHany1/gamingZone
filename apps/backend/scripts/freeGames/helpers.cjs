const { sha1Id } = require("../lib/hash.cjs");

const cleanSlug = (rawSlug, title) => {
  if (rawSlug) return rawSlug.toLowerCase().trim();
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-");
};

const cleanGameNameForSearch = (gameName) => {
  if (!gameName) return gameName;

  return String(gameName)
    .replace(/\(Steam\)\s*Giveaway/gi, "")
    .replace(/\(GOG\)\s*Giveaway/gi, "")
    .replace(/Giveaway/gi, "")
    .replace(/\(\s*\)/g, "")
    .trim()
    .replace(/\s+/g, " ");
};

const generateDocId = (slug) => sha1Id(slug);

module.exports = {
  cleanSlug,
  cleanGameNameForSearch,
  generateDocId,
};
