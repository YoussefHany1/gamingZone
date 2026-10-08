/**
 * colorUtils.ts — the small amount of color math the theme registry needs.
 *
 * The workspace has no color library (no chroma-js / polished / tinycolor2), so
 * the operations required to derive an accent variant from a base palette are
 * implemented here directly. The surface area is deliberately tiny:
 *
 *  - parse/emit in the two notations the palettes actually use: `#rrggbb` and
 *    `rgba(r, g, b, a)`
 *  - HSL conversion, used to retune an accent's lightness per color scheme so
 *    `accentText` stays legible on `background`
 *  - WCAG relative luminance, used to pick `onAccent` and to validate contrast
 *
 * Everything is written to emit 6-digit hex or `rgba(...)` and nothing else,
 * because call sites concatenate alpha suffixes onto tokens (e.g.
 * `colors.accent + "40"`). See the note in `colors.ts`.
 */

export interface Rgba {
  r: number;
  g: number;
  b: number;
  /** 0–1. */
  a: number;
}

export interface Hsl {
  /** Degrees, 0–360. */
  h: number;
  /** Percent, 0–100. */
  s: number;
  /** Percent, 0–100. */
  l: number;
}

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGBA_RE =
  /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i;

const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

const clampChannel = (value: number): number => Math.round(clamp(value, 0, 255));

/** Parses `#rgb`, `#rrggbb`, `rgb(...)` or `rgba(...)`. */
export function parseColor(value: string): Rgba | null {
  const hex = HEX_RE.exec(value);
  if (hex?.[1]) {
    const digits = hex[1];
    const full =
      digits.length === 3
        ? digits
            .split("")
            .map((c) => c + c)
            .join("")
        : digits;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: 1,
    };
  }

  const rgba = RGBA_RE.exec(value);
  if (rgba) {
    return {
      r: Number(rgba[1]),
      g: Number(rgba[2]),
      b: Number(rgba[3]),
      a: rgba[4] === undefined ? 1 : Number(rgba[4]),
    };
  }

  return null;
}

/** Emits 6-digit hex when fully opaque, `rgba(...)` otherwise. */
export function formatColor({ r, g, b, a }: Rgba): string {
  if (a >= 1) {
    const hex = (n: number): string => clampChannel(n).toString(16).padStart(2, "0");
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }
  const alpha = Math.round(clamp(a, 0, 1) * 1000) / 1000;
  return `rgba(${clampChannel(r)}, ${clampChannel(g)}, ${clampChannel(b)}, ${alpha})`;
}

/**
 * Swaps the color channels while preserving alpha. Used to retint a token that
 * the base palette expressed as translucent accent (e.g. `surface`) so the
 * per-scheme alpha tuned in `colors.ts` is reused verbatim.
 */
export function withRgb(value: string, rgb: Rgba): string {
  const base = parseColor(value);
  if (!base) return value;
  return formatColor({ ...rgb, a: base.a });
}

/** Replaces the hue/chroma of `value` with `from`, keeping its lightness. */
export function withHue(value: string, from: Rgba): string {
  const base = parseColor(value);
  if (!base) return value;
  return formatColor({ ...from, a: base.a });
}

export function rgbToHsl({ r, g, b }: Rgba): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l: l * 100 };

  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;

  h *= 60;
  if (h < 0) h += 360;

  return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: Hsl): Rgba {
  const hn = (((h % 360) + 360) % 360) / 60;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs((hn % 2) - 1));
  const m = ln - c / 2;

  let rgb: [number, number, number];
  if (hn < 1) rgb = [c, x, 0];
  else if (hn < 2) rgb = [x, c, 0];
  else if (hn < 3) rgb = [0, c, x];
  else if (hn < 4) rgb = [0, x, c];
  else if (hn < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  return {
    r: (rgb[0] + m) * 255,
    g: (rgb[1] + m) * 255,
    b: (rgb[2] + m) * 255,
    a: 1,
  };
}

/** Retunes an accent's lightness, keeping its hue and relative saturation. */
export function withLightness(value: string, lightness: number): string {
  const base = parseColor(value);
  if (!base) return value;
  const { h, s } = rgbToHsl(base);
  return formatColor(hslToRgb({ h, s, l: lightness }));
}

/** Sets a color's alpha, keeping its channels. */
export function withAlpha(value: string, alpha: number): string {
  const base = parseColor(value);
  return base ? formatColor({ ...base, a: alpha }) : value;
}

/** Linear blend of `a` toward `b`; `t` of 0 returns `a`, 1 returns `b`. */
export function mix(a: string, b: string, t: number): string {
  const from = parseColor(a);
  const to = parseColor(b);
  if (!from || !to) return a;
  const ratio = clamp(t, 0, 1);
  return formatColor({
    r: from.r + (to.r - from.r) * ratio,
    g: from.g + (to.g - from.g) * ratio,
    b: from.b + (to.b - from.b) * ratio,
    a: from.a + (to.a - from.a) * ratio,
  });
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance({ r, g, b }: Rgba): number {
  const channel = (raw: number): number => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Composites `fg` over `bg` as channel values. */
function compositeRgb(fg: Rgba, bg: Rgba): Rgba {
  if (fg.a >= 1) return { ...fg, a: 1 };
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  };
}

/** Composites `fg` over `bg`, returning an opaque color. */
export function over(fg: string, bg: string): string {
  const top = parseColor(fg);
  const bottom = parseColor(bg);
  return top && bottom ? formatColor(compositeRgb(top, bottom)) : fg;
}

/**
 * WCAG contrast ratio between two colors, 1–21.
 *
 * `background` is expected to be opaque (flatten a translucent token with
 * `over(token, pageBackground)` first — the caller is the only one that knows
 * what it sits on). A translucent `foreground` is composited onto it here, so
 * a token like `rgba(12,26,51,0.12)` is measured as it actually renders rather
 * than at its raw, far-too-dark channel values.
 */
export function contrastRatio(foreground: string, background: string): number {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  if (!fg || !bg) return 1;

  const l1 = relativeLuminance(compositeRgb(fg, bg));
  const l2 = relativeLuminance({ ...bg, a: 1 });
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Picks the more readable of black/white for a filled surface.
 *
 * Decided by measured contrast rather than a luminance threshold: mid-tone
 * accents such as gold are readable with white on one side of the threshold
 * and black on the other, and only the ratio knows which.
 */
export function readableForeground(fill: string): string {
  const parsed = parseColor(fill);
  if (!parsed) return "#ffffff";
  const white = contrastRatio("#ffffff", fill);
  const black = contrastRatio("#000000", fill);
  return white >= black ? "#ffffff" : "#000000";
}
