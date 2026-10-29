import { memo } from "react";
import { View, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useBottomInset, useFloatingTopInset } from "@/src/hooks/useBottomInset";
import useShimmer from "@/src/features/games/skeleton/gameDetails/useShimmer";
import SkeletonBar from "@/src/features/games/skeleton/gameDetails/SkeletonBar";

type SProps = Omit<Parameters<typeof SkeletonBar>[0], "shimmer">;

/** Placeholder shown while the article body loads / the first paint settles. */
const NewsDetailsSkeleton = memo(function NewsDetailsSkeleton() {
  const { i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith("ar");
  const topInset = useFloatingTopInset(10);
  const bottomInset = useBottomInset();
  const shimmer = useShimmer();
  const S = (p: SProps) => <SkeletonBar shimmer={shimmer} {...p} />;

  const styles = useThemeStyles(
    (c) => ({
      root: {
        flex: 1,
        backgroundColor: c.background,
        direction: isRtl ? "rtl" : "ltr",
      },
      header: {
        position: "absolute",
        top: topInset,
        left: 15,
        right: 15,
        zIndex: 10,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      },
      content: {
        padding: 15,
        paddingBottom: bottomInset,
      },
      titleContainer: {
        alignItems: "center",
        marginBottom: 16,
      },
      metaRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginHorizontal: 15,
        marginVertical: 8,
      },
      metaSiteInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      },
      badgesRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      },
      summaryCard: {
        backgroundColor: c.backgroundDeep,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: c.accentBorder,
        padding: 16,
        marginVertical: 16,
      },
      summaryHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: c.accentBorder,
      },
      bodyContainer: {
        marginTop: 8,
      },
    }),
    [topInset, bottomInset, isRtl],
  );

  return (
    <View style={styles.root}>
      {/* Floating back & share button placeholders */}
      <View style={styles.header}>
        <S width={40} height={40} radius={20} />
        <S width={40} height={40} radius={20} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Hero image placeholder */}
        <S width="100%" height={300} radius={0} />

        <View style={styles.content}>
          {/* Article Title */}
          <View style={styles.titleContainer}>
            <S width="88%" height={24} radius={6} style={{ marginBottom: 8 }} />
            <S width="64%" height={24} radius={6} />
          </View>

          {/* Meta Row 1: Site logo + name & time */}
          <View style={styles.metaRow}>
            <View style={styles.metaSiteInfo}>
              <S width={40} height={40} radius={20} />
              <S width={95} height={16} radius={4} />
            </View>
            <S width={65} height={14} radius={4} />
          </View>

          {/* Meta Row 2: Date & platform badges */}
          <View style={styles.metaRow}>
            <S width={110} height={14} radius={4} />
            <View style={styles.badgesRow}>
              <S width={55} height={24} radius={12} />
              <S width={55} height={24} radius={12} />
            </View>
          </View>

          {/* AI Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <S width={24} height={24} radius={12} />
              <S width={130} height={14} radius={4} />
            </View>
            <S width="100%" height={14} radius={4} style={{ marginBottom: 6 }} />
            <S width="92%" height={14} radius={4} style={{ marginBottom: 6 }} />
            <S width="68%" height={14} radius={4} />
          </View>

          {/* Body text paragraphs */}
          <View style={styles.bodyContainer}>
            <S width="100%" height={15} radius={4} style={{ marginBottom: 8 }} />
            <S width="96%" height={15} radius={4} style={{ marginBottom: 8 }} />
            <S width="90%" height={15} radius={4} style={{ marginBottom: 8 }} />
            <S width="60%" height={15} radius={4} style={{ marginBottom: 16 }} />

            <S width="98%" height={15} radius={4} style={{ marginBottom: 8 }} />
            <S width="92%" height={15} radius={4} style={{ marginBottom: 8 }} />
            <S width="75%" height={15} radius={4} />
          </View>

          {/* Read full article button */}
          <S width="100%" height={52} radius={12} style={{ marginVertical: 20 }} />
        </View>
      </ScrollView>
    </View>
  );
});

export default NewsDetailsSkeleton;
