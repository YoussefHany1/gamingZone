import { formatDistanceToNow, formatDistanceToNowStrict } from "date-fns";
import { ar, es, fr, hi, ptBR, pt } from "date-fns/locale";

const locales = { ar, es, fr, hi, "pt-BR": ptBR, "pt-PT": pt } as const;

function localeFor(language?: string) {
  if (!language) return undefined;
  return locales[language as keyof typeof locales];
}

/**
 * `date-fns` throws on NaN/Infinity, and a malformed Firestore value could
 * reach here through a mapper miss. Rendering an empty label is safer than
 * taking the whole list row down.
 */
function isRenderableTime(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function relativeTime(value: number | null, language?: string): string {
  if (!isRenderableTime(value)) return "";
  const locale = localeFor(language);
  return formatDistanceToNow(value, locale ? { addSuffix: true, locale } : { addSuffix: true });
}

export function countdown(value: number | null, language?: string): string {
  if (!isRenderableTime(value)) return "";
  const locale = localeFor(language);
  return formatDistanceToNowStrict(value, locale ? { addSuffix: true, locale } : { addSuffix: true });
}
