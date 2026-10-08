/**
 * check-theme.ts — static verification of the appearance system.
 *
 * Three groups of assertions, none of which need a device:
 *
 *   1. Contrast  — every (scheme × style × accent) combination is measured
 *      against WCAG thresholds. This is what makes a set of hand-authored
 *      palettes trustworthy without eyes on them.
 *   2. Locales   — every locale file carries the same key set as `en`, with
 *      the same interpolation placeholders.
 *   3. Tokens    — invariants the runtime depends on: alpha-concatenated
 *      tokens stay 6-digit hex, palettes carry no stray keys, the `textMuted`
 *      tint rule still matches reality, and the cache preserves identity.
 *
 * Run with:  npm run check:theme
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BASE_PALETTES,
  DARK_COLORS,
  LIGHT_COLORS,
  type ColorScheme,
} from "../src/constants/colors";
import {
  ACCENT_IDS,
  APPEARANCE_IDS,
  STYLES,
  STYLE_SCHEME,
  TEXT_MUTED_TINTED,
  THEME_STYLES,
  resolvePalette,
  type AccentId,
  type ConcreteAccentId,
} from "../src/constants/theme";
import { contrastRatio, over, parseColor } from "../src/constants/colorUtils";

// ── config ───────────────────────────────────────────────────────────────────

/** WCAG 2.1 AA for body text. */
const AA_TEXT = 4.5;
/** AA for large text, placeholders and non-text UI boundaries. */
const AA_LARGE = 3.0;

const SCHEMES: ColorScheme[] = ["light", "dark"];
const ACCENT_CHOICES: AccentId[] = ["auto", ...ACCENT_IDS];

const LOCALES_DIR = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "..",
  "..",
  "..",
  "packages",
  "locales",
);

const HEX_6 = /^#[0-9a-f]{6}$/i;

// ── reporting ────────────────────────────────────────────────────────────────

let failures = 0;
let warnings = 0;
const notes: string[] = [];

function fail(group: string, message: string): void {
  failures++;
  console.log(`  FAIL  [${group}] ${message}`);
}

function warn(message: string): void {
  warnings++;
  console.log(`  WARN  ${message}`);
}

function group(name: string): void {
  console.log(`\n${name}`);
}

/** Short label for one combination, e.g. "dark/steam/gold". */
function combo(scheme: ColorScheme, style: string, accent: string): string {
  return `${scheme}/${style}/${accent}`;
}

// ── 1. contrast ──────────────────────────────────────────────────────────────

function checkContrast(): void {
  group("1. Contrast (WCAG 2.1)");

  // Background tokens are translucent by design, so each must be flattened
  // over the screen background before anything can be measured against it.
  //
  // `border` is deliberately absent: WCAG 1.4.11 requires 3:1 for the boundary
  // of an interactive control, not for a hairline divider, and most of this
  // token's uses are dividers. It is measured separately below, where the
  // accessibility-oriented style is held to the full requirement.
  const pairs: Array<[string, string, number]> = [
    ["text", "background", AA_TEXT],
    ["text", "surface", AA_TEXT],
    ["textMuted", "background", AA_TEXT],
    ["textMuted", "surface", AA_TEXT],
    ["accentText", "background", AA_TEXT],
    ["accentText", "surface", AA_TEXT],
    ["onAccent", "accent", AA_TEXT],
    ["textSubtle", "background", AA_LARGE],
  ];

  let measured = 0;
  let worst: { label: string; ratio: number; min: number } | null = null;

  for (const scheme of SCHEMES) {
    for (const style of THEME_STYLES) {
      for (const accent of ACCENT_CHOICES) {
        const p = resolvePalette(scheme, style, accent);
        const label = combo(scheme, style, accent);

        for (const [fg, bg, min] of pairs) {
          const surface = over(p[bg as keyof typeof p], p.background);
          const ratio = contrastRatio(p[fg as keyof typeof p], surface);
          measured++;

          if (!worst || ratio < worst.ratio) {
            worst = { label: `${label} ${fg} on ${bg}`, ratio, min };
          }

          if (ratio < min) {
            fail(
              "contrast",
              `${label}  ${fg} on ${bg} = ${ratio.toFixed(2)} (needs ${min.toFixed(1)})`,
            );
          }
        }
      }
    }
  }

  if (worst) {
    const w = worst as { label: string; ratio: number; min: number };
    console.log(
      `  ${measured} pairs measured. Tightest: ${w.label} = ${w.ratio.toFixed(2)} (min ${w.min.toFixed(1)})`,
    );
  }

  checkBorders();
}

/**
 * `border` is mostly a hairline divider, so 3:1 is not required of it in
 * general — but the `contrast` style exists precisely to make boundaries
 * unambiguous, so that one is held to the requirement.
 */
