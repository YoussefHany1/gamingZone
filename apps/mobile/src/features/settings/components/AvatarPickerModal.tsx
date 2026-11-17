import React from "react";
import CustomText from "@/src/components/CustomText";
import { Modal, View, Pressable } from "react-native";
import AppImage from "@/src/components/AppImage";
import IconButton from "@/src/components/IconButton";
import { useTranslation } from "react-i18next";
import { Camera, X } from "lucide-react-native";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

interface AvatarPickerModalProps {
  visible: boolean;
  onClose: () => void;
  currentUri: string | null;
  onSelect: (uri: string) => void;
  onUpload: () => void;
}

/**
 * Curated suggested avatars, generated deterministically from the free
 * DiceBear API. Each URL is stable for its seed, needs no API key, and is a
 * plain remote PNG — so the selected value persists like any other photoURL.
 */
const SUGGESTED_AVATARS: string[] = [
  "https://avatarfiles.alphacoders.com/166/thumb-1920-166632.png",
  "https://avatarfiles.alphacoders.com/480/thumb-1920-48099.jpg",
  "https://i.redd.it/9iax30sarym51.jpg",
  "https://avatarfiles.alphacoders.com/148/thumb-1920-148815.jpg",
  "https://i.pinimg.com/736x/01/39/c2/0139c21440cfe0e5f82d1dbe911cba96.jpg",
  "https://i1.sndcdn.com/avatars-yN8iC0dnmbPtwLUS-yFHdhw-t500x500.jpg",
  "https://avatarfiles.alphacoders.com/359/thumb-1920-359966.jpg",
  "https://image.api.playstation.com/cdn/EP1018/CUSA00135_00/fRWsxYfNnuF0qeG8RjlzjirPbuTKIyb1.png",
];

const THUMB = 64;
const GRID_GAP = 14;

function AvatarPickerModal({
  visible,
  onClose,
  currentUri,
  onSelect,
  onUpload,
}: AvatarPickerModalProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const styles = useThemeStyles((c) => ({
    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      width: "88%",
      backgroundColor: c.background,
      padding: 20,
      borderRadius: 16,
      elevation: 5,
    },
    closeBtn: {
      alignSelf: "flex-end",
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      color: c.text,
      fontSize: 18,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 4,
    },
    subtitle: {
      color: c.textSubtle,
      fontSize: 13,
      textAlign: "center",
      marginBottom: 16,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: GRID_GAP,
      marginBottom: 16,
    },
    thumb: {
      width: THUMB,
      height: THUMB,
      borderRadius: THUMB / 2,
      backgroundColor: c.skeletonBase,
      borderWidth: 2.5,
      borderColor: "transparent",
    },
    thumbSelected: {
      borderColor: c.accent,
    },
    uploadBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: c.surface,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.border,
      borderStyle: "dashed",
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    uploadText: {
      color: c.textMuted,
      fontSize: 15,
      fontWeight: "600",
    },
    cancelBtn: {
      alignSelf: "center",
      paddingVertical: 10,
      paddingHorizontal: 24,
    },
    cancelText: {
      color: c.accentText,
      fontSize: 15,
      fontWeight: "700",
    },
  }));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <IconButton
            onPress={onClose}
            size={48}
            accessibilityLabel={t("common.close")}
            style={styles.closeBtn}
          >
            <X size={22} color={colors.text} />
          </IconButton>

          <CustomText style={styles.title}>
            {t("settings.profile.avatar.title")}
          </CustomText>
          <CustomText style={styles.subtitle}>
            {t("settings.profile.avatar.suggested")}
          </CustomText>

          <View style={styles.grid}>
            {SUGGESTED_AVATARS.map((uri) => (
              <Pressable
                key={uri}
                onPress={() => onSelect(uri)}
                accessibilityRole="radio"
                accessibilityState={{ selected: currentUri === uri }}
                android_ripple={{
                  color: "rgba(128,128,128,0.3)",
                  borderless: true,
                  radius: THUMB / 2,
                }}
              >
                <AppImage
                  style={[styles.thumb, currentUri === uri && styles.thumbSelected]}
                  source={{ uri }}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                  allowDownscaling
                />
              </Pressable>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.85 }]}
            onPress={onUpload}
            accessibilityRole="button"
            accessibilityLabel={t("settings.profile.avatar.upload")}
            android_ripple={{ color: "rgba(128,128,128,0.2)", borderless: false }}
          >
            <Camera size={20} color={colors.accentText}/>
            <CustomText style={styles.uploadText}>
              {t("settings.profile.avatar.upload")}
            </CustomText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.85 }]}
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            android_ripple={{ color: "rgba(128,128,128,0.25)", borderless: false }}
          >
            <CustomText style={styles.cancelText}>{t("common.cancel")}</CustomText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

AvatarPickerModal.displayName = "AvatarPickerModal";
export default AvatarPickerModal;
