import { memo } from "react";
import { View } from "react-native";
import AppImage from "@/src/components/AppImage";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

type GamerAvatarProps = {
  photoURL?: string | null | undefined;
  size?: number;
  /** Show the green "online now" corner dot (presence). */
  online?: boolean;
};

const GamerAvatar = memo(({ photoURL, size = 48, online = false }: GamerAvatarProps) => {
  const styles = useThemeStyles(
    (c) => ({
      frame: {
        width: size + 2,
        height: size + 2,
        borderRadius: (size + 2) / 2,
        backgroundColor: c.accentSurface,
        borderWidth: 1,
        borderColor: c.accentBorder,
      },
      image: {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.skeletonBase,
      },
      dot: {
        position: "absolute" as const,
        bottom: 0,
        end: 0,
        width: Math.max(10, Math.round(size * 0.28)),
        height: Math.max(10, Math.round(size * 0.28)),
        borderRadius: Math.max(5, Math.round(size * 0.14)),
        backgroundColor: "#22c55e",
        borderWidth: 2,
        borderColor: c.surface,
      },
    }),
    [size],
  );
  return (
    <View style={styles.frame}>
      <AppImage
        source={photoURL ? { uri: photoURL } : require("@/assets/default_profile.webp")}
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      {online ? <View style={styles.dot} /> : null}
    </View>
  );
});

GamerAvatar.displayName = "GamerAvatar";
export default GamerAvatar;
