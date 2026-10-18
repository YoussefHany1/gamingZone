import React, { useCallback } from "react";
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
import ProfileActions from "../components/profile/ProfileActions";
import ProfileContentSkeleton from "../components/profile/ProfileContentSkeleton";
import ProfileEmptyLibraryCard from "../components/profile/ProfileEmptyLibraryCard";
import ProfileHeaderCard from "../components/profile/ProfileHeaderCard";
import ProfileStatsGrid from "../components/profile/ProfileStatsGrid";
import RateCard from "../components/profile/RateCard";
import { useProfileData } from "../hooks/useProfileData";
import { useUserStats } from "../hooks/useUserStats";

const ProfileScreen = React.memo((): React.ReactElement => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const currentUser = useAuthStore((state) => state.user);
  const uid = currentUser?.uid ?? "";

  const { stats, loading, refreshing, refresh } = useUserStats(uid);
  const { displayName, photoURL, memberSince, platform, country } = useProfileData();
  const isReady = useDeferredReady();

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
            />

            <SectionTitle title={t("settings.profileShowcase.statsSection")} />
            <ProfileStatsGrid stats={stats} />

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

            <ProfileActions
              onEditProfile={() => navigation.navigate("EditProfile")}
              onMyLists={() => navigation.navigate("UserListsScreen")}
            />

            <AdSlot visible={isReady} marginVertical={22} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
});

ProfileScreen.displayName = "ProfileScreen";
export default ProfileScreen;
