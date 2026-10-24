/**
 * Curated PC hardware catalog.
 *
 * `score` is a relative 0–100 "1080p capability" index, calibrated so that a
 * roughly equivalent CPU and GPU land on the same number. It is intentionally
 * approximate: the goal is a stable ordering for comparing a machine against
 * Steam's minimum/recommended text, not a benchmark and certainly not an FPS
 * prediction.
 *
 * Adding a part:
 *   1. pick a stable `id` (never reuse or rename one — it is persisted in
 *      Firestore and MMKV);
 *   2. give it a score by comparing with the nearest entries around it;
 *   3. write a `match` regex source for Steam's requirement text. Keep it
 *      anchored with word boundaries so "RX 580" cannot match "RX 5800";
 *   4. variants of one model that Steam distinguishes by VRAM (GTX 1060 3GB /
 *      6GB) share a `family` so the requirement parser can pick the right one.
 */
import type { PcCpu, PcGpu } from "@gaming-zone/core";

export const PC_CPUS: readonly PcCpu[] = [
  // Intel — Core i3
  { id: "intel-core-i3-6100", label: "Intel Core i3-6100", score: 12, match: "\\bi3[- ]?6100\\b" },
  { id: "intel-core-i3-8100", label: "Intel Core i3-8100", score: 20, match: "\\bi3[- ]?8100\\b" },
  { id: "intel-core-i3-10100", label: "Intel Core i3-10100", score: 28, match: "\\bi3[- ]?10100f?\\b" },
  { id: "intel-core-i3-12100", label: "Intel Core i3-12100", score: 38, match: "\\bi3[- ]?12100f?\\b" },
  { id: "intel-core-i3-13100", label: "Intel Core i3-13100", score: 40, match: "\\bi3[- ]?13100f?\\b" },

  // Intel — Core i5
  { id: "intel-core-i5-4460", label: "Intel Core i5-4460", score: 10, match: "\\bi5[- ]?4460\\b" },
  { id: "intel-core-i5-6400", label: "Intel Core i5-6400", score: 13, match: "\\bi5[- ]?6400\\b" },
  { id: "intel-core-i5-7400", label: "Intel Core i5-7400", score: 16, match: "\\bi5[- ]?7400\\b" },
  { id: "intel-core-i5-7500", label: "Intel Core i5-7500", score: 17, match: "\\bi5[- ]?7500\\b" },
  { id: "intel-core-i5-8400", label: "Intel Core i5-8400", score: 26, match: "\\bi5[- ]?8400\\b" },
  { id: "intel-core-i5-9400f", label: "Intel Core i5-9400F", score: 29, match: "\\bi5[- ]?9400f?\\b" },
  { id: "intel-core-i5-10400", label: "Intel Core i5-10400", score: 34, match: "\\bi5[- ]?10400f?\\b" },
  { id: "intel-core-i5-11400", label: "Intel Core i5-11400", score: 39, match: "\\bi5[- ]?11400f?\\b" },
  { id: "intel-core-i5-12400", label: "Intel Core i5-12400", score: 46, match: "\\bi5[- ]?12400f?\\b" },
  { id: "intel-core-i5-13400", label: "Intel Core i5-13400", score: 50, match: "\\bi5[- ]?13400f?\\b" },
  { id: "intel-core-i5-13600k", label: "Intel Core i5-13600K", score: 60, match: "\\bi5[- ]?13600kf?\\b" },
  { id: "intel-core-i5-14400", label: "Intel Core i5-14400", score: 52, match: "\\bi5[- ]?14400f?\\b" },

  // Intel — Core i7
  { id: "intel-core-i7-4790k", label: "Intel Core i7-4790K", score: 15, match: "\\bi7[- ]?4790k?\\b" },
  { id: "intel-core-i7-6700k", label: "Intel Core i7-6700K", score: 20, match: "\\bi7[- ]?6700k?\\b" },
  { id: "intel-core-i7-7700k", label: "Intel Core i7-7700K", score: 23, match: "\\bi7[- ]?7700k?\\b" },
  { id: "intel-core-i7-8700k", label: "Intel Core i7-8700K", score: 30, match: "\\bi7[- ]?8700k?\\b" },
  { id: "intel-core-i7-9700k", label: "Intel Core i7-9700K", score: 34, match: "\\bi7[- ]?9700k?\\b" },
  { id: "intel-core-i7-10700k", label: "Intel Core i7-10700K", score: 40, match: "\\bi7[- ]?10700k?\\b" },
  { id: "intel-core-i7-11700k", label: "Intel Core i7-11700K", score: 44, match: "\\bi7[- ]?11700k?\\b" },
  { id: "intel-core-i7-12700k", label: "Intel Core i7-12700K", score: 53, match: "\\bi7[- ]?12700k?\\b" },
  { id: "intel-core-i7-13700k", label: "Intel Core i7-13700K", score: 62, match: "\\bi7[- ]?13700k?\\b" },
  { id: "intel-core-i7-14700k", label: "Intel Core i7-14700K", score: 66, match: "\\bi7[- ]?14700k?\\b" },

  // Intel — Core i9
  { id: "intel-core-i9-9900k", label: "Intel Core i9-9900K", score: 38, match: "\\bi9[- ]?9900k?\\b" },
  { id: "intel-core-i9-10900k", label: "Intel Core i9-10900K", score: 44, match: "\\bi9[- ]?10900k?\\b" },
  { id: "intel-core-i9-11900k", label: "Intel Core i9-11900K", score: 48, match: "\\bi9[- ]?11900k?\\b" },
  { id: "intel-core-i9-12900k", label: "Intel Core i9-12900K", score: 58, match: "\\bi9[- ]?12900k?\\b" },
  { id: "intel-core-i9-13900k", label: "Intel Core i9-13900K", score: 68, match: "\\bi9[- ]?13900k?\\b" },
  { id: "intel-core-i9-14900k", label: "Intel Core i9-14900K", score: 70, match: "\\bi9[- ]?14900k?\\b" },

  // AMD — Ryzen 3
  { id: "amd-ryzen-3-1200", label: "AMD Ryzen 3 1200", score: 14, match: "\\bryzen 3 1200\\b" },
  { id: "amd-ryzen-3-2200g", label: "AMD Ryzen 3 2200G", score: 16, match: "\\bryzen 3 2200g\\b" },
  { id: "amd-ryzen-3-3200g", label: "AMD Ryzen 3 3200G", score: 20, match: "\\bryzen 3 3200g\\b" },
  { id: "amd-ryzen-3-3300x", label: "AMD Ryzen 3 3300X", score: 26, match: "\\bryzen 3 3300x\\b" },

  // AMD — Ryzen 5
  { id: "amd-ryzen-5-1600", label: "AMD Ryzen 5 1600", score: 22, match: "\\bryzen 5 1600(?:x|af)?\\b" },
  { id: "amd-ryzen-5-2600", label: "AMD Ryzen 5 2600", score: 26, match: "\\bryzen 5 2600(?:x)?\\b" },
  { id: "amd-ryzen-5-3600", label: "AMD Ryzen 5 3600", score: 34, match: "\\bryzen 5 3600(?:x|xt)?\\b" },
  { id: "amd-ryzen-5-5500", label: "AMD Ryzen 5 5500", score: 42, match: "\\bryzen 5 5500\\b" },
  { id: "amd-ryzen-5-5600", label: "AMD Ryzen 5 5600", score: 46, match: "\\bryzen 5 5600(?:x)?\\b" },
  { id: "amd-ryzen-5-7600", label: "AMD Ryzen 5 7600", score: 54, match: "\\bryzen 5 7600(?:x)?\\b" },

  // AMD — Ryzen 7
  { id: "amd-ryzen-7-1700", label: "AMD Ryzen 7 1700", score: 23, match: "\\bryzen 7 1700(?:x)?\\b" },
  { id: "amd-ryzen-7-2700", label: "AMD Ryzen 7 2700", score: 27, match: "\\bryzen 7 2700(?:x)?\\b" },
  { id: "amd-ryzen-7-3700x", label: "AMD Ryzen 7 3700X", score: 38, match: "\\bryzen 7 3700x\\b" },
  { id: "amd-ryzen-7-5700x", label: "AMD Ryzen 7 5700X", score: 46, match: "\\bryzen 7 5700x\\b" },
  { id: "amd-ryzen-7-5800x", label: "AMD Ryzen 7 5800X", score: 49, match: "\\bryzen 7 5800x\\b" },
  { id: "amd-ryzen-7-5800x3d", label: "AMD Ryzen 7 5800X3D", score: 58, match: "\\bryzen 7 5800x3d\\b" },
  { id: "amd-ryzen-7-7700x", label: "AMD Ryzen 7 7700X", score: 58, match: "\\bryzen 7 7700x\\b" },
  { id: "amd-ryzen-7-7800x3d", label: "AMD Ryzen 7 7800X3D", score: 68, match: "\\bryzen 7 7800x3d\\b" },
  { id: "amd-ryzen-7-9700x", label: "AMD Ryzen 7 9700X", score: 64, match: "\\bryzen 7 9700x\\b" },

  // AMD — Ryzen 9
  { id: "amd-ryzen-9-3900x", label: "AMD Ryzen 9 3900X", score: 42, match: "\\bryzen 9 3900x\\b" },
  { id: "amd-ryzen-9-5900x", label: "AMD Ryzen 9 5900X", score: 52, match: "\\bryzen 9 5900x\\b" },
  { id: "amd-ryzen-9-5950x", label: "AMD Ryzen 9 5950X", score: 56, match: "\\bryzen 9 5950x\\b" },
  { id: "amd-ryzen-9-7900x", label: "AMD Ryzen 9 7900X", score: 64, match: "\\bryzen 9 7900x\\b" },
  { id: "amd-ryzen-9-7950x", label: "AMD Ryzen 9 7950X", score: 70, match: "\\bryzen 9 7950x\\b" },

  // Low-power / integrated CPU entries (common in laptops)
  { id: "intel-uhd-620", label: "Intel UHD Graphics 620 (laptop)", score: 2, match: "\\buhd graphics 620\\b" },
  { id: "intel-iris-xe", label: "Intel Iris Xe Graphics", score: 6, match: "\\biris xe\\b" },
  { id: "amd-radeon-vega-8", label: "AMD Radeon Vega 8", score: 4, match: "\\bvega 8\\b" },
  { id: "amd-radeon-680m", label: "AMD Radeon 680M", score: 10, match: "\\bradeon 680m\\b" },
  { id: "amd-radeon-780m", label: "AMD Radeon 780M", score: 12, match: "\\bradeon 780m\\b" },
];

