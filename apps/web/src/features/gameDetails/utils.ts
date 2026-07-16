export function getAgeRatingLabel(ratingCategory: number): string {
  const map: Record<number, string> = {
    1: "3+",
    2: "7+",
    3: "12+",
    4: "16+",
    5: "18+",
    6: "RP",
    7: "3+",
    8: "3+",
    9: "10+",
    10: "13+",
    11: "17+",
    12: "18+",
  };
  return map[ratingCategory] ?? "RP";
}

export function formatPlayTime(gameTimeToBeats: any) {
  if (!gameTimeToBeats) return null;
  return {
    main: gameTimeToBeats.hastily ? Math.floor(gameTimeToBeats.hastily / 3600) : null,
    mainExtra: gameTimeToBeats.normally ? Math.floor(gameTimeToBeats.normally / 3600) : null,
    completionist: gameTimeToBeats.completely ? Math.floor(gameTimeToBeats.completely / 3600) : null,
  };
}

export function formatLanguageRows(languageSupports: any[]) {
  const languageMap: Record<string, { Audio: boolean; Subtitles: boolean; Interface: boolean }> = {};

  languageSupports.forEach((sup) => {
    if (!sup.language || !sup.language_support_type) return;
    const langName = sup.language.name;
    const supportTypeName = sup.language_support_type.name;

    if (!languageMap[langName]) {
      languageMap[langName] = { Audio: false, Subtitles: false, Interface: false };
    }

    if (supportTypeName === "Audio") languageMap[langName].Audio = true;
    if (supportTypeName === "Subtitles") languageMap[langName].Subtitles = true;
    if (supportTypeName === "Interface") languageMap[langName].Interface = true;
  });

  return Object.entries(languageMap)
    .map(([name, supports]) => ({ name, ...supports }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
