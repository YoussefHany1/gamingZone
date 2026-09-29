import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type { Day, Locale, Month } from "date-fns";
import { ar, enUS, es, fr, hi, pt, ptBR } from "date-fns/locale";
import { CalendarX, ChevronLeft, ChevronRight } from "lucide-react-native";
import { igdbImageUrl } from "@gaming-zone/utils";
import CustomText from "@/src/components/CustomText";
import SectionTitle from "@/src/components/SectionTitle";
import ErrorState from "@/src/components/ErrorState";
import COLORS from "@/src/constants/colors";
import useCachedData from "@/src/hooks/useCachedData";
import { useCountdown } from "@/src/hooks/useCountdown";
import { fetchReleaseCalendarGames } from "@/src/services/api/igdbApi";
import type { Game } from "@/src/types/sharedTypes";
import SkeletonReleaseCalendar from "../skeleton/SkeletonReleaseCalendar";
import {
  DAY_SECONDS,
  currentUtcMonth,
  monthGridUtc,
  parseDayKey,
  shiftMonth,
  todayUtcMidnight,
  utcDayKey,
} from "../lib/calendarDates";

// ─── Constants ────────────────────────────────────────────────────────────────

/** How far back the request window reaches. */
const PAST_DAYS = 7;
/** How far forward the request window reaches, inclusive of the final day. */
const FUTURE_DAYS = 30;

/** Stable empty arrays so absent fields don't churn referential equality. */
const EMPTY_GAMES: Game[] = [];
const EMPTY_PLATFORMS: NonNullable<Game["platforms"]> = [];

/** The request window is a pure function of the UTC day. */
function windowForToday(todayUtcTs: number): { from: number; to: number } {
  return {
    from: todayUtcTs - PAST_DAYS * DAY_SECONDS,
    // +1 day, then -1s, lands on 23:59:59 UTC of the final day.
    to: todayUtcTs + (FUTURE_DAYS + 1) * DAY_SECONDS - 1,
  };
}

/**
 * Hard cap on rendered rows per day.
 *
 * Releases cluster hard on Thursdays and on AAA drop days, so a single day can
 * otherwise run far past a sane render budget. The grid badge always reports
 * the uncapped total, so the truncation stays visible rather than silent.
 */
const MAX_ROWS_PER_DAY = 5;

/** Within-day freshness only; the window itself is anchored to the UTC day. */
const TTL_MS = 30 * 60_000;

// ─── Localised month / weekday names ───────────────────────────────────────────

/**
 * date-fns locales for the shipped languages.
 * date-fns has no `pt-PT`; its base `pt` module is European Portuguese.
 */
const LOCALES: Record<string, Locale> = {
  en: enUS,
  ar,
  es,
  fr,
  hi,
  "pt-BR": ptBR,
  "pt-PT": pt,
};

function resolveLocale(lang: string): Locale {
  const exact = LOCALES[lang];
  if (exact) return exact;
  // `split()[0]` is `string | undefined` under noUncheckedIndexedAccess, and
  // an empty locale string ("" from e.g. "pt-") must not index the map.
  const base = lang.split("-")[0];
  return (base !== undefined ? LOCALES[base] : undefined) ?? enUS;
}

/**
 * Weekday header labels, Monday-first to match `monthGridUtc`.
 *
 * `Locale.localize` takes an index rather than a date, so the device timezone
 * cannot affect the result — unlike date-fns' `format`, which this file
 * deliberately avoids for anything that maps a timestamp to a calendar day.
 */
function weekdayLabels(locale: Locale): string[] {
  return Array.from({ length: 7 }, (_, col) =>
    // Monday-first index -> Date#getDay-style index (0 = Sunday).
    locale.localize.day(((col + 1) % 7) as Day, { width: "narrow" }),
  );
}

function monthLabel(locale: Locale, year: number, month: number): string {
  // "wide" is date-fns' full month name ("March"); "short"/"abbreviated" are
  // the truncated forms.
  return `${locale.localize.month(month as Month, { width: "wide" })} ${year}`;
}

// ─── Row ──────────────────────────────────────────────────────────────────────

type DayGameRowProps = { game: Game };

