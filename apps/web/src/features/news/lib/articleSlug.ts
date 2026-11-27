import type { Article } from "@/types";

const ARTICLE_ID_PATTERN = /^[a-fA-F0-9]{36}$/;
const MAX_SLUG_LENGTH = 90;

export type ArticleLocale = "en" | "ar";

export function slugifyArticleTitle(title: string): string {
  return title
    .normalize("NFKC")
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
}

export function articleSlug(article: Pick<Article, "$id" | "title">): string {
  return `${slugifyArticleTitle(article.title) || "article"}-${article.$id}`;
}

export function articlePath(
  article: Pick<Article, "$id" | "title">,
  locale?: ArticleLocale,
): string {
  const path = `/news/${articleSlug(article)}`;
  return locale ? `/${locale}${path}` : path;
}

export function resolveArticleId(segment: string): string | null {
  if (ARTICLE_ID_PATTERN.test(segment)) return segment;
  return segment.match(/-([a-fA-F0-9]{36})$/)?.[1] ?? null;
}

export function canonicalArticleLocale(article: Article): ArticleLocale {
  const language = (article.language ?? "").split(/[-_]/)[0].toLowerCase();
  return language === "ar" ? "ar" : "en";
}
