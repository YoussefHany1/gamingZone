import React, { memo } from "react";
import { View } from "react-native";
import { NativeAdComponent } from "@/src/components/NativeAd";
import { POSTER_CELL_STYLE } from "../../constants";
import type { UserGamesNativeAdProps } from "../../types";

/**
 * An inline ad slot in the games list. In grid view it renders a poster-sized
 * native ad box inside a matching cell so it aligns with the wall; in list view
 * it renders the standard full-width native ad row.
 */
const UserGamesNativeAd = memo<UserGamesNativeAdProps>(({ viewMode }) => {
  if (viewMode === "grid") {
    return (
      <View style={POSTER_CELL_STYLE}>
        <NativeAdComponent variant="grid" />
      </View>
    );
  }

  return <NativeAdComponent />;
});
UserGamesNativeAd.displayName = "UserGamesNativeAd";

export default UserGamesNativeAd;
