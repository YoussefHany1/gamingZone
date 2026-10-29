import { memo, useMemo } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import AdSlot from "@/src/components/AdSlot";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { NewsDescriptionProps } from "./types";

const MIN_LONG_LENGTH = 350;

function splitDescription(text: string): {
  isLong: boolean;
  firstPart: string;
  secondPart: string;
} {
  const trimmed = text.trim();
  if (trimmed.length < MIN_LONG_LENGTH) {
    return { isLong: false, firstPart: trimmed, secondPart: "" };
  }

  const mid = Math.floor(trimmed.length / 2);
  const minSplit = Math.floor(trimmed.length * 0.25);
  const maxSplit = Math.floor(trimmed.length * 0.75);

  let bestIndex = -1;
  let minDiff = Infinity;

  // 1. Double newlines (paragraphs)
  const paragraphRegex = /\n\s*\n/g;
  let match: RegExpExecArray | null;
  while ((match = paragraphRegex.exec(trimmed)) !== null) {
    const idx = match.index;
    if (idx >= minSplit && idx <= maxSplit) {
      const diff = Math.abs(idx - mid);
      if (diff < minDiff) {
        minDiff = diff;
        bestIndex = idx;
      }
    }
  }

  // 2. Single newlines
  if (bestIndex === -1) {
    const singleNewlineRegex = /\n/g;
    while ((match = singleNewlineRegex.exec(trimmed)) !== null) {
      const idx = match.index;
      if (idx >= minSplit && idx <= maxSplit) {
        const diff = Math.abs(idx - mid);
        if (diff < minDiff) {
          minDiff = diff;
          bestIndex = idx;
        }
      }
    }
  }

  // 3. Sentence boundaries (. ! ? ؟ :) followed by whitespace
  if (bestIndex === -1) {
    const sentenceRegex = /[.!?؟:][\s\n]+/g;
    while ((match = sentenceRegex.exec(trimmed)) !== null) {
      const idx = match.index + 1;
      if (idx >= minSplit && idx <= maxSplit) {
        const diff = Math.abs(idx - mid);
        if (diff < minDiff) {
          minDiff = diff;
          bestIndex = idx;
        }
      }
    }
  }

  // 4. Fallback: whitespace nearest to mid
  if (bestIndex === -1) {
    const spaceRegex = /\s+/g;
    while ((match = spaceRegex.exec(trimmed)) !== null) {
      const idx = match.index;
      if (idx >= minSplit && idx <= maxSplit) {
        const diff = Math.abs(idx - mid);
        if (diff < minDiff) {
          minDiff = diff;
          bestIndex = idx;
        }
      }
    }
  }

  if (bestIndex !== -1) {
    const firstPart = trimmed.slice(0, bestIndex).trim();
    const secondPart = trimmed.slice(bestIndex).trim();
    if (firstPart && secondPart) {
      return { isLong: true, firstPart, secondPart };
    }
  }

  return { isLong: false, firstPart: trimmed, secondPart: "" };
}

/** Article body text, in the content language's font, with inline or trailing ad placement. */
const NewsDescription = memo(function NewsDescription({
  description,
  currentLang,
  isReady = true,
}: NewsDescriptionProps) {
  const { t } = useTranslation();
  const styles = useThemeStyles((c) => ({
    container: {
      width: "100%",
    },
    description: {
      fontSize: 16,
      color: c.text,
      lineHeight: 26,
    },
  }));

  const fontStyle = useMemo(
    () => ({ fontFamily: currentLang === "ar" ? "Cairo" : "Inter" }),
    [currentLang],
  );

  const { isLong, firstPart, secondPart } = useMemo(
    () => splitDescription(description || ""),
    [description],
  );

  if (isLong && secondPart) {
    return (
      <View style={styles.container}>
        <CustomText style={[styles.description, fontStyle]}>
          {firstPart}
        </CustomText>
        <AdSlot visible={isReady} marginVertical={25} />
        <CustomText style={[styles.description, fontStyle]}>
          {secondPart}
        </CustomText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomText style={[styles.description, fontStyle]}>
        {firstPart || t("news.details.noDescription")}
      </CustomText>
      <AdSlot visible={isReady} marginVertical={30} />
    </View>
  );
});

export default NewsDescription;
