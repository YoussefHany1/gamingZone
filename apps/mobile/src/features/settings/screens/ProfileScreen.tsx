import React, { useCallback, useEffect, useMemo, useState } from "react";
import CustomText from "@/src/components/CustomText";
import { View, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import firestore from "@react-native-firebase/firestore";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { runAfterInteractions } from "@/src/utils/runAfterInteractions";
import ErrorState from "@/src/components/ErrorState";
import SectionTitle from "@/src/components/SectionTitle";
import SkeletonItem from "@/src/components/SkeletonItem";
import { usePulseAnimation } from "@/src/components/skeleton/shared";
import { BannerAd, BannerAdSize } from "@/src/components/AdBanner";
import { useAdsEnabled } from "@/src/hooks/useAdsEnabled";
import { adUnitId } from "@/src/constants/config";
import type { SettingsStackParamList } from "@/src/navigation/AppNavigator";
import type { GameEntry } from "@/src/features/lists/types";
import { Check, Clock, Layers, ListChecks, Play, Star } from "lucide-react-native";
import {
  AndroidIcon,
  AppleIcon,
  PlayStationIcon,
  XboxIcon,
} from "@/src/components/icons/BrandIcons";
import { useUserStats } from "../hooks/useUserStats";

const flagEmoji = (countryCode: string): string => {
  if (!/^[A-Za-z]{2}$/.test(countryCode)) return "";
  const codepoint = (letter: string): number =>
    127397 + letter.toUpperCase().charCodeAt(0);
  return String.fromCodePoint(
    codepoint(countryCode[0] ?? ""),
    codepoint(countryCode[1] ?? ""),
  );
};

// ─── Stat tile ────────────────────────────────────────────────────────────────

interface StatTileProps {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: string;
  wide?: boolean;
}

const StatTile = React.memo<StatTileProps>(({ icon: Icon, label, value, wide }) => {
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    tile: {
      flexBasis: wide ? "100%" : "48%",
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    tileWide: {
      flexGrow: 1,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 6,
      gap: 8,
    },
    label: {
      color: c.textMuted,
      fontSize: 13,
      fontWeight: "600",
    },
    value: {
      color: c.text,
      fontSize: wide ? 22 : 26,
      fontWeight: "700",
    },
  }));

  return (
    <View style={[styles.tile, wide && styles.tileWide]}>
      <View style={styles.row}>
        <Icon size={16} color={colors.accentText} />
        <CustomText style={styles.label} numberOfLines={1}>
          {label}
        </CustomText>
      </View>
      <CustomText style={styles.value}>{value}</CustomText>
    </View>
  );
});
StatTile.displayName = "StatTile";

// ─── Highest-rated cover card ────────────────────────────────────────────────

const coverSource = (entry: GameEntry) =>
  entry.cover_image_id
    ? {
        uri: `https://images.igdb.com/igdb/image/upload/t_cover_small/${entry.cover_image_id}.webp`,
      }
    : require("@/assets/image-not-found.webp");

const RateCard = React.memo<{ entry: GameEntry }>(({ entry }) => {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const styles = useThemeStyles((c) => ({
    card: {
      width: 110,
      marginRight: 12,
    },
    cover: {
      width: 110,
      height: 146,
      borderRadius: 10,
      backgroundColor: c.skeletonBase,
    },
    name: {
      color: c.text,
      fontSize: 12,
      fontWeight: "600",
      marginTop: 6,
      height: 30,
    },
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 2,
      gap: 4,
    },
    rating: {
      color: "#ffc107",
      fontSize: 12,
      fontWeight: "700",
    },
  }));

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("GameDetails", { gameID: entry.id })}
      activeOpacity={0.75}
    >
      <Image
        style={styles.cover}
        source={coverSource(entry)}
        contentFit="cover"
        transition={250}
        cachePolicy="memory-disk"
        allowDownscaling
      />
      <CustomText style={styles.name} numberOfLines={2}>
        {entry.name}
      </CustomText>
      <View style={styles.ratingRow}>
        <Star size={12} color="#ffc107" fill="#ffc107" />
        <CustomText style={styles.rating}>{entry.rating}</CustomText>
      </View>
    </TouchableOpacity>
  );
});
RateCard.displayName = "RateCard";

// ─── Skeleton ────────────────────────────────────────────────────────────────

