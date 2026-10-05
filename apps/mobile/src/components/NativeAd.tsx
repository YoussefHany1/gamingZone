import React, { useState, useEffect, memo } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ViewStyle } from "react-native";
import { Image } from "expo-image";
import {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
} from "react-native-google-mobile-ads";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { nativeAdUnitId } from "../constants/config";
import { useAdsEnabled } from "../hooks/useAdsEnabled";
import { t } from "i18next";
import CustomText from "./CustomText";

export type NativeAdVariant = "game" | "news";

interface NativeAdComponentProps {
  style?: ViewStyle;
  variant?: NativeAdVariant;
  language?: string;
}

export const NativeAdComponent = memo<NativeAdComponentProps>(
  ({ style, variant = "game", language }) => {
    const adsEnabled = useAdsEnabled();
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
          console.error("[NativeAd] Failed to load native ad:", err);
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

    if (!adsEnabled) {
      return null;
    }

    if (loading) {
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
