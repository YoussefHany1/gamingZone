import React, { useCallback, useMemo } from "react";
import { View } from "react-native";
import type { ListRenderItemInfo } from "@shopify/flash-list";
import { FlashList } from "@shopify/flash-list";
import type { StyleProp, ViewStyle } from "react-native";
import SectionTitle from "@/src/components/SectionTitle";
import ErrorState from "@/src/components/ErrorState";
import { GestureScrollView } from "@/src/components/GestureScrollView";
import { useTranslation } from "react-i18next";

type SkeletonPayload = { id: number };

/**
 * The shared section shell for the games feed's game rails.
 *
 * This is the "port, not unify" shell: every rendering divergence catalogued
 * during the Phase 3 migration is an explicit prop, never a normalisation.
 * The catalogue each prop encodes (see each section's own doc comment for
 * which values it passes and why):
 *
 * - Skeleton placement — `skeletonMode`:
 *   "list"         in-list placeholder rail below the header (RecentlyReleased,
 *                  Popular, TopRated, SteamTopSellers, Nostalgia, both Trending
 *                  internals);
 *   "inline"       the skeleton component wrapped in the list-paddings View
 *                  (FreeGames);
 *   "wholeSection" the skeleton early-returns the skeleton component *instead
 *                  of* the whole section, header included (ComingSoon,
 *                  MostAnticipated); its error branch also replaces the body.
 * - `pendingWhen`: "emptyList" keys the skeleton on `isLoading && length ===
 *   0` — the idiom every IGDB rail uses; "missingPayload" keys it on array
 *   *presence* instead (FreeGames' `isLoading && !Array.isArray(...)`,
 *   divergent only while a refetch is in flight over a cached-but-empty
 *   list).
 * - `errorMode`: "error" — plain error precedence beside the other branches.
 *   The family-A sections wrote this as `error || !Array.isArray
 *   (gamesToShow)`, and the array half is load-bearing exactly when the
 *   cache yields a non-null, non-array payload with no error set: the
 *   `?? []` normalisation only covers null, so the defence runs as an
 *    additional error container for shape-corrupted payloads. "errorWhen
 *   Empty" additionally requires `length === 0` and replaces the whole
 *   body (wholeSection mode only). "none" — RecommendedGames has no error
 *   state at all.
 * - Data-list gate: no error, payload in render shape for the mode (the
 *   normalised array for the emptyList rails — `?? []` makes a null
 *   payload list-shaped, exactly as the legacy branches ran; the *raw*
 *   array check for FreeGames' missingPayload mode — a null payload hides
 *   its list), and no pending skeleton — except `showListWhilePending`,
 *   which re-admits the list while the skeleton is up; that is the exact
 *   legacy behaviour of RecentlyReleased/TopRated (their list branches
 *   never excluded the loading frame, so the empty FlashList — with its
 *   `ListEmptyComponent` — renders under the skeleton).
 * - `emptyState`: the ListEmptyComponent message — "serverError" everywhere
 *   except SteamTopSellers/the Trending rails ("noResults", with the legacy
 *   i18n `defaultValue` "No games found") and RecommendedGames (none).
 * - `listRequiresData` / `collapseWhenIdleEmpty`: RecommendedGames only —
 *   the list renders only when non-empty, and the *entire section* returns
 *   `null` (title included) when idle and empty.
 * - `extraData`: forwarded to FlashList (MostAnticipated's bell state).
 * - Skeleton rails that historically ran on the native ScrollView and/or
 *   carried a keyExtractor set `skeletonWithScrollComponent` /
 *   `skeletonWithKeyExtractor`; the defaults are the bare legacy lists.
 * - `headerTrailing`: FreeGames' notification bell in the header row.
 *
 * The styles prop carries each section's own style objects, built in the
 * section through `useThemeStyles` exactly as they are today, so the shell
 * owns no styling semantics of its own. Its one sunk constant is the
 * skeleton payload: typed `{ id: number }[]` (what the legacy `as any`
 * always stood for) and `useMemo`ed — the FlashList no longer re-renders
 * the whole skeleton rail on every parent render. Invisible, and it turns
 * the legacy's half-hoisted payloads into one honest shape.
 */
export type GameSectionProps<T> = {
  /** Already-translated section title; each section owns its i18n keys. */
  title: string;
  subtitle?: string;
  headerFontSize?: number;
  /** Optional element rendered after the title in the header row. */
  headerTrailing?: React.ReactElement;
  games: T[] | null;
  isLoading: boolean;
  error: Error | null;
  /** Card renderer; replaces FlashList's renderItem callback shape. */
  renderCard: (item: T, index: number) => React.ReactElement;
  /** Skeleton component factory, used by every `skeletonMode`. */
  renderSkeletonItem: () => React.ReactElement;
  skeletonMode?: "list" | "inline" | "wholeSection";
  skeletonRows?: number;
  skeletonWithScrollComponent?: boolean;
  skeletonWithKeyExtractor?: boolean;
  pendingWhen?: "emptyList" | "missingPayload";
  errorMode?: "error" | "errorWhenEmpty" | "none";
  horizontal?: boolean;
  useGestureScroll?: boolean;
  snapToInterval?: number;
  extraData?: unknown;
  showListWhilePending?: boolean;
  emptyState?: "serverError" | "noResults" | "none";
  listRequiresData?: boolean;
  collapseWhenIdleEmpty?: boolean;
  styles: {
    container?: StyleProp<ViewStyle>;
    headerContainer: StyleProp<ViewStyle>;
    errorContainer?: StyleProp<ViewStyle>;
    listContent: StyleProp<ViewStyle>;
  };
};

