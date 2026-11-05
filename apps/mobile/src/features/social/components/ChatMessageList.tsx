import React, { memo } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { Check, CheckCheck, MessageCircle } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { SocialMessage } from "@gaming-zone/core";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import GamingEmptyState from "./GamingEmptyState";
import type { ChatSenderProfile } from "../lib/profileLookup";

export type ChatMessageListProps = {
  messages: SocialMessage[];
  olderMessages: SocialMessage[];
  uid: string;
  senderProfiles: Record<string, ChatSenderProfile>;
  /**
   * The peer's `lastReadAt` (1:1 chats only, null otherwise). Drives the
   * read ticks on own messages: single Check once sent, accent CheckCheck
   * once the peer's read position passes the message timestamp.
   */
  otherLastReadAt: number | null;
  loading: boolean;
  loadError: boolean;
  hasOlderMessages: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => Promise<void>;
  onShowActions: (message: SocialMessage) => void;
};

function formatMessageTime(value: number | null): string {
  if (typeof value !== "number") return "";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * The scrollable part of a conversation: empty/loading/error states, the
 * "load older" header and the reversed message list.
 */
const ChatMessageList = memo(
  ({
    messages,
    olderMessages,
    uid,
    senderProfiles,
    otherLastReadAt,
    loading,
    loadError,
    hasOlderMessages,
    loadingOlder,
    onLoadOlder,
    onShowActions,
  }: ChatMessageListProps): React.ReactElement => {
    const { t } = useTranslation();
    const colors = useThemeColors();
    const styles = useThemeStyles((c) => ({
      content: { padding: 16, paddingBottom: 10 },
      messageRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 8,
        marginBottom: 8,
      },
      ownRow: { justifyContent: "flex-end" },
      avatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: c.surface,
      },
      bubble: {
        maxWidth: "78%",
        padding: 11,
        borderRadius: 16,
        backgroundColor: c.surface,
      },
      ownBubble: { backgroundColor: c.accent, borderBottomRightRadius: 5 },
      receivedBubble: { borderBottomLeftRadius: 5 },
      edited: { color: c.onAccent, fontSize: 10, fontStyle: "italic" },
      message: { color: c.text },
      muted: { color: c.textMuted, fontSize: 11 },
      gameCard: {
        marginTop: 8,
        padding: 10,
        borderRadius: 10,
        backgroundColor: c.background,
      },
      gameTitle: { color: c.text, fontWeight: "700" },
      gameLink: { color: c.accent, fontSize: 12, marginTop: 4 },
      messageMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
      ownMessage: { color: c.onAccent },
      tickSent: { opacity: 0.55 },
      empty: { flex: 1, alignItems: "center", justifyContent: "center" },
      sessionSecondary: {
        backgroundColor: c.background,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 7,
      },
    }));

    if (loading) {
      return (
        <View style={styles.empty}>
          <ActivityIndicator color={colors.accent} />
        </View>
      );
    }

    if (loadError) {
      return (
        <View style={styles.empty}>
          <CustomText style={[styles.message, { color: colors.danger }]}>
            {t("social.chats.unableLoad")}
          </CustomText>
        </View>
      );
    }

    if (messages.length === 0) {
      return (
        <View style={styles.empty}>
          <GamingEmptyState title={t("social.chats.start")} icon={MessageCircle} />
        </View>
      );
    }

    return (
      <FlashList
        data={[...messages, ...olderMessages].reverse()}
        keyExtractor={(item) => item.id}
        extraData={senderProfiles}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          hasOlderMessages ? (
            <TouchableOpacity
              style={styles.sessionSecondary}
              onPress={() => void onLoadOlder()}
              disabled={loadingOlder}
            >
              <CustomText style={styles.message}>
                {loadingOlder ? t("social.chats.loading") : t("social.chats.loadOlder")}
              </CustomText>
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item }) => {
          const own = item.senderId === uid;
          const senderProfile = senderProfiles[item.senderId];
          const showAvatar = !own && item.senderId !== "system";
          const avatarSource = senderProfile?.photoURL
            ? { uri: senderProfile.photoURL }
            : require("@/assets/default_profile.webp");

          return (
            <View style={[styles.messageRow, own && styles.ownRow]}>
              {showAvatar ? (
                <Image
                  source={avatarSource}
                  style={styles.avatar}
                  contentFit="cover"
                  transition={150}
                  cachePolicy="memory-disk"
                  accessibilityIgnoresInvertColors
                />
              ) : null}
              <TouchableOpacity
                activeOpacity={1}
                onLongPress={() => onShowActions(item)}
                delayLongPress={350}
                style={[styles.bubble, own ? styles.ownBubble : styles.receivedBubble]}
              >
                <CustomText style={[styles.message, own && styles.ownMessage]}>
                  {item.deletedFor.includes(uid) ? t("social.chats.removed") : item.text}
                </CustomText>
                {!item.deletedFor.includes(uid) &&
                item.type === "game_suggestion" &&
                item.gameName ? (
                  <View style={styles.gameCard}>
                    <CustomText style={styles.gameTitle}>{item.gameName}</CustomText>
                    <CustomText style={styles.gameLink}>
                      {t("social.chats.openGame")}
                    </CustomText>
                  </View>
                ) : null}
                <View style={styles.messageMeta}>
                  <CustomText style={[styles.muted, own && styles.ownMessage]}>
                    {formatMessageTime(item.createdAt)}
                  </CustomText>
                  {item.editedAt ? (
                    <CustomText style={styles.edited}>
                      {t("social.chats.edited")}
                    </CustomText>
                  ) : null}
                  {own && typeof item.createdAt === "number" && item.senderId !== "system" ? (
                    (otherLastReadAt !== null && otherLastReadAt >= item.createdAt) ? (
                      <CheckCheck
                        size={14}
                        color={colors.onAccent}
                        accessibilityLabel={t("social.chats.read")}
                      />
                    ) : (
                      <Check
                        size={14}
                        color={colors.onAccent}
                        style={styles.tickSent}
                        accessibilityLabel={t("social.chats.sent")}
                      />
                    )
                  ) : null}
                </View>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    );
  },
);

ChatMessageList.displayName = "ChatMessageList";
export default ChatMessageList;
