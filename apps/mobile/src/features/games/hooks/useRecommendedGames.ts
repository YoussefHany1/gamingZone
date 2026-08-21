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
            userPlatform = data.platform.toLowerCase();
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

        // 3. Pick top 10 games to analyze
        const topGames = allUserGames.slice(0, 10);
        const topGameIds = topGames.map(g => g.id);

        // 4. Fetch details for these games in parallel to get their genres
        const detailsPromises = topGameIds.map(id => fetchGameById(id).catch(() => null));
        const gamesDetails = await Promise.all(detailsPromises);

        // 5. Extract similar_games IDs from the detailed games
        const similarGameWeights: Record<number, number> = {};
        const similarGameIds = new Set<number>();

        const genreCounts: Record<string, number> = {};

        gamesDetails.forEach((details, index) => {
          if (details) {
            const sourceWeight = 10 - index; // Rank 1 gets 10, Rank 10 gets 1
            if (details.similar_games) {
              details.similar_games.forEach(sg => {
                if (!ownedGameIds.has(sg.id)) {
                  similarGameIds.add(sg.id);
                  similarGameWeights[sg.id] = (similarGameWeights[sg.id] || 0) + sourceWeight;
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

        // Get top 3 genres
        const sortedGenres = Object.keys(genreCounts).sort((a, b) => (genreCounts[b] || 0) - (genreCounts[a] || 0));
        const top3Genres = sortedGenres.slice(0, 3);
        const mostFrequentGenre = top3Genres.length > 0 ? top3Genres[0] : "";
        
        if (mounted && mostFrequentGenre) {
          setBasedOnGenre(mostFrequentGenre);
        }

        // 6. Select up to 40 similar games to fetch, prioritized by their source weight
        const sortedCandidateIds = Array.from(similarGameIds).sort((a, b) => {
          return (similarGameWeights[b] || 0) - (similarGameWeights[a] || 0);
        });
        const idsToFetch = sortedCandidateIds.slice(0, 40);

        // 7. Fetch full game metadata for these similar games
        let results = await fetchGamesByIds(idsToFetch);

        // 8. Filter by Category (exclude DLCs) and User Platform
        results = results.filter(game => {
          // Exclude if it has a category and it's not a main game (0)
          if ((game as any).category !== undefined && (game as any).category !== 0) {
            return false;
          }

          if (userPlatform) {
            if (!game.platforms) return false;
            
            if (userPlatform === "playstation") {
               return game.platforms.some(p => p.name?.toLowerCase().includes("playstation") || p.abbreviation?.toLowerCase().includes("ps"));
            }
            if (userPlatform === "xbox") {
               return game.platforms.some(p => p.name?.toLowerCase().includes("xbox"));
            }
            if (userPlatform === "pc") {
               return game.platforms.some(p => p.name?.toLowerCase().includes("pc") || p.name?.toLowerCase().includes("windows"));
            }

            return game.platforms.some(p => 
              p.name?.toLowerCase().includes(userPlatform!) || 
              p.abbreviation?.toLowerCase().includes(userPlatform!)
            );
          }
          return true;
        });

        // 9. Smart Scoring
        results.forEach(game => {
          let score = game.total_rating || 50; // Default score if no rating is present
          
          // Bonus for matching any of the top 3 genres
          if (game.genres && top3Genres.length > 0) {
             const gameGenreNames = game.genres.map(g => g.name);
             if (top3Genres[0] && gameGenreNames.includes(top3Genres[0])) score += 15;
             if (top3Genres[1] && gameGenreNames.includes(top3Genres[1])) score += 10;
             if (top3Genres[2] && gameGenreNames.includes(top3Genres[2])) score += 5;
          }
          
          // Bonus from source game weight
          const weight = similarGameWeights[game.id] || 0;
          score += (weight * 2);

          (game as any)._smartScore = score;
        });

        // Filter out games that still have a very low score despite bonuses
        results = results.filter(game => ((game as any)._smartScore || 0) >= 60);

        // Sort by smart score descending
        results.sort((a, b) => ((b as any)._smartScore || 0) - ((a as any)._smartScore || 0));

        // 10. Randomness / Diversity: Take top 20, shuffle, and pick 10
        const top20 = results.slice(0, 20);
        for (let i = top20.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [top20[i], top20[j]] = [top20[j]!, top20[i]!];
        }

        // Return up to 10 recommendations
        if (mounted) {
          setRecommendedGames(top20.slice(0, 10));
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
