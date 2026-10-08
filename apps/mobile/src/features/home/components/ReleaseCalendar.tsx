import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, TouchableOpacity, StyleSheet, I18nManager } from "react-native";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type { Day, Locale, Month } from "date-fns";
import { format } from "date-fns";
import { ar, enUS, es, fr, hi, pt, ptBR } from "date-fns/locale";
import { CalendarX, ChevronLeft, ChevronRight } from "lucide-react-native";
import { igdbImageUrl } from "@gaming-zone/utils";
import CustomText from "@/src/components/CustomText";
import SectionTitle from "@/src/components/SectionTitle";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
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
 * otherwise run far past a sane render budget. The day panel header keeps
 * showing the uncapped total, so the truncation stays visible rather than
 * silent.
 */
const MAX_ROWS_PER_DAY = 5;

/**
 * Dots drawn per day, one per release up to this cap.
 *
 * A paper calendar shows *density*, not a number — a printed month would put a
 * dot under a busy day, not "37". Past the cap the dots stop growing but the
 * day panel below still lists the true total.
 */
const MAX_DOTS_PER_DAY = 3;

/** Within-day freshness only; the window itself is anchored to the UTC day. */
const TTL_MS = 30 * 60_000;

/**
 * RTL mirrors the whole row (title block, arrows, grid) via `flexDirection:
 * "row"`, so only the glyphs themselves need swapping.
 */
const IS_RTL = I18nManager.isRTL;
const PREV_ICON = IS_RTL ? ChevronRight : ChevronLeft;
const NEXT_ICON = IS_RTL ? ChevronLeft : ChevronRight;

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

/**
 * Weekday header width per language.
 *
 * A real calendar prints three letters, and "abbreviated" is that width in
 * Latin scripts. date-fns resolves the same width to the *full* weekday name in
 * Arabic ("الاثنين") and to two-syllable words in Portuguese ("terça"), either
 * of which overflows a 1/7-width column, so those fall back to shorter forms.
 */
const WEEKDAY_WIDTH: Record<string, "narrow" | "short" | "abbreviated" | "wide"> = {
  en: "abbreviated",
  ar: "narrow",
  es: "abbreviated",
  fr: "abbreviated",
  hi: "narrow",
  "pt-BR": "short",
  "pt-PT": "short",
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
function weekdayLabels(lang: string, locale: Locale): string[] {
  // Unknown languages fall back to English's spacing, which is the tightest of
  // the abbreviated forms.
  const width =
    WEEKDAY_WIDTH[lang] ?? WEEKDAY_WIDTH[lang.split("-")[0] ?? ""] ?? "abbreviated";
  return Array.from({ length: 7 }, (_, col) =>
    // Monday-first index -> Date#getDay-style index (0 = Sunday).
    locale.localize.day(((col + 1) % 7) as Day, { width }),
  );
}

function monthLabel(locale: Locale, year: number, month: number): string {
  // "wide" is date-fns' full month name ("March"); "short"/"abbreviated" are
  // the truncated forms.
  return `${locale.localize.month(month as Month, { width: "wide" })} ${year}`;
}

/**
 * Full "Monday, March 2nd, 2026" heading for the selected day, using each
 * locale's own word order rather than an English-first concatenation.
 *
 * This is the one place `format` is safe, and only because the calendar day is
 * already known here — it is *not* a timestamp->day mapping, which is what
 * `calendarDates.ts` forbids. `new Date(y, m, d, 12)` pins the *local* date
 * components to exactly this day, so the formatter reads back the same day in
 * every timezone; the offset never shifts the printed label.
 */
function longDayLabel(locale: Locale, year: number, month: number, day: number): string {
  const anchor = new Date(year, month - 1, day, 12, 0, 0, 0);
  // "full" is the only width that includes the weekday; the token sequence
  // itself is the locale's own word order, which is why `es` prints "2 de marzo
  // de 2026" rather than an English-concatenated "March 2, 2026".
  return format(anchor, locale.formatLong.date({ width: "full" }), { locale });
}

// ─── Release dots ─────────────────────────────────────────────────────────────

type DotsProps = { count: number; highlighted: boolean };

/**
 * Density marker under a day number: one dot per release, capped at
 * `MAX_DOTS_PER_DAY`. Purely decorative — the accessible name comes from the
 * day cell itself, which carries the real total.
 */
const ReleaseDots = memo<DotsProps>(({ count, highlighted }) => {
  const shown = Math.min(count, MAX_DOTS_PER_DAY);

  const styles = useThemeStyles((c) => ({
    dot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: c.textMuted,
    },
    dotHighlighted: {
      backgroundColor: c.backgroundDeep,
    },
    dotsRow: {
      flexDirection: "row",
      gap: 3,
      height: 5,
      marginTop: 3,
      alignItems: "center",
    },
  }));

  if (shown === 0) return <View style={styles.dotsRow} />;

  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: shown }, (_, i) => (
        <View key={i} style={[styles.dot, highlighted && styles.dotHighlighted]} />
      ))}
    </View>
  );
});
ReleaseDots.displayName = "ReleaseDots";

