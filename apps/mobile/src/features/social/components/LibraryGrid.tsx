import React, { memo, useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import firestore from "@react-native-firebase/firestore";
import { useTranslation } from "react-i18next";
import type { GameEntry, PublicProfile } from "@gaming-zone/core";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { logger } from "@/src/lib/logger";
import GamePosterItem from "@/src/features/lists/components/userGames/GamePosterItem";
import { DEFAULT_LIST_IDS } from "@/src/features/lists/constants";

export type LibraryGridProps = {
  profile: PublicProfile;
  /** Owners always see their own library, even when it is hidden from visitors. */
  isOwner: boolean;
};

/**
 * How many game docs we cap per list. The profile card is a teaser, not the
 * full shelf — the games feature owns browsing complete lists.
 */
const SHOW_MAX_PER_LIST = 12;

/**
 * Lists worth showing on the profile. The order is the display order:
 * currently-playing first, then played, then the backlog.
 */
const LIBRARY_LIST_ORDER = ["playing", "played", "wantToPlay"] as const;

/**
 * Library showcase on the public profile.
 *
 * The game lists live in `users/{uid}/lists/{listId}/games` and are readable
 * by any app user (firestore.rules) — no backend aggregate needed. Privacy is
 * honored at the UI level: visitors only see it when the profile projects its
 * linked accounts (`privacy.showLinks`, the same gate the SocialLinksCard /
 * PublicLinksCard uses); the owner always sees their own card.
 */
const LibraryGrid = memo(({ profile, isOwner }: LibraryGridProps): React.ReactElement => {
  const { t } = useTranslation();
  const visible = isOwner || profile.privacy.showLinks;

  const [lists, setLists] = useState<Record<string, GameEntry[]>>({});

  useEffect(() => {
    if (!visible) {
      setLists({});
      return;
    }
    const unsubscribers = LIBRARY_LIST_ORDER.map((listId) =>
      firestore()
        .collection("users")
        .doc(profile.uid)
        .collection("lists")
        .doc(listId)
        .collection("games")
        .limit(SHOW_MAX_PER_LIST)
        .onSnapshot(
          (snapshot) => {
            setLists((current) => ({
              ...current,
              [listId]: snapshot.docs.map((doc) => ({
                ...(doc.data() as Omit<GameEntry, "id">),
                id: doc.id,
              })),
            }));
          },
          (error) => {
            logger.warn(
              `[social] Library list "${listId}" unavailable for ${profile.uid}`,
              error,
            );
          },
        ),
    );
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [profile.uid, visible]);

  // Dedupe across lists (a manually-moved game can exist in two of them) and
  // billboard the currently-playing games first.
  const games = useMemo(() => {
    const seen = new Set<string>();
    const merged: GameEntry[] = [];
    for (const listId of LIBRARY_LIST_ORDER) {
      for (const game of lists[listId] ?? []) {
        const key = String(game.id);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(game);
      }
    }
    return merged;
  }, [lists]);

  const styles = useThemeStyles((c) => ({
    cardSection: {
      // marginHorizontal: 16,
      marginBottom: 20,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    sectionTitle: {
      color: c.text,
      fontSize: 16,
      fontWeight: "800",
      marginBottom: 10,
    },
    sectionCount: { color: c.textMuted, fontSize: 12, fontWeight: "700" },
    muted: { color: c.textMuted, fontSize: 12 },
    posterCell: { width: 92, marginBottom: 0 },
    hiddenCard: {
      marginHorizontal: 16,
      marginBottom: 20,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: c.accentSurface,
    },
  }));

  if (!visible) {
    return (
      <View style={styles.hiddenCard}>
        <CustomText style={styles.muted}>{t("social.profile.libraryHidden")}</CustomText>
      </View>
    );
  }

  // No snapshot yet (still loading) or a genuinely empty library — neither
  // deserves a card on a visitor's screen.
  if (games.length === 0) return <View />;

  return (
    <View style={styles.cardSection}>
      <CustomText style={styles.sectionTitle}>
        {t("social.profile.librarySection")}{" "}
        <CustomText style={styles.sectionCount}>
          {t("social.profile.libraryCount", { count: games.length })}
        </CustomText>
      </CustomText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {games.map((game) => (
          <View key={String(game.id)} style={styles.posterCell}>
            <GamePosterItem game={game} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

LibraryGrid.displayName = "LibraryGrid";
export default LibraryGrid;
