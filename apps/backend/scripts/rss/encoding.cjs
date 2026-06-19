const iconv = require("iconv-lite");

const CP1252_MAP = {
  "\u20AC": "\x80",
  "\u201A": "\x82",
  "\u0192": "\x83",
  "\u201E": "\x84",
  "\u2026": "\x85",
  "\u2020": "\x86",
  "\u2021": "\x87",
  "\u02C6": "\x88",
  "\u2030": "\x89",
  "\u0160": "\x8A",
  "\u2039": "\x8B",
  "\u0152": "\x8C",
  "\u017D": "\x8E",
  "\u2018": "\x91",
  "\u2019": "\x92",
  "\u201C": "\x93",
  "\u201D": "\x94",
  "\u2022": "\x95",
  "\u2013": "\x96",
  "\u2014": "\x97",
  "\u02DC": "\x98",
  "\u2122": "\x99",
  "\u0161": "\x9A",
  "\u203A": "\x9B",
  "\u0153": "\x9C",
  "\u017E": "\x9E",
  "\u0178": "\x9F",
};

const CP1252_REGEX = new RegExp(`[${Object.keys(CP1252_MAP).join("")}]`, "g");
const ARABIC_REGEX = /[\u0600-\u06FF]/g;
const COMMON_WORDS_REGEX =
  /(أفضل|الألعاب|المعالجات|إنتل|نفيديا|بطاقة|تجربة|أداء|سعر|مراجعة|خبر|تسريب|حصري|الجديد|نسخة|إطلاق|رسمياً|عرب|هاردوير|موقع|تقنية)/g;

function fixArabHardwareEncoding(buffer) {
  const utf8Str = buffer.toString("utf8");
  const strategies = [
    { type: "UTF-8", fn: () => utf8Str },
    { type: "Win-1256", fn: () => iconv.decode(buffer, "windows-1256") },
    {
      type: "Fix-D",
      fn: () => {
        const latinStr = utf8Str.replace(
          CP1252_REGEX,
          (char) => CP1252_MAP[char],
        );
        return Buffer.from(latinStr, "latin1").toString("utf8");
      },
    },
  ];

  let bestResult = { text: utf8Str, score: -Infinity, type: "None" };
  console.log("      🧪 --- Decoding Analysis (Optimized) ---");

  strategies.forEach(({ type, fn }) => {
    let text = "";
    try {
      text = fn();
    } catch (_error) {
      return;
    }

    const arabicCount = (text.match(ARABIC_REGEX) || []).length;
    const commonCount = (text.match(COMMON_WORDS_REGEX) || []).length;
    const errorCount = (text.match(/\uFFFD/g) || []).length;
    const score = arabicCount + commonCount * 100 - errorCount * 50;

    if (score > bestResult.score) {
      bestResult = { text, score, type };
    }
  });

  console.log(
    `      ✅ Winner: ${bestResult.type} (Score: ${bestResult.score})`,
  );
  return bestResult.text;
}

module.exports = {
  fixArabHardwareEncoding,
};
