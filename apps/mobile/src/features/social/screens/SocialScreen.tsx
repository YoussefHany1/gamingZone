import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import { Search, UserPlus } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { FriendRequest, Friendship, ProfileSearchHit } from "@gaming-zone/core";
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useSocialData } from "../hooks/useSocialData";
import { sendFriendRequest } from "../lib/friendService";

export default function SocialScreen(): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const navigation = useNavigation<any>();
  const styles = useThemeStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 80 },
    tabs: { flexDirection: "row", gap: 8, marginBottom: 14 },
    tab: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: c.surface,
    },
    activeTab: { backgroundColor: c.accent },
    tabText: { color: c.textMuted, fontWeight: "600" },
    activeTabText: { color: c.onAccent },
    search: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      marginBottom: 14,
    },
    input: { flex: 1, color: c.text, paddingVertical: 12 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 14,
      marginBottom: 8,
      borderRadius: 12,
      backgroundColor: c.surface,
    },
    rowText: { flex: 1, color: c.text },
    muted: { color: c.textMuted, fontSize: 13 },
    action: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: c.accent,
    },
    actionText: { color: c.onAccent, fontWeight: "700" },
    empty: { alignItems: "center", paddingVertical: 48 },
  }));
  const [segment, setSegment] = useState<"friends" | "requests">("friends");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { friendships, requests, results, search, error } = useSocialData();

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.trim().replace(/^@+/, "").length < 2) return;
    debounce.current = setTimeout(async () => {
      setSearching(true);
      await search(query);
      setSearching(false);
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, search]);

  const rows: Array<ProfileSearchHit | FriendRequest | Friendship> =
    query.trim().length >= 2 ? results : segment === "requests" ? requests : friendships;
  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <FlashList
        data={rows}
        keyExtractor={(item) => ("id" in item ? item.id : item.uid)}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => undefined}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.tabs}>
              {(["friends", "requests"] as const).map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.tab, segment === value && styles.activeTab]}
                  onPress={() => setSegment(value)}
                >
                  <CustomText
                    style={[styles.tabText, segment === value && styles.activeTabText]}
                  >
                    {t(`social.${value}.title`)}
                  </CustomText>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.search}>
              <Search size={18} color={colors.textMuted} />
              <CustomTextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t("social.search.placeholder")}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
              {searching && <ActivityIndicator color={colors.accent} />}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <CustomText style={styles.muted}>
              {error
                ? t("social.errors.load")
                : t(query ? "social.search.noResults" : `social.${segment}.empty`)}
            </CustomText>
          </View>
        }
        renderItem={({ item }) => {
          const isSearch = query.trim().length >= 2;
          const label = "handle" in item ? `@${item.handle}` : item.id;
          const subtitle =
            "displayName" in item
              ? item.displayName
              : "from" in item
                ? item.from
                : item.members.join(" • ");
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => {
                if ("uid" in item) {
                  navigation.getParent()?.navigate("Settings", {
                    screen: "UserProfile",
                    params: { uid: item.uid },
                  });
                }
              }}
              disabled={!("uid" in item || "from" in item)}
            >
              <View style={styles.rowText}>
                <CustomText style={styles.rowText}>{label}</CustomText>
                <CustomText style={styles.muted}>{String(subtitle)}</CustomText>
              </View>
              {isSearch && (
                <TouchableOpacity
                  style={styles.action}
                  onPress={() => {
                    if ("uid" in item) void sendFriendRequest(item.uid);
                  }}
                >
                  <UserPlus size={16} color={colors.onAccent} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}
