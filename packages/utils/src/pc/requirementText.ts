/**
 * Parses Steam's free-form CPU/GPU/RAM/storage requirement strings into
 * comparable values.
 *
 * Strategy: match every catalog entry's regex, keep the most specific match
 * (so "RTX 3060 Ti" never falls back to the plain RTX 3060), group VRAM
 * variants of one model, then take the easiest alternative when Steam writes
 * "GTX 1060 or RX 580". Only when no catalog entry matches do we fall back to
 * a nearest-neighbour estimate, flagged as approximate.
 */
import type { PcCpu, PcGpu, SpecRow } from "@gaming-zone/core";
import {
  PC_CPUS,
  PC_GPUS,
  normalizeHardwareText,
} from "./hardware";

export interface RequirementMatch {
  /** Catalog score of the requirement; compare directly with a part score. */
  score: number;
  /** VRAM stated for the selected alternative, when Steam lists one. */
  vramGb: number | null;
  /** True when the score came from a nearest-neighbour estimate. */
  approximate: boolean;
  /** The raw requirement value, for display. */
  raw: string;
}

type RawMatch<T> = {
  entry: T;
  text: string;
  end: number;
};

const CPU_REGEXES = new Map(PC_CPUS.map((entry) => [entry.id, new RegExp(entry.match, "i")]));
const GPU_REGEXES = new Map(PC_GPUS.map((entry) => [entry.id, new RegExp(entry.match, "i")]));

function collectMatches<T extends PcCpu>(
  text: string,
  catalog: readonly T[],
  regexes: Map<string, RegExp>,
): RawMatch<T>[] {
  const normalized = normalizeHardwareText(text);
  const matches: RawMatch<T>[] = [];

  for (const entry of catalog) {
    const regex = regexes.get(entry.id);
    if (!regex) continue;
    const match = regex.exec(normalized);
    if (!match) continue;
    matches.push({
      entry,
      text: match[0],
      end: match.index + match[0].length,
    });
  }

  // "RTX 3060" is a prefix of "RTX 3060 Ti"; only the longer, more specific
  // match should count.
  return matches.filter(
    (candidate) =>
      !matches.some(
        (other) =>
          other !== candidate &&
          other.text.length > candidate.text.length &&
          other.text.startsWith(candidate.text),
      ),
  );
}

