import React, { memo } from "react";
import { ImageBackground, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../../constants/colors";

interface Props {
  coverImageId?: string;
  currentLang: string;
}

const GameDetailsBackground: React.FC<Props> = ({ coverImageId, currentLang }) => {
  return (
    <>
      <View style={[styles.backgroundContainer, {
        flexDirection: currentLang === "en" ? "row" : "row-reverse",
      }]}>
        <LinearGradient colors={["transparent", COLORS.primary]} style={styles.gradient} start={{ x: 1, y: 0.5 }} end={{ x: 0, y: 0.5 }} />
        <LinearGradient colors={[COLORS.primary, "transparent"]} style={styles.gradient} start={{ x: 1, y: 0.5 }} end={{ x: 0, y: 0.5 }} />
      </View>
      <ImageBackground
        blurRadius={2}
        source={coverImageId ? { uri: `https://images.igdb.com/igdb/image/upload/t_720p/${coverImageId}.webp` } : undefined}
        style={styles.bgImage}
        imageStyle={{ resizeMode: "cover" }}
      />
    </>
  );
};

export default memo(GameDetailsBackground);

const styles = StyleSheet.create({
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
    marginTop: 350,
  },
});
