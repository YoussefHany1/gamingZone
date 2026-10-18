import React, { memo } from "react";
import DeferredSection from "./DeferredSection";
import NewsSection from "./NewsSection";
import type { DeferredNewsSectionProps } from "./types";

// Each deferred news section receives a different delay so their setState
// calls never fire at the same time — no more "VirtualizedList slow to update".
const DeferredNewsSection = memo(function DeferredNewsSection({
  category,
  language,
  website,
  delay = 1000,
}: DeferredNewsSectionProps) {
  return (
    <DeferredSection delay={delay} placeholderHeight={280}>
      <NewsSection category={category} language={language} website={website} />
    </DeferredSection>
  );
});

DeferredNewsSection.displayName = "DeferredNewsSection";

export default DeferredNewsSection;
