import React from "react";
import { View } from "react-native";
import SkeletonItem from "@/src/components/SkeletonItem";
import { usePulseAnimation } from "@/src/components/skeleton/shared";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

/** Bubble widths and line counts for each placeholder row (alternating sides). */
const BUBBLES: Array<{ own: boolean; width: `${number}%`; lines: 1 | 2 }> = [
  { own: false, width: "62%", lines: 2 },
  { own: true, width: "48%", lines: 1 },
  { own: false, width: "36%", lines: 1 },
  { own: true, width: "70%", lines: 2 },
  { own: false, width: "52%", lines: 2 },
];

/**
 * Message-bubble skeletons for the chat's first load, mirroring the real
 * ChatMessageList bubbles (maxWidth 78%, radius 16 with the corner tail,
 * 28px peer avatar on received rows). The skeleton base color stays
 * visible on top of the accent own-bubbles, so one theme pair serves both.
 */
const SkeletonChat = (): React.ReactElement => {
  const animatedStyle = usePulseAnimation();
  const styles = useThemeStyles((c) => ({
    container: { flex: 1, padding: 16 },
    row: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 8 },
    ownRow: { justifyContent: "flex-end" },
    avatar: { width: 28, height: 28, borderRadius: 14 },
    bubble: {
      maxWidth: "78%",
      padding: 11,
      borderRadius: 16,
      backgroundColor: c.surface,
    },
    receivedBubble: { borderBottomLeftRadius: 5 },
    ownBubble: { backgroundColor: c.accent, borderBottomRightRadius: 5 },
    lines: { gap: 7 },
    line: { width: "100%", height: 11, borderRadius: 6 },
  }));

  return (
    <View style={styles.container}>
      {BUBBLES.map((bubble, index) => (
        <View key={index} style={[styles.row, bubble.own && styles.ownRow]}>
          {!bubble.own ? <SkeletonItem animatedStyle={animatedStyle} style={styles.avatar} /> : null}
          <View
            style={[
              styles.bubble,
              bubble.own ? styles.ownBubble : styles.receivedBubble,
              { width: bubble.width },
            ]}
          >
            <View style={styles.lines}>
              {Array.from({ length: bubble.lines }, (_, lineIndex) => (
                <SkeletonItem
                  key={lineIndex}
                  animatedStyle={animatedStyle}
                  style={styles.line}
                />
              ))}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

export default React.memo(SkeletonChat);
