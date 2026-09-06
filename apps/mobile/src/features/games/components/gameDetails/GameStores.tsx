import React, { memo } from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useTranslation } from "react-i18next";
import COLORS from "@/src/constants/colors";
import { STORE_ICONS } from "./utils";
import { sharedStyles } from "./shared";
import type { GameStoresProps, StorePrice } from "../../types";
import { openLink } from "@/src/lib/browser";

const formatPrice = (price: number) => `$${price.toFixed(2)}`;

const StorePriceInfo: React.FC<{
  price?: StorePrice | undefined;
  loading?: boolean | undefined;
}> = ({ price, loading }) => {
  if (loading) {
    return <ActivityIndicator size="small" color="#fff" style={styles.priceLoading} />;
  }
  if (!price) return null;

  return (
    <View style={styles.priceContainer}>
      <CustomText
        style={price.isOnSale ? styles.salePrice : styles.price}
        numberOfLines={1}
      >
        {formatPrice(price.salePrice)}
      </CustomText>
      {price.isOnSale ? (
        <CustomText style={styles.normalPrice} numberOfLines={1}>
          {formatPrice(price.normalPrice)}
        </CustomText>
      ) : null}
    </View>
  );
};

const GameStores: React.FC<GameStoresProps> = ({ websites, prices, pricesLoading }) => {
  const { t } = useTranslation();

  const storeWebsites = websites?.filter((site) => STORE_ICONS[site.type]);
  if (!storeWebsites?.length) return null;

  return (
    <>
      <CustomText style={sharedStyles.sectionHeader}>
        {t("games.details.availableStores")}
      </CustomText>
      <View style={styles.storesContainer}>
        {storeWebsites.map((site) => {
          const Icon = STORE_ICONS[site.type];
          if (!Icon) return null;
          const price = prices?.find((p) => p.type === site.type);
          return (
            <TouchableOpacity
              key={site.id}
              style={styles.storeButton}
              onPress={() => openLink(price?.url ?? site.url)}
              accessibilityLabel={site.url}
              accessibilityRole="link"
              accessibilityHint={t("games.details.openStoreHint")}
            >
              <Icon size={34} fill="white" />
              <StorePriceInfo price={price} loading={pricesLoading} />
            </TouchableOpacity>
          );
        })}
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
    width: 72,
    minHeight: 70,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  priceContainer: {
    marginTop: 2,
    alignItems: "center",
  },
  price: {
    color: "#71e047",
    fontSize: 11,
    fontWeight: "700",
  },
  salePrice: {
    color: "#71e047",
    fontSize: 12,
    fontWeight: "800",
  },
  normalPrice: {
    color: "#9f9f9f",
    fontSize: 9,
    textDecorationLine: "line-through",
  },
  priceLoading: {
    marginTop: 2,
    transform: [{ scale: 0.7 }],
  },
});