const ProfileSkeleton = React.memo(() => {
  const pulse = usePulseAnimation();
  const styles = useThemeStyles(() => ({
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 24,
    },
    avatar: {
      width: 76,
      height: 76,
      borderRadius: 38,
    },
    name: {
      width: 160,
      height: 20,
      borderRadius: 6,
      marginBottom: 8,
    },
    meta: {
      width: 120,
      height: 14,
      borderRadius: 5,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
    },
    tile: {
      flex: 1,
      height: 88,
      borderRadius: 14,
      marginBottom: 10,
    },
    banner: {
      height: 170,
      borderRadius: 12,
      marginTop: 8,
    },
  }));

  return (
    <View>
      <View style={styles.header}>
        <SkeletonItem animatedStyle={pulse} style={styles.avatar} />
        <View>
          <SkeletonItem animatedStyle={pulse} style={styles.name} />
          <SkeletonItem animatedStyle={pulse} style={styles.meta} />
        </View>
      </View>
      {[0, 1].map((i) => (
        <View key={i} style={styles.row}>
          <SkeletonItem animatedStyle={pulse} style={styles.tile} />
          <SkeletonItem animatedStyle={pulse} style={styles.tile} />
        </View>
      ))}
      <SkeletonItem animatedStyle={pulse} style={styles.banner} />
    </View>
  );
});
ProfileSkeleton.displayName = "ProfileSkeleton";

// ─── Main screen ──────────────────────────────────────────────────────────────

