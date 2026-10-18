import React, { memo } from "react";
import { LatestNews } from "@/src/features/news";
import type { NewsSectionProps } from "./types";

// Stable no-op defined at module scope so LatestNews' onChangeFeed prop is
// always referentially equal across renders.
const noop = (): void => {};

/** Home's news feed: 4 items, no dropdown, header title shown, no footer. */
const NewsSection = memo(function NewsSection({
  category,
  language,
  website,
}: NewsSectionProps) {
  return (
    <LatestNews
      category={category}
      limit={4}
      showDropdown={false}
      showHeaderTitle={true}
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