// ─── Row ──────────────────────────────────────────────────────────────────────

type DayGameRowProps = { game: Game };

const DayGameRow = memo<DayGameRowProps>(({ game }) => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  // Minute precision is plenty for a calendar row, and keeps the home screen
  // from re-rendering every row every second (see useCountdown's own notes).
  const timeLeft = useCountdown(game.first_release_date, 60_000);

  const styles = useThemeStyles((c) => ({
    gameRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
    },
    rowCover: {
      width: 46,
      height: 46,
      borderRadius: 10,
      backgroundColor: c.accent,
    },
    rowInfo: {
      flex: 1,
      marginLeft: 10,
    },
    rowTitle: {
      color: c.text,
      fontSize: 14,
      fontWeight: "600",
    },
    rowMeta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
      gap: 8,
    },
    rowMetaText: {
      color: c.textMuted,
      fontSize: 11,
      flexShrink: 1,
    },
    statusPill: {
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
    },
    statusPillSoon: {
      backgroundColor: c.surface,
      borderColor: c.accent,
    },
    // Release state is a status signal, so it keeps fixed semantic colors.
    statusPillLive: {
      backgroundColor: "#6FD08C26",
      borderColor: "#6FD08C80",
    },
    statusPillPast: {
      backgroundColor: "transparent",
      borderColor: c.accent,
    },
    statusText: {
      fontSize: 10,
      fontWeight: "700",
    },
    statusTextSoon: {
      color: "#9CB4DD",
    },
    statusTextLive: {
      color: "#6FD08C",
    },
    statusTextPast: {
      color: c.textMuted,
    },
  }));

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
      <View style={[styles.statusPill, styles.statusPillSoon]}>
        <CustomText style={[styles.statusText, styles.statusTextSoon]}>
          {`${t("games.list.mostAnticipated.countdown.days")} ${timeLeft.days} · ${t(
            "games.list.mostAnticipated.countdown.hours",
          )} ${timeLeft.hours}`}
        </CustomText>
      </View>
    );
  } else {
    statusLabel = (
      <View
        style={[
          styles.statusPill,
          isPast ? styles.statusPillPast : styles.statusPillLive,
        ]}
      >
        <CustomText
          style={[
            styles.statusText,
            isPast ? styles.statusTextPast : styles.statusTextLive,
          ]}
        >
          {isPast ? t("home.releaseCalendar.released") : t("home.releaseCalendar.outNow")}
        </CustomText>
      </View>
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
        <CustomText style={styles.rowTitle} numberOfLines={2}>
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
  /** Column within the week, 0 = Monday. Drives the weekend tint. */
  column: number;
  inMonth: boolean;
  inWindow: boolean;
  isSelected: boolean;
  isToday: boolean;
  releaseCount: number;
  accessibilityLabel: string;
  onSelect: (key: string) => void;
};

const DayCell = memo<DayCellProps>(
  ({
    dayKey,
    dayNumber,
    column,
    inMonth,
    inWindow,
    isSelected,
    isToday,
    releaseCount,
    accessibilityLabel,
    onSelect,
  }) => {
    // Adjacent-month days inside the window stay tappable — a release that
    // falls on the 1st of next month is still useful to open from here.
    const cellOpacity = !inWindow ? 0.25 : inMonth ? 1 : 0.55;

    const styles = useThemeStyles((c) => ({
      dayCell: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
      },
      dayCellWeekend: {
        backgroundColor: c.accentSurface,
      },
      dayCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
      },
      dayCircleSelected: {
        backgroundColor: c.text,
      },
      dayCircleToday: {
        borderWidth: 1.5,
        borderColor: c.textMuted,
      },
      dayText: {
        color: c.text,
        fontSize: 14,
      },
      // Inverted pair: the selected day is a `text` fill with a `backgroundDeep` label.
      dayTextSelected: {
        color: c.backgroundDeep,
        fontWeight: "bold",
      },
      dayTextToday: {
        color: c.textMuted,
        fontWeight: "bold",
      },
    }));

    return (
      <TouchableOpacity
        style={[
          styles.dayCell,
          { opacity: cellOpacity },
          // Printed calendars shade Saturday and Sunday; 5 and 6 are the last
          // two Monday-first columns.
          inMonth && column >= 5 && styles.dayCellWeekend,
        ]}
        onPress={() => onSelect(dayKey)}
        disabled={!inWindow}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
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

        <ReleaseDots count={releaseCount} highlighted={isSelected} />
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

function ReleaseCalendar({
  refreshToken = 0,
}: ReleaseCalendarProps): React.ReactElement | null {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();

  const locale = useMemo(() => resolveLocale(i18n.language), [i18n.language]);
  const weekdayNames = useMemo(
    () => weekdayLabels(i18n.language, locale),
    [i18n.language, locale],
  );

  const [view, setView] = useState(currentUtcMonth);
  const [todayKey] = useState(() => utcDayKey(todayUtcMidnight()));
  const [selectedKey, setSelectedKey] = useState(todayKey);

  const styles = useThemeStyles((c) => ({
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
    todayButton: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.accentBorder,
      backgroundColor: c.surface,
      marginBottom: 14,
    },
    todayButtonText: {
      color: c.accentText,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.backgroundDeep,
      paddingHorizontal: 10,
      paddingBottom: 10,
      overflow: "hidden",
    },
    monthNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
    },
    navButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.accent,
    },
    monthLabel: {
      flex: 1,
      color: c.text,
      fontSize: 18,
      fontWeight: "700",
      textAlign: "center",
      letterSpacing: 0.3,
    },
    weekdayHeader: {
      flexDirection: "row",
      paddingVertical: 7,
      marginBottom: 2,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: c.border,
    },
    weekdayCell: {
      flex: 1,
      alignItems: "center",
    },
    weekdayCellWeekend: {
      backgroundColor: c.accentSurface,
      borderRadius: 6,
    },
    weekdayText: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    grid: {
      flexDirection: "column",
    },
    weekRow: {
      flexDirection: "row",
      height: 46,
    },
    weekRowRule: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    dayPanel: {
      marginTop: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.background,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 4,
    },
    dayPanelHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingBottom: 10,
      marginBottom: 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    dayPanelTitle: {
      flex: 1,
      color: c.text,
      fontSize: 15,
      fontWeight: "700",
      marginRight: 10,
    },
    dayPanelCount: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: c.surface,
    },
    dayPanelCountDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.textMuted,
    },
    dayPanelCountText: {
      color: c.text,
      fontSize: 12,
      fontWeight: "700",
    },
    list: {
      marginTop: 4,
    },
    moreText: {
      color: c.textMuted,
      fontSize: 12,
      marginTop: 10,
      marginBottom: 4,
      textAlign: "center",
    },
    emptyDay: {
      paddingVertical: 24,
      alignItems: "center",
      gap: 8,
    },
    emptyDayText: {
      color: c.textMuted,
      fontSize: 13,
      textAlign: "center",
    },
  }));

  // Re-derived on refresh so a pull-to-refresh also re-targets the current UTC
  // day, not whatever day the window was first built on.
  const win = useMemo(() => {
    void refreshToken;
    return windowForToday(todayUtcMidnight());
  }, [refreshToken]);

  // Same anchoring as `win`, so "Today" returns to the month the window was
  // built for. Memoised because `setView` needs a stable object to avoid
  // re-rendering on every pass.
  const currentMonth = useMemo(() => {
    void refreshToken;
    return currentUtcMonth();
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

  // Rows, not a flat wrap: the hairline between weeks is what makes a grid read
  // as a calendar rather than a list of numbers. `monthGridUtc` always returns
  // 42 cells, so this is always six rows.
  const weeks = useMemo(() => {
    const rows: string[][] = [];
    for (let i = 0; i < grid.length; i += 7) rows.push(grid.slice(i, i + 7));
    return rows;
  }, [grid]);

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

  // Paging away from the current month offers a way back, the way a paper
  // calendar's "today" marker would.
  const isViewingCurrentMonth =
    view.year === currentMonth.year && view.month === currentMonth.month;
  const handleGoToToday = useCallback(() => {
    setView(currentMonth);
    setSelectedKey(todayKey);
  }, [currentMonth, todayKey]);

  // A screen reader announces the plain date rather than a bare "7", and the
  // total so the dot cluster isn't the only signal of a busy day.
  const dayLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const key of grid) {
      const { year, month, day } = parseDayKey(key);
      const total = gamesByDay[key]?.length ?? 0;
      map[key] =
        total > 0
          ? `${longDayLabel(locale, year, month, day)}, ${total}`
          : longDayLabel(locale, year, month, day);
    }
    return map;
  }, [grid, gamesByDay, locale]);

  const selectedLabel = useMemo(() => {
    const { year, month, day } = parseDayKey(selectedKey);
    return longDayLabel(locale, year, month, day);
  }, [selectedKey, locale]);

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

        {isViewingCurrentMonth ? null : (
          <TouchableOpacity
            style={styles.todayButton}
            onPress={handleGoToToday}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t("home.releaseCalendar.today")}
          >
            <CustomText style={styles.todayButtonText}>
              {t("home.releaseCalendar.today")}
            </CustomText>
          </TouchableOpacity>
        )}
      </View>

      {/* ── The month sheet ── */}
      <View style={styles.card}>
        <View style={styles.monthNav}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={handlePrevMonth}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t("home.releaseCalendar.previousMonth")}
          >
            <PREV_ICON size={20} color={colors.text} />
          </TouchableOpacity>

          <CustomText style={styles.monthLabel} numberOfLines={1}>
            {monthLabel(locale, view.year, view.month)}
          </CustomText>

          <TouchableOpacity
            style={styles.navButton}
            onPress={handleNextMonth}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t("home.releaseCalendar.nextMonth")}
          >
            <NEXT_ICON size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekdayHeader}>
          {weekdayNames.map((name, i) => (
            <View
              key={`${name}-${i}`}
              style={[styles.weekdayCell, i >= 5 && styles.weekdayCellWeekend]}
            >
              <CustomText style={styles.weekdayText}>{name}</CustomText>
            </View>
          ))}
        </View>

        <View style={styles.grid}>
          {weeks.map((week, rowIndex) => (
            <View
              key={week[0] ?? rowIndex}
              style={[styles.weekRow, rowIndex < weeks.length - 1 && styles.weekRowRule]}
            >
              {week.map((key, column) => {
                const { year: y, month: m, day: d } = parseDayKey(key);
                return (
                  <DayCell
                    key={key}
                    dayKey={key}
                    dayNumber={d}
                    column={column}
                    inMonth={y === view.year && m === view.month + 1}
                    inWindow={key >= fromKey && key <= toKey}
                    isSelected={key === selectedKey}
                    isToday={key === todayKey}
                    releaseCount={gamesByDay[key]?.length ?? 0}
                    accessibilityLabel={dayLabels[key] ?? `${y}-${m}-${d}`}
                    onSelect={handleSelect}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* ── The selected day ── */}
      <View style={styles.dayPanel}>
        <View
          style={styles.dayPanelHeader}
          // One announcement for the whole header: a screen reader otherwise
          // reads the date, then a bare "5" with no idea what it counts.
          accessible
          accessibilityLabel={`${selectedLabel}, ${selectedInWindow ? selectedGames.length : 0}`}
        >
          <CustomText style={styles.dayPanelTitle} numberOfLines={1}>
            {selectedLabel}
          </CustomText>
          <View style={styles.dayPanelCount}>
            <View style={styles.dayPanelCountDot} />
            <CustomText style={styles.dayPanelCountText}>
              {selectedInWindow ? selectedGames.length : 0}
            </CustomText>
          </View>
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
            <CalendarX size={26} color={colors.accent} />
            <CustomText style={styles.emptyDayText}>
              {selectedInWindow && (data?.length ?? 0) > 0
                ? t("home.releaseCalendar.noReleases")
                : t("home.releaseCalendar.noReleasesInRange")}
            </CustomText>
          </View>
        )}
      </View>
    </View>
  );
}

export default ReleaseCalendar;

// ─── Styles ───────────────────────────────────────────────────────────────────
