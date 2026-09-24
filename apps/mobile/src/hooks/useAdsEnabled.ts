import { useAdsStore } from "@/src/store/useAdsStore";

export function useAdsEnabled(): boolean {
  return useAdsStore((state) => state.adsEnabled);
}