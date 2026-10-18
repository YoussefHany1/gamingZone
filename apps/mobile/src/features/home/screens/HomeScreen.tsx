import React, { useCallback } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useBottomInset } from "@/src/hooks/useBottomInset";
import { useScrollDirection } from "@/src/hooks/useScrollDirection";
import AIChatFab from "../components/homeScreen/AIChatFab";
import HomeSections from "../components/homeScreen/HomeSections";
import { useHomeRefresh } from "../hooks/useHomeRefresh";
import type { HomeStackParamList } from "@/src/navigation/AppNavigator";

/**
 * Home tab: a scrollable column of game/news/event sections plus the pulsing
 * AI-chat floating button.
 */
function HomeScreen(): React.ReactElement {
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
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

  const handleOpenAIChat = useCallback((): void => {
    navigation.navigate("AIChatScreen");
  }, [navigation]);

  return (
    <SafeAreaView edges={["right", "left"]} style={styles.container}>
      <ScrollView
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
        <HomeSections refreshToken={refreshToken} />
      </ScrollView>

      <AIChatFab onPress={handleOpenAIChat} />
    </SafeAreaView>
  );
}

export default HomeScreen;
