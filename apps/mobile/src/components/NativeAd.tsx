import { useState, useEffect, memo } from "react";
import type { ViewStyle } from "react-native";
import { View, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
} from "react-native-google-mobile-ads";
import { Gamepad2 } from "lucide-react-native";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { nativeAdUnitId } from "../constants/config";
import { useAdsEnabled } from "../hooks/useAdsEnabled";
import { useDeferredReady } from "../hooks/useDeferredReady";
import { t } from "i18next";
import CustomText from "./CustomText";
import { logger } from "@/src/lib/logger";

export type NativeAdVariant = "game" | "news" | "grid" | "chat" | "session";

interface NativeAdComponentProps {
  style?: ViewStyle;
  variant?: NativeAdVariant;
  language?: string;
}

export const NativeAdComponent = memo<NativeAdComponentProps>(
  ({ style, variant = "game", language }) => {
    const adsEnabled = useAdsEnabled();
    // Ads must never paint on the first frame; the social list also relies on
    // the chat variant returning `null` while idle/loading/error so the
    // FlashList rows do not jump around.
    const isReady = useDeferredReady();
    const colors = useThemeColors();
    const styles = useThemeStyles((c) => ({
      loadingContainer: {
        height: 120,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: c.accentSurface,
        borderRadius: 12,
        marginTop: 24,
        width: "100%",
      },
      adWrapper: {
        backgroundColor: c.surface,
        borderRadius: 12,
        marginTop: 24,
        width: "100%",
        overflow: "hidden",
      },
      adInner: {
        flexDirection: "row",
        padding: 12,
        alignItems: "center",
        width: "100%",
      },
      adIcon: {
        width: 80,
        height: 105,
        borderRadius: 8,
        backgroundColor: c.overlay,
      },
      iconPlaceholder: {
        width: 80,
        height: 105,
        borderRadius: 8,
        backgroundColor: c.accentSurface,
      },
      adInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: "center",
      },
      headlineRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4,
      },
      adHeadline: {
        color: c.text,
        fontSize: 16,
        fontWeight: "bold",
        flex: 1,
      },
      badge: {
        color: c.textMuted,
        borderWidth: 1,
        borderColor: c.textMuted,
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 1,
        fontSize: 10,
        fontWeight: "bold",
        marginLeft: 8,
      },
      adBody: {
        color: c.textSubtle,
        fontSize: 13,
        marginTop: 2,
        lineHeight: 18,
      },
      ctaButtonText: {
        backgroundColor: c.accent,
        color: c.onAccent,
        fontSize: 12,
        fontWeight: "bold",
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        alignSelf: "flex-start",
        marginTop: 8,
        textAlign: "center",
        overflow: "hidden",
      },
      newsAdWrapper: {
        alignSelf: "center",
        borderRadius: 16,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
        overflow: "hidden",
      },
      newsAdInner: {
        alignItems: "center",
        flexDirection: "row",
        padding: 20,
        width: "100%",
      },
      newsTextContainer: {
        width: "65%",
      },
      newsHeadline: {
        fontSize: 14,
        fontWeight: "bold",
        marginBottom: 12,
        color: c.text,
      },
      newsPar: {
        fontSize: 12,
        color: c.textMuted,
        marginRight: 12,
      },
      newsThumbnail: {
        width: 135,
        height: 100,
        borderRadius: 16,
        backgroundColor: c.accent,
      },
      newsIconPlaceholder: {
        width: 135,
        height: 100,
        borderRadius: 16,
        backgroundColor: c.accentSurface,
      },
      newsWebsite: {
        position: "absolute",
        bottom: 5,
        left: 15,
        fontSize: 10,
        marginTop: 8,
        color: c.onAccent,
        backgroundColor: c.overlay,
        paddingHorizontal: 7,
        borderRadius: 6,
      },
      newsCtaText: {
        fontSize: 12,
        color: c.onAccent,
        fontWeight: "bold",
        backgroundColor: c.accent,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginTop: 5,
        overflow: "hidden",
      },
      // "grid" variant — a 3:4 poster-shaped ad box that fills a single grid
      // cell, mirroring GamePosterItem so it sits naturally in the poster wall.
      gridAdWrapper: {
        width: "100%",
        aspectRatio: 3 / 4,
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
      },
      gridAdInner: {
        flex: 1,
      },
      gridAdImage: {
        flex: 1,
        backgroundColor: c.accentSurface,
      },
      gridAdImageFallback: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.accentSurface,
      },
      gridAdFallbackIcon: {
        width: 60,
        height: 60,
        borderRadius: 12,
      },
      gridAdInfo: {
        paddingHorizontal: 6,
        paddingVertical: 5,
        backgroundColor: c.accentSurface,
      },
      gridAdHeadline: {
        color: c.text,
        fontSize: 11,
        fontWeight: "bold",
      },
      gridAdInfoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
      },
      gridAdCta: {
        backgroundColor: c.accent,
        color: c.onAccent,
        fontSize: 10,
        fontWeight: "bold",
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
        overflow: "hidden",
      },
      gridAdBadge: {
        position: "absolute",
        top: 6,
        right: 6,
        color: c.textMuted,
        backgroundColor: c.overlay,
        borderRadius: 4,
        paddingHorizontal: 5,
        paddingVertical: 2,
        fontSize: 9,
        fontWeight: "bold",
        zIndex: 10,
        overflow: "hidden",
      },
      // "chat" variant — mirrors the SocialListRow card (surface bg, radius 18,
      // themed border, padding 13, marginBottom 10) with a 44px circle icon,
      // the headline+badge as the label row and the body as the snippet line.
      chatAdRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 13,
        marginBottom: 10,
        borderRadius: 18,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
      },
      chatAdInner: { flexDirection: "row", alignItems: "center", gap: 12 },
      chatAdIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: c.accentSurface,
      },
      chatAdBody: { flex: 1 },
      chatAdLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
      chatAdHeadline: { color: c.text, fontSize: 15, fontWeight: "700", flex: 1 },
      chatAdSnippet: { color: c.textMuted, fontSize: 13, marginTop: 4 },
      chatAdCta: {
        backgroundColor: c.accent,
        color: c.onAccent,
        fontSize: 12,
        fontWeight: "800",
        borderRadius: 11,
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignSelf: "flex-start",
        marginTop: 8,
        textAlign: "center",
        overflow: "hidden",
      },
      // "session" variant — mirrors the social PlaySessionCard: padding 15,
      // radius 20, accentBorder card; 58×58 game tile with the ad icon filling
      // it (Gamepad2 fallback), headline as the session title, body as the
      // meta line and the CTA as the accent pill.
      sessionAdCard: {
        padding: 15,
        marginBottom: 12,
        borderRadius: 20,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.accentBorder,
      },
      sessionAdTop: { flexDirection: "row", gap: 12, alignItems: "center" },
      sessionAdTile: {
        width: 58,
        height: 58,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.backgroundDeep,
        borderWidth: 1,
        borderColor: c.accentBorder,
      },
      sessionAdCover: {
        width: 58,
        height: 58,
        borderRadius: 16,
        backgroundColor: c.skeletonBase,
      },
      sessionAdInfo: { flex: 1 },
      sessionAdLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
      sessionAdHeadline: { color: c.text, fontSize: 16, fontWeight: "800", flex: 1 },
      sessionAdMeta: { color: c.textMuted, fontSize: 12, marginTop: 5 },
      sessionAdCta: {
        backgroundColor: c.accent,
        color: c.onAccent,
        fontSize: 12,
        fontWeight: "800",
        borderRadius: 11,
        paddingHorizontal: 12,
        paddingVertical: 9,
        alignSelf: "flex-start",
        marginTop: 12,
        textAlign: "center",
        overflow: "hidden",
      },
    }));

    const [ad, setAd] = useState<NativeAd | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<boolean>(false);

    useEffect(() => {
      if (!adsEnabled) {
        setAd(null);
        setLoading(true);
        setError(false);
        return;
      }

      let isMounted = true;
      let loadedAdRef: NativeAd | null = null;

      NativeAd.createForAdRequest(nativeAdUnitId)
        .then((loadedAd) => {
          if (isMounted) {
            loadedAdRef = loadedAd;
            setAd(loadedAd);
            setLoading(false);
          } else {
            loadedAd.destroy();
          }
        })
        .catch((err) => {
          logger.error("[NativeAd] Failed to load native ad:", err);
          if (isMounted) {
            setError(true);
            setLoading(false);
          }
        });

      return () => {
        isMounted = false;
        if (loadedAdRef) {
          loadedAdRef.destroy();
        }
      };
    }, [adsEnabled]);

    if (!adsEnabled || !isReady) {
      return null;
    }

    if (loading) {
      if (variant === "grid") {
        return (
          <View style={[styles.gridAdWrapper, style]}>
            <View style={styles.gridAdImageFallback}>
              <ActivityIndicator size="small" color={colors.accentText} />
            </View>
          </View>
        );
      }
      // Chat/session variants render nothing while loading so FlashList
      // rows never shift when the ad slots in.
      if (variant === "chat" || variant === "session") {
        return null;
      }
      return (
        <View
          style={[
            variant === "news" ? styles.newsAdWrapper : styles.loadingContainer,
            style,
          ]}
        >
          <ActivityIndicator size="small" color={colors.accentText} />
        </View>
      );
    }

    if (error || !ad) {
      return null;
    }

    if (variant === "session") {
      return (
        <View style={[styles.sessionAdCard, style]}>
          {/* Everything (top row + CTA) lives inside the NativeAdView — a
              `NativeAsset` rendered outside one would have no `viewRef` and
              crash on `viewRef.current`. */}
          <NativeAdView nativeAd={ad}>
            <View style={styles.sessionAdTop}>
              {/* Game-tile slot: ad artwork fills the 58×58 footprint. */}
              <View style={styles.sessionAdTile}>
                {ad.icon ? (
                  <NativeAsset assetType={NativeAssetType.ICON}>
                    <Image
                      source={{ uri: ad.icon.url }}
                      style={styles.sessionAdCover}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      recyclingKey={ad.icon.url}
                    />
                  </NativeAsset>
                ) : (
                  <Gamepad2 size={20} color={colors.accentText} />
                )}
              </View>

              {/* Info column — session title / status-line layout. */}
              <View style={styles.sessionAdInfo}>
                <View style={styles.sessionAdLabelRow}>
                  <NativeAsset assetType={NativeAssetType.HEADLINE}>
                    <CustomText style={styles.sessionAdHeadline} numberOfLines={1}>
                      {ad.headline}
                    </CustomText>
                  </NativeAsset>
                  <CustomText style={styles.badge}>{t("common.ad")}</CustomText>
                </View>

                {ad.body ? (
                  <NativeAsset assetType={NativeAssetType.BODY}>
                    <CustomText style={styles.sessionAdMeta} numberOfLines={2}>
                      {ad.body}
                    </CustomText>
                  </NativeAsset>
                ) : null}
              </View>
            </View>

            {ad.callToAction ? (
              <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                <CustomText style={styles.sessionAdCta} numberOfLines={1}>
                  {ad.callToAction}
                </CustomText>
              </NativeAsset>
            ) : null}
          </NativeAdView>
        </View>
      );
    }

    if (variant === "chat") {
      return (
        <View style={[styles.chatAdRow, style]}>
          <NativeAdView nativeAd={ad} style={styles.chatAdInner}>
            {ad.icon ? (
              <NativeAsset assetType={NativeAssetType.ICON}>
                <Image
                  source={{ uri: ad.icon.url }}
                  style={styles.chatAdIcon}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  recyclingKey={ad.icon.url}
                />
              </NativeAsset>
            ) : (
              <View style={styles.chatAdIcon} />
            )}

            {/* Info column — same layout as a SocialListRow body. */}
            <View style={styles.chatAdBody}>
              <View style={styles.chatAdLabelRow}>
                <NativeAsset assetType={NativeAssetType.HEADLINE}>
                  <CustomText style={styles.chatAdHeadline} numberOfLines={1}>
                    {ad.headline}
                  </CustomText>
                </NativeAsset>
                <CustomText style={styles.badge}>{t("common.ad")}</CustomText>
              </View>

              {ad.body ? (
                <NativeAsset assetType={NativeAssetType.BODY}>
                  <CustomText style={styles.chatAdSnippet} numberOfLines={2}>
                    {ad.body}
                  </CustomText>
                </NativeAsset>
              ) : null}

              {ad.callToAction ? (
                <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                  <CustomText style={styles.chatAdCta} numberOfLines={1}>
                    {ad.callToAction}
                  </CustomText>
                </NativeAsset>
              ) : null}
            </View>
          </NativeAdView>
        </View>
      );
    }

    if (variant === "grid") {
      const image = ad.images?.[0];
      return (
        <View style={[styles.gridAdWrapper, style]}>
          <NativeAdView nativeAd={ad} style={styles.gridAdInner}>
            {image ? (
              <NativeAsset assetType={NativeAssetType.IMAGE}>
                <Image
                  source={{ uri: image.url }}
                  style={styles.gridAdImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  recyclingKey={image.url}
                />
              </NativeAsset>
            ) : (
              <View style={styles.gridAdImageFallback}>
                {ad.icon ? (
                  <NativeAsset assetType={NativeAssetType.ICON}>
                    <Image
                      source={{ uri: ad.icon.url }}
                      style={styles.gridAdFallbackIcon}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                      recyclingKey={ad.icon.url}
                    />
                  </NativeAsset>
                ) : null}
              </View>
            )}

            <CustomText style={styles.gridAdBadge}>{t("common.ad")}</CustomText>

            <View style={styles.gridAdInfo}>
              <NativeAsset assetType={NativeAssetType.HEADLINE}>
                <CustomText style={styles.gridAdHeadline} numberOfLines={2}>
                  {ad.headline}
                </CustomText>
              </NativeAsset>
              <View style={styles.gridAdInfoRow}>
                {ad.callToAction ? (
                  <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                    <CustomText style={styles.gridAdCta}>{ad.callToAction}</CustomText>
                  </NativeAsset>
                ) : null}
              </View>
            </View>
          </NativeAdView>
        </View>
      );
    }

    if (variant === "news") {
      return (
        <View
          style={[
            language === "ar" ? { direction: "rtl" } : { direction: "ltr" },
            styles.newsAdWrapper,
            style,
          ]}
        >
          <NativeAdView nativeAd={ad} style={styles.newsAdInner}>
            <View style={styles.newsTextContainer}>
              <NativeAsset assetType={NativeAssetType.HEADLINE}>
                <CustomText
                  style={[
                    styles.newsHeadline,
                    language === "ar" ? { marginLeft: 8 } : { marginRight: 8 },
                  ]}
                  numberOfLines={3}
                >
                  {ad.headline}
                </CustomText>
              </NativeAsset>

              {ad.body ? (
                <NativeAsset assetType={NativeAssetType.BODY}>
                  <CustomText style={styles.newsPar} numberOfLines={2}>
                    {ad.body}..
                  </CustomText>
                </NativeAsset>
              ) : null}

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 4,
                }}
              >
                {ad.callToAction ? (
                  <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                    <CustomText style={styles.newsCtaText}>{ad.callToAction}</CustomText>
                  </NativeAsset>
                ) : null}
              </View>
            </View>

            <View>
              {ad.icon ? (
                <NativeAsset assetType={NativeAssetType.ICON}>
                  <Image
                    source={{ uri: ad.icon.url }}
                    style={styles.newsThumbnail}
                    contentFit="cover"
                    recyclingKey={ad.icon.url}
                  />
                </NativeAsset>
              ) : (
                <View style={styles.newsIconPlaceholder} />
              )}
              <CustomText style={styles.newsWebsite}>{t("common.ad")}</CustomText>
            </View>
          </NativeAdView>
        </View>
      );
    }

    return (
      <View style={[styles.adWrapper, style]}>
        <NativeAdView nativeAd={ad} style={styles.adInner}>
          {/* Icon Asset */}
          {ad.icon ? (
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Image
                source={{ uri: ad.icon.url }}
                style={styles.adIcon}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={ad.icon.url}
              />
            </NativeAsset>
          ) : (
            <View style={styles.iconPlaceholder} />
          )}

          {/* Info Column */}
          <View style={styles.adInfo}>
            <View style={styles.headlineRow}>
              <NativeAsset assetType={NativeAssetType.HEADLINE}>
                <CustomText style={styles.adHeadline} numberOfLines={1}>
                  {ad.headline}
                </CustomText>
              </NativeAsset>
              <CustomText style={styles.badge}>{t("common.ad")}</CustomText>
            </View>

            {ad.body ? (
              <NativeAsset assetType={NativeAssetType.BODY}>
                <CustomText style={styles.adBody} numberOfLines={2}>
                  {ad.body}
                </CustomText>
              </NativeAsset>
            ) : null}

            {/* CTA Button */}
            {ad.callToAction ? (
              <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                <CustomText style={styles.ctaButtonText}>{ad.callToAction}</CustomText>
              </NativeAsset>
            ) : null}
          </View>
        </NativeAdView>
      </View>
    );
  },
);

NativeAdComponent.displayName = "NativeAdComponent";
