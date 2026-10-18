import React, { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { NewsDescriptionProps } from "./types";

/** Article body text, in the content language's font. */
const NewsDescription = memo(function NewsDescription({
  description,
  currentLang,
}: NewsDescriptionProps) {
  const { t } = useTranslation();
  const styles = useThemeStyles((c) => ({
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

  return (
    <CustomText style={[styles.description, fontStyle]}>
      {description || t("news.details.noDescription")}
    </CustomText>
  );
});

export default NewsDescription;