function checkBorders(): void {
  let tightest = { label: "", ratio: Number.POSITIVE_INFINITY };

  for (const scheme of SCHEMES) {
    for (const style of THEME_STYLES) {
      for (const accent of ACCENT_CHOICES) {
        const p = resolvePalette(scheme, style, accent);
        const label = combo(scheme, style, accent);
        const ratio = contrastRatio(p.border, p.background);

        if (ratio < tightest.ratio) tightest = { label, ratio };

        if (style === "contrast" && ratio < AA_LARGE) {
          fail(
            "contrast",
            `${label}  border on background = ${ratio.toFixed(2)} (needs ${AA_LARGE.toFixed(1)} for the high-contrast style)`,
          );
        }
      }
    }
  }

  console.log(
    `  border is a divider elsewhere; tightest anywhere = ${tightest.ratio.toFixed(2)} at ${tightest.label}`,
  );
}

// ── 2. locales ───────────────────────────────────────────────────────────────

type Json = { [key: string]: Json | string };

function flatKeys(node: Json, prefix = ""): string[] {
  const out: string[] = [];
  for (const key of Object.keys(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = node[key];
    if (typeof value === "object" && value !== null) out.push(...flatKeys(value, path));
    else out.push(path);
  }
  return out.sort();
}

function placeholders(node: Json, prefix = ""): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const key of Object.keys(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = node[key];
    if (typeof value === "object" && value !== null) {
      for (const [k, v] of placeholders(value, path)) out.set(k, v);
    } else {
      const found = String(value).match(/\{\{[^}]+\}\}/g) ?? [];
      out.set(path, found.sort());
    }
  }
  return out;
}

function checkLocales(): void {
  group("2. Locale parity");

  // Language files only — the package directory also holds a package.json.
  const files = readdirSync(LOCALES_DIR).filter(
    (f) => f.endsWith(".json") && f !== "package.json",
  );
  if (files.length === 0) {
    fail("locales", `no locale files found in ${LOCALES_DIR}`);
    return;
  }

  const read = (name: string): Json =>
    JSON.parse(readFileSync(join(LOCALES_DIR, name), "utf8"));
  const baseName = files.includes("en.json") ? "en.json" : files[0];
  const baseKeys = flatKeys(read(baseName));
  const basePlaceholders = placeholders(read(baseName));

  for (const file of files) {
    const data = read(file);
    const keys = flatKeys(data);
    const missing = baseKeys.filter((k) => !keys.includes(k));
    const extra = keys.filter((k) => !basePlaceholders.has(k));

    for (const key of missing) fail("locales", `${file}: missing key "${key}"`);

    // Extra keys are dead strings rather than breakage — `t()` resolves them
    // to the fallback language — so report them without failing the gate.
    if (extra.length) {
      warn(
        `${file}: ${extra.length} key(s) not present in ${baseName}: ${extra.slice(0, 4).join(", ")}${
          extra.length > 4 ? ", …" : ""
        }`,
      );
    }

    const ph = placeholders(data);
    for (const [key, expected] of basePlaceholders) {
      if (!ph.has(key)) continue;
      const actual = ph.get(key) as string[];
      if (expected.join("|") !== actual.join("|")) {
        fail(
          "locales",
          `${file}: "${key}" placeholders ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`,
        );
      }
    }
  }

  console.log(
    `  ${files.length} locales checked against ${baseName} (${baseKeys.length} keys).`,
  );

  checkAppearanceKeys();
}

/**
 * Every label and string the Appearance screen renders must exist in every
 * locale.
 *
 * The parity check above only catches *relative* drift — it cannot notice a
 * key missing from all seven files at once, which is exactly what happens when
 * an option is added to `theme.ts` without its label. The registry is therefore
 * treated as the source of truth for what must exist, and the screen's fixed
 * copy is listed alongside it.
 *
 * Keys live under `settings.theme`, since the picker, its mock preview and the
 * accent grid are all part of the single Appearance screen.
 */
function checkAppearanceKeys(): void {
  const required = [
    "title",
    "accentTitle",
    // Theme-picker chrome: the mock news card and the note under the name.
    "syncNote",
    "previewHeadline",
    "previewSummary",
    "previewSite",
    ...APPEARANCE_IDS,
    "auto",
    "random",
    ...ACCENT_IDS,
  ];

  const files = readdirSync(LOCALES_DIR).filter(
    (f) => f.endsWith(".json") && f !== "package.json",
  );

  for (const file of files) {
    const parsed = JSON.parse(readFileSync(join(LOCALES_DIR, file), "utf8")) as Json;
    const settings = parsed.settings as Json;
    const section = (settings?.theme ?? {}) as Json;

    for (const key of required) {
      const value = section[key];
      if (typeof value !== "string" || value === "") {
        fail(
          "i18n",
          `${file}: settings.theme.${key} is missing or not a non-empty string`,
        );
      }
    }
  }

  // Every appearance that names a style must pin a brightness, since only one
  // appearance is active at a time and a style cannot defer to the OS setting.
  for (const appearance of APPEARANCE_IDS) {
    if (appearance === "system" || appearance === "light" || appearance === "dark")
      continue;
    if (!(appearance in STYLE_SCHEME)) {
      fail("appearance", `STYLE_SCHEME has no brightness for "${appearance}"`);
    }
  }

  console.log(
    `  ${required.length} strings required under settings.theme in ${files.length} locales.`,
  );
}

