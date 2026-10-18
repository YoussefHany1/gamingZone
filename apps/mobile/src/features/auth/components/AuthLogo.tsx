import React, { memo, useMemo } from "react";
import { StyleSheet } from "react-native";
import { Image } from "expo-image";
import type { AuthLogoProps } from "./types";

/** The shared app logo shown at the top of every auth screen. */
const AuthLogo: React.FC<AuthLogoProps> = ({ size = 220 }) => {
  const dimensions = useMemo(() => ({ width: size, height: size }), [size]);

  return (
    <Image
      source={require("@/assets/logo.webp")}
      style={[styles.logo, dimensions]}
      contentFit="cover"
      transition={500}
      cachePolicy="memory-disk"
      allowDownscaling
    />
  );
};

const styles = StyleSheet.create({
  logo: { alignSelf: "center" },
});

export default memo(AuthLogo);
