import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import type { SocialStackParamList } from "@/src/navigation/AppNavigator";
import { FlashList } from "@shopify/flash-list";
import { Check, Search, UserPlus, X } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type {
  Conversation,
  FriendRequest,
  Friendship,
  ProfileSearchHit,
} from "@gaming-zone/core";
type SocialParentNavigation = {
  Settings: { screen: "UserProfile"; params: { uid: string } };
};
import CustomText from "@/src/components/CustomText";
import CustomTextInput from "@/src/components/CustomTextInput";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useSocialData } from "../hooks/useSocialData";
import { respondFriendRequest, sendFriendRequest } from "../lib/friendService";

export default function SocialScreen(): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const navigation =
    useNavigation<NavigationProp<SocialStackParamList & SocialParentNavigation>>();
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
    dangerAction: { backgroundColor: c.danger },
    empty: { alignItems: "center", paddingVertical: 48 },
    searchError: { marginBottom: 12, color: c.danger },
  }));
  const [segment, setSegment] = useState<"friends" | "requests" | "chats">("friends");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    uid,
    friendships,
    friendProfiles,
    requests,
    conversations,
    results,
    search,
    searchError,
  } = useSocialData();

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

  const rows: Array<ProfileSearchHit | FriendRequest | Friendship | Conversation> =
    query.trim().length >= 2
      ? results
      : segment === "requests"
        ? requests
        : segment === "chats"
          ? conversations
          : friendships;

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length >= 2;
  const emptyText = isSearching
    ? t("social.search.noResults")
    : t(`social.${segment}.empty`);

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
              {(["friends", "requests", "chats"] as const).map((value) => (
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
            {searchError ? (
              <CustomText style={[styles.muted, styles.searchError]}>
                {t("social.errors.search")}
              </CustomText>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <CustomText style={styles.muted}>{emptyText}</CustomText>
          </View>
        }
        renderItem={({ item }) => {
          const isSearch = query.trim().length >= 2;
          const isConversation =
            "type" in item && (item.type === "dm" || item.type === "group");

          let label = "";
          let subtitle = "";

          if (isSearch && "handle" in item) {
            // Search results: @handle as label, displayName as subtitle
            label = `@${item.handle}`;
            subtitle = item.displayName;
          } else if ("from" in item) {
            // Friend request: sender's displayName as label, @handle as subtitle
            const profile = friendProfiles[item.from];
            label = profile?.displayName ?? "Player";
            subtitle = profile?.handle ? `@${profile.handle}` : "";
          } else if (isConversation) {
            // Conversation row
            if (item.type === "dm") {
              const otherUid = item.members.find((member) => member !== uid);
              const profile = otherUid ? friendProfiles[otherUid] : null;
              label = profile?.displayName ?? "Player";
              subtitle = item.lastMessage?.text ?? "No messages yet";
            } else {
              label = item.title ?? "Group";
              subtitle = item.lastMessage?.text ?? "No messages yet";
            }
          } else if ("members" in item) {
            // Friendship: friend's displayName as label, @handle as subtitle
            const otherUid = item.members.find((member) => member !== uid);
            const profile = otherUid ? friendProfiles[otherUid] : null;
            label = profile?.displayName ?? "Player";
            subtitle = profile?.handle ? `@${profile.handle}` : "";
          } else {
            label = "";
          }

          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => {
                if (isConversation) {
                  navigation.navigate("ChatScreen", { conversationId: item.id });
                  return;
                }
                const targetUid =
                  "uid" in item
                    ? item.uid
                    : "from" in item
                      ? item.from
                      : item.members.find((member) => member !== uid);
                if (targetUid) {
                  navigation.getParent()?.navigate("Settings", {
                    screen: "UserProfile",
                    params: { uid: targetUid },
                  });
                }
              }}
              disabled={
                !isConversation && !("uid" in item || "from" in item || "members" in item)
              }
            >
              <View style={styles.rowText}>
                <CustomText style={styles.rowText}>{label}</CustomText>
                {subtitle ? (
                  <CustomText style={styles.muted}>{subtitle}</CustomText>
                ) : null}
              </View>
              {isSearch && "uid" in item && (
                <TouchableOpacity
                  style={styles.action}
                  onPress={() => void sendFriendRequest(item.uid)}
                >
                  <UserPlus size={16} color={colors.onAccent} />
                </TouchableOpacity>
              )}
              {!isSearch && "from" in item && (
                <>
                  <TouchableOpacity
                    style={styles.action}
                    onPress={() => void respondFriendRequest(item.from, "accept")}
                  >
                    <Check size={16} color={colors.onAccent} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.action, styles.dangerAction]}
                    onPress={() => void respondFriendRequest(item.from, "decline")}
                  >
                    <X size={16} color={colors.onAccent} />
                  </TouchableOpacity>
                </>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}
