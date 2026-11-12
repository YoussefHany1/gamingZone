import React, { memo } from "react";
import { LatestNews } from "@/src/features/news";
import type { NewsSectionProps } from "./types";

// Stable no-op defined at module scope so LatestNews' onChangeFeed prop is
// always referentially equal across renders.
const noop = (): void => {};

/** The home news feed section (fixed to 4 items, no dropdown/footer). */
const NewsSection = memo(function NewsSection({
  category,
  language,
  website,
  showHeaderTitle = true,
  userPlatform,
  feedReady,
}: NewsSectionProps) {
  return (
    <LatestNews
      category={category}
      limit={4}
      showDropdown={false}
      showHeaderTitle={showHeaderTitle}
      userPlatform={userPlatform}
      feedReady={feedReady}
      language={language}
      showFooter={false}
      website={website}
      selectedItem={undefined}
      onChangeFeed={noop}
      websitesList={[]}
      scrollEnabled={false}
    />
  );
});

NewsSection.displayName = "NewsSection";

export default NewsSection;
