import React, { memo, useMemo } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import Slideshow from "../Slideshow";
import WeeklySummary from "../WeeklySummary";
import ReleaseCalendar from "../ReleaseCalendar";
import AdSlot from "@/src/components/AdSlot";
import { DiscoveryRail, DiscoveryRailProvider, FreeGames } from "@/src/features/games";
import { GamingEvents } from "@/src/features/events";
import TabbedNewsSection, {
  ESPORTS_HARDWARE_TABS,
  NEWS_REVIEWS_TABS,
} from "./TabbedNewsSection";
import DeferredSection from "./DeferredSection";
import QuickActions from "./QuickActions";
import { buildHomeSections } from "../../lib/homeSections";
import type { SectionItem } from "../../types";
import type {
  HomeSectionsProps,
  QuickActionsProps,
  ReleaseCalendarSectionProps,
} from "./types";

// ─── Stable section wrappers (module scope → references never change) ─────────

const SlideshowSection = memo(function SlideshowSection() {
  return <Slideshow />;
});
SlideshowSection.displayName = "SlideshowSection";

const QuickActionsSection = memo(function QuickActionsSection({
  onScrollToSection,
}: QuickActionsProps) {
  return <QuickActions onScrollToSection={onScrollToSection} />;
});
QuickActionsSection.displayName = "QuickActionsSection";

const FreeGamesSection = memo(function FreeGamesSection() {
  return <FreeGames />;
});
FreeGamesSection.displayName = "FreeGamesSection";

const WeeklySummarySection = memo(function WeeklySummarySection() {
  return <WeeklySummary />;
});
WeeklySummarySection.displayName = "WeeklySummarySection";

/**
 * Keyed by a constant, NOT by `refreshToken`: the calendar re-fetches via
 * `refreshToken` rather than remounting, so it actually honours pull-to-refresh.
 */
const ReleaseCalendarSection = memo(function ReleaseCalendarSection({
  refreshToken,
}: ReleaseCalendarSectionProps) {
  return <ReleaseCalendar refreshToken={refreshToken} />;
});
ReleaseCalendarSection.displayName = "ReleaseCalendarSection";

const DiscoveryRailSection = memo(function DiscoveryRailSection() {
  return <DiscoveryRail />;
});
DiscoveryRailSection.displayName = "DiscoveryRailSection";

const GamingEventsSection = memo(function GamingEventsSection() {
  return <GamingEvents />;
});
GamingEventsSection.displayName = "GamingEventsSection";

// ─── Section renderer (module scope → never recreated) ────────────────────────

/** No-op fallback so `renderSection` always receives a stable callback. */
function noop(): void {}

/**
 * Stable logical id for a section, independent of `refreshToken` — the
 * quick-action chips target these via scroll-to-section. An explicit `id`
 * wins (the two tab groups).
 */
function sectionId(item: SectionItem): string {
  if (item.id) return item.id;
  return item.category ? `${item.type}_${item.category}` : item.type;
}

function renderSection(
  item: SectionItem,
  lang: string,
  onScrollToSection: (id: string) => void,
  newsTabRequest: string | undefined,
): React.ReactElement | null {
  switch (item.type) {
    case "slideshow":
      return <SlideshowSection />;
    case "quick_actions":
      return <QuickActionsSection onScrollToSection={onScrollToSection} />;
    case "free_games":
      return (
        <DeferredSection delay={800} placeholderHeight={380}>
          <FreeGamesSection />
        </DeferredSection>
      );
    case "news_tabs": {
      const isInsightGroup = item.id === "insight_tabs";
      return (
        // The two groups keep separate stagger slots so their first-tab
        // fetches (news, then esports) never fire together.
        <DeferredSection delay={isInsightGroup ? 3400 : 2600} placeholderHeight={280}>
          <TabbedNewsSection
            language={lang}
            website={item.website}
            tabs={isInsightGroup ? ESPORTS_HARDWARE_TABS : NEWS_REVIEWS_TABS}
            tabRequest={newsTabRequest}
          />
        </DeferredSection>
      );
    }
    case "weekly_summary":
      return (
        <DeferredSection delay={1800} placeholderHeight={230}>
          <WeeklySummarySection />
        </DeferredSection>
      );
    case "release_calendar":
      return (
        <DeferredSection delay={1500} placeholderHeight={110}>
          <ReleaseCalendarSection refreshToken={item.refreshToken} />
        </DeferredSection>
      );
    case "recommended":
      return (
        <DeferredSection delay={1100} placeholderHeight={300}>
          <DiscoveryRailSection />
        </DeferredSection>
      );
    case "events":
      return (
        <DeferredSection delay={3900} placeholderHeight={220}>
          <GamingEventsSection />
        </DeferredSection>
      );
    case "ad":
      return <AdSlot />;
    default:
      return null;
  }
}

/**
 * Renders the ordered list of home sections for a given `refreshToken`.
 *
 * ScrollView replaces FlatList: there are only ~10 fixed sections, so
 * virtualization adds overhead with zero benefit, and every section component
 * is memoized so re-renders are already minimal. Each section is wrapped in a
 * View that reports its content-space y offset, powering the quick-action
 * chips' scroll-to-section.
 */
const HomeSections = memo(function HomeSections({
  refreshToken,
  onSectionLayout,
  onScrollToSection,
  newsTabRequest,
}: HomeSectionsProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const sections = useMemo(
    () => buildHomeSections(currentLang, refreshToken),
    [currentLang, refreshToken],
  );

  const renderedSections = useMemo(
    () =>
      sections.map((item) => {
        const id = sectionId(item);
        return (
          <View
            key={item._key}
            onLayout={
              onSectionLayout
                ? (e) => onSectionLayout(id, e.nativeEvent.layout.y)
                : undefined
            }
          >
            {renderSection(item, currentLang, onScrollToSection ?? noop, newsTabRequest)}
          </View>
        );
      }),
    [sections, currentLang, onSectionLayout, onScrollToSection, newsTabRequest],
  );

  return <DiscoveryRailProvider>{renderedSections}</DiscoveryRailProvider>;
});

HomeSections.displayName = "HomeSections";

export default HomeSections;
