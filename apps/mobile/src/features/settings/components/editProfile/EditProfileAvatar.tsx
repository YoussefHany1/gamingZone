import React, { memo } from "react";
import { TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { EditProfileAvatarProps } from "./types";

/** The avatar preview, which opens the avatar picker when tapped. */
const EditProfileAvatar = memo(
  ({ imageUri, onPress }: EditProfileAvatarProps): React.ReactElement => {
    const { t } = useTranslation();

    const styles = useThemeStyles((c) => ({
      avatarContainer: { alignItems: "center", marginBottom: 20 },
      avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: c.skeletonBase,
        borderWidth: 2,
        borderColor: c.textMuted,
      },
      changePicText: { color: c.textMuted, marginTop: 10, fontSize: 16 },
    }));

    return (
      <TouchableOpacity onPress={onPress} style={styles.avatarContainer}>
        <Image
          recyclingKey={imageUri ?? ""}
          style={styles.avatar}
          source={imageUri ?? require("@/assets/default_profile.webp")}
          contentFit="cover"
          transition={500}
          cachePolicy="memory-disk"
          allowDownscaling
        />
        <CustomText style={styles.changePicText}>
          {t("settings.profile.changePic")}
        </CustomText>
      </TouchableOpacity>
    );
  },
);

EditProfileAvatar.displayName = "EditProfileAvatar";
export default EditProfileAvatar;
