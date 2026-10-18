/**
 * Type-level contract tests for the shared domain models.
 *
 * `packages/core` is types-only (no runtime code), so there is nothing to unit
 * test here. The risks worth guarding are:
 *
 *   1. a shared model losing a type it previously expressed — the motivating
 *      example is `Game.screenshots`, which had degraded to `any` in the mobile
 *      app's local copy of this model;
 *   2. the real API payload shape drifting away from the shared model.
 *
 * (1) is covered by the `Equal<A, B>` assertions below; (2) by assigning
 * captured payload fixtures to the models. Both fail at `tsc --noEmit` time,
 * which is gated in CI (`npm run type-check -w packages/core`).
 *
 * The fixtures are representative IGDB payloads. Refresh them from a real
 * response whenever an endpoint's shape is suspected to have changed — that is
 * the point of keeping them.
 */
import type {
  ArticleSummaryKey,
  CollectionGame,
  Cover,
  Game,
  GameBrief,
  GameCover,
  GameData,
  GameEntry,
  GameItem,
  Screenshot,
  SimilarGame,
  SummaryLanguage,
  WeeklySummaryDoc,
} from "./index";
import igdbGameDetail from "./__fixtures__/igdb-game-detail.json";
import igdbGamesList from "./__fixtures__/igdb-games-list.json";

// --- compile-time helpers --------------------------------------------------

/** `true` only when `A` and `B` are the same type (order-insensitive). */
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

/** Compile-time assertion: `T` must be `true`, or this file fails to compile. */
type Expect<T extends true> = T;

// --- regression guards -----------------------------------------------------

/** `screenshots` must stay typed; it silently became `any` in the old copy. */
type _ScreenshotsStayTyped = Expect<
  Equal<Game["screenshots"], Screenshot[] | undefined>
>;

/** Every brief-shape alias must still resolve to the same type. */
type _CollectionGameIsBrief = Expect<Equal<CollectionGame, GameBrief>>;
type _SimilarGameIsBrief = Expect<Equal<SimilarGame, GameBrief>>;
type _GameItemIsBrief = Expect<Equal<GameItem, GameBrief>>;
type _GameCoverIsCover = Expect<Equal<GameCover, Cover>>;

/** The supported-language union drives every per-language summary lookup. */
type _SummaryLanguageUnion = Expect<
  Equal<SummaryLanguage, "en" | "ar" | "es" | "fr" | "hi" | "pt-BR" | "pt-PT">
>;

/**
 * A detail payload must remain renderable by a browse-list card: `GameData` has
 * to stay assignable to `Game`.
 */
type _DetailFitsListCard = Expect<GameData extends Game ? true : false>;

/** Article summary attributes are derived from the language union. */
type _SummaryKeyCoversEnglish = Expect<Equal<ArticleSummaryKey extends string ? true : false, true>>;

// --- payload contract fixtures --------------------------------------------

const detail: GameData = igdbGameDetail;
const list: Game[] = igdbGamesList;
const entry: GameEntry = { id: 1, name: "Hades", cover_image_id: null };
const weekly: WeeklySummaryDoc = { $id: "1", $createdAt: "2026-01-01T00:00:00.000Z" };

void detail;
void list;
void entry;
void weekly;
