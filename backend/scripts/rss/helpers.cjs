const { sha1Id } = require("../lib/hash.cjs");

const safeId = (input) => {
  if (!input) return "unknown";

  return String(input)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
};

const resolveImageUrl = (img, baseUrl) => {
  if (!img || typeof img !== "string") return null;

  let finalUrl = img.trim();
  if (finalUrl.startsWith("//")) finalUrl = `https:${finalUrl}`;

  if (finalUrl.startsWith("/")) {
    try {
      const u = new URL(baseUrl);
      finalUrl = u.origin + finalUrl;
    } catch (_error) {}
  }

  if (finalUrl.startsWith("http:")) {
    finalUrl = finalUrl.replace("http:", "https:");
  }

  if (!finalUrl.startsWith("https")) return null;
  return finalUrl;
};

const extractThumbnail = (item, baseUrl, isJson = false) => {
  let img = null;

  if (isJson) {
    img =
      item.image ||
      item.tileImage ||
      item.thumbnail ||
      item.img ||
      item.urlToImage ||
      null;
  } else {
    const getImgFromHtml = (html) =>
      (html || "").match(/<img[^>]+src=['\"]([^'\"]+)['\"]/i)?.[1];

    img =
      item["media:content"]?.["media:thumbnail"]?.url ||
      (item.thumbnail &&
        (Array.isArray(item.thumbnail) ? item.thumbnail[0] : item.thumbnail)) ||
      item["media:content"]?.url ||
      item["media:thumbnail"]?.url ||
      getImgFromHtml(item.description) ||
      getImgFromHtml(item["content:encoded"]) ||
      (item.enclosure &&
        (Array.isArray(item.enclosure)
          ? item.enclosure[0]?.url
          : item.enclosure.url));
  }

  return resolveImageUrl(img, baseUrl);
};

const generateDocId = (item) => {
  const key = item.id || item.guid || item.rawId;
  if (key) return sha1Id(String(key));

  const fallback = `${item.link || ""}::${(item.title || "unknown").trim().toLowerCase()}`;
  return sha1Id(fallback);
};

module.exports = {
  safeId,
  resolveImageUrl,
  extractThumbnail,
  generateDocId,
};
