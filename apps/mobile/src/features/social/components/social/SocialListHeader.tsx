import React from "react";
import { View } from "react-native";
import { Search, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import PressScale from "../PressScale";
import type { SocialSegment } from "../../lib/socialList";

/** Per-segment content above the list (the segment switching itself lives in the TabBar). */
export type SocialListHeaderProps = {
  segment: SocialSegment;
  requestView: "incoming" | "sent";
  chatView: "active" | "archived";
  isSearching: boolean;
  query: string;
  setQuery: (v: string) => void;
  searching: boolean;
  searchError: unknown;
  platformFilter: string | null;
  setPlatformFilter: (
    v: string | null | ((prev: string | null) => string | null),
  ) => void;
  countryFilter: string | null;
  setCountryFilter: (v: string | null | ((prev: string | null) => string | null)) => void;
  countries: string[];
  onRequestViewChange: (view: "incoming" | "sent") => void;
  onChatViewChange: (view: "active" | "archived") => void;
};

export default function SocialListHeader({
  segment,
  requestView,
  chatView,
  isSearching,
  query,
  setQuery,
  searching,
  searchError,
  platformFilter,
  setPlatformFilter,
  countryFilter,
  setCountryFilter,
  countries,
  onRequestViewChange,
  onChatViewChange,
}: SocialListHeaderProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    search: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      minHeight: 50,
      paddingHorizontal: 14,
      marginBottom: 14,
      borderRadius: 16,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    input: { flex: 1, color: c.text, paddingVertical: 8, fontSize: 15 },
    subTabs: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 14,
    },
    subTab: {
      flex: 1,
      minHeight: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      backgroundColor: c.accentSurface,
      borderWidth: 1,
      borderColor: c.border,
    },
    subTabActive: {
      backgroundColor: c.accent,
      borderColor: c.accent,
    },
    subTabText: { color: c.text, fontSize: 12, fontWeight: "700" },
    subTabTextActive: { color: c.onAccent },
    searchError: { marginBottom: 12, color: c.danger },
  }));

  return (
    <>
      {(segment === "friends" || segment === "requests") && (
        <View style={styles.search}>
          <Search size={18} color={colors.textMuted} />
          <CustomTextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("social.search.placeholder")}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          {query.length > 0 && (
            <PressScale onPress={() => setQuery("")}>
              <X size={18} color={colors.textMuted} />
            </PressScale>
          )}
          {searching && <X size={0} />}
        </View>
      )}

      {segment === "requests" && !isSearching && (
        <View style={styles.subTabs}>
          {["incoming", "sent"].map((view) => {
            const active = requestView === view;
            return (
              <PressScale
                key={view}
                style={[styles.subTab, active && styles.subTabActive]}
                onPress={() => onRequestViewChange(view as "incoming" | "sent")}
              >
                <CustomText
                  style={[styles.subTabText, active && styles.subTabTextActive]}
                >
                  {t(`social.requests.${view}Tab`)}
                </CustomText>
              </PressScale>
            );
          })}
        </View>
      )}

      {segment === "chats" && !isSearching && (
        <View style={styles.subTabs}>
          {["active", "archived"].map((view) => {
            const active = chatView === view;
            return (
              <PressScale
                key={view}
                style={[styles.subTab, active && styles.subTabActive]}
                onPress={() => onChatViewChange(view as "active" | "archived")}
              >
                <CustomText
                  style={[styles.subTabText, active && styles.subTabTextActive]}
                >
                  {t(`social.chats.${view}`)}
                </CustomText>
              </PressScale>
            );
          })}
        </View>
      )}

      {searchError && (
        <CustomText style={styles.searchError}>{t("social.errors.search")}</CustomText>
      )}

      {isSearching && (
        <View style={styles.subTabs}>
          {["PC", "PlayStation", "Xbox"].map((platform) => {
            const active = platformFilter === platform;
            return (
              <PressScale
                key={platform}
                style={[styles.subTab, active && styles.subTabActive]}
                onPress={() =>
                  setPlatformFilter((previous) =>
                    previous === platform ? null : platform,
                  )
                }
              >
                <CustomText
                  style={[styles.subTabText, active && styles.subTabTextActive]}
                >
                  {platform}
                </CustomText>
              </PressScale>
            );
          })}
        </View>
      )}

      {isSearching && countries.length > 0 && (
        <View style={styles.subTabs}>
          {countries.map((country) => {
            const active = countryFilter === country;
            return (
              <PressScale
                key={country}
                style={[styles.subTab, active && styles.subTabActive]}
                onPress={() =>
                  setCountryFilter((previous) => (previous === country ? null : country))
                }
              >
                <CustomText
                  style={[styles.subTabText, active && styles.subTabTextActive]}
                >
                  {country}
                </CustomText>
              </PressScale>
            );
          })}
        </View>
      )}
    </>
  );
}
