import React, { memo, useRef, useEffect, useMemo, useCallback } from "react";
import { Pressable, View } from "react-native";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import AppImage from "@/src/components/AppImage";
import { Check, CheckCheck, MessageCircle } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { SocialMessage } from "@gaming-zone/core";
import CustomText from "@/src/components/CustomText";
import SkeletonChat from "../skeleton/SkeletonChat";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import GamingEmptyState from "@/src/components/GamingEmptyState";
import GameCoverThumbnail from "./social/GameCoverThumbnail";
import type { ChatSenderProfile } from "../lib/profileLookup";
import type { ThemeColors } from "@/src/constants/colors";

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

// ── Styles (single sheet shared by the list and every row) ───────────────────
const chatStylesFactory = (c: ThemeColors) => ({
  content: { padding: 16, paddingBottom: 10 },
  messageRow: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    gap: 8,
    marginBottom: 8,
  },
  ownRow: { justifyContent: "flex-end" as const },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.surface,
  },
  bubble: {
    maxWidth: "78%" as const,
    padding: 11,
    borderRadius: 16,
    backgroundColor: c.surface,
  },
  ownBubble: { backgroundColor: c.accent, borderBottomRightRadius: 5 },
  receivedBubble: { borderBottomLeftRadius: 5 },
  edited: { color: c.onAccent, fontSize: 10, fontStyle: "italic" as const },
  message: { color: c.text },
  muted: { color: c.textMuted, fontSize: 11 },
  gameCard: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: c.background,
  },
  gameTitle: { color: c.text, fontWeight: "700" as const },
  gameLink: { color: c.accent, fontSize: 12, marginTop: 4 },
  messageMeta: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginTop: 4,
  },
  ownMessage: { color: c.onAccent },
  tickSent: { opacity: 0.55 },
  empty: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
  sessionSecondary: {
    backgroundColor: c.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
});
type ChatStyles = Readonly<ReturnType<typeof chatStylesFactory>>;

// ── Single message row ───────────────────────────────────────────────────────
type MessageRowProps = {
  item: SocialMessage;
  uid: string;
  senderProfile: ChatSenderProfile | undefined;
  otherLastReadAt: number | null;
  onShowActions: (message: SocialMessage) => void;
  onAccent: string;
  styles: ChatStyles;
};

/**
 * Memoized row: re-renders only when its own message, the sender's profile,
 * the peer's read position or the theme changes — not on every list update.
 */
const MessageRow = memo(function MessageRow({
  item,
  uid,
  senderProfile,
  otherLastReadAt,
  onShowActions,
  onAccent,
  styles,
}: MessageRowProps): React.ReactElement {
  const { t } = useTranslation();
  const own = item.senderId === uid;
  const showAvatar = !own && item.senderId !== "system";
  const avatarSource = senderProfile?.photoURL
    ? { uri: senderProfile.photoURL }
    : // Metro caches the module, so the inline require is resolved once.
      require("@/assets/default_profile.webp");

  return (
    <View style={[styles.messageRow, own && styles.ownRow]}>
      {showAvatar ? (
        <AppImage
          source={avatarSource}
          style={styles.avatar}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <Pressable
        onLongPress={() => onShowActions(item)}
        delayLongPress={350}
        style={[styles.bubble, own ? styles.ownBubble : styles.receivedBubble]}
      >
        {item.type === "system" && item.gameId ? (
          <GameCoverThumbnail gameId={item.gameId} />
        ) : null}
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
          {own &&
          typeof item.createdAt === "number" &&
          item.senderId !== "system" ? (
            otherLastReadAt !== null && otherLastReadAt >= item.createdAt ? (
              <CheckCheck
                size={14}
                color={onAccent}
                accessibilityLabel={t("social.chats.read")}
              />
            ) : (
              <Check
                size={14}
                color={onAccent}
                style={styles.tickSent}
                accessibilityLabel={t("social.chats.sent")}
              />
            )
          ) : null}
        </View>
      </Pressable>
    </View>
  );
});
MessageRow.displayName = "MessageRow";

const keyExtractor = (item: SocialMessage): string => item.id;

/**
 * The scrollable part of a conversation: skeleton/empty/error states, the
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
    const listRef = useRef<FlashListRef<SocialMessage>>(null);
    const prevFirstMessageId = useRef<string | null>(null);

    // Keep the view pinned to the newest messages on initial load and whenever
    // a new message arrives, without yanking the user back down while they are
    // paging through older history.
    useEffect(() => {
      const firstId = messages[0]?.id ?? null;
      const shouldScroll = firstId !== null && firstId !== prevFirstMessageId.current;
      prevFirstMessageId.current = firstId;
      if (!shouldScroll) return;
      const frame = requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: false });
      });
      return () => cancelAnimationFrame(frame);
    }, [messages]);

    const styles = useThemeStyles(chatStylesFactory);

    // Rebuilt only when the underlying pages change — never a fresh spread +
    // reverse copy on every render of the chat screen.
    const data = useMemo(
      () => [...messages, ...olderMessages].reverse(),
      [messages, olderMessages],
    );

    // Read ticks depend on `otherLastReadAt` too, so it must be part of the
    // extra-data identity for rows to repaint when the peer catches up.
    const extraData = useMemo(
      () => ({ senderProfiles, otherLastReadAt }),
      [senderProfiles, otherLastReadAt],
    );

    const renderItem = useCallback(
      ({ item }: { item: SocialMessage }): React.ReactElement => (
        <MessageRow
          item={item}
          uid={uid}
          senderProfile={senderProfiles[item.senderId]}
          otherLastReadAt={otherLastReadAt}
          onShowActions={onShowActions}
          onAccent={colors.onAccent}
          styles={styles}
        />
      ),
      [uid, senderProfiles, otherLastReadAt, onShowActions, colors.onAccent, styles],
    );

    if (loading) {
      return <SkeletonChat />;
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
        ref={listRef}
        data={data}
        keyExtractor={keyExtractor}
        extraData={extraData}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          hasOlderMessages ? (
            <Pressable
              style={({ pressed }) => [
                styles.sessionSecondary,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => void onLoadOlder()}
              disabled={loadingOlder}
              android_ripple={{ color: "rgba(128,128,128,0.25)", borderless: false }}
              accessibilityRole="button"
            >
              <CustomText style={styles.message}>
                {loadingOlder ? t("social.chats.loading") : t("social.chats.loadOlder")}
              </CustomText>
            </Pressable>
          ) : null
        }
        renderItem={renderItem}
      />
    );
  },
);

ChatMessageList.displayName = "ChatMessageList";
export default ChatMessageList;
