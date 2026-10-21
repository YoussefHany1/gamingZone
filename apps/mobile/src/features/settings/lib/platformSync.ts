/**
 * platformSync — the shared pipeline behind linked-account library imports.
 *
 * Both the manual "Sync now" UI (LinkAccountModal) and the silent app-open
 * auto-sync (useAppOpenSync) run the same flow through here:
 *
 *   resolve → fetch library → map to IGDB → batch-write to Firestore lists
 *
 * Platform adapters:
 *  - Steam: backend-owned `/steam/*` endpoints (appids → IGDB by external id).
 *  - PSN:   backend `/psn/sync` (played titles) + `/igdb/map-by-names` with a
 *           server-side global name cache.
 *  - Xbox:  backend `/xbox/sync` (recently played + achievement titles) using
 *           the same server-side IGDB name cache.
 *
 * Firestore shape written here is identical to the pre-existing Steam flow:
 * users/{uid}/lists/{playing|played|wantToPlay}/games/{igdbId}, with a new
 * `platformOrigin` stamp. Legacy docs have it `undefined`, which callers must
 * treat as the implicit "steam" default.
 *
 * Import classification (matching the legacy Steam flow):
 *  - Steam: playtime in the last 2 weeks → "playing", rest → "played".
 *  - PSN:   touched within the last 21 days → "playing", rest → "played".
 *  - Xbox:  played within the last 14 days → "playing", rest → "played".
 *  - Steam wishlist → "wantToPlay".
 */