/** VRAM attached to a match, stopping before the next "or"/"and" alternative. */
function vramAfter(text: string, end: number): number | null {
  const tail = text.slice(end, end + 28);
  const beforeNext = tail.split(/\b(?:or|and)\b/)[0] ?? tail;
  const match = /(\d+)\s*gb\b/.exec(beforeNext);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function pickVariant<T extends PcCpu>(
  group: readonly RawMatch<T>[],
  vramGb: number | null,
): RawMatch<T> {
  const withVram = group.filter((m) => (m.entry as PcGpu).vramGb !== undefined);
  if (vramGb !== null && withVram.length > 0) {
    const exact = withVram.find((m) => (m.entry as PcGpu).vramGb === vramGb);
    if (exact) return exact;
    // Closest VRAM variant keeps a wrong "6GB" note from becoming a wild score.
    return withVram.reduce((best, candidate) => {
      const bestDelta = Math.abs(((best.entry as PcGpu).vramGb ?? 0) - vramGb);
      const candidateDelta = Math.abs(((candidate.entry as PcGpu).vramGb ?? 0) - vramGb);
      return candidateDelta < bestDelta ? candidate : best;
    });
  }

  // Steam often omits VRAM ("GTX 1060"). Assume the stronger variant so the
  // requirement is not accidentally made easier than it really is.
  return group.reduce((best, candidate) =>
    candidate.entry.score > best.entry.score ? candidate : best,
  );
}

function matchCatalog<T extends PcCpu>(
  text: string,
  catalog: readonly T[],
  regexes: Map<string, RegExp>,
): RequirementMatch | null {
  const normalized = normalizeHardwareText(text);
  const matches = collectMatches(text, catalog, regexes);
  if (matches.length === 0) return approximateMatch(normalized, catalog);

  const groups = new Map<string, RawMatch<T>[]>();
  for (const match of matches) {
    const key = match.entry.family ?? match.entry.id;
    const group = groups.get(key);
    if (group) group.push(match);
    else groups.set(key, [match]);
  }

  let best: { match: RawMatch<T>; vramGb: number | null } | null = null;
  for (const group of groups.values()) {
    const first = group[0];
    if (!first) continue;
    const vramGb = vramAfter(normalized, first.end);
    const selected = pickVariant(group, vramGb);
    if (!best || selected.entry.score < best.match.entry.score) {
      best = { match: selected, vramGb };
    }
  }

  if (!best) return approximateMatch(normalized, catalog);
  return {
    score: best.match.entry.score,
    vramGb: best.vramGb ?? (best.match.entry as PcGpu).vramGb ?? null,
    approximate: false,
    raw: text,
  };
}

/** Family pool used when a model is not in the catalog (e.g. an OEM-only SKU). */
function fallbackPool<T extends PcCpu>(
  normalized: string,
  catalog: readonly T[],
): T[] {
  const pools: Array<{ test: RegExp; idPart: string }> = [
    { test: /\brtx\b/, idPart: "rtx-" },
    { test: /\bgtx\b/, idPart: "gtx-" },
    { test: /\brx\b/, idPart: "radeon-rx-" },
    { test: /\barc\b/, idPart: "arc-" },
    { test: /\bryzen 3\b/, idPart: "ryzen-3-" },
    { test: /\bryzen 5\b/, idPart: "ryzen-5-" },
    { test: /\bryzen 7\b/, idPart: "ryzen-7-" },
    { test: /\bryzen 9\b/, idPart: "ryzen-9-" },
    { test: /\bi3\b/, idPart: "-i3-" },
    { test: /\bi5\b/, idPart: "-i5-" },
    { test: /\bi7\b/, idPart: "-i7-" },
    { test: /\bi9\b/, idPart: "-i9-" },
  ];

  for (const pool of pools) {
    if (!pool.test.test(normalized)) continue;
    const entries = catalog.filter((entry) => entry.id.includes(pool.idPart));
    if (entries.length > 0) return entries;
  }
  return [];
}

function modelNumber(text: string): number | null {
  const match = /\b(\d{3,5})\b/.exec(text);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function approximateMatch<T extends PcCpu>(
  normalized: string,
  catalog: readonly T[],
): RequirementMatch | null {
  const pool = fallbackPool(normalized, catalog);
  if (pool.length === 0) return null;

  const target = modelNumber(normalized);
  if (target === null) {
    // No model number: fall back to the family's weakest entry so we never
    // overstate what the machine needs.
    const weakest = pool.reduce((best, candidate) =>
      candidate.score < best.score ? candidate : best,
    );
    return {
      score: Math.max(1, weakest.score - 4),
      vramGb: null,
      approximate: true,
      raw: normalized,
    };
  }

  let nearest = pool[0]!;
  let nearestDelta = Number.POSITIVE_INFINITY;
  for (const candidate of pool) {
    const candidateModel = modelNumber(normalizeHardwareText(candidate.label));
    if (candidateModel === null) continue;
    const delta = Math.abs(candidateModel - target);
    if (delta < nearestDelta) {
      nearest = candidate;
      nearestDelta = delta;
    }
  }

  return {
    score: Math.max(1, nearest.score - 4),
    vramGb: /(\d+)\s*gb\b/.exec(normalized)?.[1]
      ? Number(/(\d+)\s*gb\b/.exec(normalized)![1])
      : null,
    approximate: true,
    raw: normalized,
  };
}

/** Resolves the CPU text of one requirement tier. */
export function parseCpuRequirement(text: string | null | undefined): RequirementMatch | null {
  if (!text) return null;
  return matchCatalog(text, PC_CPUS, CPU_REGEXES);
}

/** Resolves the GPU text of one requirement tier. */
export function parseGpuRequirement(text: string | null | undefined): RequirementMatch | null {
  if (!text) return null;
  return matchCatalog(text, PC_GPUS, GPU_REGEXES);
}

const CPU_LABEL = /\b(?:processor|cpu)\b/i;
const GPU_LABEL = /\b(?:graphics|video card|gpu)\b/i;
const RAM_LABEL = /\b(?:memory|ram)\b/i;
const STORAGE_LABEL = /\b(?:storage|hard disk|hard drive|disk space)\b/i;

/** Value of the first row whose label matches, or null. */
export function findSpecValue(rows: readonly SpecRow[], label: RegExp): string | null {
  const row = rows.find((item) => label.test(item.label));
  return row?.value ?? null;
}

/** Reads a RAM value ("8 GB RAM", "16 GB") as whole gigabytes. */
export function parseRamGb(value: string | null | undefined): number | null {
  if (!value) return null;
  const gb = /(\d+(?:\.\d+)?)\s*gb\b/i.exec(value);
  if (gb?.[1]) {
    const amount = Number(gb[1]);
    return Number.isFinite(amount) ? Math.ceil(amount) : null;
  }
  const mb = /(\d+(?:\.\d+)?)\s*mb\b/i.exec(value);
  if (mb?.[1]) {
    const amount = Number(mb[1]);
    return Number.isFinite(amount) ? Math.ceil(amount / 1024) : null;
  }
  return null;
}

/** Reads a storage value ("50 GB available space", "1 TB") as gigabytes. */
export function parseStorageGb(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /(\d+(?:\.\d+)?)\s*(tb|gb|mb)\b/i.exec(value);
  if (!match?.[1] || !match[2]) return null;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;

  switch (match[2].toLowerCase()) {
    case "tb":
      return amount * 1024;
    case "mb":
      return amount / 1024;
    default:
      return amount;
  }
}

export { CPU_LABEL, GPU_LABEL, RAM_LABEL, STORAGE_LABEL };
