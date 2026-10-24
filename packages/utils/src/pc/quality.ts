/**
 * PC-vs-Steam-requirements estimator.
 *
 * The output is a relative estimate at 1080p, not a benchmark. Every comparison
 * is per-component (CPU score vs CPU requirement, GPU vs GPU) so the CPU and
 * GPU indexes never get mixed into a meaningless ratio.
 */
import type {
  PcCompatibility,
  PcPartKey,
  PcPartVerdict,
  PcQuality,
  PcRequirements,
  PcSpecs,
  SpecRow,
} from "@gaming-zone/core";
import { findCpuById, findGpuById, isValidPcHardware } from "./hardware";
import {
  CPU_LABEL,
  GPU_LABEL,
  RAM_LABEL,
  STORAGE_LABEL,
  findSpecValue,
  parseCpuRequirement,
  parseGpuRequirement,
  parseRamGb,
  parseStorageGb,
  type RequirementMatch,
} from "./requirementText";

export const PC_QUALITY_RANK: Record<PcQuality, number> = {
  unsupported: 0,
  low: 1,
  medium: 2,
  high: 3,
  ultra: 4,
};

export function capPcQuality(quality: PcQuality, maximum: PcQuality): PcQuality {
  return PC_QUALITY_RANK[quality] > PC_QUALITY_RANK[maximum] ? maximum : quality;
}

type RequirementTier = {
  cpu: RequirementMatch | null;
  gpu: RequirementMatch | null;
  ramGb: number | null;
  storageGb: number | null;
  cpuRaw: string | null;
  gpuRaw: string | null;
  ramRaw: string | null;
  storageRaw: string | null;
};

function parseTier(rows: readonly SpecRow[]): RequirementTier {
  const cpuRaw = findSpecValue(rows, CPU_LABEL);
  const gpuRaw = findSpecValue(rows, GPU_LABEL);
  const ramRaw = findSpecValue(rows, RAM_LABEL);
  const storageRaw = findSpecValue(rows, STORAGE_LABEL);

  return {
    cpu: parseCpuRequirement(cpuRaw),
    gpu: parseGpuRequirement(gpuRaw),
    ramGb: parseRamGb(ramRaw),
    storageGb: parseStorageGb(storageRaw),
    cpuRaw,
    gpuRaw,
    ramRaw,
    storageRaw,
  };
}

function verdict(
  required: string | null,
  actual: string,
  minValue: number | null,
  maxValue: number | null,
  userValue: number | null,
): PcPartVerdict {
  if (required === null) {
    return { required: null, actual, status: "unknown" };
  }
  if (userValue === null || (minValue === null && maxValue === null)) {
    return { required, actual, status: "unknown" };
  }
  if (minValue !== null && userValue < minValue) {
    return { required, actual, status: "below" };
  }
  return { required, actual, status: "meets" };
}

function lowestRatio(
  pairs: ReadonlyArray<{ part: PcPartKey; ratio: number }>,
): { part: PcPartKey; ratio: number } | null {
  let worst: { part: PcPartKey; ratio: number } | null = null;
  for (const pair of pairs) {
    if (!worst || pair.ratio < worst.ratio) worst = pair;
  }
  return worst;
}

/**
 * Estimates how well `specs` runs a game with the given Steam requirements.
 *
 * Returns null when there is nothing comparable (no requirements, or no CPU /
 * GPU requirement we could resolve). Missing requirement rows never fail a
 * game — they are reported as "unknown" and skipped.
 */