export const PC_GPUS: readonly PcGpu[] = [
  // NVIDIA — GTX 700/900
  { id: "nvidia-geforce-gt-730", label: "NVIDIA GeForce GT 730", score: 1, match: "\\bgt 730\\b" },
  { id: "nvidia-geforce-gtx-750-ti", label: "NVIDIA GeForce GTX 750 Ti", score: 6, match: "\\bgtx 750 ti\\b" },
  { id: "nvidia-geforce-gtx-950", label: "NVIDIA GeForce GTX 950", score: 8, match: "\\bgtx 950\\b" },
  { id: "nvidia-geforce-gtx-960", label: "NVIDIA GeForce GTX 960", score: 10, match: "\\bgtx 960\\b" },
  { id: "nvidia-geforce-gtx-970", label: "NVIDIA GeForce GTX 970", score: 14, match: "\\bgtx 970\\b" },
  { id: "nvidia-geforce-gtx-980", label: "NVIDIA GeForce GTX 980", score: 17, match: "\\bgtx 980\\b" },
  { id: "nvidia-geforce-gtx-980-ti", label: "NVIDIA GeForce GTX 980 Ti", score: 19, match: "\\bgtx 980 ti\\b" },

  // NVIDIA — GTX 10 series
  { id: "nvidia-geforce-gtx-1050", label: "NVIDIA GeForce GTX 1050", score: 10, match: "\\bgtx 1050\\b" },
  { id: "nvidia-geforce-gtx-1050-ti", label: "NVIDIA GeForce GTX 1050 Ti", score: 13, match: "\\bgtx 1050 ti\\b" },
  {
    id: "nvidia-geforce-gtx-1060-3gb",
    label: "NVIDIA GeForce GTX 1060 3GB",
    score: 18,
    match: "\\bgtx 1060\\b",
    family: "gtx-1060",
    vramGb: 3,
  },
  {
    id: "nvidia-geforce-gtx-1060-6gb",
    label: "NVIDIA GeForce GTX 1060 6GB",
    score: 21,
    match: "\\bgtx 1060\\b",
    family: "gtx-1060",
    vramGb: 6,
  },
  { id: "nvidia-geforce-gtx-1070", label: "NVIDIA GeForce GTX 1070", score: 25, match: "\\bgtx 1070\\b" },
  { id: "nvidia-geforce-gtx-1070-ti", label: "NVIDIA GeForce GTX 1070 Ti", score: 27, match: "\\bgtx 1070 ti\\b" },
  { id: "nvidia-geforce-gtx-1080", label: "NVIDIA GeForce GTX 1080", score: 30, match: "\\bgtx 1080\\b" },
  { id: "nvidia-geforce-gtx-1080-ti", label: "NVIDIA GeForce GTX 1080 Ti", score: 34, match: "\\bgtx 1080 ti\\b" },

  // NVIDIA — GTX 16 series
  { id: "nvidia-geforce-gtx-1650", label: "NVIDIA GeForce GTX 1650", score: 19, match: "\\bgtx 1650\\b" },
  { id: "nvidia-geforce-gtx-1650-super", label: "NVIDIA GeForce GTX 1650 SUPER", score: 22, match: "\\bgtx 1650 super\\b" },
  { id: "nvidia-geforce-gtx-1660", label: "NVIDIA GeForce GTX 1660", score: 25, match: "\\bgtx 1660\\b" },
  { id: "nvidia-geforce-gtx-1660-super", label: "NVIDIA GeForce GTX 1660 SUPER", score: 28, match: "\\bgtx 1660 (?:super|ti)\\b" },

  // NVIDIA — RTX 20 series
  { id: "nvidia-geforce-rtx-2060", label: "NVIDIA GeForce RTX 2060", score: 34, match: "\\brtx 2060\\b" },
  { id: "nvidia-geforce-rtx-2060-super", label: "NVIDIA GeForce RTX 2060 SUPER", score: 37, match: "\\brtx 2060 super\\b" },
  { id: "nvidia-geforce-rtx-2070", label: "NVIDIA GeForce RTX 2070", score: 39, match: "\\brtx 2070\\b" },
  { id: "nvidia-geforce-rtx-2070-super", label: "NVIDIA GeForce RTX 2070 SUPER", score: 42, match: "\\brtx 2070 super\\b" },
  { id: "nvidia-geforce-rtx-2080", label: "NVIDIA GeForce RTX 2080", score: 45, match: "\\brtx 2080\\b" },
  { id: "nvidia-geforce-rtx-2080-super", label: "NVIDIA GeForce RTX 2080 SUPER", score: 47, match: "\\brtx 2080 super\\b" },
  { id: "nvidia-geforce-rtx-2080-ti", label: "NVIDIA GeForce RTX 2080 Ti", score: 50, match: "\\brtx 2080 ti\\b" },

  // NVIDIA — RTX 30 series
  { id: "nvidia-geforce-rtx-3050", label: "NVIDIA GeForce RTX 3050", score: 30, match: "\\brtx 3050\\b" },
  {
    id: "nvidia-geforce-rtx-3060-8gb",
    label: "NVIDIA GeForce RTX 3060 8GB",
    score: 38,
    match: "\\brtx 3060\\b",
    family: "rtx-3060",
    vramGb: 8,
  },
  {
    id: "nvidia-geforce-rtx-3060-12gb",
    label: "NVIDIA GeForce RTX 3060 12GB",
    score: 40,
    match: "\\brtx 3060\\b",
    family: "rtx-3060",
    vramGb: 12,
  },
  { id: "nvidia-geforce-rtx-3060-ti", label: "NVIDIA GeForce RTX 3060 Ti", score: 46, match: "\\brtx 3060 ti\\b" },
  { id: "nvidia-geforce-rtx-3070", label: "NVIDIA GeForce RTX 3070", score: 50, match: "\\brtx 3070\\b" },
  { id: "nvidia-geforce-rtx-3070-ti", label: "NVIDIA GeForce RTX 3070 Ti", score: 53, match: "\\brtx 3070 ti\\b" },
  { id: "nvidia-geforce-rtx-3080", label: "NVIDIA GeForce RTX 3080", score: 60, match: "\\brtx 3080\\b" },
  { id: "nvidia-geforce-rtx-3080-ti", label: "NVIDIA GeForce RTX 3080 Ti", score: 64, match: "\\brtx 3080 ti\\b" },
  { id: "nvidia-geforce-rtx-3090", label: "NVIDIA GeForce RTX 3090", score: 68, match: "\\brtx 3090\\b" },

  // NVIDIA — RTX 40 series
  { id: "nvidia-geforce-rtx-4060", label: "NVIDIA GeForce RTX 4060", score: 44, match: "\\brtx 4060\\b" },
  { id: "nvidia-geforce-rtx-4060-ti", label: "NVIDIA GeForce RTX 4060 Ti", score: 50, match: "\\brtx 4060 ti\\b" },
  { id: "nvidia-geforce-rtx-4070", label: "NVIDIA GeForce RTX 4070", score: 58, match: "\\brtx 4070\\b" },
  { id: "nvidia-geforce-rtx-4070-super", label: "NVIDIA GeForce RTX 4070 SUPER", score: 62, match: "\\brtx 4070 super\\b" },
  { id: "nvidia-geforce-rtx-4070-ti", label: "NVIDIA GeForce RTX 4070 Ti", score: 64, match: "\\brtx 4070 ti\\b" },
  { id: "nvidia-geforce-rtx-4080", label: "NVIDIA GeForce RTX 4080", score: 74, match: "\\brtx 4080\\b" },
  { id: "nvidia-geforce-rtx-4080-super", label: "NVIDIA GeForce RTX 4080 SUPER", score: 76, match: "\\brtx 4080 super\\b" },
  { id: "nvidia-geforce-rtx-4090", label: "NVIDIA GeForce RTX 4090", score: 90, match: "\\brtx 4090\\b" },

  // NVIDIA — RTX 50 series
  { id: "nvidia-geforce-rtx-5070", label: "NVIDIA GeForce RTX 5070", score: 66, match: "\\brtx 5070\\b" },
  { id: "nvidia-geforce-rtx-5070-ti", label: "NVIDIA GeForce RTX 5070 Ti", score: 70, match: "\\brtx 5070 ti\\b" },
  { id: "nvidia-geforce-rtx-5080", label: "NVIDIA GeForce RTX 5080", score: 80, match: "\\brtx 5080\\b" },
  { id: "nvidia-geforce-rtx-5090", label: "NVIDIA GeForce RTX 5090", score: 100, match: "\\brtx 5090\\b" },

  // AMD — RX 400/500
  { id: "amd-radeon-rx-460", label: "AMD Radeon RX 460", score: 8, match: "\\brx 460\\b" },
  { id: "amd-radeon-rx-470", label: "AMD Radeon RX 470", score: 12, match: "\\brx 470\\b" },
  { id: "amd-radeon-rx-480", label: "AMD Radeon RX 480", score: 15, match: "\\brx 480\\b" },
  { id: "amd-radeon-rx-570", label: "AMD Radeon RX 570", score: 15, match: "\\brx 570\\b" },
  { id: "amd-radeon-rx-580", label: "AMD Radeon RX 580", score: 17, match: "\\brx 580\\b" },
  { id: "amd-radeon-rx-590", label: "AMD Radeon RX 590", score: 19, match: "\\brx 590\\b" },

  // AMD — Vega
  { id: "amd-radeon-rx-vega-56", label: "AMD Radeon RX Vega 56", score: 27, match: "\\bvega 56\\b" },
  { id: "amd-radeon-rx-vega-64", label: "AMD Radeon RX Vega 64", score: 30, match: "\\bvega 64\\b" },

  // AMD — RX 5000
  { id: "amd-radeon-rx-5500-xt", label: "AMD Radeon RX 5500 XT", score: 24, match: "\\brx 5500 xt\\b" },
  { id: "amd-radeon-rx-5600-xt", label: "AMD Radeon RX 5600 XT", score: 30, match: "\\brx 5600 xt\\b" },
  { id: "amd-radeon-rx-5700", label: "AMD Radeon RX 5700", score: 34, match: "\\brx 5700\\b" },
  { id: "amd-radeon-rx-5700-xt", label: "AMD Radeon RX 5700 XT", score: 37, match: "\\brx 5700 xt\\b" },

  // AMD — RX 6000
  { id: "amd-radeon-rx-6600", label: "AMD Radeon RX 6600", score: 36, match: "\\brx 6600\\b" },
  { id: "amd-radeon-rx-6600-xt", label: "AMD Radeon RX 6600 XT", score: 39, match: "\\brx 6600 xt\\b" },
  { id: "amd-radeon-rx-6650-xt", label: "AMD Radeon RX 6650 XT", score: 41, match: "\\brx 6650 xt\\b" },
  { id: "amd-radeon-rx-6700-xt", label: "AMD Radeon RX 6700 XT", score: 46, match: "\\brx 6700 xt\\b" },
  { id: "amd-radeon-rx-6750-xt", label: "AMD Radeon RX 6750 XT", score: 48, match: "\\brx 6750 xt\\b" },
  { id: "amd-radeon-rx-6800", label: "AMD Radeon RX 6800", score: 56, match: "\\brx 6800\\b" },
  { id: "amd-radeon-rx-6800-xt", label: "AMD Radeon RX 6800 XT", score: 60, match: "\\brx 6800 xt\\b" },
  { id: "amd-radeon-rx-6900-xt", label: "AMD Radeon RX 6900 XT", score: 64, match: "\\brx 6900 xt\\b" },
  { id: "amd-radeon-rx-6950-xt", label: "AMD Radeon RX 6950 XT", score: 66, match: "\\brx 6950 xt\\b" },

  // AMD — RX 7000
  { id: "amd-radeon-rx-7600", label: "AMD Radeon RX 7600", score: 42, match: "\\brx 7600\\b" },
  { id: "amd-radeon-rx-7700-xt", label: "AMD Radeon RX 7700 XT", score: 52, match: "\\brx 7700 xt\\b" },
  { id: "amd-radeon-rx-7800-xt", label: "AMD Radeon RX 7800 XT", score: 58, match: "\\brx 7800 xt\\b" },
  { id: "amd-radeon-rx-7900-gre", label: "AMD Radeon RX 7900 GRE", score: 62, match: "\\brx 7900 gre\\b" },
  { id: "amd-radeon-rx-7900-xt", label: "AMD Radeon RX 7900 XT", score: 68, match: "\\brx 7900 xt\\b" },
  { id: "amd-radeon-rx-7900-xtx", label: "AMD Radeon RX 7900 XTX", score: 74, match: "\\brx 7900 xtx\\b" },

  // AMD — RX 9000
  { id: "amd-radeon-rx-9070", label: "AMD Radeon RX 9070", score: 64, match: "\\brx 9070\\b" },
  { id: "amd-radeon-rx-9070-xt", label: "AMD Radeon RX 9070 XT", score: 72, match: "\\brx 9070 xt\\b" },

  // Intel Arc
  { id: "intel-arc-a380", label: "Intel Arc A380", score: 20, match: "\\barc a380\\b" },
  { id: "intel-arc-a580", label: "Intel Arc A580", score: 32, match: "\\barc a580\\b" },
  { id: "intel-arc-a750", label: "Intel Arc A750", score: 38, match: "\\barc a750\\b" },
  { id: "intel-arc-a770", label: "Intel Arc A770", score: 42, match: "\\barc a770\\b" },
  { id: "intel-arc-b580", label: "Intel Arc B580", score: 46, match: "\\barc b580\\b" },

  // Integrated
  { id: "intel-hd-graphics-4000", label: "Intel HD Graphics 4000", score: 1, match: "\\bhd graphics 4000\\b" },
  { id: "intel-hd-graphics-620", label: "Intel HD Graphics 620", score: 2, match: "\\bhd graphics 620\\b" },
  { id: "intel-uhd-graphics-630", label: "Intel UHD Graphics 630", score: 3, match: "\\buhd graphics 630\\b" },
  { id: "intel-iris-xe-gpu", label: "Intel Iris Xe Graphics", score: 8, match: "\\biris xe\\b" },
  { id: "amd-radeon-vega-8-gpu", label: "AMD Radeon Vega 8", score: 5, match: "\\bvega 8\\b" },
  { id: "amd-radeon-680m-gpu", label: "AMD Radeon 680M", score: 14, match: "\\bradeon 680m\\b" },
  { id: "amd-radeon-780m-gpu", label: "AMD Radeon 780M", score: 17, match: "\\bradeon 780m\\b" },
];

