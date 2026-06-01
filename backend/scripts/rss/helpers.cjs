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
    } catch (_error) { }
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
    // Highly robust HTML image extraction including lazy loading attributes
    const getImgFromHtml = (html) => {
      if (!html || typeof html !== "string") return null;
      // Try data-src, data-lazy-src, data-original, data-srcset, srcset, src
      const matches = 
        html.match(/<img[^>]+(?:data-src|data-lazy-src|data-original|data-srcset)=['"]([^'"]+)['"]/i)?.[1] ||
        html.match(/<img[^>]+src=['"]([^'"]+)['"]/i)?.[1];
      return matches;
    };

    // Robust extraction for og:image tags embedded in RSS HTML content
    const getOgImageFromHtml = (html) => {
      if (!html || typeof html !== "string") return null;
      return (
        html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]
      );
    };

    // Helper to safely extract url/href from parsed XML thumbnail or enclosure objects/strings
    const getUrlFromField = (field) => {
      if (!field) return null;
      if (typeof field === "string") return field;
      if (Array.isArray(field)) return getUrlFromField(field[0]);
      if (typeof field === "object") {
        return field.url || field.href || field._ || (field.$ && (field.$.url || field.$.href));
      }
      return null;
    };

    // Extract from media:content (which could be an array or single object)
    const mediaContent = item["media:content"];
    let mediaContentUrl = null;
    if (mediaContent) {
      if (Array.isArray(mediaContent)) {
        const imageObj = mediaContent.find(m => m.medium === "image" || m.type?.startsWith("image/")) || mediaContent[0];
        mediaContentUrl = getUrlFromField(imageObj);
      } else {
        mediaContentUrl = getUrlFromField(mediaContent);
      }
    }

    // Extract from media:thumbnail (which could be an array or single object)
    const mediaThumbnail = item["media:thumbnail"] || item["media:content"]?.["media:thumbnail"];
    let mediaThumbnailUrl = getUrlFromField(mediaThumbnail);

    img =
      mediaThumbnailUrl ||
      mediaContentUrl ||
      getUrlFromField(item.thumbnail) ||
      getImgFromHtml(item.description) ||
      getOgImageFromHtml(item.description) ||
      getImgFromHtml(item["content:encoded"]) ||
      getOgImageFromHtml(item["content:encoded"]) ||
      getUrlFromField(item.enclosure);
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
