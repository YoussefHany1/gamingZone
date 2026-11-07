import React from "react";
import { View } from "react-native";
import { Search, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import PressScale from "@/src/components/PressScale";
import ToggleChipRow from "../common/ToggleChipRow";
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
  // The search spinner is no longer rendered inline; the prop stays part of
  // the header contract for the social screen wiring.
  searching: _searching,
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
        </View>
      )}

      {segment === "requests" && !isSearching && (
        <ToggleChipRow
          options={[
            { key: "incoming", label: t("social.requests.incomingTab") },
            { key: "sent", label: t("social.requests.sentTab") },
          ]}
          value={requestView}
          onChipPress={(key) => onRequestViewChange(key as "incoming" | "sent")}
        />
      )}

      {segment === "chats" && !isSearching && (
        <ToggleChipRow
          options={[
            { key: "active", label: t("social.chats.active") },
            { key: "archived", label: t("social.chats.archived") },
          ]}
          value={chatView}
          onChipPress={(key) => onChatViewChange(key as "active" | "archived")}
        />
      )}

      {searchError && (
        <CustomText style={styles.searchError}>{t("social.errors.search")}</CustomText>
      )}

      {isSearching && (
        <ToggleChipRow
          options={["PC", "PlayStation", "Xbox"].map((platform) => ({
            key: platform,
            label: platform,
          }))}
          value={platformFilter}
          onChipPress={(key) =>
            setPlatformFilter((previous) => (previous === key ? null : key))
          }
        />
      )}

      {isSearching && countries.length > 0 && (
        <ToggleChipRow
          options={countries.map((country) => ({ key: country, label: country }))}
          value={countryFilter}
          onChipPress={(key) =>
            setCountryFilter((previous) => (previous === key ? null : key))
          }
        />
      )}
    </>
  );
}
