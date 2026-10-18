/**
 * Onboarding plays over arbitrary video frames, so its scrim and the copy on
 * top of it are fixed light-on-dark values rather than theme tokens: a themed
 * (let alone light) panel would wash out whatever the clip is showing.
 */
export const SCRIM_GRADIENT: readonly [string, string] = ["#1a3560", "#0c1a33"];

export const SCRIM_TITLE_COLOR = "#ffffff";

export const SCRIM_DESCRIPTION_COLOR = "rgba(255,255,255,0.78)";
