import React, { useCallback, useState } from "react";
import { View, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import ErrorState from "@/src/components/ErrorState";
import SectionTitle from "@/src/components/SectionTitle";
import { useDeferredReady } from "@/src/hooks/useDeferredReady";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useAuthStore } from "@/src/store/useAuthStore";
import type { SettingsStackParamList } from "@/src/navigation/AppNavigator";
import AdSlot from "@/src/components/AdSlot";
import ProfileContentSkeleton from "../components/profile/ProfileContentSkeleton";
import ProfileEmptyLibraryCard from "../components/profile/ProfileEmptyLibraryCard";
import ProfileHeaderCard from "../components/profile/ProfileHeaderCard";
import ProfileMenu from "../components/profile/ProfileMenu";
import ProfileStatsGrid from "../components/profile/ProfileStatsGrid";
import RateCard from "../components/profile/RateCard";
import LevelCard from "@/src/features/gamification/components/LevelCard";
import { useGamification } from "@/src/features/gamification/hooks/useGamification";
import { useProfileData } from "../hooks/useProfileData";
import { useUserStats } from "../hooks/useUserStats";
import LinkAccountModal from "@/src/features/linking/components/LinkAccountModal";

const ProfileScreen = React.memo((): React.ReactElement => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const currentUser = useAuthStore((state) => state.user);
  const uid = currentUser?.uid ?? "";

  const { stats, loading, refreshing, refresh } = useUserStats(uid);
  const { gamification } = useGamification(uid);
  const {
    displayName,
    photoURL,
    memberSince,
    platform,
    country,
    handle,
    bannerURL,
    bio,
    status,
  } = useProfileData();
  const isReady = useDeferredReady();
  const [showLinkModal, setShowLinkModal] = useState<boolean>(false);

  // Refresh statistics whenever the screen regains focus (silent re-fetch).
  useFocusEffect(
    useCallback(() => {
      if (uid) refresh(true);
    }, [uid, refresh]),
  );

  const styles = useThemeStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      padding: 20,
      paddingBottom:60
    },
    coversRow: {
      flexDirection: "row",
      marginTop: 12,
      marginBottom: 8,
    },
  }));

  if (!currentUser) {
    return <ErrorState message={t("common.loginRequired")} showContactButton={false} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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
          <ProfileContentSkeleton />
        ) : (
          <>
            <ProfileHeaderCard
              displayName={displayName}
              photoURL={photoURL}
              memberSince={memberSince}
              platform={platform}
              country={country}
              handle={handle}
              bannerURL={bannerURL}
              bio={bio}
              status={status}
              onEditProfile={() => navigation.navigate("EditProfile")}
            />

            <LevelCard
              gamification={gamification}
              unlockedCount={
                gamification?.achievements.filter((a) => a.unlocked).length ?? 0
              }
              onPress={() => navigation.navigate("Achievements")}
            />

            <SectionTitle title={t("settings.profileShowcase.statsSection")} />
            <ProfileStatsGrid stats={stats} />
<AdSlot visible={isReady} marginVertical={22} />
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

            {stats && stats.counts.totalUnique === 0 && (
              <ProfileEmptyLibraryCard
                onBrowse={() => navigation.getParent()?.navigate("Games")}
              />
            )}

            <ProfileMenu
              onPublicProfile={() => navigation.navigate("UserProfile", { uid })}
              onMyLists={() => navigation.navigate("UserListsScreen")}
              onPcSpecs={() => navigation.navigate("PcSpecsScreen")}
              onConnectedApps={() => setShowLinkModal(true)}
            />

          </>
        )}
      </ScrollView>
      <LinkAccountModal visible={showLinkModal} onClose={() => setShowLinkModal(false)} />
    </SafeAreaView>
  );
});

ProfileScreen.displayName = "ProfileScreen";
export default ProfileScreen;
