import type { Source, SourceGroup } from "../types";

type TranslateFn = (
  key: string,
  replacements?: Record<string, string | number>,
) => string;

const LANGUAGE_TITLE_KEYS: Record<string, string> = {
  ar: "news.dropdown.arabicSources",
  en: "news.dropdown.englishSources",
  es: "news.dropdown.spanishSources",
  fr: "news.dropdown.frenchSources",
  hi: "news.dropdown.hindiSources",
  pt: "news.dropdown.portugueseSources",
};

const PREFERRED_LANGUAGES = ["ar", "en", "es", "fr", "hi", "pt"];

export function normalizeSourceLanguage(language?: string): string {
  const code = (language ?? "").trim().split(/[-_]/)[0]?.toLowerCase();
  return code || "en";
}

export function getLanguageBadge(language?: string): string {
  return normalizeSourceLanguage(language).toUpperCase();
}

function languageDisplayName(language: string, locale: string): string {
  try {
    return (
      new Intl.DisplayNames([locale], { type: "language" }).of(language) ||
      language
    );
  } catch {
    return language;
  }
}

function compareNames(a: string, b: string, language: string, locale: string) {
  try {
    return a.localeCompare(b, language);
  } catch {
    return a.localeCompare(b, locale);
  }
}

function groupTitle(language: string, locale: string, t: TranslateFn): string {
  const key = LANGUAGE_TITLE_KEYS[language];
  if (key) {
    const title = t(key);
    if (title !== key) return title;
  }

  return t("news.dropdown.sourcesByLanguage", {
    language: languageDisplayName(language, locale),
  });
}

export function groupSourcesByLanguage(
  sources: Source[],
  locale: string,
  t: TranslateFn,
): SourceGroup[] {
  const buckets = new Map<string, Source[]>();

  for (const source of sources) {
    const language = normalizeSourceLanguage(source.language);
    const bucket = buckets.get(language);
    if (bucket) bucket.push(source);
    else buckets.set(language, [source]);
  }

  const activeLanguage = normalizeSourceLanguage(locale);
  const languages = [...buckets.keys()].sort((a, b) => {
    if (a === activeLanguage) return -1;
    if (b === activeLanguage) return 1;

    const aIndex = PREFERRED_LANGUAGES.indexOf(a);
    const bIndex = PREFERRED_LANGUAGES.indexOf(b);
    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }

    return a.localeCompare(b, locale);
  });

  return languages.map((language) => ({
    language,
    title: groupTitle(language, locale, t),
    sources: buckets
      .get(language)!
      .sort((a, b) => compareNames(a.name, b.name, language, locale)),
  }));
}
