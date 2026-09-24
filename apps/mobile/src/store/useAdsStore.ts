import { create } from "zustand";
import { storageGet, storageSet } from "@/src/lib/storage";

interface AdsState {
  adsEnabled: boolean;
  setAdsEnabled: (enabled: boolean) => void;
  toggleAds: () => void;
}

const ADS_ENABLED_KEY = "@ads_enabled";

export const useAdsStore = create<AdsState>()((set, get) => ({
  adsEnabled: storageGet<boolean>(ADS_ENABLED_KEY) ?? true,

  setAdsEnabled: (enabled) => {
    if (get().adsEnabled === enabled) return;
    storageSet(ADS_ENABLED_KEY, enabled);
    set({ adsEnabled: enabled });
  },

  toggleAds: () => get().setAdsEnabled(!get().adsEnabled),
}));