// ── 3. token invariants ──────────────────────────────────────────────────────

function checkTokens(): void {
  group("3. Token invariants");

  // Alpha-concatenated tokens. Six call sites do e.g. `colors.accent + "40"`,
  // which only works for 6-digit hex.
  const alphaConcatenated = ["accent", "text", "danger"] as const;

  for (const scheme of SCHEMES) {
    for (const style of THEME_STYLES) {
      for (const accent of ACCENT_CHOICES) {
        const p = resolvePalette(scheme, style, accent);
        const label = combo(scheme, style, accent);

        for (const key of alphaConcatenated) {
          if (!HEX_6.test(p[key])) {
            fail("tokens", `${label}  ${key} = "${p[key]}" is not 6-digit hex`);
          }
        }

        for (const [key, value] of Object.entries(p)) {
          if (parseColor(value) === null) {
            fail("tokens", `${label}  ${key} = "${value}" is not a parseable color`);
          }
        }

        // Config flags must be stripped, or a stylesheet factory would receive
        // keys that are not palette tokens.
        for (const leaked of ["tintSurface", "tintTextMuted"]) {
          if (leaked in p)
            fail("tokens", `${label}  leaked config key "${leaked}" into palette`);
        }

        if (Object.keys(p).length !== Object.keys(LIGHT_COLORS).length) {
          fail(
            "tokens",
            `${label}  has ${Object.keys(p).length} tokens, expected ${Object.keys(LIGHT_COLORS).length}`,
          );
        }
      }
    }
  }

  // ASSERTION A — the documented `textMuted` tint rule must still describe the
  // base palettes. If `colors.ts` changes this relationship, this fails rather
  // than letting the light palette quietly start tinting its neutral slate.
  for (const scheme of SCHEMES) {
    const base = BASE_PALETTES[scheme];
    const actual = base.textMuted === base.accentText;
    if (TEXT_MUTED_TINTED[scheme] !== actual) {
      fail(
        "assertion A",
        `${scheme}: TEXT_MUTED_TINTED=${TEXT_MUTED_TINTED[scheme]} but textMuted===accentText is ${actual}`,
      );
    }
  }

  // ASSERTION B — a style that redefines `textMuted` must say explicitly
  // whether the accent should tint it.
  for (const style of THEME_STYLES) {
    for (const scheme of SCHEMES) {
      const override = STYLES[style][scheme];
      if (override.textMuted !== undefined && override.tintTextMuted === undefined) {
        fail(
          "assertion B",
          `${style}/${scheme} overrides textMuted without declaring tintTextMuted`,
        );
      }
    }
  }

  // The default style with an automatic accent must reproduce the original
  // palettes exactly, so adopting the theme system cannot change the app's
  // existing look.
  for (const scheme of SCHEMES) {
    const p = resolvePalette(scheme, "default", "auto");
    const base = scheme === "dark" ? DARK_COLORS : LIGHT_COLORS;
    const drifted = Object.keys(base).filter(
      (k) => p[k as keyof typeof p] !== base[k as keyof typeof base],
    );
    if (drifted.length) {
      fail(
        "regression",
        `default/${scheme} drifted from the base palette: ${drifted.join(", ")}`,
      );
    }
  }

  // Identity stability: the palette reference is a memo dependency throughout
  // the app, so the same combination must always yield the same object.
  const a = resolvePalette("dark", "sepia", "gold");
  const b = resolvePalette("dark", "sepia", "gold" as ConcreteAccentId);
  if (a !== b)
    fail("cache", "resolvePalette returned a new object for a repeated combination");

  if (resolvePalette("dark", "steam") === resolvePalette("dark", "blurple")) {
    fail("cache", "different styles resolved to the same object");
  }

  // An unknown accent or style must degrade to the default rather than throw
  // or produce a broken palette.
  const fallback = resolvePalette("dark", "nope" as never, "chartreuse" as never);
  if (fallback !== resolvePalette("dark", "default", "auto")) {
    fail("fallback", "unknown style/accent did not resolve to the default palette");
  }

  console.log(
    "  Alpha-hex, parseability, assertions A/B, default regression and cache checked.",
  );
}

// ── run ──────────────────────────────────────────────────────────────────────

checkContrast();
checkLocales();
checkTokens();

console.log(
  `\n${failures === 0 ? "PASS" : "FAIL"}  ${failures} failure(s), ${warnings} warning(s).`,
);
if (failures === 0 && notes.length) notes.forEach((n) => console.log(`  note: ${n}`));
process.exit(failures === 0 ? 0 : 1);
