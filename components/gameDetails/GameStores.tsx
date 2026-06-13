import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import COLORS from "../../constants/colors";
import { STORE_ICONS } from "./utils";
import { sharedStyles } from "./shared";
import type { Website } from "./types";
import { openLink } from "../../lib/browser";

interface Props {
  websites?: Website[];
}

const GameStores: React.FC<Props> = ({ websites }) => {
  const { t } = useTranslation();

  const storeWebsites = websites?.filter((site) => STORE_ICONS[site.type]);
  if (!storeWebsites?.length) return null;

  return (
    <>
      <Text style={sharedStyles.sectionHeader}>
        {t("games.details.availableStores")}
      </Text>
      <View style={styles.storesContainer}>
        {storeWebsites.map((site) => (
          <TouchableOpacity
            key={site.id}
            style={styles.storeButton}
            onPress={() => openLink(site.url)}
          >
            <Image
              style={styles.storeIcon}
              source={STORE_ICONS[site.type]}
              contentFit="contain"
              transition={500}
              cachePolicy="memory-disk"
              allowDownscaling
            />
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
};

export default memo(GameStores);

const styles = StyleSheet.create({
  storesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  storeButton: {
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: "#779bdd",
    borderRadius: 12,
    marginRight: 10,
    marginBottom: 10,
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  storeIcon: {
    borderRadius: 12,
    width: 50,
    height: 50,
  },
});