import auth from "@react-native-firebase/auth";
import firestore, {
  type FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import i18n from "@/src/i18n";
import { logger } from "@/src/lib/logger";
import { storage } from "@/src/lib/storage";
import {
  fetchOwnedGames,
  mapSteamAppsToIgdb,
  fetchSteamWishlist,
} from "@/src/services/api/steamApi";
import { mapTitlesToIgdbChunked, syncPsnTitles, syncXboxTitles } from "@/src/services/api/linkedAccountsApi";
import { normalizeGameTitle } from "@gaming-zone/utils";
import type {
  LinkedAccountPlatform,
  SteamGame,
} from "@/src/features/settings/types";

// ─── Constants ───────────────────────────────────────────────────────────────

/** An account older than this is silently re-synced on app open. */
export const SYNC_STALE_MS = 24 * 60 * 60 * 1000;
const FIRESTORE_BATCH_LIMIT = 400; // < 500 safety margin
/** A PSN title counts as "currently playing" if touched in the last 3 weeks. */
const PSN_RECENT_DAYS = 21;
/** An Xbox title counts as "currently playing" if played in the last 2 weeks. */
export const XBOX_RECENT_DAYS = 14;
const MMKV_SYNC_LOCK = "@linked_sync_running";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SyncOutcome = "ok" | "empty" | "private" | "error";

/** Shared outcome shape for the serverside-token platforms (PSN, Xbox). */
export type LinkSyncOutcome = "ok" | "empty" | "reauth_required" | "error";

export type PsnSyncOutcome = LinkSyncOutcome;

export type XboxSyncOutcome = LinkSyncOutcome;

/** One imported entry, ready for the Firestore writer. */
interface ImportedGame {
  id: number;
  name: string;
  cover_image_id: string | null;
  release_date: string;
  platformOrigin: LinkedAccountPlatform;
  /** Steam only. */
  steamPlaytimeForever?: number;
  /** Recency marker stamped inside the recency window (Steam 14d / PSN 21d /
   * Xbox 14d). Non-null → the writer lands the game in "playing" instead of
   * "played". */
  lastPlayedMs?: number | null;
}

// ─── Locking ─────────────────────────────────────────────────────────────────

/**
 * MMKV flag-lock so a manual sync and the app-open hook never run
 * concurrently — overlapping Firestore batch commits duplicate work.
 */
export function isSyncLocked(): boolean {
  return storage.getString(MMKV_SYNC_LOCK) === "1";
}

function lockSync(): void {
  storage.set(MMKV_SYNC_LOCK, "1");
}

function unlockSync(): void {
  storage.remove(MMKV_SYNC_LOCK);
}

/**
 * Runs `fn` while holding the sync lock. Returns null (instead of queueing)
 * when another sync is already running.
 */
async function withSyncLock<T>(fn: () => Promise<T>): Promise<T | null> {
  if (isSyncLocked()) {
    logger.debug("[platformSync] another sync already running — skipping");
    return null;
  }
  lockSync();
  try {
    return await fn();
  } finally {
    unlockSync();
  }
}

/** Uniform decision: a recency-stamped title goes to "playing". */
function isCurrentlyPlaying(game: ImportedGame): boolean {
  return game.lastPlayedMs != null;
}

/**
 * Builds one import entry — every adapter constructs through here so the list
 * writer keeps a single, stable doc shape per platform.
 */
function makeImportedGame(
  platform: LinkedAccountPlatform,
  game: {
    id: number;
    name: string;
    cover_image_id: string | null;
    release_date: string;
  },
  extra: {
    steamPlaytimeForever?: number;
    /** Touched inside the recency window → "playing" (else "played"). */
    lastPlayedMs?: number | null;
  } = {},
): ImportedGame {
  return {
    ...game,
    platformOrigin: platform,
    lastPlayedMs: extra.lastPlayedMs ?? null,
    ...(extra.steamPlaytimeForever != null
      ? { steamPlaytimeForever: extra.steamPlaytimeForever }
      : {}),
  };
}

// ─── Firestore writer (shared by every platform) ─────────────────────────────

/** Base doc fields written for every imported game (Steam- and PSN-shape
 * compatible: lists render `cover_image_id`/`release_date` uniformly). */
function importedDocFields(game: ImportedGame) {
  return {
    id: game.id,
    name: game.name,
    cover_image_id: game.cover_image_id,
    release_date: game.release_date,
    platformOrigin: game.platformOrigin,
    ...(game.steamPlaytimeForever != null
      ? { steamPlaytimeForever: game.steamPlaytimeForever }
      : {}),
    addedAt: firestore.FieldValue.serverTimestamp(),
  };
}

/**
 * Batch-writes games into the lists resolved by `resolveListId`, committing
 * every FIRESTORE_BATCH_LIMIT ops. Returns the number of games written.
 */
async function batchWriteGames(
  games: ImportedGame[],
  resolveListId: (game: ImportedGame) => string,
): Promise<number> {
  const uid = auth().currentUser?.uid;
  if (!uid || games.length === 0) return 0;

  const db = firestore();
  const listsRef = db.collection("users").doc(uid).collection("lists");

  let batch: FirebaseFirestoreTypes.WriteBatch = db.batch();
  let opCount = 0;
  let written = 0;

  for (const game of games) {
    batch.set(
      listsRef.doc(resolveListId(game)).collection("games").doc(String(game.id)),
      importedDocFields(game),
      { merge: true },
    );

    written++;
    opCount++;

    if (opCount >= FIRESTORE_BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) await batch.commit();
  return written;
}

/** Shared linkedAccounts/{platform} doc patch (rules: owner-only fields). */
async function updateLinkedAccountDoc(
  platform: LinkedAccountPlatform,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const uid = auth().currentUser?.uid;
    if (!uid) return;
    await firestore().collection("users").doc(uid).collection("linkedAccounts").doc(platform).set(
      { platform, ...data },
      { merge: true },
    );
  } catch (e) {
    logger.warn(`[platformSync] linkedAccounts/${platform} update failed:`, e);
  }
}

/**
 * Ensures the three default lists exist, then writes every game into
 * "playing"/"played" per its recency marker (re-imports never duplicate docs).
 */
async function writeImportedGames(games: ImportedGame[]): Promise<number> {
  const uid = auth().currentUser?.uid;
  if (!uid || games.length === 0) return 0;

  const db = firestore();
  const listsRef = db.collection("users").doc(uid).collection("lists");

  // Ensure the default lists exist (same as the legacy modal).
  const t = i18n.t.bind(i18n);
  const defaults: Array<{ id: string; name: string }> = [
    { id: "playing", name: t("games.details.listStatus.playing") },
    { id: "played", name: t("games.details.listStatus.played") },
    { id: "wantToPlay", name: t("games.details.listStatus.wantToPlay") },
  ];
  const ensureLists = db.batch();
  for (const item of defaults) {
    ensureLists.set(
      listsRef.doc(item.id),
      {
        name: item.name,
        type: "default",
        createdAt: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  await ensureLists.commit();

  return batchWriteGames(games, (game) =>
    isCurrentlyPlaying(game) ? "playing" : "played",
  );
}

// ─── Steam adapter ───────────────────────────────────────────────────────────

interface SteamOwnedPlaytime {
  playtimeForever: number;
  playtime2weeks: number;
}

type FetchOwnedOutcome =
  | { status: "ok"; games: SteamGame[] }
  | { status: "private" }
  | { status: "error" };

/** Thin wrapper giving syncSteamLibrary a stable, typed outcome. */
async function fetchSteamOutcome(steamId: string): Promise<FetchOwnedOutcome> {
  try {
    const data = await fetchOwnedGames(steamId);
    return { status: "ok", games: Array.isArray(data.games) ? data.games : [] };
  } catch (error) {
    const status = (error as unknown as { status?: number }).status;
    if (Number(status) === 403) return { status: "private" };
    // Fallback: the shared axios client discards statuses in its message.
    if (String((error as Error).message ?? "").includes("403")) {
      return { status: "private" };
    }
    return { status: "error" };
  }
}

/**
 * Full Steam sync for a resolved SteamID. Returns a SyncOutcome; never throws.
 * Errors ARE returned (never thrown) so callers like silent auto-sync can
 * branch on the outcome without try/catch noise.
 */
export async function syncSteamLibrary(steamId: string): Promise<SyncOutcome> {
  const result = await withSyncLock(async (): Promise<SyncOutcome> => {
    try {
      if (!steamId) return "error";

      // 1. Owned (played) games — filter to played only, like the modal did.
      const owned = await fetchSteamOutcome(steamId);
      if (owned.status === "private") return "private";
      if (owned.status === "error") return "error";

      const playedOnly = owned.games.filter((g) => g.playtime_forever > 0);
      if (playedOnly.length === 0) return "empty";

      // 2. IGDB mapping in batches via backend.
      const mapped = await mapSteamAppsToIgdb(playedOnly.map((g) => g.appid));
      const playtimeByAppId = new Map<number, SteamOwnedPlaytime>();
      for (const g of playedOnly) {
        playtimeByAppId.set(Number(g.appid), {
          playtimeForever: g.playtime_forever,
          playtime2weeks: g.playtime_2weeks ?? 0,
        });
      }

      const games: ImportedGame[] = mapped.flatMap((game) => {
        const appId = Number(
          (game as unknown as { steam_appid?: number }).steam_appid ?? NaN,
        );
        const playtime = playtimeByAppId.get(appId);
        if (!playtime) return [];
        return [
          makeImportedGame("steam", game, {
            steamPlaytimeForever: playtime.playtimeForever,
            // doubles as the "playing" marker for the writer
            lastPlayedMs: playtime.playtime2weeks > 0 ? Date.now() : null,
          }),
        ];
      });

      // 3. Wishlist → wantToPlay.
      const playedIds = new Set(
        mapped.map((g) => Number((g as { steam_appid?: number }).steam_appid)),
      );
      let wishlistGames: ImportedGame[] = [];
      try {
        const wishlistAppIds = await fetchSteamWishlist(steamId);
        const uniqueWishlistAppIds = Array.from(
          new Set(
            wishlistAppIds.filter((id) => Number.isFinite(id) && !playedIds.has(Number(id))),
          ),
        );
        if (uniqueWishlistAppIds.length > 0) {
          const mappedWishlist = await mapSteamAppsToIgdb(uniqueWishlistAppIds);
          wishlistGames = mappedWishlist.map((game) => makeImportedGame("steam", game));
        }
      } catch (e) {
        logger.warn("[platformSync] Steam wishlist import skipped:", e);
      }

      // 4. Writes.
      const playingAndPlayed = await writeImportedGames(games);
      // Wishlist items are appended to wantToPlay directly (same listsRef).
      const wishlistWritten = await writeSteamWishlistGames(wishlistGames);

      const total = playingAndPlayed + wishlistWritten;
      if (total === 0) return "empty";

      await markSynced("steam");
      return "ok";
    } catch (e) {
      logger.error("[platformSync] Steam sync failed:", e);
      return "error";
    }
  });

  return result ?? "error"; // lock-busy behaves as a no-op error for callers
}

/**
 * Wishlist items land in wantToPlay, not the played-driven lists.
 */
async function writeSteamWishlistGames(games: ImportedGame[]): Promise<number> {
  return batchWriteGames(games, () => "wantToPlay");
}

// ─── PSN adapter ─────────────────────────────────────────────────────────────

/**
 * Full PSN sync: backend pulls played titles, IGDB name-map resolves them,
 * the writer lands them in the lists. Reauth failures NEVER throw — the
 * outcome tells the caller to show the reconnect UI instead.
 */
export async function syncPsnLibrary(): Promise<PsnSyncOutcome> {
  const result = await withSyncLock(async (): Promise<PsnSyncOutcome> => {
    try {
      const response = await syncPsnTitles();
      if (response.status === "reauth_required") return "reauth_required";
      if (response.status !== "ok") return "error";

      const titles = response.titles ?? [];
      if (titles.length === 0) return "empty";

      // Dedupe by normalized name: PSN regularly lists the SAME game again for
      // a different platform version (PS4/PS5/PC).
      const unique = new Map<string, PsnTitleShape>();
      for (const title of titles) {
        const key = normalizeGameTitle(title.name);
        if (!key) continue;
        const existing = unique.get(key);
        if (!existing || lastPlayedMs(title) > lastPlayedMs(existing)) {
          unique.set(key, title);
        }
      }
      const uniqueTitles = Array.from(unique.values());
      const uniqueNames = uniqueTitles.map((t) => t.name);

      // IGDB map-by-names (server-side cache; pace + 429 handled server-side).
      const mapped = await mapTitlesToIgdbChunked(uniqueNames);
      if (mapped.length === 0) return "empty";

      const byTitle = new Map(mapped.map((r) => [normalizeGameTitle(r.title), r.game]));
      const games: ImportedGame[] = [];
      for (const [key, title] of unique.entries()) {
        const game = byTitle.get(key);
        if (!game) continue; // unmatched → negative-cached server-side, skipped here
        const playedMs = lastPlayedMs(title);
        games.push(
          makeImportedGame("psn", game, {
            // Only recently-touched titles get the marker → they land in "playing".
            lastPlayedMs:
              playedMs > 0 && Date.now() - playedMs < PSN_RECENT_DAYS * 24 * 60 * 60 * 1000
                ? playedMs
                : null,
          }),
        );
      }
      if (games.length === 0) return "empty";

      const written = await writeImportedGames(games);
      if (written === 0) return "empty";

      await markSynced("psn");
      return "ok";
    } catch (e) {
      logger.error("[platformSync] PSN sync failed:", e);
      return "error";
    }
  });

  return result ?? "error";
}

interface PsnTitleShape {
  name: string;
  lastPlayedDateTime: string | null;
}

function lastPlayedMs(title: PsnTitleShape): number {
  if (!title.lastPlayedDateTime) return -1;
  const ms = Date.parse(title.lastPlayedDateTime);
  return Number.isFinite(ms) ? ms : -1;
}

// ─── Xbox adapter ────────────────────────────────────────────────────────────

interface XboxTitleShape {
  name: string;
  source: "recent" | "achievements";
  lastPlayedDateTime: string | null;
}

function xboxLastPlayedMs(title: XboxTitleShape): number {
  if (!title.lastPlayedDateTime) return -1;
  const ms = Date.parse(title.lastPlayedDateTime);
  return Number.isFinite(ms) ? ms : -1;
}

/**
 * Full Xbox sync: the backend refreshes the Microsoft grant and returns the
 * recently played titles plus the achievement titles that show real progress.
 * IGDB name-mapping resolves them and the writer lands them in the lists.
 *
 * There is no purchase history and no playtime counter for modern Xbox, so
 * only two buckets exist: "playing" (played within XBOX_RECENT_DAYS) and
 * "played" (everything else). Reauth failures NEVER throw — the outcome tells
 * the caller to show the reconnect UI instead.
 */
export async function syncXboxLibrary(): Promise<XboxSyncOutcome> {
  const result = await withSyncLock(async (): Promise<XboxSyncOutcome> => {
    try {
      const response = await syncXboxTitles();
      if (response.status === "reauth_required") return "reauth_required";
      if (response.status !== "ok") return "error";

      const titles = response.titles ?? [];
      if (titles.length === 0) return "empty";

      // Dedupe by normalized name: the same title can show up in both sources
      // (recent play AND achievements). The entry carrying the play date wins.
      const unique = new Map<string, XboxTitleShape>();
      for (const title of titles) {
        const key = normalizeGameTitle(title.name);
        if (!key) continue;
        const existing = unique.get(key);
        if (!existing || xboxLastPlayedMs(title) > xboxLastPlayedMs(existing)) {
          unique.set(key, title);
        }
      }
      const uniqueTitles = Array.from(unique.values());
      const uniqueNames = uniqueTitles.map((t) => t.name);

      const mapped = await mapTitlesToIgdbChunked(uniqueNames);
      if (mapped.length === 0) return "empty";

      const byTitle = new Map(mapped.map((r) => [normalizeGameTitle(r.title), r.game]));
      const games: ImportedGame[] = [];
      for (const [key, title] of unique.entries()) {
        const game = byTitle.get(key);
        if (!game) continue; // unmatched → negative-cached server-side, skipped here
        const playedMs = xboxLastPlayedMs(title);
        games.push(
          makeImportedGame("xbox", game, {
            // Only titles played inside the window get the marker → "playing".
            lastPlayedMs:
              playedMs > 0 && Date.now() - playedMs < XBOX_RECENT_DAYS * 24 * 60 * 60 * 1000
                ? playedMs
                : null,
          }),
        );
      }
      if (games.length === 0) return "empty";

      const written = await writeImportedGames(games);
      if (written === 0) return "empty";

      await markSynced("xbox");
      return "ok";
    } catch (e) {
      logger.error("[platformSync] Xbox sync failed:", e);
      return "error";
    }
  });

  return result ?? "error";
}

// ─── Linked-account helpers ──────────────────────────────────────────────────

/** Writes lastSyncedAt under the user's linkedAccounts doc (rules: owner-only). */
export async function markSynced(platform: LinkedAccountPlatform): Promise<void> {
  await updateLinkedAccountDoc(platform, { lastSyncedAt: Date.now() });
}

/** Flips the account to "unlinked" (artifacts in lists are kept). */
export async function unlinkAccount(platform: LinkedAccountPlatform): Promise<void> {
  await updateLinkedAccountDoc(platform, { status: "unlinked" });
}

/**
 * True when `Date.now() - lastSyncedMs` exceeds the staleness window.
 * NOTE the subtraction direction — easy to invert by mistake.
 */
export function isAccountStale(lastSyncedMs: number | null | undefined): boolean {
  if (lastSyncedMs == null) return true; // never synced
  return Date.now() - lastSyncedMs > SYNC_STALE_MS;
}
