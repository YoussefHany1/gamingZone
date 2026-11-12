export const SETUP_PLATFORMS = [
  { id: "playstation", labelKey: "setup.platforms.playstation", icon: "Gamepad2" },
  { id: "xbox", labelKey: "setup.platforms.xbox", icon: "Gamepad2" },
  { id: "pc", labelKey: "setup.platforms.pc", icon: "Monitor" },
  { id: "nintendo", labelKey: "setup.platforms.nintendo", icon: "Gamepad2" },
  { id: "mobile", labelKey: "setup.platforms.mobile", icon: "Smartphone" },
] as const;

export type SetupPlatformId = (typeof SETUP_PLATFORMS)[number]["id"];

// Reuse IGDB genre names as canonical IDs (same as games filter).
export const SETUP_GENRES = [
  { id: "Role-playing (RPG)", labelKey: "games.filter.genres.rpg" },
  { id: "Shooter", labelKey: "games.filter.genres.shooter" },
  { id: "Adventure", labelKey: "games.filter.genres.adventure" },
  { id: "Racing", labelKey: "games.filter.genres.racing" },
  { id: "Sport", labelKey: "games.filter.genres.sport" },
  { id: "Strategy", labelKey: "games.filter.genres.strategy" },
  { id: "Fighting", labelKey: "games.filter.genres.fighting" },
  { id: "Platform", labelKey: "games.filter.genres.platform" },
  { id: "Puzzle", labelKey: "games.filter.genres.puzzle" },
  { id: "Simulator", labelKey: "games.filter.genres.simulator" },
  { id: "Indie", labelKey: "games.filter.genres.indie" },
  { id: "Arcade", labelKey: "games.filter.genres.arcade" },
] as const;

export type SetupGenreId = (typeof SETUP_GENRES)[number]["id"];

export const SETUP_FLAG_PREFIX = "@setup_done_";
export const SETUP_MIN_GENRES = 3;
export const SETUP_MAX_GENRES = 5;