const DayGameRow = memo<DayGameRowProps>(({ game }) => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  // Minute precision is plenty for a calendar row, and keeps the home screen
  // from re-rendering every row every second (see useCountdown's own notes).
  const timeLeft = useCountdown(game.first_release_date, 60_000);

  // useCountdown returns null for any past timestamp, so distinguish "already
  // released" from "releases today" — the window looks 7 days back.
  const isPast = useMemo(
    () =>
      game.first_release_date !== undefined &&
      game.first_release_date * 1000 < Date.now(),
    [game.first_release_date],
  );

  const handlePress = useCallback(() => {
    navigation.navigate("GameDetails", { gameID: game.id });
  }, [navigation, game.id]);

  const platforms = useMemo(() => game.platforms ?? EMPTY_PLATFORMS, [game.platforms]);

  let statusLabel: React.ReactNode;
  if (timeLeft) {
    statusLabel = (
      <CustomText style={styles.rowCountdown}>
        {`${t("games.list.mostAnticipated.countdown.days")} ${timeLeft.days} · ${t(
          "games.list.mostAnticipated.countdown.hours",
        )} ${timeLeft.hours}`}
      </CustomText>
    );
  } else {
    statusLabel = (
      <CustomText style={isPast ? styles.rowReleased : styles.rowOutNow}>
        {isPast ? t("home.releaseCalendar.released") : t("home.releaseCalendar.outNow")}
      </CustomText>
    );
  }

  return (
    <TouchableOpacity style={styles.gameRow} onPress={handlePress} activeOpacity={0.85}>
      <Image
        source={
          game.cover?.image_id
            ? { uri: igdbImageUrl(game.cover.image_id, "cover_med") }
            : require("@/assets/image-not-found.webp")
        }
        style={styles.rowCover}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={game.cover?.image_id || String(game.id)}
      />

      <View style={styles.rowInfo}>
        <CustomText style={styles.rowTitle} numberOfLines={1}>
          {game.name}
        </CustomText>

        <View style={styles.rowMeta}>
          {platforms.length > 0 ? (
            <CustomText style={styles.rowMetaText} numberOfLines={1}>
              {platforms
                .slice(0, 3)
                .map((p) => p.abbreviation ?? p.name)
                .join(" · ")}
            </CustomText>
          ) : (
            <View />
          )}
          {statusLabel}
        </View>
      </View>
    </TouchableOpacity>
  );
});
DayGameRow.displayName = "DayGameRow";

// ─── Day cell ─────────────────────────────────────────────────────────────────

type DayCellProps = {
  dayKey: string;
  dayNumber: number;
  inMonth: boolean;
  inWindow: boolean;
  isSelected: boolean;
  isToday: boolean;
  releaseCount: number;
  onSelect: (key: string) => void;
};

