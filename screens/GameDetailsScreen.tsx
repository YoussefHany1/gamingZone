import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  Linking,
  ToastAndroid,
} from "react-native";
import { Image } from "expo-image";
import { useEffect, useState, useRef, useCallback, memo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import YoutubePlayer from "react-native-youtube-iframe";
import auth from "@react-native-firebase/auth";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import Loading from "../Loading";
import { useTranslation } from "react-i18next";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { adUnitId } from "../constants/config";
import COLORS from "../constants/colors";
import Svg, { Circle, Text as SvgText, Path } from "react-native-svg";
import { SERVER_URL } from "../constants/config";
import ListSelectionModal from "../components/ListSelectionModal";
import ImageGallery from "../components/ImageGallery";
import useCachedData from "../hooks/useCachedData";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

// Types
export type GamesStackParamList = {
  GameDetails: {
    gameID: number | string;
    claimUrl?: string;
    store?: string;
  };
};
type Props = NativeStackScreenProps<GamesStackParamList, "GameDetails">;
interface AgeRating {
  organization: number;
  rating_category: number;
}

interface Platform { id: number; abbreviation?: string }
interface Genre    { id: number; name: string }
interface GameMode { id: number; name: string }
interface Company  { id: number; name: string }
interface Engine   { id: number; name: string }
interface Video    { video_id?: string; name?: string }
interface Screenshot { image_id?: string }
interface Cover      { image_id?: string }
interface Website    { id: number; type: number; url: string }
interface Language   { name: string }
interface LangSupportType { name: string }

interface LanguageSupport {
  language: Language;
  language_support_type: LangSupportType;
}

interface GameTimeToBeat {
  hastily?: number;
  normally?: number;
  completely?: number;
}

interface GameData {
  id: number;
  name: string;
  summary?: string;
  cover?: Cover;
  total_rating?: number;
  total_rating_count?: number;
  release_dates?: { human?: string }[];
  platforms?: Platform[];
  genres?: Genre[];
  game_modes?: GameMode[];
  age_ratings?: AgeRating[];
  involved_companies?: {
    id: number;
    developer: boolean;
    publisher: boolean;
    company: Company;
  }[];
  game_engines?: Engine[];
  videos?: Video[];
  screenshots?: Screenshot[];
  language_supports?: LanguageSupport[];
  game_time_to_beats?: GameTimeToBeat;
  websites?: Website[];
  collections?: { games?: { id: number; name: string; cover?: Cover }[] }[];
  similar_games?: { id: number; name: string; cover?: Cover }[];
}

interface AgeRatingInfo { label: string; color: string }

interface LangRow {
  name: string;
  Audio: boolean;
  Subtitles: boolean;
  Interface: boolean;
}

// Constants
const AGE_RATING_MAP: Record<number, string> = {
  1: "3+", 2: "7+", 3: "12+", 4: "16+", 5: "18+",
  6: "RP", 7: "3+", 8: "3+", 9: "10+", 10: "13+", 11: "17+", 12: "18+",
};

// require() calls must be at module level for static assets
const STORE_ICONS: Record<number, ReturnType<typeof require>> = {
  13: require("../assets/steam.png"),
  16: require("../assets/epic-games.png"),
  17: require("../assets/gog.png"),
  23: require("../assets/playstation.png"),
  22: require("../assets/xbox.png"),
  24: require("../assets/nintendo-switch.png"),
  12: require("../assets/play-store.png"),
  10: require("../assets/apple-store.png"),
};

// helper functions

async function fetchGameById(id: number | string): Promise<GameData> {
  if (!id) throw new Error("fetchGameById: missing id");
  try {
    const res = await axios.get<GameData>(`${SERVER_URL}/game-details`, {
      params: { id },
    });
    return res.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response) throw new Error(`Server fetch failed: ${error.response.status}`);
      throw new Error("Network Error");
    }
    throw error;
  }
}

function getRatingColorCode(ratingVal: number): string {
  if ([1, 2, 6, 7, 8].includes(ratingVal)) return "#a5c400";
  if ([3, 4, 9, 10].includes(ratingVal)) return "#f4a200";
  if ([5, 11, 12].includes(ratingVal)) return "#e3001b";
  return COLORS.secondary;
}

