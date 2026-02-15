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
import { useEffect, useState, useRef, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import YoutubePlayer from "react-native-youtube-iframe";
import auth from "@react-native-firebase/auth";
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

async function fetchGameById(id) {
  if (!id) throw new Error("fetchGameById: missing id");

  try {
    const response = await axios.get(`${SERVER_URL}/game-details`, {
      params: { id: id },
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(
        "Server Error:",
        error.response.status,
        error.response.data,
      );
      throw new Error(`Server fetch failed: ${error.response.status}`);
    } else if (error.request) {
      console.error("Network Error:", error.request);
      throw new Error("Network Error");
    } else {
      console.error("Error setting up request:", error.message);
      throw error;
    }
  }
}

// خريطة تحويل الأكواد إلى نصوص (أرقام مع +)
const AGE_RATING_MAP = {
  // PEGI Ratings (الأوروبي)
  1: "3+",
  2: "7+",
  3: "12+",
  4: "16+",
  5: "18+",

  // ESRB Ratings (الأمريكي) - سنحاول تقريبها لأرقام
  6: "RP", // Pending
  7: "3+", // Early Childhood (تقريباً)
  8: "3+", // Everyone (تقريباً)
  9: "10+", // Everyone 10+
  10: "13+", // Teen
  11: "17+", // Mature
  12: "18+", // Adults Only
};

// ... (AGE_RATING_MAP يبقى كما هو)

const getAgeRatingInfo = (ratings) => {
  if (!ratings || ratings.length === 0) return null;

  // استخدام organization بدلاً من category
  const pegi = ratings.find((r) => r.organization === 2);
  const esrb = ratings.find((r) => r.organization === 1);

  const selectedRating = pegi || esrb;

  if (!selectedRating) return null;

  // استخدام rating_category بدلاً من rating
  return {
    label: AGE_RATING_MAP[selectedRating.rating_category] || "?",
    color: getRatingColorCode(selectedRating.rating_category),
  };
};

const getRatingColorCode = (ratingVal) => {
  // Low ratings (safe for kids)
  if ([1, 2, 6, 7, 8].includes(ratingVal)) return "#a5c400"; // Green

  // Medium ratings (teens)
  if ([3, 4, 9, 10].includes(ratingVal)) return "#f4a200"; // Orange

  // High ratings (mature/adult)
  if ([5, 11, 12].includes(ratingVal)) return "#e3001b"; // Red

  // Default
  return COLORS.secondary;
};

function GameDetails({ route, navigation }) {
  const { gameID: initialGameID } = route.params;
  const [currentId, setCurrentId] = useState(initialGameID);
  const mountedRef = useRef(true);
  const scrollRef = useRef(null);
  const [user, setUser] = useState();
  const [showListModal, setShowListModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const CACHE_KEY = currentId ? `GAME_DETAILS_CACHE_${currentId}` : null;

  // إنشاء دالة الجلب تحديد حسب currentId
  const fetchGameData = useCallback(async () => {
    if (!currentId) throw new Error("No game ID provided");
    return fetchGameById(currentId);
  }, [currentId]);

  // استخدام Hook الكاش المحسّن
  const {
    data: game,
    isLoading: loading,
    error,
  } = useCachedData(CACHE_KEY, fetchGameData, [currentId]);

  const ageRating = game ? getAgeRatingInfo(game.age_ratings) : null;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged((u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return subscriber;
  }, []);

  useEffect(() => {
    if (initialGameID && initialGameID !== currentId) {
      setCurrentId(initialGameID);
    }
  }, [initialGameID]);

  useEffect(() => {
    // التمرير إلى الأعلى عند تحميل البيانات
    if (game && !loading) {
      setTimeout(() => {
        try {
          scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
        } catch (e) {}
      }, 50);
    }
  }, [game, loading]);

  // Rating Background Color
  function getRatingColor(rating) {
    if (rating <= 2) return "#8B0000";
    if (rating <= 4) return "#FF4C4C";
    if (rating <= 6) return "#FFA500";
    if (rating <= 8) return "#71e047";
    return "#006400";
  }

  // Store Icons
  const storeIcons = {
    13: require("../assets/steam.png"),
    16: require("../assets/epic-games.png"),
    17: require("../assets/gog.png"),
    23: require("../assets/playstation.png"),
    22: require("../assets/xbox.png"),
    24: require("../assets/nintendo-switch.png"),
    12: require("../assets/play-store.png"),
    10: require("../assets/apple-store.png"),
  };

  const processLanguageData = () => {
    if (!game?.language_supports) return [];

    const langMap = {};

    game.language_supports.forEach((item) => {
      const langName = item.language.name;
      const supportType = item.language_support_type.name; // المتوقع: "Audio", "Subtitles", "Interface"

      if (!langMap[langName]) {
        langMap[langName] = {
          name: langName,
          Audio: false,
          Subtitles: false,
          Interface: false,
        };
      }
      langMap[langName][supportType] = true;
    });

    return Object.values(langMap);
  };

  const languageList = processLanguageData();

  let main, mainExtra, completionist, showHowLongToBeat;
  if (game?.game_time_to_beats) {
    main = game?.game_time_to_beats?.hastily
      ? Math.floor(game?.game_time_to_beats?.hastily / 60 / 60)
      : null;
    mainExtra = game?.game_time_to_beats?.normally
      ? Math.floor(game?.game_time_to_beats?.normally / 60 / 60)
      : null;
    completionist = game?.game_time_to_beats?.completely
      ? Math.floor(game?.game_time_to_beats?.completely / 60 / 60)
      : null;
    showHowLongToBeat = !!(main || mainExtra || completionist);
  }

  const getGameDataForList = () => {
    if (!game) return null;
    return {
      id: game.id,
      name: game.name,
      cover_image_id: game.cover?.image_id || null,
      release_date: game.release_dates?.[0]?.human || "N/A",
    };
  };
  console.log("Game Data:", game);
  return (
    <SafeAreaView edges={["right", "left"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading && <Loading />}

      {!loading && error && (
        <View style={{ padding: 20, backgroundColor: COLORS.primary }}>
          <Text style={{ color: "red", textAlign: "center" }}>
            Error: {error}
          </Text>
        </View>
      )}

      {!loading && !error && !game && (
        <View style={{ padding: 20, backgroundColor: COLORS.primary }}>
          <Text style={{ color: COLORS.textLight, textAlign: "center" }}>
            No data to display
          </Text>
        </View>
      )}

      {!loading && game && (
        <ScrollView
          ref={scrollRef}
          style={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ zIndex: 100 }}>
            <ImageGallery
              coverImageId={game.cover?.image_id}
              screenshots={game.screenshots || []}
            />
          </View>
          <View
            style={[
              styles.backgroundContainer,
              {
                flexDirection: currentLang === "en" ? "row" : "row-reverse",
              },
            ]}
          >
            <LinearGradient
              colors={["transparent", COLORS.primary]}
              style={styles.gradient}
              start={{ x: 1, y: 0.5 }}
              end={{ x: 0, y: 0.5 }}
            />
            <LinearGradient
              colors={[COLORS.primary, "transparent"]}
              style={styles.gradient}
              start={{ x: 1, y: 0.5 }}
              end={{ x: 0, y: 0.5 }}
            />
          </View>
          {/* Game Info */}
          <View style={styles.content}>
            {/* Game Name */}
            <Text style={styles.title}>{game.name}</Text>
            {/* Game release date */}
            <Text style={styles.releaseDate}>
              {game.release_dates?.[0]?.human}
            </Text>

            <View style={styles.contentHeader}>
              {/* platforms */}
              <View style={styles.platformContainer}>
                {game.platforms?.map((platform) => (
                  <Text key={platform.id} style={styles.platform}>
                    {platform.abbreviation}
                  </Text>
                ))}
              </View>

              {/* game rating */}
              <View
                style={{
                  alignItems: "center",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {game.total_rating ? (
                  <Text
                    style={[
                      styles.rating,
                      {
                        backgroundColor: getRatingColor(game.total_rating / 10),
                      },
                    ]}
                  >
                    {Math.round(game.total_rating) / 10}
                  </Text>
                ) : (
                  <Text
                    style={[
                      styles.rating,
                      { backgroundColor: COLORS.secondary },
                    ]}
                  >
                    N/A
                  </Text>
                )}
                {game.total_rating_count > 0 && (
                  <Text style={styles.ratingCount}>
                    {game.total_rating_count} user ratings
                  </Text>
                )}
              </View>
            </View>
            {/* age rating */}
            {ageRating && (
              <View
                style={[
                  styles.ageRatingBadge,
                  { backgroundColor: ageRating.color },
                ]}
              >
                <Text style={styles.ageRatingText}>{ageRating.label}</Text>
              </View>
            )}

            {/* Available Stores */}
            {game.websites &&
              game.websites.some((site) => storeIcons[site.type]) && (
                <Text style={styles.storesHeader}>
                  {t("games.details.availableStores")}
                </Text>
              )}
            <View style={styles.storesContainer}>
              {game.websites?.map((site) => {
                const icon = storeIcons[site.type];
                if (!icon) return null;
                return (
                  <TouchableOpacity
                    key={site.id}
                    style={styles.storesBtn}
                    onPress={() => Linking.openURL(site.url)}
                  >
                    <Image
                      style={styles.storeImg}
                      source={icon}
                      contentFit="contain"
                      transition={500}
                      cachePolicy="memory-disk"
                      allowDownscaling={true}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Add to list Button */}
            <View style={styles.addToList}>
              <TouchableOpacity
                style={{
                  backgroundColor: COLORS.secondary,
                  padding: 12,
                  borderRadius: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: 1,
                }}
                onPress={() => {
                  if (!user) {
                    ToastAndroid.show(
                      t("common.loginRequired") ||
                        "You need to log in to perform this action.",
                      ToastAndroid.LONG,
                    );
                    return;
                  }
                  setShowListModal(true);
                }}
              >
                <Ionicons name="add-circle-outline" size={24} color="white" />
                <Text
                  style={{
                    color: COLORS.textLight,
                    fontSize: 18,
                    fontWeight: "600",
                    marginLeft: 8,
                  }}
                >
                  {t("games.details.addToList") || "Add to List"}
                </Text>
              </TouchableOpacity>
            </View>

            <ListSelectionModal
              visible={!!showListModal}
              onClose={() => setShowListModal(false)}
              gameId={currentId}
              gameData={getGameDataForList()}
            />

            {/* About Section */}
            <View>
              <Text style={styles.detailsHeader}>
                {t("games.details.about")}
              </Text>
              <Text style={styles.summary}>{game.summary}</Text>
            </View>

            {/* Game Trailer section */}
            {game.videos && (
              <View style={styles.trailerContainer}>
                {(() => {
                  const trailer =
                    game.videos.find((v) => v.name === "Trailer") ||
                    game.videos.find(
                      (v) => v.name === "Announcement Trailer",
                    ) ||
                    game.videos.find((v) => v.name === "Teaser") ||
                    game.videos.find(
                      (v) => v.name === "Release Date Trailer",
                    ) ||
                    game.videos.find((v) => v.name === "Gameplay Trailer");
                  if (trailer?.video_id) {
                    return (
                      <>
                        <Text style={styles.detailsHeader}>
                          {t("games.details.trailer")}
                        </Text>
                        <View style={styles.ytVid}>
                          <YoutubePlayer
                            height={250}
                            videoId={trailer.video_id}
                          />
                        </View>
                      </>
                    );
                  }
                  return null;
                })()}
              </View>
            )}

            <View style={styles.details}>
              {/* generes section */}
              {game.genres && (
                <View style={styles.textCard}>
                  <Text style={styles.detailsHeader}>
                    {t("games.details.genres")}
                  </Text>
                  {game.genres.map((genre) => (
                    <View key={genre.id}>
                      <Text style={styles.detailsText}>{genre.name}</Text>
                    </View>
                  ))}
                </View>
              )}
              {/* Game mode section */}
              {game.game_modes && (
                <View style={styles.textCard}>
                  <Text style={styles.detailsHeader}>
                    {t("games.details.gameModes")}
                  </Text>
                  {game.game_modes.map((mode) => (
                    <View key={mode.id}>
                      <Text style={styles.detailsText}>{mode.name}</Text>
                    </View>
                  ))}
                </View>
              )}
              {game.involved_companies && (
                <>
                  {/* Developers section*/}
                  {game.involved_companies.some(
                    (company) => company.developer,
                  ) && (
                    <View style={styles.textCard}>
                      <Text style={styles.detailsHeader}>
                        {t("games.details.developer")}
                      </Text>
                      {game.involved_companies
                        .filter((company) => company.developer)
                        .map((company) => (
                          <Text key={company.id} style={styles.detailsText}>
                            {company.company.name}
                          </Text>
                        ))}
                    </View>
                  )}

                  {/* Publishers section*/}
                  {game.involved_companies.some(
                    (company) => company.publisher,
                  ) && (
                    <View style={styles.textCard}>
                      <Text style={styles.detailsHeader}>
                        {t("games.details.publisher")}
                      </Text>
                      {game.involved_companies
                        .filter((company) => company.publisher)
                        .map((company) => (
                          <Text key={company.id} style={styles.detailsText}>
                            {company.company.name}
                          </Text>
                        ))}
                    </View>
                  )}
                </>
              )}
              {/* Game Engines section */}
              {game.game_engines && (
                <View style={styles.textCard}>
                  <Text style={styles.detailsHeader}>
                    {t("games.details.engines")}
                  </Text>
                  {game.game_engines.map((engine) => (
                    <View key={engine.id}>
                      <Text style={styles.detailsText}>{engine.name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* ad space */}
            <View style={styles.ad}>
              <Text style={styles.adText}>{t("common.ad")}</Text>
              <BannerAd
                unitId={adUnitId}
                size={BannerAdSize.MEDIUM_RECTANGLE}
              />
            </View>

            {/* Language Supports Table Section */}
            {languageList.length > 0 && (
              <View style={[styles.textCard, { width: "100%", marginTop: 20 }]}>
                <Text style={styles.detailsHeader}>
                  {t("games.details.languages.title")}
                </Text>

                {/* Table Header */}
                <View style={styles.langTableHeader}>
                  <View style={styles.langHeaderCell}>
                    <Ionicons
                      name="language"
                      size={18}
                      color={COLORS.secondary}
                    />
                    <Text style={styles.langHeaderCellText}>
                      {t("games.details.languages.Language")}
                    </Text>
                  </View>
                  <View style={styles.iconHeaderContainer}>
                    <Ionicons name="mic" size={18} color={COLORS.secondary} />
                    <Text style={styles.headerLabel}>
                      {t("games.details.languages.audio")}
                    </Text>
                  </View>
                  <View style={styles.iconHeaderContainer}>
                    <Ionicons
                      name="document-text"
                      size={18}
                      color={COLORS.secondary}
                    />
                    <Text style={styles.headerLabel}>
                      {t("games.details.languages.subtitles")}
                    </Text>
                  </View>
                  <View style={styles.iconHeaderContainer}>
                    <Ionicons
                      name="desktop"
                      size={18}
                      color={COLORS.secondary}
                    />
                    <Text style={styles.headerLabel}>
                      {t("games.details.languages.interface")}
                    </Text>
                  </View>
                </View>

                {/* Table Rows */}
                {languageList.map((lang, index) => (
                  <View
                    key={lang.name}
                    style={[
                      styles.langTableRow,
                      {
                        backgroundColor:
                          index % 2 === 0
                            ? "rgba(81, 105, 150, 0.1)"
                            : "transparent",
                      },
                    ]}
                  >
                    <Text style={[styles.langCellText, { flex: 2 }]}>
                      {lang.name}
                    </Text>

                    <View style={styles.checkCell}>
                      {lang.Audio && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={COLORS.lightGray}
                        />
                      )}
                    </View>

                    <View style={styles.checkCell}>
                      {lang.Subtitles && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={COLORS.lightGray}
                        />
                      )}
                    </View>

                    <View style={styles.checkCell}>
                      {lang.Interface && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={COLORS.lightGray}
                        />
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* How long to beat section */}
            {showHowLongToBeat && (
              <>
                <View style={{ marginTop: 30 }}>
                  <Text style={styles.detailsHeader}>
                    {t("games.details.howLongToBeat.title")}
                  </Text>
                </View>
                <View style={styles.howLongToBeatContainer}>
                  {main && (
                    <View style={styles.howLongToBeat}>
                      <Text style={styles.howLongToBeatHeader}>
                        {t("games.details.howLongToBeat.main")}
                      </Text>
                      <Svg height="85" width="85">
                        <Path
                          d="M 40 4 A 36 36 0 0 1 76 40"
                          stroke={COLORS.secondary}
                          strokeWidth={5}
                          fill="none"
                          strokeLinecap="round"
                        />
                        <SvgText
                          x={40}
                          y={40}
                          textAnchor="middle"
                          alignmentBaseline="middle"
                          fontSize={styles.howLongToBeatText.fontSize}
                          dy={38 * 0.1}
                          fontWeight={styles.howLongToBeatText.fontWeight}
                          fill={styles.howLongToBeatText.color}
                        >
                          {main}
                        </SvgText>
                      </Svg>
                      <Text style={{ color: "#9f9f9f" }}>
                        {t("games.details.howLongToBeat.hours")}
                      </Text>
                    </View>
                  )}

                  {mainExtra && (
                    <View style={styles.howLongToBeat}>
                      <Text style={styles.howLongToBeatHeader}>
                        {t("games.details.howLongToBeat.mainExtra")}
                      </Text>
                      <Svg
                        width={80}
                        height={80}
                        viewBox="0 0 80 80"
                        preserveAspectRatio="xMidYMid meet"
                        style={{ alignSelf: "center" }}
                      >
                        <Path
                          d="M 40 4 A 36 36 0 0 1 40 76"
                          stroke={COLORS.secondary}
                          strokeWidth={5}
                          fill="none"
                          strokeLinecap="round"
                        />
                        <SvgText
                          x={40}
                          y={40}
                          textAnchor="middle"
                          alignmentBaseline="middle"
                          fontSize={styles.howLongToBeatText.fontSize}
                          dy={38 * 0.1}
                          fontWeight={styles.howLongToBeatText.fontWeight}
                          fill={styles.howLongToBeatText.color}
                        >
                          {mainExtra}
                        </SvgText>
                      </Svg>
                      <Text style={{ color: "#9f9f9f" }}>
                        {t("games.details.howLongToBeat.hours")}
                      </Text>
                    </View>
                  )}

                  {completionist && (
                    <View style={styles.howLongToBeat}>
                      <Text style={styles.howLongToBeatHeader}>
                        {t("games.details.howLongToBeat.completionist")}
                      </Text>
                      <Svg
                        width={80}
                        height={80}
                        viewBox="0 0 80 80"
                        preserveAspectRatio="xMidYMid meet"
                        style={{ alignSelf: "center" }}
                      >
                        <Circle
                          cx={40}
                          cy={40}
                          r={36}
                          stroke={COLORS.secondary}
                          strokeWidth={5}
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <SvgText
                          x={40}
                          y={40}
                          textAnchor="middle"
                          alignmentBaseline="middle"
                          fontSize={styles.howLongToBeatText.fontSize}
                          dy={38 * 0.1}
                          fontWeight={styles.howLongToBeatText.fontWeight}
                          fill={styles.howLongToBeatText.color}
                        >
                          {completionist}
                        </SvgText>
                      </Svg>
                      <Text style={{ color: "#9f9f9f" }}>
                        {t("games.details.howLongToBeat.hours")}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* ad space */}
            <View style={styles.ad}>
              <Text style={styles.adText}>{t("common.ad")}</Text>
              <BannerAd
                unitId={adUnitId}
                size={BannerAdSize.MEDIUM_RECTANGLE}
              />
            </View>

            {/* Collection section */}
            {game.collections?.[0]?.games && (
              <View style={{ marginTop: 20 }}>
                <Text style={styles.detailsHeader}>
                  {t("games.details.series")}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginTop: 10 }}
                >
                  {game.collections?.[0]?.games.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      style={styles.similarCard}
                      onPress={() => {
                        setCurrentId(g.id);
                      }}
                    >
                      <Image
                        recyclingKey={g.cover?.image_id || ""}
                        style={styles.similarImg}
                        source={
                          g.cover?.image_id
                            ? `https://images.igdb.com/igdb/image/upload/t_cover_small/${g.cover?.image_id}.webp`
                            : require("../assets/image-not-found.webp")
                        }
                        contentFit="cover"
                        transition={500}
                        cachePolicy="memory-disk"
                        allowDownscaling={true}
                      />
                      <Text style={styles.similarName} numberOfLines={2}>
                        {g.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Similar Games section */}
            {game?.similar_games && game.similar_games.length > 0 && (
              <View style={{ marginTop: 20 }}>
                <Text style={styles.detailsHeader}>
                  {t("games.details.similar")}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginTop: 10 }}
                >
                  {game.similar_games.map((sg) => (
                    <TouchableOpacity
                      key={sg.id}
                      style={styles.similarCard}
                      onPress={() => {
                        setCurrentId(sg.id);
                      }}
                    >
                      <Image
                        recyclingKey={sg.cover?.image_id || ""}
                        style={styles.similarImg}
                        source={
                          sg.cover?.image_id
                            ? `https://images.igdb.com/igdb/image/upload/t_cover_small/${sg.cover?.image_id}.webp`
                            : require("../assets/image-not-found.webp")
                        }
                        contentFit="cover"
                        transition={500}
                        cachePolicy="memory-disk"
                        allowDownscaling={true}
                      />
                      <Text style={styles.similarName} numberOfLines={2}>
                        {sg.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <ImageBackground
            blurRadius={2}
            source={
              game.cover?.image_id
                ? {
                    uri: `https://images.igdb.com/igdb/image/upload/t_720p/${game.cover?.image_id}.webp`,
                  }
                : null
            }
            style={{
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
              marginTop: 350,
            }}
            imageStyle={{
              resizeMode: "cover",
            }}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

export default GameDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    // marginBottom: 20
  },
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    margin: 10,
    marginTop: 30,
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
});
