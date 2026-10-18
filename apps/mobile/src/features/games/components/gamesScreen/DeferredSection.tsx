import React, { memo, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

// Placeholder height used while a section waits to mount, so the list
// measurements stay stable (same trick as HomeScreen's DeferredSection).
const DEFERRED_PLACEHOLDER_HEIGHT = 340;

const staticStyles = StyleSheet.create({
  placeholder: { height: DEFERRED_PLACEHOLDER_HEIGHT },
});

export type DeferredSectionProps = {
  delay: number;
  children: React.ReactElement;
};

/**
 * Mounts children only after `delay` ms. Each deferred section is given a
 * different delay so their network fetches and expo-image loads never fire at
 * the same time — this caps the cold-start network/image burst that otherwise
 * spawns dozens of OkHttp threads and starves the main thread (Crashlytics ANR
 * "nativeFinishInputEvent").
 */
const DeferredSection = memo(function DeferredSection({
  delay,
  children,
}: DeferredSectionProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!mounted) {
    return <View style={staticStyles.placeholder} />;
  }

  return children;
});

DeferredSection.displayName = "DeferredSection";

export default DeferredSection;
