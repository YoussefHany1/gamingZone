import { useState, useEffect } from "react";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { fetchGameById, fetchGamesByIds } from "@/src/services/api/igdbApi";
import type { Game } from "@/src/types/sharedTypes";

export function useRecommendedGames() {
  const [recommendedGames, setRecommendedGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [basedOnGenre, setBasedOnGenre] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchRecommendations() {
      try {
        const uid = auth().currentUser?.uid;
        if (!uid) {
          if (mounted) setLoading(false);
          return;
        }

        const db = firestore();
        
        // Fetch user profile to get platform preference
        const userDoc = await db.collection("users").doc(uid).get();
        let userPlatform: string | null = null;
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data?.platform) {
            const profilePlatform = data.platform.toLowerCase();
            if (profilePlatform === "pc") userPlatform = "PC (Microsoft Windows)";
            else if (profilePlatform === "playstation") userPlatform = "PlayStation 5";
            else if (profilePlatform === "xbox") userPlatform = "Xbox Series X|S";
            else if (profilePlatform === "android") userPlatform = "Android";
            else if (profilePlatform === "ios") userPlatform = "iOS";
          }
        }

        const listsRef = db.collection("users").doc(uid).collection("lists");

        // 1. Fetch user's playing and played games
        const [playingSnap, playedSnap, wantToPlaySnap] = await Promise.all([
          listsRef.doc("playing").collection("games").get(),
          listsRef.doc("played").collection("games").get(),
          listsRef.doc("wantToPlay").collection("games").get(),
        ]);

        const allUserGames: any[] = [];
        const ownedGameIds = new Set<number>();

        playingSnap.forEach((doc) => {
          const data = doc.data();
          allUserGames.push(data);
          ownedGameIds.add(data.id);
        });

        playedSnap.forEach((doc) => {
          const data = doc.data();
          allUserGames.push(data);
          ownedGameIds.add(data.id);
        });

        wantToPlaySnap.forEach((doc) => {
          ownedGameIds.add(doc.data().id);
        });

        if (allUserGames.length === 0) {
          if (mounted) setLoading(false);
          return;
        }

        // 2. Sort games by steamPlaytimeForever (descending), fallback to addedAt (descending)
        allUserGames.sort((a, b) => {
          const playA = a.steamPlaytimeForever || 0;
          const playB = b.steamPlaytimeForever || 0;
          if (playA !== playB) return playB - playA;
          
          const timeA = a.addedAt?.toMillis ? a.addedAt.toMillis() : 0;
          const timeB = b.addedAt?.toMillis ? b.addedAt.toMillis() : 0;
          return timeB - timeA;
        });

        // 3. Pick top 5 games to analyze
        const topGames = allUserGames.slice(0, 5);
        const topGameIds = topGames.map(g => g.id);

        // 4. Fetch details for these 5 games in parallel to get their genres
        const detailsPromises = topGameIds.map(id => fetchGameById(id).catch(() => null));
        const gamesDetails = await Promise.all(detailsPromises);

        // 5. Extract similar_games IDs from the detailed games
        const similarGameIds = new Set<number>();
        let mostFrequentGenre = "";

        const genreCounts: Record<string, number> = {};

        gamesDetails.forEach(details => {
          if (details) {
            if (details.similar_games) {
              details.similar_games.forEach(sg => {
                if (!ownedGameIds.has(sg.id)) {
                  similarGameIds.add(sg.id);
                }
              });
            }
            if (details.genres) {
              details.genres.forEach(genre => {
                if (genre.name) {
                  genreCounts[genre.name] = (genreCounts[genre.name] || 0) + 1;
                }
              });
            }
          }
        });

        if (similarGameIds.size === 0) {
          if (mounted) setLoading(false);
          return;
        }

        if (Object.keys(genreCounts).length > 0) {
          mostFrequentGenre = Object.keys(genreCounts).reduce((a, b) =>
            (genreCounts[a] || 0) > (genreCounts[b] || 0) ? a : b
          );
        }
        
        if (mounted && mostFrequentGenre) {
          setBasedOnGenre(mostFrequentGenre);
        }

        // 6. Select up to 15 similar games to fetch
        const idsToFetch = Array.from(similarGameIds).slice(0, 15);

        // 7. Fetch full game metadata for these similar games
        const results = await fetchGamesByIds(idsToFetch);

        // Sort by total_rating descending
        results.sort((a, b) => (b.total_rating || 0) - (a.total_rating || 0));

        // Return up to 10 recommendations
        if (mounted) {
          setRecommendedGames(results.slice(0, 10));
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching recommended games:", error);
        if (mounted) setLoading(false);
      }
    }

    fetchRecommendations();

    return () => {
      mounted = false;
    };
  }, []);

  return { recommendedGames, loading, basedOnGenre };
}
