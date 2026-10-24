import { describe, expect, it } from "vitest";
import type { PcRequirements, PcSpecs, SpecRow } from "@gaming-zone/core";
import { PC_CPUS, PC_GPUS, findCpuById, findGpuById, searchHardware } from "./hardware";
import {
  parseCpuRequirement,
  parseGpuRequirement,
  parseRamGb,
  parseStorageGb,
} from "./requirementText";
import { estimatePcCompatibility, isValidPcSpecs } from "./quality";

const specs = (
  cpuId: string,
  gpuId: string,
  ramGb = 16,
  freeStorageGb = 200,
): PcSpecs => ({ cpuId, gpuId, ramGb, freeStorageGb, updatedAt: 1 });

const rows = (
  cpu: string,
  gpu: string,
  ram: string,
  storage: string,
): SpecRow[] => [
  { label: "Processor", value: cpu },
  { label: "Graphics", value: gpu },
  { label: "Memory", value: ram },
  { label: "Storage", value: storage },
];

const requirements = (
  minimum: SpecRow[],
  recommended: SpecRow[] = [],
): PcRequirements => ({ minimum, recommended });

describe("hardware catalog", () => {
  it("has unique, well-formed entries", () => {
    const ids = new Set<string>();
    for (const entry of [...PC_CPUS, ...PC_GPUS]) {
      expect(ids.has(entry.id)).toBe(false);
      ids.add(entry.id);
      expect(entry.score).toBeGreaterThanOrEqual(0);
      expect(entry.score).toBeLessThanOrEqual(100);
      expect(() => new RegExp(entry.match, "i")).not.toThrow();
    }
  });

  it("gives VRAM variants a shared family", () => {
    for (const gpu of PC_GPUS) {
      if (gpu.vramGb !== undefined) {
        expect(gpu.family).toBeTruthy();
      }
    }
  });

  it("searches across spacing and vendor prefixes", () => {
    expect(searchHardware(PC_GPUS, "rtx3060").map((gpu) => gpu.id)).toContain(
      "nvidia-geforce-rtx-3060-12gb",
    );
    expect(searchHardware(PC_CPUS, "ryzen 5 5600").map((cpu) => cpu.id)).toEqual([
      "amd-ryzen-5-5600",
    ]);
    expect(searchHardware(PC_CPUS, "")).toHaveLength(PC_CPUS.length);
  });

  it("resolves ids", () => {
    expect(findCpuById("intel-core-i5-12400")?.score).toBe(46);
    expect(findGpuById("nvidia-geforce-rtx-3060-12gb")?.vramGb).toBe(12);
    expect(findCpuById("nope")).toBeUndefined();
  });
});

describe("requirement parsing", () => {
  it("takes the easiest CPU alternative", () => {
    const match = parseCpuRequirement("Intel Core i5-8400 / AMD Ryzen 5 1600");
    expect(match?.score).toBe(22);
    expect(match?.approximate).toBe(false);
  });

  it("takes the easiest GPU alternative and its VRAM", () => {
    const match = parseGpuRequirement("NVIDIA GTX 1060 6GB or AMD RX 580 8GB");
    expect(match?.score).toBe(17);
    expect(match?.vramGb).toBe(8);
  });

  it("prefers the most specific model", () => {
    expect(parseGpuRequirement("NVIDIA GeForce RTX 3060 Ti")?.score).toBe(46);
    expect(parseGpuRequirement("NVIDIA GeForce RTX 3060")?.score).toBe(40);
    expect(parseGpuRequirement("GTX 1660 SUPER")?.score).toBe(28);
    expect(parseCpuRequirement("AMD Ryzen 5 5600X")?.score).toBe(46);
  });

  it("infers an approximate score for uncatalogued models", () => {
    const match = parseCpuRequirement("Intel Core i5-7600K");
    expect(match?.approximate).toBe(true);
    expect(match?.score).toBeGreaterThan(0);
    expect(match?.score).toBeLessThan(17);
  });

  it("returns null when no family is recognizable", () => {
    expect(parseCpuRequirement("Requires a 64-bit processor")).toBeNull();
    expect(parseGpuRequirement("DirectX 11 compatible")).toBeNull();
    expect(parseCpuRequirement(null)).toBeNull();
  });

  it("reads RAM and storage values", () => {
    expect(parseRamGb("8 GB RAM")).toBe(8);
    expect(parseRamGb("16 GB")).toBe(16);
    expect(parseRamGb("512 MB")).toBe(1);
    expect(parseRamGb("n/a")).toBeNull();
    expect(parseStorageGb("50 GB available space")).toBe(50);
    expect(parseStorageGb("1 TB available space")).toBe(1024);
    expect(parseStorageGb("")).toBeNull();
  });
});

