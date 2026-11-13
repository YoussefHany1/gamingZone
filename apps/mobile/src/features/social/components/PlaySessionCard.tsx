import React, { memo } from "react";
import { TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import AppImage from "@/src/components/AppImage";
import { igdbImageUrl } from "@gaming-zone/utils";
import { useTranslation } from "react-i18next";
import { Gamepad2 } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import PressScale from "@/src/components/PressScale";
import GamerAvatar from "./GamerAvatar";
import PillButton from "./common/PillButton";
import type { PlaySession } from "../hooks/usePlaySessions";
import { openSessionInCalendar } from "../lib/calendarLink";
import { openSessionLink } from "../lib/sessionLink";
import { showToast } from "@/src/lib/toast";
import {
  useSessionActions,
  type SessionActionErrorHandler,
} from "../hooks/useSessionActions";
import {
  deriveSessionView,
  sessionInitials,
  type SessionActionKind,
  type SessionVariant,
} from "../lib/sessionView";
import { useGameCoverImage } from "../hooks/useGameCoverImage";
import { countdown } from "../lib/relativeTime";

export type ParticipantProfiles = Record<
  string,
  { photoURL?: string | null } | undefined
>;

export type PlaySessionCardProps = {
  session: PlaySession;
  currentUid: string;
  variant: SessionVariant;
  /** Used by the social variant for the participant avatar strip. */
  participantProfiles?: ParticipantProfiles;
  /** Social-only: opens the time picker for a still-unconfirmed session. */
  onSchedule?: ((session: PlaySession) => void) | undefined;
  /** Social-only: opens the chat linked to this session. */
  onOpenChat?: ((session: PlaySession) => void) | undefined;
  onError?: SessionActionErrorHandler;
};

type ActionTone = "primary" | "secondary" | "danger";

type ActionSurfaceProps = {
  variant: SessionVariant;
  style: StyleProp<ViewStyle>;
  onPress: () => void;
  children: React.ReactNode;
};

/**
 * The chat card has always used an opacity press state while the social card
 * scales; keep the two interactions unchanged now that they share a component.
 */
function ActionSurface({ variant, style, onPress, children }: ActionSurfaceProps) {
  if (variant === "chat") {
    return (
      <TouchableOpacity style={style} onPress={onPress}>
        {children}
      </TouchableOpacity>
    );
  }
  return (
    <PressScale style={style} onPress={onPress}>
      {children}
    </PressScale>
  );
}

/**
 * A play-session card for both the social feed and the chat header.
 *
 * `variant` only changes the layout and the lifecycle controls; the proposal
 * permission matrix lives in `deriveSessionView` and is shared by both.
 */
const PlaySessionCard = memo(
  ({
    session,
    currentUid,
    variant,
    participantProfiles,
    onSchedule,
    onOpenChat,
    onError,
  }: PlaySessionCardProps): React.ReactElement => {
    const { t, i18n } = useTranslation();
    const colors = useThemeColors();
    const runAction = useSessionActions(onError);
    const { proposal, actions } = deriveSessionView(session, currentUid, variant);
    /** IGDB artwork resolves per gameId (module-cached); null → initials tile. */
    const coverImageId = useGameCoverImage(session.gameId);
    /** A session is over once its start time has passed (or the server marked it). */
    const isCompleted =
      session.status === "completed" ||
      (session.status === "confirmed" &&
        typeof session.startsAt === "number" &&
        session.startsAt <= Date.now());

    const styles = useThemeStyles((c) => ({
      session: {
        padding: 15,
        marginBottom: 12,
        borderRadius: 20,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.accentBorder,
      },
      gameTile: {
        width: 58,
        height: 58,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.backgroundDeep,
        borderWidth: 1,
        borderColor: c.accentBorder,
      },
      /** Artwork fills the same 58×58 footprint as the initials fallback tile. */
      gameCover: {
        width: 58,
        height: 58,
        borderRadius: 16,
        backgroundColor: c.skeletonBase,
        overflow: "hidden",
      },
      gameInitial: { color: c.accentText, fontSize: 20, fontWeight: "900" },
      sessionTop: { flexDirection: "row", gap: 12, alignItems: "center" },
      sessionInfo: { flex: 1 },
      sessionTitle: { color: c.text, fontSize: 16, fontWeight: "800" },
      sessionMeta: { color: c.textMuted, fontSize: 12, marginTop: 5 },
      countdown: {
        alignSelf: "flex-start",
        marginTop: 10,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: c.accentSurface,
      },
      countdownText: { color: c.accentText, fontSize: 11, fontWeight: "800" },
      participantRow: { flexDirection: "row", alignItems: "center", marginTop: 13 },
      miniAvatar: { marginRight: -8 },
      sessionActions: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 14 },
      chip: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 7,
        backgroundColor: c.stripe,
      },
      chipText: { color: c.textMuted, fontSize: 10, fontWeight: "800" },
      /** Read-only indicator shown once a session is over. */
      completedBadge: {
        alignSelf: "flex-start",
        marginTop: 14,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: c.accentSurface,
        borderWidth: 1,
        borderColor: c.border,
      },
      completedBadgeText: { color: c.textMuted, fontSize: 11, fontWeight: "800" },
      linkRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 7,
        marginTop: 10,
      },
      linkChip: {
        maxWidth: "100%",
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: c.accentSurface,
        borderWidth: 1,
        borderColor: c.border,
      },
      linkChipText: { color: c.accentText, fontSize: 11, fontWeight: "700" },

      sessionCard: {
        marginHorizontal: 16,
        marginTop: 10,
        padding: 12,
        borderRadius: 12,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
      },
      chatActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
      sessionButton: {
        backgroundColor: c.accent,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 7,
      },
      sessionButtonText: { color: c.onAccent },
      sessionSecondary: {
        backgroundColor: c.background,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 7,
      },
      message: { color: c.text },
      muted: { color: c.textMuted, fontSize: 11 },
      gameTitle: { color: c.text, fontWeight: "700" },
    }));

    const run = (action: SessionActionKind): void => {
      void runAction(session.id, proposal?.id ?? "", action);
    };

    const renderAction = (
      kind: SessionActionKind,
      label: string,
      tone: ActionTone,
    ): React.ReactElement => {
      // The chat card keeps its compact opacity-press buttons; the
      // social card uses the shared pill button.
      if (variant === "chat") {
        return (
          <ActionSurface
            key={kind}
            variant={variant}
            style={tone === "primary" ? styles.sessionButton : styles.sessionSecondary}
            onPress={() => run(kind)}
          >
            <CustomText
              style={tone === "primary" ? styles.sessionButtonText : styles.message}
            >
              {label}
            </CustomText>
          </ActionSurface>
        );
      }
      return (
        <PillButton
          key={kind}
          label={label}
          tone={tone === "primary" ? "primary" : tone === "danger" ? "danger-outline" : "secondary"}
          onPress={() => run(kind)}
        />
      );
    };

    const startsLabel = proposal
      ? ` • ${new Date(proposal.startsAt).toLocaleString(
          variant === "social" ? i18n.language : undefined,
        )}`
      : "";

    const links = session.links ?? [];
    /** Party-room chips: open safe links, surface invalid ones as a toast. */
    const openLink = (url: string): void => {
      void openSessionLink(url).then((opened) => {
        if (!opened) showToast(t("social.sessions.links.openError"));
      });
    };
    const linkRow =
      links.length > 0 ? (
        <View style={styles.linkRow}>
          {links.map((link) => (
            <TouchableOpacity
              key={link.id}
              style={styles.linkChip}
              onPress={() => openLink(link.url)}
              accessibilityRole="link"
            >
              <CustomText style={styles.linkChipText} numberOfLines={1}>
                {link.label ?? t(`social.sessions.links.kind.${link.kind}`)}
              </CustomText>
            </TouchableOpacity>
          ))}
        </View>
      ) : null;

    const actionRow = (
      <View style={variant === "social" ? styles.sessionActions : styles.chatActions}>
        {variant === "social" && onSchedule && session.status === "proposed" ? (
          <PillButton
            key="schedule"
            label={t("social.sessions.schedule")}
            onPress={() => onSchedule(session)}
          />
        ) : null}
        {actions.accept
          ? renderAction("accept", t("social.sessions.accept"), "primary")
          : null}
        {actions.decline
          ? renderAction("decline", t("social.sessions.decline"), "secondary")
          : null}
        {actions.withdraw
          ? renderAction("withdraw", t("social.sessions.withdraw"), "secondary")
          : null}
        {variant === "chat" && actions.cancel
          ? renderAction("cancel", t("social.sessions.cancel"), "secondary")
          : null}
        {actions.leave
          ? renderAction("leave", t("social.sessions.leave"), "secondary")
          : null}
        {variant === "social" && actions.cancel
          ? renderAction("cancel", t("social.sessions.cancel"), "danger")
          : null}
        {variant === "social" && onOpenChat ? (
          <PillButton
            key="openChat"
            tone="secondary"
            label={t("social.sessions.openChat")}
            onPress={() => onOpenChat(session)}
          />
        ) : null}
        {variant === "social" && typeof session.startsAt === "number" ? (
          <PillButton
            key="calendar"
            tone="secondary"
            label={t("social.sessions.addToCalendar")}
            onPress={() => {
              if (session.startsAt === null) return;
              void openSessionInCalendar({
                gameName: session.gameName,
                startsAt: session.startsAt,
              }).then((opened) => {
                if (!opened) showToast(t("social.sessions.calendarError"));
              });
            }}
          />
        ) : null}
      </View>
    );

    if (variant === "chat") {
      return (
        <View style={styles.sessionCard}>
          <CustomText style={styles.gameTitle}>{session.gameName}</CustomText>
          <CustomText style={styles.muted}>
            {isCompleted ? t("social.sessions.completed") : session.status}
            {startsLabel}
          </CustomText>
          {linkRow}
          {!isCompleted && actionRow}
        </View>
      );
    }

    return (
      <View style={styles.session}>
        <PressScale
          style={styles.sessionTop}
          onPress={onOpenChat ? () => onOpenChat(session) : undefined}
          disabled={!onOpenChat}
        >
          {coverImageId ? (
            <AppImage
              source={{ uri: igdbImageUrl(coverImageId, "cover_small") }}
              style={styles.gameCover}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={`session-cover-${session.gameId}`}
            />
          ) : (
            <View style={styles.gameTile}>
              <Gamepad2 size={20} color={colors.accentText} />
              <CustomText style={styles.gameInitial}>
                {sessionInitials(session.gameName)}
              </CustomText>
            </View>
          )}
          <View style={styles.sessionInfo}>
            <CustomText style={styles.sessionTitle}>{session.gameName}</CustomText>
            <CustomText style={styles.sessionMeta}>
              {isCompleted ? t("social.sessions.completed") : session.status}
              {startsLabel}
            </CustomText>
            {proposal ? (
              <View style={styles.countdown}>
                <CustomText style={styles.countdownText}>
                  {countdown(proposal.startsAt, i18n.language)}
                </CustomText>
              </View>
            ) : null}
          </View>
        </PressScale>
        <View style={styles.participantRow}>
          {session.participantUids.slice(0, 5).map((participant) => (
            <View key={participant} style={styles.miniAvatar}>
              <GamerAvatar
                photoURL={participantProfiles?.[participant]?.photoURL}
                size={27}
              />
            </View>
          ))}
          <View style={styles.chip}>
            <CustomText style={styles.chipText}>
              {t("social.sessions.players", {
                count: session.participantUids.length,
              })}
            </CustomText>
          </View>
        </View>
        {linkRow}
        {!isCompleted && actionRow}
      </View>
    );
  },
);

PlaySessionCard.displayName = "PlaySessionCard";
export default PlaySessionCard;
