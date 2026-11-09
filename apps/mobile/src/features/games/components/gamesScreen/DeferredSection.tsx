import React, { memo, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import SkeletonPopular from "../../skeleton/gamesScreen/SkeletonPopular";

// Placeholder height used while a section waits to mount, so the list
// measurements stay stable (same trick as HomeScreen's DeferredSection).
const DEFERRED_PLACEHOLDER_HEIGHT = 340;

const staticStyles = StyleSheet.create({
  placeholder: {
    height: DEFERRED_PLACEHOLDER_HEIGHT,
    flexDirection: "row",
    overflow: "hidden",
  },
});

export type DeferredSectionProps = {
  delay: number;
  children: React.ReactElement;
};

/**
 * The session's cold-start clock: set by the very first DeferredSection to
 * mount (≈ the frame the app renders its feed). The stagger delays were
 * measured against app start, so sections FlashList mounts later — i.e. when
 * the user scrolls toward them — have their remaining delay collapsed to
 * zero instead of re-arming the full 600-3000ms blank gap mid-scroll.
 *
 * Load-bearing for a session only (var-scoped, not exported): a fresh JS
 * context on the next app start re-seeds it.
 */
let coldStartAt: number | null = null;

/**
 * Mounts children once the section's share of the cold-start window has
 * elapsed. While waiting, it shows static skeleton cards (no fetches fire —
 * the children, and their network calls, stay unmounted).
 *
 * Each deferred section is originally given a different delay so their
 * network fetches and expo-image loads never fire at the same time right
 * after app start — this caps the cold-start network/image burst that
 * otherwise spawns dozens of OkHttp threads and starves the main thread
 * (Crashlytics ANR "nativeFinishInputEvent").
 *
 * Sections mounted after that window (scrolled into view) mount immediately:
 * deferring them again would only paint blank space while scrolling.
 */
const DeferredSection = memo(function DeferredSection({
  delay,
  children,
}: DeferredSectionProps) {
  const [mounted, setMounted] = useState<boolean>(() => {
    // First DeferredSection of the session anchors the cold-start clock.
    if (coldStartAt === null) coldStartAt = Date.now();
    return Date.now() - coldStartAt >= delay;
  });

  useEffect(() => {
    if (mounted) return;
    const elapsed = Date.now() - (coldStartAt ?? Date.now());
    const remaining = Math.max(0, delay - elapsed);
    const timer = setTimeout(() => setMounted(true), remaining);
    return () => clearTimeout(timer);
  }, [delay, mounted]);

  if (!mounted) {
    return (
      <View style={staticStyles.placeholder}>
        <SkeletonPopular />
        <SkeletonPopular />
      </View>
    );
  }

  return children;
});

DeferredSection.displayName = "DeferredSection";

export default DeferredSection;
