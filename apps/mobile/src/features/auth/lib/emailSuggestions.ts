/**
 * Pure helpers for the one-tap email domain suggestions shown under the email
 * field. Kept framework-free so the matching rules are easy to reason about
 * and test.
 */

/** Domains offered as chips, ordered by how common they are for our users. */
export const COMMON_EMAIL_DOMAINS = [
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "icloud.com",
  "protonmail.com",
] as const;

export type EmailDomain = (typeof COMMON_EMAIL_DOMAINS)[number];

/**
 * Returns the domains worth suggesting for the current input.
 *
 * - No `@` yet: every common domain is suggested.
 * - Partial domain (`user@gm`): only domains that start with the partial text.
 * - Complete/known domain (`user@gmail.com`): nothing is suggested.
 * - Empty or malformed input: nothing is suggested.
 */
export function getEmailDomainSuggestions(
  email: string,
  domains: readonly string[] = COMMON_EMAIL_DOMAINS,
): string[] {
  const value = email.trim();
  if (!value) return [];

  const atIndex = value.indexOf("@");
  if (atIndex === -1) return [...domains];

  const localPart = value.slice(0, atIndex);
  if (!localPart) return [];

  const partialDomain = value.slice(atIndex + 1).toLowerCase();
  if (!partialDomain) return [...domains];

  return domains.filter(
    (domain) =>
      domain.startsWith(partialDomain) && domain !== partialDomain,
  );
}

/**
 * Replaces (or adds) the domain while keeping the local part intact.
 * `user` + `gmail.com` → `user@gmail.com`, `user@yah` → `user@gmail.com`.
 */
export function applyEmailDomain(email: string, domain: string): string {
  const value = email.trim();
  const atIndex = value.indexOf("@");
  const localPart = atIndex === -1 ? value : value.slice(0, atIndex);
  return localPart ? `${localPart}@${domain}` : "";
}
