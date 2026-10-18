import React, { memo, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import type { DeferredSectionProps } from "./types";

/**
 * Mounts `children` only after `delay` ms. Used to spread out the Home-screen
 * network fetches so they never all fire at once: a simultaneous burst
 * (slideshow + news feeds + weekly summary + recommended + events + ads)
 * starved the main- and render-threads on a low-end MediaTek device and
 * produced an input-dispatch ANR. Renders a fixed-height placeholder until
 * mounted so the page layout doesn't shift.
 */
const DeferredSection = memo(function DeferredSection({
  delay = 1000,
  placeholderHeight = 0,
  children,
}: DeferredSectionProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const placeholderStyle = useMemo(
    () => ({ height: placeholderHeight }),
    [placeholderHeight],
  );

  if (!mounted) {
    return <View style={placeholderStyle} />;
  }

  return children;
});

DeferredSection.displayName = "DeferredSection";

export default DeferredSection;
