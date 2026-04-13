import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import COLORS from "../../constants/colors";
import { STORE_ICONS } from "./utils";
import type { Website } from "./types";

interface Props {
  websites?: Website[];
}

const GameStores: React.FC<Props> = ({ websites }) => {
  const { t } = useTranslation();

  const hasStores = websites?.some((s) => STORE_ICONS[s.type]);
  if (!hasStores) return null;

  return (
    <>
      <Text style={styles.storesHeader}>{t("games.details.availableStores")}</Text>
      <View style={styles.storesContainer}>
        {websites?.map((site) => {
          const icon = STORE_ICONS[site.type];
          if (!icon) return null;
          return (
            <TouchableOpacity key={site.id} style={styles.storesBtn} onPress={() => Linking.openURL(site.url)}>
              <Image style={styles.storeImg} source={icon} contentFit="contain" transition={500} cachePolicy="memory-disk" allowDownscaling />
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
};

export default memo(GameStores);

const styles = StyleSheet.create({
  storesHeader: {
    color: COLORS.textLight,
    fontWeight: "600",
    fontSize: 24,
    marginBottom: 10,
    marginTop: 5,
  },
  storesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  storesBtn: {
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: "#779bdd",
    borderRadius: 12,
    marginRight: 10,
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  storeImg: {
    borderRadius: 12,
    width: 50,
    height: 50,
  },
});
