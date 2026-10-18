import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import ErrorState from "../../../components/ErrorState";
import GameDetailsHeader from "../components/gameDetails/GameDetailsHeader";
import GameDetailsContent from "../components/gameDetails/GameDetailsContent";
import type { GamesStackParamList, Props } from "../types";
export type { GamesStackParamList };
import { useGameDetails } from "../hooks/useGameDetails";
import { useGameReleaseNotification } from "../hooks/useGameReleaseNotification";

const GameDetails = ({ route, navigation }: Props) => {
  const { t } = useTranslation();
  const styles = useThemeStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
  }));

  const { gameID: initialGameID, claimUrl, store = "" } = route.params;

  const details = useGameDetails({ initialGameID, navigation });
  const { isSubscribed, handleToggleNotification } = useGameReleaseNotification({
    gameId: details.currentId,
    user: details.user,
  });

  return (
    <SafeAreaView edges={["right", "left"]} style={styles.container}>
      {/* Back button — always visible */}
      <GameDetailsHeader onBack={details.handleGoBack} />

      {/* Error states */}
      {!details.loading && details.error && !details.game && (
        <ErrorState
          message={t("common.dataLoadError")}
          showContactButton={false}
          onRetry={() => details.refetch(true)}
        />
      )}
      {!details.loading && !details.error && !details.game && (
        <ErrorState message={t("common.noData")} showContactButton={false} />
      )}

      {/* Main content — ScrollView always mounted, each section swaps independently */}
      {(details.loading || details.game) && (
        <ScrollView
          ref={details.scrollRef}
          style={styles.container}
          showsVerticalScrollIndicator={false}
          onScroll={details.onScroll}
          scrollEventThrottle={16}
        >
          <GameDetailsContent
            game={details.game}
            loading={details.loading}
            isReady={details.isReady}
            currentId={details.currentId}
            user={details.user}
            rating={details.rating}
            ageRating={details.ageRating}
            languageList={details.languageList}
            pcRequirements={details.pcRequirements}
            pcReqLoading={details.pcReqLoading}
            storePrices={details.storePrices}
            storePricesLoading={details.storePricesLoading}
            main={details.main}
            mainExtra={details.mainExtra}
            completionist={details.completionist}
            gameDataForList={details.gameDataForList}
            seriesGames={details.seriesGames}
            similarGames={details.similarGames}
            showListModal={details.showListModal}
            claimUrl={claimUrl}
            store={store}
            isSubscribed={isSubscribed}
            handleRateGame={details.handleRateGame}
            handleAddToList={details.handleAddToList}
            handleCloseModal={details.handleCloseModal}
            handleNavigateToGame={details.handleNavigateToGame}
            onToggleNotification={handleToggleNotification}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default GameDetails;