const CPU_BY_ID = new Map(PC_CPUS.map((cpu) => [cpu.id, cpu]));
const GPU_BY_ID = new Map(PC_GPUS.map((gpu) => [gpu.id, gpu]));

export function findCpuById(id: string): PcCpu | undefined {
  return CPU_BY_ID.get(id);
}

export function findGpuById(id: string): PcGpu | undefined {
  return GPU_BY_ID.get(id);
}

/**
 * Normalizes free text for catalog matching/search.
 *
 * Splits letter/digit boundaries ("RTX3060" → "rtx 3060"), strips trademark
 * symbols, unifies dashes and collapses whitespace.
 */
export function normalizeHardwareText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[™®]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/([a-z]{2,})(\d)/g, "$1 $2")
    .replace(/(\d)([a-z]{2,})/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Case-insensitive substring search across a catalog's labels. The picker uses
 * this so "rtx3060" and "Ryzen 5 5600" both match without alias tables.
 */
export function searchHardware<T extends PcCpu>(
  catalog: readonly T[],
  query: string,
): T[] {
  const needle = normalizeHardwareText(query);
  if (!needle) return [...catalog];

  return catalog.filter((item) => {
    const haystack = normalizeHardwareText(item.label);
    if (haystack.includes(needle)) return true;
    return (item.aliases ?? []).some((alias) =>
      normalizeHardwareText(alias).includes(needle),
    );
  });
}

/** True when both ids exist in the current catalog. */
export function isValidPcHardware(cpuId: string, gpuId: string): boolean {
  return CPU_BY_ID.has(cpuId) && GPU_BY_ID.has(gpuId);
}
