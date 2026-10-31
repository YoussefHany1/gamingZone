import React, { memo } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

type GamerAvatarProps = { photoURL?: string | null | undefined; size?: number };

const GamerAvatar = memo(({ photoURL, size = 48 }: GamerAvatarProps) => {
  const styles = useThemeStyles((c) => ({
    frame: {
      width: size + 6,
      height: size + 6,
      borderRadius: (size + 6) / 2,
      padding: 3,
      backgroundColor: c.accentSurface,
      borderWidth: 1,
      borderColor: c.accentBorder,
    },
    image: { width: size, height: size, borderRadius: size / 2, backgroundColor: c.skeletonBase },
  }), [size]);
  return (
    <View style={styles.frame}>
      <Image
        source={photoURL ? { uri: photoURL } : require("@/assets/default_profile.webp")}
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    </View>
  );
});

GamerAvatar.displayName = "GamerAvatar";
export default GamerAvatar;