const DayCell = memo<DayCellProps>(
  ({
    dayKey,
    dayNumber,
    inMonth,
    inWindow,
    isSelected,
    isToday,
    releaseCount,
    onSelect,
  }) => {
    // Adjacent-month days inside the window stay tappable — a release that
    // falls on the 1st of next month is still useful to open from here.
    const cellOpacity = !inWindow ? 0.22 : inMonth ? 1 : 0.6;

    return (
      <TouchableOpacity
        style={[styles.dayCell, { opacity: cellOpacity }]}
        onPress={() => onSelect(dayKey)}
        disabled={!inWindow}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected, disabled: !inWindow }}
      >
        <View
          style={[
            styles.dayCircle,
            isSelected && styles.dayCircleSelected,
            !isSelected && isToday && styles.dayCircleToday,
          ]}
        >
          <CustomText
            style={[
              styles.dayText,
              isSelected && styles.dayTextSelected,
              !isSelected && isToday && styles.dayTextToday,
            ]}
          >
            {dayNumber}
          </CustomText>
        </View>

        {releaseCount > 0 ? (
          <View style={styles.dayBadge}>
            <CustomText style={styles.dayBadgeText}>
              {releaseCount > 99 ? "99+" : releaseCount}
            </CustomText>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  },
);
DayCell.displayName = "DayCell";

// ─── Main ─────────────────────────────────────────────────────────────────────

type ReleaseCalendarProps = {
  /**
   * Bumped by HomeScreen on pull-to-refresh, which drives `refetch(true)`.
   *
   * The section deliberately does NOT remount on refresh: remounting would
   * re-run useCachedData's mount effect with forceRefresh=false, falling back
   * to the cached (stale) payload instead of hitting the network.
   */
  refreshToken?: number | undefined;
};

function ReleaseCalendar({ refreshToken = 0 }: ReleaseCalendarProps): React.ReactElement | null {
  const { t, i18n } = useTranslation();

  const locale = useMemo(() => resolveLocale(i18n.language), [i18n.language]);
  const weekdayNames = useMemo(() => weekdayLabels(locale), [locale]);

  const [view, setView] = useState(currentUtcMonth);
  const [todayKey] = useState(() => utcDayKey(todayUtcMidnight()));
  const [selectedKey, setSelectedKey] = useState(todayKey);

  // Re-derived on refresh so a pull-to-refresh also re-targets the current UTC
  // day, not whatever day the window was first built on.
  const win = useMemo(() => {
    void refreshToken;
    return windowForToday(todayUtcMidnight());
  }, [refreshToken]);

  const fromKey = useMemo(() => utcDayKey(win.from), [win.from]);
  const toKey = useMemo(() => utcDayKey(win.to), [win.to]);

  const fetchWindow = useCallback(
    () => fetchReleaseCalendarGames(win.from, win.to),
    [win.from, win.to],
  );

  // Scoped to the UTC day: opening the app tomorrow is then an automatic cache
  // miss rather than a stale window inherited from yesterday.
  const cacheKey = `GAMES_CACHE_RELEASE_CALENDAR_${todayKey}`;

  const { data, isLoading, error, refetch } = useCachedData<Game[]>(
    cacheKey,
    fetchWindow,
    [],
    TTL_MS,
  );

  // Pull-to-refresh has to force past the TTL. The first run is skipped: the
  // hook's own mount effect already fetches, and calling refetch here too would
  // double the request on every screen open.
  const isFirstToken = useRef(true);
  useEffect(() => {
    if (isFirstToken.current) {
      isFirstToken.current = false;
      return;
    }
    refetch(true);
  }, [refreshToken, refetch]);

  const grid = useMemo(() => monthGridUtc(view.year, view.month), [view]);

  const gamesByDay = useMemo(() => {
    const map: Record<string, Game[]> = {};
    for (const game of data ?? []) {
      if (!game.first_release_date) continue;
      const key = utcDayKey(game.first_release_date);
      (map[key] ??= []).push(game);
    }
    // The server returns one flat date-ascending list, so ordering *within* a
    // day is arbitrary. Rank by hype then rating so the visible slice leads
    // with the notable games rather than whichever IGDB returned first.
    for (const list of Object.values(map)) {
      list.sort(
        (a, b) =>
          (b.hypes ?? 0) - (a.hypes ?? 0) ||
          (b.total_rating ?? 0) - (a.total_rating ?? 0),
      );
    }
    return map;
  }, [data]);

  const handlePrevMonth = useCallback(() => {
    setView((v) => shiftMonth(v.year, v.month, -1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setView((v) => shiftMonth(v.year, v.month, 1));
  }, []);

  const handleSelect = useCallback((key: string) => setSelectedKey(key), []);

  // Paging to a month outside the fetched window leaves the previous selection
  // stranded. Detect that so the list doesn't show one day's games under an
  // unrelated month header.
  const selectedInWindow = selectedKey >= fromKey && selectedKey <= toKey;

  const selectedGames = selectedInWindow
    ? (gamesByDay[selectedKey] ?? EMPTY_GAMES)
    : EMPTY_GAMES;
  const visibleGames = selectedGames.slice(0, MAX_ROWS_PER_DAY);
  const hiddenCount = selectedGames.length - visibleGames.length;

  if (isLoading && !data) return <SkeletonReleaseCalendar />;

  if (error || (!isLoading && (!data || data.length === 0))) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <SectionTitle
            title={t("home.releaseCalendar.title")}
            subtitle={t("home.releaseCalendar.subtitle")}
            fontSize={24}
          />
        </View>

        <View style={styles.navGroup}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={handlePrevMonth}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t("home.releaseCalendar.previousMonth")}
          >
            <ChevronLeft size={20} color={COLORS.light} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navButton}
            onPress={handleNextMonth}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t("home.releaseCalendar.nextMonth")}
          >
            <ChevronRight size={20} color={COLORS.light} />
          </TouchableOpacity>
        </View>
      </View>

      <CustomText style={styles.monthLabel}>
        {monthLabel(locale, view.year, view.month)}
      </CustomText>

      <View style={styles.weekdayRow}>
        {weekdayNames.map((name, i) => (
          <View key={`${name}-${i}`} style={styles.weekdayCell}>
            <CustomText style={styles.weekdayText}>{name}</CustomText>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {grid.map((key) => {
          const { year: y, month: m, day: d } = parseDayKey(key);
          return (
            <DayCell
              key={key}
              dayKey={key}
              dayNumber={d}
              inMonth={y === view.year && m === view.month + 1}
              inWindow={key >= fromKey && key <= toKey}
              isSelected={key === selectedKey}
              isToday={key === todayKey}
              releaseCount={gamesByDay[key]?.length ?? 0}
              onSelect={handleSelect}
            />
          );
        })}
      </View>

      {visibleGames.length > 0 ? (
        <View style={styles.list}>
          {visibleGames.map((game) => (
            <DayGameRow key={game.id} game={game} />
          ))}

          {hiddenCount > 0 ? (
            <CustomText style={styles.moreText}>
              {t("home.releaseCalendar.moreCount", { count: hiddenCount })}
            </CustomText>
          ) : null}
        </View>
      ) : (
        <View style={styles.emptyDay}>
          <CustomText style={styles.emptyDayText}>
            {selectedInWindow && (data?.length ?? 0) > 0
              ? t("home.releaseCalendar.noReleases")
              : t("home.releaseCalendar.noReleasesInRange")}
          </CustomText>
        </View>
      )}
    </View>
  );
}

export default ReleaseCalendar;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    paddingHorizontal: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
    marginRight: 10,
  },
  navGroup: {
    flexDirection: "row",
    gap: 8,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
  },
  monthLabel: {
    color: COLORS.light,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 10,
  },
  weekdayRow: {
    flexDirection: "row",
    columnGap: 5,
    marginBottom: 4,
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
  },
  weekdayText: {
    color: COLORS.lightGray,
    fontSize: 12,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 5,
    rowGap: 4,
  },
  // flex:1 (basis 0) is what keeps all seven cells on one row: the gaps consume
  // the fixed space and the cells share the remainder. Percentage widths plus a
  // gap would overflow and push the last cell onto its own row.
  dayCell: {
    flex: 1,
    alignItems: "center",
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleSelected: {
    backgroundColor: COLORS.lightGray,
  },
  dayCircleToday: {
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
  },
  dayText: {
    color: COLORS.light,
    fontSize: 14,
  },
  dayTextSelected: {
    color: COLORS.darkBackground,
    fontWeight: "bold",
  },
  dayTextToday: {
    color: COLORS.lightGray,
    fontWeight: "bold",
  },
  dayBadge: {
    marginTop: 1,
    minWidth: 17,
    height: 15,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBadgeText: {
    color: COLORS.light,
    fontSize: 9,
    fontWeight: "bold",
  },
  list: {
    marginTop: 12,
  },
  gameRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
  },
  rowCover: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
  },
  rowInfo: {
    flex: 1,
    marginLeft: 10,
  },
  rowTitle: {
    color: COLORS.light,
    fontSize: 14,
    fontWeight: "600",
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 3,
  },
  rowMetaText: {
    color: COLORS.lightGray,
    fontSize: 11,
    flexShrink: 1,
  },
  rowCountdown: {
    color: "#9CB4DD",
    fontSize: 11,
    marginLeft: 8,
  },
  rowOutNow: {
    color: "#6FD08C",
    fontSize: 11,
    fontWeight: "bold",
    marginLeft: 8,
  },
  rowReleased: {
    color: COLORS.lightGray,
    fontSize: 11,
    marginLeft: 8,
  },
  moreText: {
    color: COLORS.lightGray,
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  emptyDay: {
    paddingVertical: 22,
    alignItems: "center",
  },
  emptyDayText: {
    color: COLORS.lightGray,
    fontSize: 13,
    textAlign: "center",
  },
  errorContainer: {
    height: 220,
    marginHorizontal: 18,
    marginVertical: 10,
  },
});