function GameSection<T extends { id: string | number }>({
  title,
  subtitle,
  headerFontSize = 24,
  headerTrailing,
  games,
  isLoading,
  error,
  renderCard,
  renderSkeletonItem,
  skeletonMode = "list",
  skeletonRows = 5,
  skeletonWithScrollComponent = false,
  skeletonWithKeyExtractor = false,
  pendingWhen = "emptyList",
  errorMode = "error",
  horizontal = false,
  useGestureScroll = false,
  snapToInterval,
  extraData,
  showListWhilePending = false,
  emptyState = "serverError",
  listRequiresData = false,
  collapseWhenIdleEmpty = false,
  styles,
}: GameSectionProps<T>): React.ReactElement | null {
  const { t } = useTranslation();

  // `gamesShowable` — the identical `games ?? []` normalisation every ported
  // section performs before branching (rendering family A's array-defence
  // vestigial; see the type docs).
  const gamesShowable: T[] = games ?? [];
  const hasData = Array.isArray(games) && games.length > 0;

  const skeletonPending =
    pendingWhen === "missingPayload"
      ? isLoading && !Array.isArray(games)
      : isLoading && gamesShowable.length === 0;

  // Payload in render shape for this mode: the normalised array for the
  // emptyList rails (so a null payload is list-shaped, as the legacy's
  // `?? []` branches ran), the raw array check for FreeGames (a null
  // payload hides its list). Recommended's listRequiresData folds in on
  // top. This is the real weight behind the legacy's Array.isArray
  // defences — see the type docs.
  const payloadInShape = listRequiresData
    ? hasData
    : pendingWhen === "missingPayload"
      ? Array.isArray(games)
      : Array.isArray(gamesShowable);

  const showList =
    errorMode === "none"
      ? !error && payloadInShape && !isLoading
      : !error && payloadInShape && (!skeletonPending || showListWhilePending);

  // Skeleton placeholders — hoisted once instead of rebuilt inline per
  // render (what the legacy did in some sections and not others).
  const skeletonData = useMemo<SkeletonPayload[]>(
    () => Array.from({ length: skeletonRows }, (_, i) => ({ id: i })),
    [skeletonRows],
  );

  const renderDataItem = useCallback(
    ({ item, index }: ListRenderItemInfo<T>) => renderCard(item, index),
    [renderCard],
  );

  const skeletonSlot = useCallback(
    () => renderSkeletonItem(),
    [renderSkeletonItem],
  );

  const emptyListMessage =
    emptyState === "noResults"
      ? t("games.list.noResults", "No games found")
      : t("games.list.serverError");

  // Conditional spreads instead of `undefined` values: with
  // `exactOptionalPropertyTypes`, an optional prop must not receive an
  // explicit undefined — these spreads land only when the prop is in play,
  // which is exactly how the ported sections omitted them.
  const listProps = {
    ...(horizontal
      ? { horizontal: true as const, showsHorizontalScrollIndicator: false }
      : { showsVerticalScrollIndicator: false }),
    contentContainerStyle: styles.listContent,
    ...(snapToInterval !== undefined && { snapToInterval, decelerationRate: "fast" as const }),
    ...(extraData !== undefined && { extraData }),
  } as const;

  // ---- wholeSection mode: skeleton and error REPLACE the section body ----
  if (skeletonMode === "wholeSection") {
    if (skeletonPending) return renderSkeletonItem();

    if (errorMode === "errorWhenEmpty" && !!error && gamesShowable.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <ErrorState message={t("games.list.serverError")} />
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <SectionTitle
            title={title}
            {...(subtitle !== undefined && { subtitle })}
            fontSize={headerFontSize}
          />
        </View>
        <FlashList
          // Unconditional list: wholeSection sections reaching this point have
          // already dispatched pending and error — ComingSoon/MostAnticipated
          // render the list with no third guard.
          {...(useGestureScroll && { renderScrollComponent: GestureScrollView })}
          data={gamesShowable}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderDataItem}
          {...listProps}
          ListEmptyComponent={
            <View style={styles.errorContainer}>
              <ErrorState message={emptyListMessage} />
            </View>
          }
        />
      </View>
    );
  }

  // ---- idle-and-empty section collapse (RecommendedGames) ----
  if (collapseWhenIdleEmpty && !isLoading && !hasData) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <SectionTitle
          title={title}
          {...(subtitle !== undefined && { subtitle })}
          fontSize={headerFontSize}
        />
        {headerTrailing}
      </View>

      {skeletonPending && skeletonMode === "inline" && (
        <View style={styles.listContent}>{renderSkeletonItem()}</View>
      )}

      {skeletonPending && skeletonMode === "list" && (
        <FlashList
          data={skeletonData}
          horizontal={horizontal}
          renderItem={skeletonSlot}
          {...(skeletonWithKeyExtractor && {
            keyExtractor: (item: SkeletonPayload) => String(item.id),
          })}
          {...(skeletonWithScrollComponent && { renderScrollComponent: GestureScrollView })}
          {...(horizontal
            ? { showsHorizontalScrollIndicator: false }
            : { showsVerticalScrollIndicator: false })}
          contentContainerStyle={styles.listContent}
        />
      )}

      {errorMode === "error" && (!!error || !Array.isArray(gamesShowable)) && (
        <View style={styles.errorContainer}>
          <ErrorState message={t("games.list.serverError")} />
        </View>
      )}

      {showList && (
        <FlashList
          {...(useGestureScroll && { renderScrollComponent: GestureScrollView })}
          data={gamesShowable}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderDataItem}
          {...listProps}
          ListEmptyComponent={
            emptyState !== "none" ? (
              <View style={styles.errorContainer}>
                <ErrorState message={emptyListMessage} />
              </View>
            ) : undefined
          }
        />
      )}
    </View>
  );
}

GameSection.displayName = "GameSection";

export { GameSection };
