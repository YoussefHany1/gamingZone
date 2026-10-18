import firestore from "@react-native-firebase/firestore";
import type { GameEntry } from "@gaming-zone/core";
import { logger } from "@/src/lib/logger";

/**
 * Firestore reads and writes for a user's game ratings.
 *
 * A rating is stored twice — as `users/{uid}/ratings/{gameId}` and as a `rating`
 * field on the game's document inside the "rated" list — and the value is then
 * mirrored onto the game's document in every *other* list that holds it. That
 * mirroring loop used to be copy-pasted into three call sites (two of them in
 * `useGameMutations`), so it lives here now.
 */

/**
 * Saves (`newRating` > 0) or clears (`newRating` === 0) the user's rating and
 * keeps the "rated" list and the other lists in sync.
 *
 * The "rated" list is created on demand: a user can rate a game from the
 * details screen without ever having used the lists feature.
 */
export async function saveGameRating(
  uid: string,
  gameId: string | number,
  newRating: number,
  game: GameEntry,
): Promise<void> {
  const gameIdStr = String(gameId);
  const ratingRef = firestore()
    .collection("users")
    .doc(uid)
    .collection("ratings")
    .doc(gameIdStr);

  const ratedGameRef = firestore()
    .collection("users")
    .doc(uid)
    .collection("lists")
    .doc("rated")
    .collection("games")
    .doc(gameIdStr);

  if (newRating === 0) {
    await ratingRef.delete();
    await ratedGameRef.delete();
  } else {
    await firestore()
      .collection("users")
      .doc(uid)
      .collection("lists")
      .doc("rated")
      .set(
        {
          name: "Rated",
          type: "default",
          createdAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    await ratingRef.set({
      rating: newRating,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    await ratedGameRef.set({
      id: game.id,
      name: game.name,
      cover_image_id: game.cover_image_id ?? null,
      release_date: game.release_date ?? "N/A",
      rating: newRating,
      ratedAt: firestore.FieldValue.serverTimestamp(),
    });
  }

  await syncRatingFieldAcrossLists(uid, gameIdStr, newRating);
}

/**
 * Mirrors the `rating` field — or its absence, when `newRating` is 0 — onto the
 * game's document in every list except "rated".
 *
 * Exported separately because deleting a game straight out of the "rated" list
 * needs the mirroring without touching either rating document.
 */
export async function syncRatingFieldAcrossLists(
  uid: string,
  gameId: string | number,
  newRating: number,
): Promise<void> {
  const gameIdStr = String(gameId);
  const listsSnap = await firestore()
    .collection("users")
    .doc(uid)
    .collection("lists")
    .get();

  for (const listDoc of listsSnap.docs) {
    if (listDoc.id === "rated") continue;

    const gameRef = listDoc.ref.collection("games").doc(gameIdStr);
    const gameSnap = await gameRef.get();
    if (!gameSnap.exists()) continue;

    try {
      if (newRating === 0) {
        await gameRef.update({ rating: firestore.FieldValue.delete() });
      } else {
        await gameRef.update({ rating: newRating });
      }
    } catch {
      // The document can be deleted between the read and the write — the game is
      // already out of this list, so there is nothing left to sync.
      logger.debug(
        `[ratingService] Stale cache update handled for list ${listDoc.id}`,
      );
    }
  }
}
