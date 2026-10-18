import React, { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Slideshow from "../Slideshow";
import WeeklySummary from "../WeeklySummary";
import ReleaseCalendar from "../ReleaseCalendar";
import AdSlot from "@/src/components/AdSlot";
import DeferredNewsSection from "./DeferredNewsSection";
import DeferredSection from "./DeferredSection";
import NewsSection from "./NewsSection";
import { RecommendedGames } from "@/src/features/games";
import { GamingEvents } from "@/src/features/events";
import { buildHomeSections } from "../../lib/homeSections";
import type { SectionItem } from "../../types";
import type { HomeSectionsProps, ReleaseCalendarSectionProps } from "./types";

// ─── Stable section wrappers (module scope → references never change) ─────────

const SlideshowSection = memo(function SlideshowSection() {
  return <Slideshow />;
});
SlideshowSection.displayName = "SlideshowSection";

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

const RecommendedGamesSection = memo(function RecommendedGamesSection() {
  return <RecommendedGames />;
});
RecommendedGamesSection.displayName = "RecommendedGamesSection";

const GamingEventsSection = memo(function GamingEventsSection() {
  return <GamingEvents />;
});
GamingEventsSection.displayName = "GamingEventsSection";

// ─── Section renderer (module scope → never recreated) ────────────────────────
function renderSection(item: SectionItem, lang: string): React.ReactElement | null {
  switch (item.type) {
    case "slideshow":
      return <SlideshowSection key={item._key} />;
    case "news":
      if (!item.delay) {
        return (
          <NewsSection
            key={item._key}
            category={item.category!}
            language={lang}
            website={item.website}
          />
        );
      }
      return (
        <DeferredNewsSection
          key={item._key}
          category={item.category!}
          language={lang}
          website={item.website}
          delay={item.delay}
        />
      );
    case "weekly_summary":
      return (
        <DeferredSection key={item._key} delay={1100} placeholderHeight={230}>
          <WeeklySummarySection />
        </DeferredSection>
      );
    case "release_calendar":
      return (
        <DeferredSection key={item._key} delay={1500} placeholderHeight={840}>
          <ReleaseCalendarSection refreshToken={item.refreshToken} />
        </DeferredSection>
      );
    case "recommended":
      return (
        <DeferredSection key={item._key} delay={2200} placeholderHeight={300}>
          <RecommendedGamesSection />
        </DeferredSection>
      );
    case "events":
      return (
        <DeferredSection key={item._key} delay={3900} placeholderHeight={220}>
          <GamingEventsSection />
        </DeferredSection>
      );
    case "ad":
      return <AdSlot key={item._key} />;
    default:
      return null;
  }
}

/**
 * Renders the ordered list of home sections for a given `refreshToken`.
 *
 * ScrollView replaces FlatList: there are only ~10 fixed sections, so
 * virtualization adds overhead with zero benefit, and every section component
 * is memoized so re-renders are already minimal.
 */
const HomeSections = memo(function HomeSections({
  refreshToken,
}: HomeSectionsProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const sections = useMemo(
    () => buildHomeSections(currentLang, refreshToken),
    [currentLang, refreshToken],
  );

  const renderedSections = useMemo(
    () => sections.map((item) => renderSection(item, currentLang)),
    [sections, currentLang],
  );

  return <>{renderedSections}</>;
});

HomeSections.displayName = "HomeSections";

export default HomeSections;