const ProfileScreen = React.memo((): React.ReactElement => {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const currentUser = useAuthStore((state) => state.user);
  const uid = currentUser?.uid ?? "";

  const { stats, loading, refreshing, refresh } = useUserStats(uid);

  // Auth profile lacks platform/country — those live on the Firestore user doc.
  const [userData, setUserData] = useState<{
    platform?: string;
    country?: string;
  }>({});

  useEffect(() => {
    if (!uid) return;
    let isMounted = true;
    firestore()
      .collection("users")
      .doc(uid)
      .get()
      .then((doc) => {
        if (!isMounted) return;
        const data = doc.data();
        setUserData({
          platform: typeof data?.platform === "string" ? data.platform : "",
          country: typeof data?.country === "string" ? data.country : "",
        });
      })
      .catch((error) => {
        console.error("[ProfileScreen] Error loading user doc:", error);
      });
    return () => {
      isMounted = false;
    };
  }, [uid]);

  const [showAds, setShowAds] = useState<boolean>(false);
  const adsEnabled = useAdsEnabled();

  useEffect(() => {
    const task = runAfterInteractions(() => setShowAds(true));
    return () => task.cancel();
  }, []);

  // Refresh statistics whenever the screen regains focus (silent re-fetch).
  useFocusEffect(
    useCallback(() => {
      if (uid) refresh(true);
    }, [uid, refresh]),
  );

  const memberSince = useMemo(() => {
    const created = currentUser?.metadata?.creationTime;
    if (!created) return null;
    try {
      return new Date(created).toLocaleDateString(i18n.language, {
        month: "long",
        year: "numeric",
      });
    } catch {
      return null;
    }
  }, [currentUser?.metadata?.creationTime, i18n.language]);

  const platformIcon = useMemo(() => {
    switch (userData.platform) {
      case "playstation":
        return <PlayStationIcon size={20} fill={colors.textMuted} />;
      case "xbox":
        return <XboxIcon size={20} fill={colors.textMuted} />;
      case "android":
        return <AndroidIcon size={20} fill={colors.textMuted} />;
      case "ios":
        return <AppleIcon size={20} fill={colors.textMuted} />;
      default:
        return null;
    }
  }, [userData.platform, colors.textMuted]);

  const countryFlag = useMemo(
    () => flagEmoji(userData.country ?? ""),
    [userData.country],
  );

  const styles = useThemeStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.background,
      paddingBottom: 90,
    },
    content: {
      padding: 20,
    },
    headerCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      marginBottom: 24,
    },
    avatar: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: c.skeletonBase,
      borderWidth: 2,
      borderColor: c.textMuted,
    },
    nameBlock: {
      flex: 1,
    },
    name: {
      color: c.text,
      fontSize: 20,
      fontWeight: "700",
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 6,
    },
    metaText: {
      color: c.textMuted,
      fontSize: 13,
    },
    statGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    coversRow: {
      flexDirection: "row",
      marginTop: 12,
      marginBottom: 8,
    },
    emptyCard: {
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      marginTop: 12,
    },
    emptyText: {
      color: c.textMuted,
      fontSize: 14,
      textAlign: "center",
      marginBottom: 14,
    },
    primaryBtn: {
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 22,
    },
    primaryText: {
      color: c.onAccent,
      fontSize: 16,
      fontWeight: "700",
    },
    secondaryBtn: {
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 12,
    },
    secondaryText: {
      color: c.text,
      fontSize: 16,
      fontWeight: "600",
    },
    ad: { alignItems: "center", width: "100%", marginVertical: 22 },
    adText: { color: c.text, marginBottom: 10 },
  }));

  if (!currentUser) {
    return <ErrorState message={t("common.loginRequired")} showContactButton={false} />;
  }

  const displayName = currentUser.displayName || t("auth.register.signUpButton");
  const photoURL = currentUser.photoURL || "";
  const avatarSource = photoURL
    ? { uri: photoURL }
    : require("@/assets/default_profile.webp");

  return (
    <SafeAreaView style={styles.container} edges={["right", "left"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refresh()}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
      >
        {loading && !stats ? (
          <ProfileSkeleton />
        ) : (
          <>
            {/* Header card */}
            <View style={styles.headerCard}>
              <Image
                recyclingKey={photoURL}
                style={styles.avatar}
                source={avatarSource}
                contentFit="cover"
                transition={300}
                cachePolicy="memory-disk"
                allowDownscaling
              />
              <View style={styles.nameBlock}>
                <CustomText style={styles.name} numberOfLines={1}>
                  {displayName}
                </CustomText>
                <View style={styles.metaRow}>
                  {platformIcon}
                  {memberSince && (
                    <CustomText style={styles.metaText}>
                      {t("settings.profileShowcase.memberSince")} {memberSince}
                    </CustomText>
                  )}
                  {countryFlag !== "" && (
                    <CustomText style={styles.metaText}>{countryFlag}</CustomText>
                  )}
                </View>
              </View>
            </View>

            {/* Statistics */}
            <SectionTitle title={t("settings.profileShowcase.statsSection")} />
            <View style={styles.statGrid}>
              <StatTile
                icon={Play}
                label={t("settings.profileShowcase.stats.playing")}
                value={String(stats?.counts.playing ?? 0)}
              />
              <StatTile
                icon={Check}
                label={t("settings.profileShowcase.stats.played")}
                value={String(stats?.counts.played ?? 0)}
              />
              <StatTile
                icon={ListChecks}
                label={t("settings.profileShowcase.stats.wantToPlay")}
                value={String(stats?.counts.wantToPlay ?? 0)}
              />
              <StatTile
                icon={Star}
                label={t("settings.profileShowcase.stats.rated")}
                value={String(stats?.ratedCount ?? 0)}
              />
              <StatTile
                icon={Layers}
                label={t("settings.profileShowcase.stats.total")}
                value={String(stats?.counts.totalUnique ?? 0)}
              />
              <StatTile
                icon={Star}
                label={t("settings.profileShowcase.stats.avgRating")}
                value={
                  stats?.averageRating != null
                    ? `${stats.averageRating} / 5`
                    : t("settings.profileShowcase.dash")
                }
              />
            </View>
            <StatTile
              icon={Clock}
              label={t("settings.profileShowcase.stats.playtime")}
              value={t("settings.profileShowcase.playtimeValue", {
                count: stats?.playtimeHours ?? 0,
              })}
              wide
            />

            {/* Highest rated */}
            {(stats?.highestRated.length ?? 0) > 0 && (
              <>
                <SectionTitle title={t("settings.profileShowcase.highestRated")} />
                <View style={styles.coversRow}>
                  {stats?.highestRated.map((entry) => (
                    <RateCard key={String(entry.id)} entry={entry} />
                  ))}
                </View>
              </>
            )}

            {/* Empty library hint */}
            {stats && stats.counts.totalUnique === 0 && (
              <View style={styles.emptyCard}>
                <CustomText style={styles.emptyText}>
                  {t("settings.profileShowcase.emptyLibrary")}
                </CustomText>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => navigation.getParent()?.navigate("Games")}
                >
                  <CustomText style={styles.primaryText}>
                    {t("settings.profileShowcase.browseGames")}
                  </CustomText>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick actions */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate("EditProfile")}
              activeOpacity={0.8}
            >
              <CustomText style={styles.primaryText}>
                {t("settings.profileShowcase.editProfile")}
              </CustomText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate("UserListsScreen")}
              activeOpacity={0.8}
            >
              <CustomText style={styles.secondaryText}>
                {t("settings.profileShowcase.myLists")}
              </CustomText>
            </TouchableOpacity>

            {showAds && adsEnabled && (
              <View style={styles.ad}>
                <CustomText style={styles.adText}>{t("common.ad")}</CustomText>
                <BannerAd unitId={adUnitId} size={BannerAdSize.MEDIUM_RECTANGLE} />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
});

ProfileScreen.displayName = "ProfileScreen";
export default ProfileScreen;