function getAgeRatingInfo(ratings?: AgeRating[]): AgeRatingInfo | null {
  if (!ratings?.length) return null;
  const selected = ratings.find((r) => r.organization === 2) ?? ratings.find((r) => r.organization === 1);
  if (!selected) return null;
  return {
    label: AGE_RATING_MAP[selected.rating_category] ?? "?",
    color: getRatingColorCode(selected.rating_category),
  };
}

function getRatingColor(rating: number): string {
  if (rating <= 2) return "#8B0000";
  if (rating <= 4) return "#FF4C4C";
  if (rating <= 6) return "#FFA500";
  if (rating <= 8) return "#71e047";
  return "#006400";
}

// main

const GameDetails: React.FC<Props> = ({ route, navigation }) => {
  const { gameID: initialGameID, claimUrl, store = "" } = route.params;
  const [currentId, setCurrentId] = useState<number | string>(initialGameID);
  const mountedRef  = useRef<boolean>(true);
  const scrollRef   = useRef<ScrollView>(null);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null | undefined>(undefined);
  const [showListModal, setShowListModal] = useState<boolean>(false);
  const [authLoading, setAuthLoading]     = useState<boolean>(true);
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  // Cache key

  const cacheKey = currentId ? `GAME_DETAILS_CACHE_${currentId}` : "";

  const fetchGameData = useCallback(async (): Promise<GameData> => {
    if (!currentId) throw new Error("No game ID provided");
    return fetchGameById(currentId);
  }, [currentId]);

  const { data: game, isLoading: loading, error } = useCachedData<GameData>(
    cacheKey,
    fetchGameData,
    [currentId]
  );

  // Derived values (memoised)

  const ageRating = game ? getAgeRatingInfo(game.age_ratings) : null;

  const languageList: LangRow[] = React.useMemo(() => {
    if (!game?.language_supports) return [];
    const langMap: Record<string, LangRow> = {};
    game.language_supports.forEach((item) => {
      const langName = item.language.name;
      const supportType = item.language_support_type.name as keyof Omit<LangRow, "name">;
      if (!langMap[langName]) {
        langMap[langName] = { name: langName, Audio: false, Subtitles: false, Interface: false };
      }
      langMap[langName][supportType] = true;
    });
    return Object.values(langMap);
  }, [game?.language_supports]);

  const { main, mainExtra, completionist, showHowLongToBeat } =
    React.useMemo(() => {
      if (!game?.game_time_to_beats) {
        return { main: null, mainExtra: null, completionist: null, showHowLongToBeat: false };
      }
      const { hastily, normally, completely } = game.game_time_to_beats;
      const m  = hastily    ? Math.floor(hastily    / 3600) : null;
      const me = normally   ? Math.floor(normally   / 3600) : null;
      const c  = completely ? Math.floor(completely / 3600) : null;
      return { main: m, mainExtra: me, completionist: c, showHowLongToBeat: !!(m || me || c) };
    }, [game?.game_time_to_beats]);

  const getGameDataForList = useCallback(() => {
    if (!game) return null;
    return {
      id: game.id,
      name: game.name,
      cover_image_id: game.cover?.image_id ?? null,
      release_date: game.release_dates?.[0]?.human ?? "N/A",
    };
  }, [game]);

  // Effects

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const unsub = auth().onAuthStateChanged((u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (initialGameID && initialGameID !== currentId) {
      setCurrentId(initialGameID);
    }
  }, [initialGameID]);

  useEffect(() => {
    if (game && !loading) {
      setTimeout(() => {
        try { scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true }); }
        catch (_) {}
      }, 50);
    }
  }, [game, loading]);

  // Handlers

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleAddToList = useCallback(() => {
    if (!user) {
      ToastAndroid.show(
        t("common.loginRequired") ?? "You need to log in.",
        ToastAndroid.LONG
      );
      return;
    }
    setShowListModal(true);
  }, [user, t]);

  const handleCloseModal = useCallback(() => setShowListModal(false), []);

  const handleNavigateToGame = useCallback((id: number) => setCurrentId(id), []);

  return (
    <SafeAreaView edges={["right", "left"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {(loading || authLoading) && <Loading />}

      {!loading && error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {String(error)}</Text>
        </View>
      )}

      {!loading && !error && !game && (
        <View style={styles.errorContainer}>
          <Text style={{ color: COLORS.textLight, textAlign: "center" }}>
            No data to display
          </Text>
        </View>
      )}

      {!loading && !authLoading && game && (
        <ScrollView ref={scrollRef} style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={{ zIndex: 100 }}>
            <ImageGallery
              coverImageId={game.cover?.image_id}
              screenshots={game.screenshots ?? []}
            />
          </View>

          <View style={[styles.backgroundContainer, {
            flexDirection: currentLang === "en" ? "row" : "row-reverse",
          }]}>
            <LinearGradient colors={["transparent", COLORS.primary]} style={styles.gradient} start={{ x: 1, y: 0.5 }} end={{ x: 0, y: 0.5 }} />
            <LinearGradient colors={[COLORS.primary, "transparent"]} style={styles.gradient} start={{ x: 1, y: 0.5 }} end={{ x: 0, y: 0.5 }} />
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>{game.name}</Text>
            <Text style={styles.releaseDate}>{game.release_dates?.[0]?.human}</Text>

            <View style={styles.contentHeader}>
              <View style={styles.platformContainer}>
                {game.platforms?.map((p) => (
                  <Text key={p.id} style={styles.platform}>{p.abbreviation}</Text>
                ))}
              </View>
              <View style={{ alignItems: "center", flexDirection: "column" }}>
                {game.total_rating ? (
                  <Text style={[styles.rating, { backgroundColor: getRatingColor(game.total_rating / 10) }]}>
                    {Math.round(game.total_rating) / 10}
                  </Text>
                ) : (
                  <Text style={[styles.rating, { backgroundColor: COLORS.secondary }]}>N/A</Text>
                )}
                {(game.total_rating_count ?? 0) > 0 && (
                  <Text style={styles.ratingCount}>{game.total_rating_count} user ratings</Text>
                )}
              </View>
            </View>

            {ageRating && (
              <View style={[styles.ageRatingBadge, { backgroundColor: ageRating.color }]}>
                <Text style={styles.ageRatingText}>{ageRating.label}</Text>
              </View>
            )}

            {/* Available stores */}
            {game.websites?.some((s) => STORE_ICONS[s.type]) && (
              <Text style={styles.storesHeader}>{t("games.details.availableStores")}</Text>
            )}
            <View style={styles.storesContainer}>
              {game.websites?.map((site) => {
                const icon = STORE_ICONS[site.type];
                if (!icon) return null;
                return (
                  <TouchableOpacity key={site.id} style={styles.storesBtn} onPress={() => Linking.openURL(site.url)}>
                    <Image style={styles.storeImg} source={icon} contentFit="contain" transition={500} cachePolicy="memory-disk" allowDownscaling />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Action buttons */}
            <View style={{ marginVertical: 20 }}>
              {claimUrl && (
                <View style={styles.addToList}>
                  <TouchableOpacity activeOpacity={0.9} onPress={() => Linking.openURL(claimUrl)} style={{ width: "100%" }}>
                    <LinearGradient colors={["#516996", "#3b4d6e"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addToListBtn}>
                      <Ionicons name="gift" size={24} color="#fff" style={{ marginRight: 10 }} />
                      <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold", letterSpacing: 0.5 }}>
                        {t("games.details.claimNow")}{store.charAt(0).toUpperCase() + store.slice(1)}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.addToList}>
                <TouchableOpacity onPress={handleAddToList} style={{ width: "100%" }}>
                  <LinearGradient colors={["#516996", "#3b4d6e"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addToListBtn}>
                    <Ionicons name="add-circle-outline" size={24} color="white" />
                    <Text style={{ color: COLORS.textLight, fontSize: 18, fontWeight: "600", marginLeft: 8 }}>
                      {t("games.details.addToList") ?? "Add to List"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            <ListSelectionModal
              visible={showListModal}
              onClose={handleCloseModal}
              gameId={currentId}
              gameData={getGameDataForList()}
            />

            {/* About */}
            <View>
              <Text style={styles.detailsHeader}>{t("games.details.about")}</Text>
              <Text style={styles.summary}>{game.summary}</Text>
            </View>

            {/* Trailer */}
            {game.videos && (() => {
              const trailer =
                game.videos.find((v) => v.name === "Trailer") ??
                game.videos.find((v) => v.name === "Announcement Trailer") ??
                game.videos.find((v) => v.name === "Teaser") ??
                game.videos.find((v) => v.name === "Release Date Trailer") ??
                game.videos.find((v) => v.name === "Gameplay Trailer");
              if (!trailer?.video_id) return null;
              return (
                <View style={styles.trailerContainer}>
                  <Text style={styles.detailsHeader}>{t("games.details.trailer")}</Text>
                  <View style={styles.ytVid}>
                    <YoutubePlayer height={250} videoId={trailer.video_id} />
                  </View>
                </View>
              );
            })()}

            {/* Details grid */}
            <View style={styles.details}>
              {game.genres && (
                <View style={styles.textCard}>
                  <Text style={styles.detailsHeader}>{t("games.details.genres")}</Text>
                  {game.genres.map((g) => <Text key={g.id} style={styles.detailsText}>{g.name}</Text>)}
                </View>
              )}
              {game.game_modes && (
                <View style={styles.textCard}>
                  <Text style={styles.detailsHeader}>{t("games.details.gameModes")}</Text>
                  {game.game_modes.map((m) => <Text key={m.id} style={styles.detailsText}>{m.name}</Text>)}
                </View>
              )}
              {game.involved_companies && (
                <>
                  {game.involved_companies.some((c) => c.developer) && (
                    <View style={styles.textCard}>
                      <Text style={styles.detailsHeader}>{t("games.details.developer")}</Text>
                      {game.involved_companies.filter((c) => c.developer).map((c) => (
                        <Text key={c.id} style={styles.detailsText}>{c.company.name}</Text>
                      ))}
                    </View>
                  )}
                  {game.involved_companies.some((c) => c.publisher) && (
                    <View style={styles.textCard}>
                      <Text style={styles.detailsHeader}>{t("games.details.publisher")}</Text>
                      {game.involved_companies.filter((c) => c.publisher).map((c) => (
                        <Text key={c.id} style={styles.detailsText}>{c.company.name}</Text>
                      ))}
                    </View>
                  )}
                </>
              )}
              {game.game_engines && (
                <View style={styles.textCard}>
                  <Text style={styles.detailsHeader}>{t("games.details.engines")}</Text>
                  {game.game_engines.map((e) => <Text key={e.id} style={styles.detailsText}>{e.name}</Text>)}
                </View>
              )}
            </View>

            {/* Ad */}
            <View style={styles.ad}>
              <Text style={styles.adText}>{t("common.ad")}</Text>
              <BannerAd unitId={adUnitId} size={BannerAdSize.MEDIUM_RECTANGLE} />
            </View>

            {/* Language support table */}
            {languageList.length > 0 && (
              <View style={[styles.textCard, { width: "100%", marginTop: 20 }]}>
                <Text style={styles.detailsHeader}>{t("games.details.languages.title")}</Text>
                <View style={styles.langTableHeader}>
                  <View style={styles.langHeaderCell}>
                    <Ionicons name="language" size={18} color={COLORS.secondary} />
                    <Text style={styles.langHeaderCellText}>{t("games.details.languages.Language")}</Text>
                  </View>
                  {(["mic", "document-text", "desktop"] as const).map((icon, i) => (
                    <View key={icon} style={styles.iconHeaderContainer}>
                      <Ionicons name={icon} size={18} color={COLORS.secondary} />
                      <Text style={styles.headerLabel}>
                        {t(["games.details.languages.audio", "games.details.languages.subtitles", "games.details.languages.interface"][i])}
                      </Text>
                    </View>
                  ))}
                </View>
                {languageList.map((lang, index) => (
                  <View key={lang.name} style={[styles.langTableRow, {
                    backgroundColor: index % 2 === 0 ? "rgba(81, 105, 150, 0.1)" : "transparent",
                  }]}>
                    <Text style={[styles.langCellText, { flex: 2 }]}>{lang.name}</Text>
                    {(["Audio", "Subtitles", "Interface"] as const).map((key) => (
                      <View key={key} style={styles.checkCell}>
                        {lang[key] && <Ionicons name="checkmark-circle" size={20} color={COLORS.lightGray} />}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}

            {/* How long to beat */}
            {showHowLongToBeat && (
              <>
                <View style={{ marginTop: 30 }}>
                  <Text style={styles.detailsHeader}>{t("games.details.howLongToBeat.title")}</Text>
                </View>
                <View style={styles.howLongToBeatContainer}>
                  {main && (
                    <View style={styles.howLongToBeat}>
                      <Text style={styles.howLongToBeatHeader}>{t("games.details.howLongToBeat.main")}</Text>
                      <Svg height="85" width="85">
                        <Path d="M 40 4 A 36 36 0 0 1 76 40" stroke={COLORS.secondary} strokeWidth={5} fill="none" strokeLinecap="round" />
                        <SvgText x={40} y={40} textAnchor="middle" alignmentBaseline="middle" fontSize={styles.howLongToBeatText.fontSize} dy={38 * 0.1} fontWeight={String(styles.howLongToBeatText.fontWeight)} fill={styles.howLongToBeatText.color}>{main}</SvgText>
                      </Svg>
                      <Text style={{ color: "#9f9f9f" }}>{t("games.details.howLongToBeat.hours")}</Text>
                    </View>
                  )}
                  {mainExtra && (
                    <View style={styles.howLongToBeat}>
                      <Text style={styles.howLongToBeatHeader}>{t("games.details.howLongToBeat.mainExtra")}</Text>
                      <Svg width={80} height={80} viewBox="0 0 80 80">
                        <Path d="M 40 4 A 36 36 0 0 1 40 76" stroke={COLORS.secondary} strokeWidth={5} fill="none" strokeLinecap="round" />
                        <SvgText x={40} y={40} textAnchor="middle" alignmentBaseline="middle" fontSize={styles.howLongToBeatText.fontSize} dy={38 * 0.1} fontWeight={String(styles.howLongToBeatText.fontWeight)} fill={styles.howLongToBeatText.color}>{mainExtra}</SvgText>
                      </Svg>
                      <Text style={{ color: "#9f9f9f" }}>{t("games.details.howLongToBeat.hours")}</Text>
                    </View>
                  )}
                  {completionist && (
                    <View style={styles.howLongToBeat}>
                      <Text style={styles.howLongToBeatHeader}>{t("games.details.howLongToBeat.completionist")}</Text>
                      <Svg width={80} height={80} viewBox="0 0 80 80">
                        <Circle cx={40} cy={40} r={36} stroke={COLORS.secondary} strokeWidth={5} fill="none" />
                        <SvgText x={40} y={40} textAnchor="middle" alignmentBaseline="middle" fontSize={styles.howLongToBeatText.fontSize} dy={38 * 0.1} fontWeight={String(styles.howLongToBeatText.fontWeight)} fill={styles.howLongToBeatText.color}>{completionist}</SvgText>
                      </Svg>
                      <Text style={{ color: "#9f9f9f" }}>{t("games.details.howLongToBeat.hours")}</Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* Second ad */}
            <View style={styles.ad}>
              <Text style={styles.adText}>{t("common.ad")}</Text>
              <BannerAd unitId={adUnitId} size={BannerAdSize.MEDIUM_RECTANGLE} />
            </View>

            {/* Game series */}
            {game.collections?.[0]?.games && (
              <View style={{ marginTop: 20 }}>
                <Text style={styles.detailsHeader}>{t("games.details.series")}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                  {game.collections[0].games.map((g) => (
                    <TouchableOpacity key={g.id} style={styles.similarCard} onPress={() => handleNavigateToGame(g.id)}>
                      <Image recyclingKey={g.cover?.image_id ?? ""} style={styles.similarImg}
                        source={g.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_small/${g.cover.image_id}.webp` : require("../assets/image-not-found.webp")}
                        contentFit="cover" transition={500} cachePolicy="memory-disk" allowDownscaling />
                      <Text style={styles.similarName} numberOfLines={2}>{g.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Similar games */}
            {(game.similar_games?.length ?? 0) > 0 && (
              <View style={{ marginTop: 20 }}>
                <Text style={styles.detailsHeader}>{t("games.details.similar")}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                  {game.similar_games!.map((sg) => (
                    <TouchableOpacity key={sg.id} style={styles.similarCard} onPress={() => handleNavigateToGame(sg.id)}>
                      <Image recyclingKey={sg.cover?.image_id ?? ""} style={styles.similarImg}
                        source={sg.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_small/${sg.cover.image_id}.webp` : require("../assets/image-not-found.webp")}
                        contentFit="cover" transition={500} cachePolicy="memory-disk" allowDownscaling />
                      <Text style={styles.similarName} numberOfLines={2}>{sg.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Blurred background */}
          <ImageBackground
            blurRadius={2}
            source={game.cover?.image_id ? { uri: `https://images.igdb.com/igdb/image/upload/t_720p/${game.cover.image_id}.webp` } : undefined}
            style={styles.bgImage}
            imageStyle={{ resizeMode: "cover" }}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default GameDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    // marginBottom: 20
  },
  errorContainer: {
    padding: 20,
    backgroundColor: COLORS.primary
  },
  errorText: { color: "red", textAlign: "center" },
  backgroundContainer: {
    justifyContent: "space-between",
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  gradient: {
    height: "100%",
    width: "50%",
  },
  header: {
    position: "absolute",
    width: 40,
    height: 40,
    top: 50,
    left: 10,
    zIndex: 1000,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary + "90",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: 350,
    resizeMode: "cover",
    zIndex: 100,
  },
  content: {
    padding: 15,
    paddingBottom: 40,
  },
  title: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: "bold",
  },
  releaseDate: {
    color: "gray",
    letterSpacing: 2,
  },
  contentHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  platformContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    flex: 1,
  },
  platform: {
    color: COLORS.textLight,
    fontSize: 17,
    fontWeight: "500",
    backgroundColor: "rgb(81, 105,150, 0.3)",
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 14,
  },
  ageRatingBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginRight: 27,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-end",
    minWidth: 45,
  },
  ageRatingText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  rating: {
    color: COLORS.textLight,
    textAlign: "center",
    borderRadius: 50,
    textAlignVertical: "center",
    width: 70,
    height: 70,
    fontSize: 34,
    fontWeight: "bold",
  },
  ratingCount: {
    color: "#9f9f9f",
    marginTop: 4,
  },
  storesHeader: {
    color: COLORS.textLight,
    fontWeight: "600",
    fontSize: 24,
    marginBottom: 10,
    marginTop: 5,
  },
  storesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  storesBtn: {
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: "#779bdd",
    borderRadius: 12,
    marginRight: 10,
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  storeImg: {
    borderRadius: 12,
    width: 50,
    height: 50,
  },
  addToList: {
    alignItems: "center",
    margin: 10,
    // marginTop: 30,
  },
  addToListBtn: {
    padding: 15,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#516996",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    width: "100%",
  },
  details: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  langTableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
    paddingVertical: 10,
    marginTop: 10,
    alignItems: "flex-end",
  },
  iconHeaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLabel: {
    color: "#9f9f9f",
    marginTop: 2,
  },
  langHeaderCell: {
    flex: 2,
    marginLeft: 8,
  },
  langHeaderCellText: {
    color: "#9f9f9f",
  },
  langTableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(81, 105, 150, 0.3)",
  },
  langCellText: {
    color: "#cfcfcf",
    fontSize: 15,
    fontWeight: "500",
    marginLeft: 8,
  },
  checkCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  textCard: {
    // marginRight: 25
    width: "50%",
  },
  detailsHeader: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: "600",
    textDecorationLine: "underline",
    marginTop: 10,
  },
  detailsText: {
    color: "#9f9f9f",
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 3,
    flexWrap: "wrap",
  },
  howLongToBeatTitle: {
    color: COLORS.textLight,
    fontSize: 24,
    // textAlign
    fontWeight: "600",
    textDecorationLine: "underline",
    marginBottom: 10,
  },
  howLongToBeatContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    width: "100%",
    padding: 10,
  },
  howLongToBeat: {
    marginHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  howLongToBeatHeader: {
    color: COLORS.textLight,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },
  howLongToBeatText: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "bold",
    borderRadius: 50,
    textAlign: "center",
    textAlignVertical: "center",
  },
  ad: {
    alignItems: "center",
    width: "100%",
    marginVertical: 20,
  },
  adText: {
    color: "#fff",
    marginBottom: 10,
  },
  summary: {
    color: "#c1c1c1",
    fontSize: 16,
    marginTop: 5,
  },
  langs: {
    color: "#9f9f9f",
  },
  trailerContainer: {
    marginTop: 20,
  },
  ytVid: {
    marginTop: 20,
  },
  similarCard: {
    width: 120,
    marginRight: 12,
    alignItems: "center",
  },
  similarImg: {
    width: 120,
    height: 160,
    borderRadius: 8,
    marginBottom: 6,
  },
  similarName: {
    color: "#cfcfcf",
    fontSize: 14,
    textAlign: "center",
  },
  bgImage: {
    height: "100%",
    width: "100%",
     opacity: 0.4, 
    position: "absolute",
    top: 0, 
    left: 0,
    right: 0, 
    bottom: 0,
    zIndex: -100,
    backgroundColor: COLORS.primary, 
    marginTop: 350
  },
});