export function estimatePcCompatibility(
  specs: PcSpecs,
  requirements: PcRequirements | null | undefined,
): PcCompatibility | null {
  if (!requirements) return null;
  if (!isValidPcHardware(specs.cpuId, specs.gpuId)) return null;

  const cpu = findCpuById(specs.cpuId);
  const gpu = findGpuById(specs.gpuId);
  if (!cpu && !gpu) return null;

  const minimum = parseTier(requirements.minimum);
  const recommended = parseTier(requirements.recommended);

  const userRam = Number.isFinite(specs.ramGb) && specs.ramGb > 0 ? specs.ramGb : null;
  const freeStorage =
    Number.isFinite(specs.freeStorageGb) && specs.freeStorageGb >= 0
      ? specs.freeStorageGb
      : null;

  const minPairs: Array<{ part: PcPartKey; ratio: number }> = [];
  const recPairs: Array<{ part: PcPartKey; ratio: number }> = [];

  if (cpu && minimum.cpu && minimum.cpu.score > 0) {
    minPairs.push({ part: "cpu", ratio: cpu.score / minimum.cpu.score });
  }
  if (gpu && minimum.gpu && minimum.gpu.score > 0) {
    minPairs.push({ part: "gpu", ratio: gpu.score / minimum.gpu.score });
  }
  if (cpu && recommended.cpu && recommended.cpu.score > 0) {
    recPairs.push({ part: "cpu", ratio: cpu.score / recommended.cpu.score });
  }
  if (gpu && recommended.gpu && recommended.gpu.score > 0) {
    recPairs.push({ part: "gpu", ratio: gpu.score / recommended.gpu.score });
  }
  if (userRam !== null && minimum.ramGb && minimum.ramGb > 0) {
    minPairs.push({ part: "ram", ratio: userRam / minimum.ramGb });
  }
  if (userRam !== null && recommended.ramGb && recommended.ramGb > 0) {
    recPairs.push({ part: "ram", ratio: userRam / recommended.ramGb });
  }

  if (minPairs.length === 0 && recPairs.length === 0) return null;

  const worstMinimum = lowestRatio(minPairs);
  const worstRecommended = lowestRatio(recPairs);

  const vramBelowMinimum =
    gpu?.vramGb !== undefined &&
    minimum.gpu?.vramGb !== null &&
    minimum.gpu?.vramGb !== undefined &&
    gpu.vramGb < minimum.gpu.vramGb;

  const vramBelowRecommended =
    gpu?.vramGb !== undefined &&
    recommended.gpu?.vramGb !== null &&
    recommended.gpu?.vramGb !== undefined &&
    gpu.vramGb < recommended.gpu.vramGb;

  const hasUltraRam =
    recommended.ramGb === null ||
    (userRam !== null && userRam >= Math.max(recommended.ramGb + 8, 16));

  let quality: PcQuality;

  if (
    (worstMinimum !== null && worstMinimum.ratio < 1) ||
    vramBelowMinimum ||
    (userRam !== null && minimum.ramGb !== null && userRam < minimum.ramGb)
  ) {
    quality = "unsupported";
  } else if (worstRecommended !== null) {
    if (worstRecommended.ratio >= 1.4 && hasUltraRam && !vramBelowRecommended) {
      quality = "ultra";
    } else if (worstRecommended.ratio >= 1) {
      quality = "high";
    } else if (
      worstRecommended.ratio >= 0.75 ||
      (worstMinimum !== null && worstMinimum.ratio >= 1.4)
    ) {
      quality = "medium";
    } else {
      quality = "low";
    }

    // RAM (and VRAM) below the recommended amount is a hard ceiling: the game
    // runs, but high/ultra is not a credible claim.
    if (userRam !== null && recommended.ramGb !== null && userRam < recommended.ramGb) {
      quality = capPcQuality(quality, "medium");
    }
    if (vramBelowRecommended) quality = capPcQuality(quality, "medium");
  } else if (worstMinimum !== null) {
    quality =
      worstMinimum.ratio >= 1.8 ? "high" : worstMinimum.ratio >= 1.25 ? "medium" : "low";
  } else {
    quality = "low";
  }

  const ramVerdict = verdict(
    minimum.ramRaw ?? recommended.ramRaw,
    userRam !== null ? `${userRam} GB` : "Not set",
    minimum.ramGb,
    recommended.ramGb,
    userRam,
  );

  const storageStatus: PcPartVerdict["status"] =
    freeStorage === null || minimum.storageGb === null
      ? "unknown"
      : freeStorage < minimum.storageGb
        ? "below"
        : "meets";

  const parts: Record<PcPartKey, PcPartVerdict> = {
    cpu: verdict(
      minimum.cpuRaw ?? recommended.cpuRaw,
      cpu?.label ?? "Unknown CPU",
      minimum.cpu?.score ?? null,
      recommended.cpu?.score ?? null,
      cpu?.score ?? null,
    ),
    gpu: verdict(
      minimum.gpuRaw ?? recommended.gpuRaw,
      gpu?.label ?? "Unknown GPU",
      minimum.gpu?.score ?? null,
      recommended.gpu?.score ?? null,
      gpu?.score ?? null,
    ),
    ram: ramVerdict,
    storage: {
      required: minimum.storageRaw ?? recommended.storageRaw,
      actual: freeStorage !== null ? `${freeStorage} GB free` : "Not set",
      status: storageStatus,
    },
  };

  const qualityPairs: Array<{ part: PcPartKey; ratio: number }> = [...minPairs];
  const bottleneck = lowestRatio(qualityPairs.filter((pair) => pair.part !== "storage"));

  return {
    quality,
    parts,
    bottleneck:
      bottleneck && bottleneck.ratio < 1.4 ? bottleneck.part : null,
    approximate:
      minimum.cpu?.approximate === true ||
      minimum.gpu?.approximate === true ||
      recommended.cpu?.approximate === true ||
      recommended.gpu?.approximate === true,
  };
}

/** Narrows an arbitrary Firestore/MMKV value to a usable `PcSpecs`. */
export function isValidPcSpecs(value: unknown): value is PcSpecs {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PcSpecs>;

  return (
    typeof candidate.cpuId === "string" &&
    typeof candidate.gpuId === "string" &&
    isValidPcHardware(candidate.cpuId, candidate.gpuId) &&
    typeof candidate.ramGb === "number" &&
    Number.isFinite(candidate.ramGb) &&
    candidate.ramGb >= 1 &&
    candidate.ramGb <= 1024 &&
    typeof candidate.freeStorageGb === "number" &&
    Number.isFinite(candidate.freeStorageGb) &&
    candidate.freeStorageGb >= 0 &&
    candidate.freeStorageGb <= 100_000 &&
    typeof candidate.updatedAt === "number" &&
    Number.isFinite(candidate.updatedAt)
  );
}
