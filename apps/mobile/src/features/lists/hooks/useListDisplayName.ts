import { useCallback } from "react";
import { useTranslation } from "react-i18next";

/**
 * Resolves the fixed, English names of the built-in lists (Playing/Played/
 * Want to Play/Rated) to their localized equivalents. Custom list names pass
 * through unchanged.
 */
export function useListDisplayName(): (name: string) => string {
  const { t } = useTranslation();

  return useCallback(
    (name: string): string => {
      const map: Record<string, string> = {
        Playing: t("games.details.listStatus.playing"),
        Played: t("games.details.listStatus.played"),
        "Want to Play": t("games.details.listStatus.wantToPlay"),
        Rated: t("games.details.listStatus.rated"),
      };
      return map[name] ?? name;
    },
    [t],
  );
}
