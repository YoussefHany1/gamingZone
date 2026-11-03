import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { SocialSegment } from "../lib/socialList";
import type { SocialRouteShape } from "../types";

const SOCIAL_SEGMENTS: readonly SocialSegment[] = [
  "friends",
  "requests",
  "chats",
  "sessions",
];

export type UseSocialTabsParams = {
  segment: SocialSegment;
  onSegmentChange: (segment: SocialSegment) => void;
};

export type UseSocialTabsResult = {
  index: number;
  routes: SocialRouteShape[];
  handleIndexChange: (index: number) => void;
};

/**
 * Maps the screen's segment state onto the route/index shape `TabView`
 * expects, the same way the news screen's tabs are built. The segment stays
 * the single source of truth so non-TabView code (e.g. "invite to session"
 * jumping straight to the sessions tab) keeps working.
 */
export function useSocialTabs({
  segment,
  onSegmentChange,
}: UseSocialTabsParams): UseSocialTabsResult {
  const { t } = useTranslation();

  const routes = useMemo<SocialRouteShape[]>(
    () =>
      SOCIAL_SEGMENTS.map((key) => ({
        key,
        title: t(`social.${key}.title`),
      })),
    [t],
  );

  const index = Math.max(0, SOCIAL_SEGMENTS.indexOf(segment));

  const handleIndexChange = useCallback(
    (nextIndex: number) => {
      const nextSegment = SOCIAL_SEGMENTS[nextIndex];
      if (nextSegment) onSegmentChange(nextSegment);
    },
    [onSegmentChange],
  );

  return { index, routes, handleIndexChange };
}
