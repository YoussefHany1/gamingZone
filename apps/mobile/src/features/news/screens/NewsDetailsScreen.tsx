import React, { memo, useCallback, useMemo } from "react";
import { ScrollView, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useScrollDirection } from "@/src/hooks/useScrollDirection";
import AdSlot from "@/src/components/AdSlot";
import { useBottomInset } from "@/src/hooks/useBottomInset";
import NewsArticleImage from "../components/newsDetails/NewsArticleImage";
import NewsArticleMeta from "../components/newsDetails/NewsArticleMeta";
import NewsDescription from "../components/newsDetails/NewsDescription";
import NewsDetailsHeader from "../components/newsDetails/NewsDetailsHeader";
import NewsDetailsSkeleton from "../components/newsDetails/NewsDetailsSkeleton";
import NewsSummaryCard from "../components/newsDetails/NewsSummaryCard";
import ReadFullArticleButton from "../components/newsDetails/ReadFullArticleButton";
import { useNewsArticle } from "../hooks/useNewsArticle";
import { useShareArticle } from "../hooks/useShareArticle";

/**
 * Article reader: hero image, title, source metadata, AI summary, body and a
 * CTA to the original source. Falls back to fetching the full document from
 * Appwrite when the route only carries an id.
 */
const NewsDetails = memo((): React.ReactElement => {
  const navigation = useNavigation();
  const bottomInset = useBottomInset();
  const styles = useThemeStyles(
    (c) => ({
      modalContainer: {
        flex: 1,
      },
      container: {
        flex: 1,
      },
      content: {
        padding: 15,
        paddingBottom: bottomInset,
      },
    title: {
      fontSize: 22,
      fontWeight: "bold",
      color: c.text,
      lineHeight: 32,
      textAlign: "center",
    },
    }),
    [bottomInset],
  );

  const { onScroll } = useScrollDirection();

  const {
    isLoadingArticle,
    isReady,
    articleId,
    title,
    link,
    thumbnail,
    siteName,
    siteImage,
    description,
    summary,
    isSummaryRtl,
    platforms,
    currentLang,
    formattedDate,
    timeAgo,
    handleOpenLink,
  } = useNewsArticle();

  const { handleShare } = useShareArticle({ articleId, title, link });

  const handleGoBack = useCallback((): void => navigation.goBack(), [navigation]);

  const directionStyle = useMemo(
    () => ({
      direction: currentLang === "ar" ? ("rtl" as const) : ("ltr" as const),
    }),
    [currentLang],
  );

  if (isLoadingArticle || !isReady) {
    return <NewsDetailsSkeleton />;
  }

  return (
    <View style={[styles.modalContainer, directionStyle]}>
      <NewsDetailsHeader
        currentLang={currentLang}
        onBack={handleGoBack}
        onShare={handleShare}
      />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <NewsArticleImage thumbnail={thumbnail} />

        <View style={styles.content}>
          <CustomText style={styles.title}>{title}</CustomText>

          <NewsArticleMeta
            siteImage={siteImage}
            siteName={siteName}
            timeAgo={timeAgo}
            formattedDate={formattedDate}
            platforms={platforms}
          />

          {summary ? (
            <NewsSummaryCard summary={summary} isRtl={isSummaryRtl} />
          ) : null}

          <NewsDescription description={description} currentLang={currentLang} />

          <AdSlot visible={isReady} />

          <ReadFullArticleButton onPress={handleOpenLink} />
        </View>
      </ScrollView>
    </View>
  );
});

NewsDetails.displayName = "NewsDetails";

export default NewsDetails;
