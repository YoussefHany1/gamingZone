import React, { useCallback, useRef, useState } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useBottomInset } from "@/src/hooks/useBottomInset";
import { useScrollDirection } from "@/src/hooks/useScrollDirection";
import AIChatFab from "../components/homeScreen/AIChatFab";
import HomeHeader from "../components/homeScreen/HomeHeader";
import HomeSections from "../components/homeScreen/HomeSections";
import { useHomeRefresh } from "../hooks/useHomeRefresh";
import type { HomeStackParamList } from "@/src/navigation/AppNavigator";

/**
 * Home tab: a greeting/gamification header on top of a scrollable column of
 * game/news/event sections, with quick-action chips for jumping between
 * sections, plus the pulsing AI-chat floating button.
 */
function HomeScreen(): React.ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const colors = useThemeColors();
  const bottomInset = useBottomInset();
  const styles = useThemeStyles(
    (c) => ({
      container: {
        flex: 1,
        backgroundColor: c.background,
      },
      scrollContent: { paddingBottom: bottomInset },
    }),
    [bottomInset],
  );

  const { onScroll } = useScrollDirection();
  const { refreshing, refreshToken, handleRefresh } = useHomeRefresh();

  /** Content-space y of each home section, keyed by logical id (see QuickActions). */
  const sectionOffsets = useRef<{ [id: string]: number }>({});
  const scrollRef = useRef<ScrollView>(null);
  /** Tab to activate in the tabbed news section, requested via the chips. */
  const [newsTabRequest, setNewsTabRequest] = useState<string | undefined>(undefined);

  const handleSectionLayout = useCallback((id: string, y: number): void => {
    sectionOffsets.current[id] = y;
  }, []);

  const handleScrollToSection = useCallback((id: string): void => {
    // A chip id may carry a tab request for the tabbed news section: "id:tab".
    const [sectionId, tabId] = id.split(":");
    if (tabId !== undefined) {
      setNewsTabRequest(tabId);
    }
    const y = sectionOffsets.current[sectionId ?? id];
    if (y !== undefined) {
      scrollRef.current?.scrollTo({ y: Math.max(y - 8, 0), animated: true });
    }
  }, []);

  const handleOpenAIChat = useCallback((): void => {
    navigation.navigate("AIChatScreen");
  }, [navigation]);

  return (
    <SafeAreaView edges={["right", "left"]} style={styles.container}>
      <HomeHeader />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <HomeSections
          refreshToken={refreshToken}
          onSectionLayout={handleSectionLayout}
          onScrollToSection={handleScrollToSection}
          newsTabRequest={newsTabRequest}
        />
      </ScrollView>

      <AIChatFab onPress={handleOpenAIChat} />
    </SafeAreaView>
  );
}

export default HomeScreen;
