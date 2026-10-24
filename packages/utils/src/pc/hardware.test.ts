import { describe, expect, it } from "vitest";
import { PC_CPUS, PC_GPUS, estimatePcScore, pcTierForScore } from "./hardware";

describe("estimatePcScore", () => {
  it("blends GPU (0.65) and CPU (0.35) and rounds", () => {
    const summary = estimatePcScore({
      cpuId: "intel-core-i5-12400", // 46
      gpuId: "nvidia-geforce-rtx-3060-12gb", // 40
      ramGb: 16,
      freeStorageGb: 200,
      updatedAt: 1,
    });
    expect(summary).toEqual({ score: Math.round(40 * 0.65 + 46 * 0.35), tier: "mainstream" });
  });

  it("maps the pinned tier cutoffs", () => {
    expect(pcTierForScore(0)).toBe("entry");
    expect(pcTierForScore(24)).toBe("entry");
    expect(pcTierForScore(25)).toBe("mainstream");
    expect(pcTierForScore(49)).toBe("mainstream");
    expect(pcTierForScore(50)).toBe("performance");
    expect(pcTierForScore(74)).toBe("performance");
    expect(pcTierForScore(75)).toBe("enthusiast");
    expect(pcTierForScore(100)).toBe("enthusiast");
  });

  it("returns null when either part is missing from the catalog", () => {
    const base = { ramGb: 16, freeStorageGb: 200, updatedAt: 1 };
    expect(estimatePcScore({ ...base, cpuId: "nope", gpuId: "nvidia-geforce-rtx-4090" })).toBeNull();
    expect(estimatePcScore({ ...base, cpuId: "intel-core-i5-12400", gpuId: "nope" })).toBeNull();
  });

  it("caps at the catalog ceiling", () => {
    const summary = estimatePcScore({
      cpuId: "amd-ryzen-9-9950x", // 72
      gpuId: "nvidia-geforce-rtx-5090", // 100
      ramGb: 64,
      freeStorageGb: 2000,
      updatedAt: 1,
    });
    expect(summary?.score).toBe(Math.round(100 * 0.65 + 72 * 0.35));
    expect(summary?.score).toBeLessThanOrEqual(100);
    expect(summary?.tier).toBe("enthusiast");
  });
});

describe("catalog integrity", () => {
  it("never has two entries whose regexes make identical full-text claims", () => {
    // Two entries sharing one regex source is fine only when a family/VRAM
    // disambiguates them (e.g. GTX 1060 3GB/6GB); a shared regex without a
    // shared family would make parser output ordering-dependent. CPUs and
    // GPUs are checked separately: iGPU models intentionally appear in both
    // lists (as CPU-integrated and standalone GPU entries).
    for (const catalog of [PC_CPUS, PC_GPUS]) {
      const byRegex = new Map<string, string[]>();
      for (const entry of catalog) {
        const list = byRegex.get(entry.match) ?? [];
        list.push(entry.id);
        byRegex.set(entry.match, list);
      }
      for (const [source, ids] of byRegex) {
        if (ids.length < 2) continue;
        const entries = ids.map((id) => catalog.find((entry) => entry.id === id)!);
        const families = new Set(entries.map((entry) => entry.family ?? entry.id));
        // All share one family (VRAM variants) — acceptable.
        expect(families.size, `regex ${source} claimed by ${ids.join(", ")}`).toBe(1);
      }
    }
  });

  it("keeps laptop dGPUs below their desktop counterparts", () => {
    for (const gpu of PC_GPUS.filter((entry) => entry.id.endsWith("-laptop"))) {
      const desktopBase = gpu.id.replace(/-laptop$/, "");
      const desktop = PC_GPUS.find(
        (entry) =>
          entry.id !== gpu.id &&
          (entry.id === desktopBase || entry.id.startsWith(`${desktopBase}-`)),
      );
      if (!desktop) continue;
      expect(gpu.score, gpu.id).toBeLessThan(desktop.score);
    }
  });

  it("scores new entries within the existing generation ordering", () => {
    expect(PC_GPUS.find((g) => g.id === "nvidia-geforce-rtx-5060-ti-16gb")?.score).toBeGreaterThan(
      PC_GPUS.find((g) => g.id === "nvidia-geforce-rtx-4060")!.score,
    );
    expect(PC_CPUS.find((c) => c.id === "amd-ryzen-9-9950x")?.score).toBeGreaterThan(
      PC_CPUS.find((c) => c.id === "amd-ryzen-9-7950x")!.score,
    );
  });
});
