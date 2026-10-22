/**
 * check-shared-models.ts — fails when the mobile app re-declares a domain model
 * that `@gaming-zone/core` already owns.
 *
 * `apps/mobile` used to carry its own near-identical copies of the shared IGDB
 * types, including a `Game` whose `screenshots` had degraded to `any`. Sharing
 * a model only stays meaningful if nothing quietly re-declares it, so this
 * script scans `src` for declarations of the shared names.
 *
 * Declarations that already exist are listed in `KNOWN_DUPLICATES` so the guard
 * can be enabled before the duplication is removed. New duplicates fail the
 * check; entries that no longer exist are reported so the list can be pruned.
 *
 * Run with:  npm run check:models
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// ── config ───────────────────────────────────────────────────────────────────

const APP_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC_DIR = join(APP_DIR, "src");

/** Model names owned by `@gaming-zone/core` — the single source of truth. */
const SHARED_MODELS = [
  "Cover",
  "Website",
  "Company",
  "InvolvedCompany",
  "Platform",
  "Genre",
  "GameMode",
  "Engine",
  "Video",
  "Screenshot",
  "AgeRating",
  "Language",
  "LangSupportType",
  "LanguageSupport",
  "GameTimeToBeat",
  "SpecRow",
  "PcRequirements",
  "LangRow",
  "PlayTime",
  "GameBrief",
  "CollectionGame",
  "SimilarGame",
  "GamingEventGame",
  "GameItem",
  "GameCover",
  "GameData",
  "Game",
  "GamePlatform",
  "GameGenre",
  "FreeGame",
  "NewsGame",
  "SummaryLanguage",
  "ArticleSummaryKey",
  "Article",
  "GameEntry",
  "WeeklySummaryDoc",
  "GamingEvent",
  "GamingEventVideo",
  "GamingEventNetwork",
  "ChatMessage",
  "CountdownResult",
  "XpReason",
  "AchievementTier",
  "AchievementMetric",
  "AchievementDefinition",
  "AchievementState",
  "GamificationStats",
  "GamificationState",
  "XpBreakdownEntry",
];

/**
 * `"<path>:<Model>"` entries that exist today, tracked so this guard could be
 * enabled before the duplication itself was removed. Remove an entry once its
 * declaration is gone — the script reports stale entries.
 *
 * The DRY-1 duplicates in `src/features/games/types.ts` and
 * `src/types/sharedTypes.ts` are gone (both now re-export from
 * `@gaming-zone/core`). `Game` in `sharedTypes.ts` was the copy whose
 * `screenshots` had degraded to `any`, which is what `packages/core`'s contract
 * tests now guard against.
 */
const KNOWN_DUPLICATES: readonly string[] = [
  // Not a copy: this is core's `Article` plus Appwrite's `Models.Document`
  // ($createdAt, $updatedAt, $permissions, …). The DRY fix is to re-export as
  // `Article & Models.Document` from core, which is why it stays tracked here.
  "src/features/news/hooks/useFeed.ts:Article",
];

// Longest names first so a shorter prefix (e.g. `Game` vs `GameData`) cannot
// win the alternation and then fail the trailing word boundary.
const DECLARATION_RE = new RegExp(
  `^\\s*(?:export\\s+)?(?:declare\\s+)?(?:interface|type)\\s+(${[...SHARED_MODELS]
    .sort((a, b) => b.length - a.length)
    .join("|")})\\b`,
);

// ── reporting ────────────────────────────────────────────────────────────────

let failures = 0;
let warnings = 0;

function fail(message: string): void {
  failures += 1;
  console.log(`  FAIL  ${message}`);
}

function warn(message: string): void {
  warnings += 1;
  console.log(`  WARN  ${message}`);
}

// ── scan ─────────────────────────────────────────────────────────────────────

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* sourceFiles(full);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    if (/\.test\.tsx?$/.test(entry.name)) continue;
    yield full;
  }
}

function checkSharedModels(): void {
  console.log("Shared domain models (must be imported from @gaming-zone/core)");

  const found: { location: string; line: number; model: string }[] = [];

  for (const file of sourceFiles(SRC_DIR)) {
    const location = relative(APP_DIR, file).replace(/\\/g, "/");
    const lines = readFileSync(file, "utf8").split(/\r?\n/);

    lines.forEach((line, index) => {
      const match = DECLARATION_RE.exec(line);
      if (match?.[1]) {
        found.push({ location, line: index + 1, model: match[1] });
      }
    });
  }

  found.sort(
    (a, b) =>
      a.location.localeCompare(b.location) ||
      a.line - b.line ||
      a.model.localeCompare(b.model),
  );

  const allowed = new Set(KNOWN_DUPLICATES);
  const seen = new Set<string>();

  for (const { location, line, model } of found) {
    const key = `${location}:${model}`;

    if (allowed.has(key)) {
      seen.add(key);
      continue;
    }

    fail(
      `${location}:${line} declares \`${model}\` — import it from @gaming-zone/core ` +
        `instead (or add it there if the model is genuinely shared).`,
    );
  }

  for (const stale of KNOWN_DUPLICATES) {
    if (!seen.has(stale)) {
      warn(`KNOWN_DUPLICATES entry no longer matches anything: ${stale} — prune it.`);
    }
  }

  const remaining = KNOWN_DUPLICATES.length;
  console.log(
    `  ${found.length} declaration(s) found, ${remaining} tracked as known duplicates.`,
  );
}

// ── run ──────────────────────────────────────────────────────────────────────

checkSharedModels();

console.log(
  `\n${failures === 0 ? "PASS" : "FAIL"}  ${failures} failure(s), ${warnings} warning(s).`,
);
process.exit(failures === 0 ? 0 : 1);