describe("estimatePcCompatibility", () => {
  const modernMinimum = rows(
    "Intel Core i5-8400",
    "NVIDIA GTX 1060 6GB",
    "8 GB RAM",
    "50 GB available space",
  );
  const modernRecommended = rows(
    "Intel Core i5-12400",
    "NVIDIA RTX 3060",
    "16 GB RAM",
    "50 GB available space",
  );

  it("returns null when requirements are unavailable", () => {
    expect(
      estimatePcCompatibility(specs("amd-ryzen-5-5600", "nvidia-geforce-rtx-3060-12gb"), null),
    ).toBeNull();
  });

  it("returns null when nothing can be compared", () => {
    const impossible = requirements(
      rows("Requires a 64-bit processor", "DirectX 11 compatible", "", ""),
    );
    expect(
      estimatePcCompatibility(specs("amd-ryzen-5-5600", "nvidia-geforce-rtx-3060-12gb"), impossible),
    ).toBeNull();
  });

  it("marks a PC below the minimum as unsupported", () => {
    const result = estimatePcCompatibility(
      specs("intel-core-i5-4460", "nvidia-geforce-gtx-1050"),
      requirements(modernMinimum, modernRecommended),
    );
    expect(result?.quality).toBe("unsupported");
    expect(result?.parts.gpu.status).toBe("below");
  });

  it("reports high when the PC meets the recommended tier", () => {
    const result = estimatePcCompatibility(
      specs("intel-core-i5-12400", "nvidia-geforce-rtx-3060-12gb", 16),
      requirements(modernMinimum, modernRecommended),
    );
    expect(result?.quality).toBe("high");
  });

  it("reports ultra only with headroom on every part", () => {
    const result = estimatePcCompatibility(
      specs("amd-ryzen-7-7800x3d", "nvidia-geforce-rtx-4090", 32),
      requirements(modernMinimum, modernRecommended),
    );
    expect(result?.quality).toBe("ultra");

    const onlyGpu = estimatePcCompatibility(
      specs("intel-core-i5-12400", "nvidia-geforce-rtx-4090", 16),
      requirements(modernMinimum, modernRecommended),
    );
    expect(onlyGpu?.quality).toBe("high");
  });

  it("caps the result when RAM is below recommended", () => {
    const result = estimatePcCompatibility(
      specs("intel-core-i5-13600k", "nvidia-geforce-rtx-4090", 16),
      requirements(
        rows("Intel Core i5-8400", "GTX 1060 6GB", "8 GB RAM", "50 GB"),
        rows("Intel Core i5-12400", "RTX 3060", "32 GB RAM", "50 GB"),
      ),
    );
    expect(result?.quality).toBe("medium");
    expect(result?.parts.ram.status).toBe("meets");
  });

  it("fails a VRAM shortage even when the score passes", () => {
    const result = estimatePcCompatibility(
      specs("intel-core-i5-12400", "nvidia-geforce-rtx-3060-8gb", 16),
      requirements(
        rows("Intel Core i5-8400", "RTX 3060 12GB", "8 GB RAM", "50 GB"),
        rows("Intel Core i5-12400", "RTX 3060 12GB", "16 GB RAM", "50 GB"),
      ),
    );
    expect(result?.quality).toBe("unsupported");
  });

  it("keeps the quality and flags storage separately", () => {
    const result = estimatePcCompatibility(
      specs("intel-core-i5-12400", "nvidia-geforce-rtx-3060-12gb", 16, 10),
      requirements(modernMinimum, modernRecommended),
    );
    expect(result?.quality).toBe("high");
    expect(result?.parts.storage.status).toBe("below");
    expect(result?.parts.storage.required).toBe("50 GB available space");
  });

  it("handles minimum-only titles", () => {
    const result = estimatePcCompatibility(
      specs("intel-core-i5-12400", "nvidia-geforce-rtx-3060-12gb", 16),
      requirements(modernMinimum),
    );
    expect(result?.quality).toBe("medium");
  });

  it("marks inferred requirements as approximate", () => {
    const result = estimatePcCompatibility(
      specs("intel-core-i5-12400", "nvidia-geforce-rtx-3060-12gb", 16),
      requirements(rows("Intel Core i5-7600K", "GTX 1070 Ti", "8 GB RAM", "50 GB")),
    );
    expect(result?.approximate).toBe(true);
  });

  it("validates persisted specs", () => {
    expect(isValidPcSpecs(specs("amd-ryzen-5-5600", "nvidia-geforce-rtx-3060-12gb"))).toBe(
      true,
    );
    expect(isValidPcSpecs({})).toBe(false);
    expect(
      isValidPcSpecs(specs("amd-ryzen-5-5600", "nvidia-geforce-rtx-3060-12gb", -1)),
    ).toBe(false);
    expect(isValidPcSpecs(specs("missing", "nvidia-geforce-rtx-3060-12gb"))).toBe(false);
  });
});
