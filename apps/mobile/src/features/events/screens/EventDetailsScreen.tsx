import React, { memo, useMemo } from "react";
import { View, Animated, ScrollView } from "react-native";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useBottomInset } from "@/src/hooks/useBottomInset";
import EventHero from "../components/EventHero";
import EventDates from "../components/EventDates";
import EventCountdown from "../components/EventCountdown";
import EventStreamButton from "../components/EventStreamButton";
import EventDescription from "../components/EventDescription";
import EventNetworks from "../components/EventNetworks";
import EventVideosSection from "../components/EventVideosSection";
import EventFeaturedGamesSection from "../components/EventFeaturedGamesSection";
import { useEventDetails } from "../hooks/useEventDetails";
import { useContentFadeIn } from "../hooks/useContentFadeIn";
import type { EventDetailsParamList } from "../types";

const EventDetailsScreen = memo((): React.ReactElement => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<EventDetailsParamList, "EventDetailsScreen">>();
  const bottomInset = useBottomInset();
  const styles = useThemeStyles(
    (c) => ({
      screen: {
        flex: 1,
        backgroundColor: c.background,
      },
      scroll: { flex: 1 },
      scrollContent: {
        paddingTop: 16,
        paddingHorizontal: 18,
        paddingBottom: bottomInset,
      },
      spacer: { height: 40 },
    }),
    [bottomInset],
  );

  const contentOpacity = useContentFadeIn();
  const animatedStyle = useMemo(() => ({ opacity: contentOpacity }), [contentOpacity]);

  const event = route.params.event;
  const {
    status,
    timeUntil,
    logoUri,
    startDateStr,
    endDateStr,
    handleGoBack,
    handleStream,
  } = useEventDetails({ event, navigation });

  return (
    <View style={styles.screen}>
      <EventHero event={event} status={status} logoUri={logoUri} onBack={handleGoBack} />

      <Animated.View style={[styles.scroll, animatedStyle]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <EventDates startDateStr={startDateStr} endDateStr={endDateStr} />

          {timeUntil && <EventCountdown timeUntil={timeUntil} />}

          {event.live_stream_url && (
            <EventStreamButton status={status} onPress={handleStream} />
          )}

          {event.description ? (
            <EventDescription description={event.description} />
          ) : null}

          {event.event_networks && event.event_networks.length > 0 && (
            <EventNetworks networks={event.event_networks} />
          )}

          {event.videos && event.videos.length > 0 && (
            <EventVideosSection videos={event.videos} />
          )}

          {event.games && event.games.length > 0 && (
            <EventFeaturedGamesSection games={event.games} />
          )}

          <View style={styles.spacer} />
        </ScrollView>
      </Animated.View>
    </View>
  );
});

EventDetailsScreen.displayName = "EventDetailsScreen";

export default EventDetailsScreen;
