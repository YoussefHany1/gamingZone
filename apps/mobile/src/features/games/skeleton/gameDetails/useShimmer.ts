// Backward-compatible re-export. The canonical implementation now lives in
// `@/src/components/skeleton/shared` so there is a single source of truth for
// the skeleton shimmer systems. This module stays in place so every existing
// import path keeps working unchanged.
export { useShimmer } from "@/src/components/skeleton/shared";
export { useShimmer as default } from "@/src/components/skeleton/shared";
