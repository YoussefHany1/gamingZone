import React, { memo } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { BannerAd, BannerAdSize } from "@/src/components/AdBanner";
import CustomText from "@/src/components/CustomText";
import { adUnitId } from "@/src/constants/config";
import { useAdsEnabled } from "@/src/hooks/useAdsEnabled";
import { useDeferredReady } from "@/src/hooks/useDeferredReady";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

/**
 * The app's banner-ad slot: the "Ad" label above an AdMob medium rectangle.
 *
 * Six near-identical per-feature wrappers used to exist for this (settings,
 * news details, home feed, games feed, game details, my-lists); they differed
 * only in spacing. Anything that shows a labelled banner should use this.
 *
 * Two rules are built in, both to keep ads away from the first frame:
 *
 * - nothing renders while ads are disabled (the premium entitlement), and
 * - nothing renders until the JS thread is idle (`useDeferredReady`).
 *
 * The deferral state deliberately lives *here* while the premium check lives in
 * the store: this component is mounted inside long lists, and keeping the
 * "ready" flag local means hiding it cannot re-render the rows around it.
 */

type AdSlotProps = {
  /** Spacing above/below the banner; each screen tunes this. */
  marginVertical?: number;
  /** Ad format. The default is the medium rectangle used across the app. */
  size?: BannerAdSize;
  /**
   * Host gate for screens that only want the ad once their own content has
   * rendered — they pass their `useDeferredReady()`/`useDeferredMount()` flag.
   * Defaults to `true`, i.e. gated by the checks above only.
   */
  visible?: boolean;
};

const AdSlot = memo(
  ({
    marginVertical = 55,
    size = BannerAdSize.MEDIUM_RECTANGLE,
    visible = true,
  }: AdSlotProps): React.ReactElement | null => {
    const { t } = useTranslation();
    const adsEnabled = useAdsEnabled();
    const isReady = useDeferredReady();

    const styles = useThemeStyles(
      (c) => ({
        container: { alignItems: "center", width: "100%", marginVertical },
        label: { color: c.text, marginBottom: 10 },
      }),
      [marginVertical],
    );

    if (!visible || !adsEnabled || !isReady) return null;

    return (
      <View style={styles.container}>
        <CustomText style={styles.label}>{t("common.ad")}</CustomText>
        <BannerAd unitId={adUnitId} size={size} />
      </View>
    );
  },
);

AdSlot.displayName = "AdSlot";

export default AdSlot;
