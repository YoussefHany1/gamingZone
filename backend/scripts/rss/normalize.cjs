const striptags = require("striptags");
const he = require("he");

const { generateDocId, extractThumbnail } = require("./helpers.cjs");

function getJsonRawItems(data) {
  if (Array.isArray(data)) return data;

  const candidateKeys = [
    "items",
    "articles",
    "results",
    "posts",
    "news",
    "data",
    "entries",
  ];

  for (const key of candidateKeys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  return [];
}

function normalizeJsonItems(data, sourceUrl) {
  const rawItems = getJsonRawItems(data);

  return rawItems.map((item, index) => {
    const title = item.title || item.name || item.headline || "No Title";
    const desc =
      item.description || item.body || item.summary || item.content || "";
    const link = item.link || item.url || item.website || item.href || null;

    const uniqueKey =
      item.id ||
      item.uuid ||
      item.slug ||
      (link && link !== sourceUrl ? link : null) ||
      `${sourceUrl}::${index}::${title}`;

    return {
      title,
      description: desc,
      link: link || sourceUrl,
      thumbnail: extractThumbnail(item, sourceUrl, true),
      guid: String(uniqueKey),
      rawId: uniqueKey,
      pubDate: item.pubDate || item.date || item.publishedAt || new Date(),
    };
  });
}

function normalizeXmlItems(parsedData, sourceUrl) {
  const channel = parsedData.rss?.channel || parsedData.feed || parsedData;
  let rawItems = channel.item || channel.entry || [];
  if (!Array.isArray(rawItems)) rawItems = [rawItems];

  const items = [];

  rawItems.forEach((item) => {
    const link =
      item.link?._ ||
      item.link ||
      (typeof item.link === "object" && item.link.href) ||
      item.guid?._ ||
      item.guid;

    if (!link) return;

    const description = item.description
      ? he.decode(striptags(String(item.description))).trim()
      : item.summary
        ? he.decode(striptags(String(item.summary))).trim()
        : "";

    const pubDateRaw =
      item.pubDate || item["dc:date"] || item.published || item.updated;
    const pubDate = pubDateRaw ? new Date(pubDateRaw) : new Date();

    items.push({
      title:
        typeof item.title === "string"
          ? item.title
          : item.title?._ || "No Title",
      description: description.replace(/\s+/g, " "),
      link,
      thumbnail: extractThumbnail(item, sourceUrl, false),
      guid: (typeof item.guid === "string" ? item.guid : item.guid?._) || link,
      pubDate,
    });
  });

  return items;
}

function normalizeItems(fetchedContent, sourceUrl) {
  if (!fetchedContent) return [];
  const items =
    fetchedContent.type === "json"
      ? normalizeJsonItems(fetchedContent.data, sourceUrl)
      : normalizeXmlItems(fetchedContent.data, sourceUrl);

  return items.map((item) => ({
    ...item,
    docId: generateDocId(item),
  }));
}

module.exports = {
  normalizeItems,
};
