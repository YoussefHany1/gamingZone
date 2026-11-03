import React from "react";
import { View } from "react-native";
import { Gamepad2 } from "lucide-react-native";
import { PlaySession } from "../hooks/usePlaySessions";
import PressScale from "./PressScale";
import CustomText from "@/src/components/CustomText";
import GamerAvatar from "./GamerAvatar";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useTranslation } from "react-i18next";

type SessionCardProps = {
  item: PlaySession;
  currentUid: string;
  colors: ReturnType<typeof useThemeColors>;
  onAccept?: (proposalId: string) => void;
  onDecline?: (proposalId: string) => void;
  onWithdraw?: (proposalId: string) => void;
  onConfirm?: (proposalId: string) => void;
  onLeave?: (sessionId: string) => void;
  onCancel?: (sessionId: string) => void;
};

const SessionCard: React.FC<SessionCardProps> = ({
  item,
  currentUid,
  colors,
  onAccept,
  onDecline,
  onWithdraw,
  onConfirm,
  onLeave,
  onCancel,
}) => {
  const { t } = useTranslation();
  const styles = useThemeStyles((c) => ({
    container: {
      padding: 12,
      marginHorizontal: 16,
      marginTop: 10,
      borderRadius: 12,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    gameTitle: { color: c.text, fontSize: 16, fontWeight: "800" },
    muted: { color: c.textMuted, fontSize: 12, marginTop: 5 },
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
    chip: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 7,
      backgroundColor: c.stripe,
    },
    chipText: { color: c.textMuted, fontSize: 10, fontWeight: "800" },
    sessionActions: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 14 },
    action: {
      minHeight: 36,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingHorizontal: 12,
      borderRadius: 11,
      backgroundColor: c.accent,
    },
    secondaryButton: {
      minHeight: 36,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 11,
      borderRadius: 11,
      backgroundColor: c.accentSurface,
      borderWidth: 1,
      borderColor: c.border,
    },
    secondaryButtonText: { color: c.text, fontSize: 12, fontWeight: "700" },
    actionText: { color: c.onAccent, fontSize: 12, fontWeight: "800" },
    dangerButton: { backgroundColor: c.danger, borderColor: c.danger },
    secondaryDanger: {
      backgroundColor: c.danger,
      borderColor: c.danger,
      paddingHorizontal: 10,
      paddingVertical: 7,
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
    gameInitial: { color: c.accentText, fontSize: 20, fontWeight: "900" },
  }));

  const proposal = item.proposals.find((c) => c.status !== "withdrawn");
  const accepted = proposal?.responses[currentUid] === "accepted";
  const everyoneAccepted = Boolean(
    proposal && item.participantUids.every((p) => proposal.responses[p] === "accepted"),
  );
  const initials = item.gameName.trim().slice(0, 2).toUpperCase() || "GZ";

  return (
    <View style={styles.container}>
      <View style={styles.sessionTop}>
        <View style={styles.gameTile}>
          <Gamepad2 size={20} color={colors.accentText} />
          <CustomText style={styles.gameInitial}>{initials}</CustomText>
        </View>
        <View style={styles.sessionInfo}>
          <CustomText style={styles.sessionTitle}>{item.gameName}</CustomText>
          <CustomText style={styles.sessionMeta}>
            {item.status}
            {proposal ? ` • ${new Date(proposal.startsAt).toLocaleString()}` : ""}
          </CustomText>
          {proposal ? (
            <View style={styles.countdown}>
              <CustomText style={styles.countdownText}>
                {item.startsAt ? "⏱ " : ""}
              </CustomText>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.participantRow}>
        {item.participantUids.slice(0, 5).map((p) => (
          <View key={p} style={styles.miniAvatar}>
            <GamerAvatar photoURL={undefined} size={27} />
          </View>
        ))}
        <View style={styles.chip}>
          <CustomText style={styles.chipText}>
            {item.participantUids.length} players
          </CustomText>
        </View>
      </View>
      <View style={styles.sessionActions}>
        {proposal && !accepted && item.status === "proposed" && onAccept && (
          <PressScale style={styles.action} onPress={() => void onAccept(proposal.id)}>
            <CustomText style={styles.actionText}>Accept</CustomText>
          </PressScale>
        )}
        {proposal && accepted && item.status === "proposed" && onDecline && (
          <PressScale
            style={styles.secondaryButton}
            onPress={() => void onDecline(proposal.id)}
          >
            <CustomText style={styles.secondaryButtonText}>Decline</CustomText>
          </PressScale>
        )}
        {proposal &&
          proposal.proposerUid === currentUid &&
          item.status === "proposed" &&
          onWithdraw && (
            <PressScale
              style={styles.secondaryButton}
              onPress={() => void onWithdraw(proposal.id)}
            >
              <CustomText style={styles.secondaryButtonText}>Withdraw</CustomText>
            </PressScale>
          )}
        {proposal && everyoneAccepted && item.status === "proposed" && onConfirm && (
          <PressScale style={styles.action} onPress={() => void onConfirm(proposal.id)}>
            <CustomText style={styles.actionText}>Confirm</CustomText>
          </PressScale>
        )}
        {item.status !== "cancelled" && onLeave && (
          <PressScale
            style={styles.secondaryButton}
            onPress={() => void onLeave(item.id)}
          >
            <CustomText style={styles.secondaryButtonText}>Leave</CustomText>
          </PressScale>
        )}
        {item.participantUids.includes(currentUid) &&
          item.status !== "cancelled" &&
          item.status !== "completed" &&
          onCancel && (
            <PressScale
              style={[styles.secondaryButton, { borderColor: colors.danger }]}
              onPress={() => void onCancel(item.id)}
            >
              <CustomText style={[styles.secondaryButtonText, { color: colors.danger }]}>
                Cancel
              </CustomText>
            </PressScale>
          )}
      </View>
    </View>
  );
};

export default SessionCard;
