import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

export type CurrentGameId = {
  currentId: number | string;
  setCurrentId: Dispatch<SetStateAction<number | string>>;
};

/**
 * The game currently on screen.
 *
 * Starts from the route param and changes when the user opens a game from the
 * "series" or "similar" rails, which swap the content in place rather than
 * pushing a new screen.
 */
export function useCurrentGameId(initialGameID: number | string): CurrentGameId {
  const [currentId, setCurrentId] = useState<number | string>(initialGameID);

  // Re-sync only when the route hands us a different game (same screen, new
  // params). The functional update keeps `currentId` out of the dependency
  // list: depending on it would re-run this effect after the user opens a
  // similar game and snap them back to the route's game.
  useEffect(() => {
    if (!initialGameID) return;
    setCurrentId((prev) => (prev === initialGameID ? prev : initialGameID));
  }, [initialGameID]);

  return { currentId, setCurrentId };
}
