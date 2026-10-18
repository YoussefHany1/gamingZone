import { StyleSheet } from "react-native";

// ─── Layout constants ─────────────────────────────────────────────────────────

const INSET = 20;
export { INSET };

const TILE_SIZE = 52;
const TILE_RADIUS = 14;
const TILE_RING = 2.5;
const TILE_PAD = 3;

export const SWATCH = 32;
const SWATCH_HIT = SWATCH + 16;
const SWATCH_GAP = 10;

// ─── Static geometry (theme-independent) ─────────────────────────────────────

/**
 * The parts of the theme screen that do not depend on the active palette:
 * sizes, spacing and shape. Everything colour-bearing lives in a themed sheet.
 */
export const geometry = StyleSheet.create({
  // preview
  previewWrapper: {
    marginHorizontal: INSET,
    marginTop: 16,
    borderRadius: 20,
    overflow: "hidden",
  },

  // tile strip
  tilesScroll: {
    paddingHorizontal: INSET,
    paddingTop: 20,
    paddingBottom: 4,
    gap: 10,
    flexDirection: "row",
  },
  tileWrapper: {
    alignItems: "center",
    gap: 6,
  },
  tileTouchable: {
    padding: TILE_PAD,
    borderWidth: TILE_RING,
    borderRadius: TILE_RADIUS + TILE_RING + TILE_PAD,
  },
  tileSwatch: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: TILE_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tileLabel: {
    fontSize: 10,
    textAlign: "center",
    maxWidth: TILE_SIZE + TILE_PAD * 2 + TILE_RING * 2,
  },
  tileStripe: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: TILE_SIZE * 0.35,
  },
  tileDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tileCheck: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  // description block
  descBlock: {
    marginTop: 20,
    paddingHorizontal: INSET,
    alignItems: "center",
    gap: 4,
  },

  // accent section
  accentSection: {
    paddingHorizontal: INSET,
    paddingTop: 28,
  },
  swatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SWATCH_GAP,
    marginTop: 10,
  },
  swatchCol: {
    alignItems: "center",
    gap: 4,
  },
  swatchHit: {
    width: SWATCH_HIT,
    height: SWATCH_HIT,
    borderRadius: SWATCH_HIT / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchCircle: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchLabel: {
    fontSize: 10,
    textAlign: "center",
  },
});
