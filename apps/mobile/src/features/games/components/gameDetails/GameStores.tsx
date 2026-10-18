import React, { memo, useMemo } from "react";
import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { STORE_FALLBACK_URL, STORE_ICONS, STORE_ORDER } from "./utils";
import { useSharedStyles } from "./shared";
import type { GameStoresProps, StorePrice, Website } from "../../types";
import { openLink } from "@/src/lib/browser";

/**
 * `0` is the standardised "free game" price — never render "$0.00".
 * Non-finite values (upstream garbage) render nothing: an error must
 * never look like a free game.
 */
const formatPrice = (price: number): string | null =>
  Number.isFinite(price) ? (price > 0 ? `$${price.toFixed(2)}` : "Free") : null;

const StorePriceInfo: React.FC<{
  price?: StorePrice | undefined;
  loading?: boolean | undefined;
}> = ({ price, loading }) => {
  const colors = useThemeColors();

  const styles = useThemeStyles((c) => ({
    priceContainer: {
      marginTop: 2,
      alignItems: "center",
    },
    // Discounted price reads as a status, so it keeps a fixed green.
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
      color: c.textSubtle,
      fontSize: 9,
      textDecorationLine: "line-through",
    },
    priceLoading: {
      marginTop: 2,
      transform: [{ scale: 0.7 }],
    },
  }));

  if (loading) {
    return (
      <ActivityIndicator size="small" color={colors.text} style={styles.priceLoading} />
    );
  }
  if (!price) return null;

  const saleText = formatPrice(price.salePrice);
  if (!saleText) return null;
  const normalText = price.isOnSale ? formatPrice(price.normalPrice) : null;

  return (
    <View style={styles.priceContainer}>
      <CustomText
        style={price.isOnSale ? styles.salePrice : styles.price}
        numberOfLines={1}
      >
        {saleText}
      </CustomText>
      {normalText ? (
        <CustomText style={styles.normalPrice} numberOfLines={1}>
          {normalText}
        </CustomText>
      ) : null}
    </View>
  );
};

/** One store tile: the union of IGDB store websites and priced stores. */
type StoreEntry = {
  /** Stable React key (one tile per IGDB website type). */
  key: string;
  type: number;
  url: string;
  price: StorePrice | undefined;
};

/**
 * Builds the store tiles: every store the game links to on IGDB plus every
 * store a price was found for, even when IGDB has no website entry for it.
 * Ordered by `STORE_ORDER`; the tile links to the live price URL first, then
 * the IGDB website, then the store root.
 */
function buildStoreEntries(
  websites: Website[] | undefined,
  prices: StorePrice[] | undefined,
): StoreEntry[] {
  const siteUrlByType = new Map<number, string>();
  for (const site of websites ?? []) {
    if (STORE_ICONS[site.type] && !siteUrlByType.has(site.type)) {
      siteUrlByType.set(site.type, site.url);
    }
  }

  const priceByType = new Map<number, StorePrice>();
  for (const price of prices ?? []) {
    if (STORE_ICONS[price.type] && !priceByType.has(price.type)) {
      priceByType.set(price.type, price);
    }
  }

  const types = [...new Set([...siteUrlByType.keys(), ...priceByType.keys()])].sort(
    (a, b) => {
      const orderA = STORE_ORDER.indexOf(a);
      const orderB = STORE_ORDER.indexOf(b);
      return (
        (orderA === -1 ? STORE_ORDER.length : orderA) -
        (orderB === -1 ? STORE_ORDER.length : orderB)
      );
    },
  );

  return types.map((type) => ({
    key: String(type),
    type,
    price: priceByType.get(type),
    url:
      priceByType.get(type)?.url ??
      siteUrlByType.get(type) ??
      STORE_FALLBACK_URL[type] ??
      "",
  }));
}

const GameStores: React.FC<GameStoresProps> = ({ websites, prices, pricesLoading }) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const sharedStyles = useSharedStyles();

  const styles = useThemeStyles((c) => ({
    storesContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 10,
    },
    storeButton: {
      backgroundColor: c.accent,
      borderWidth: 1,
      borderColor: c.accent,
      borderRadius: 12,
      marginRight: 10,
      marginBottom: 10,
      width: 72,
      minHeight: 70,
      paddingVertical: 6,
      alignItems: "center",
      justifyContent: "center",
    },
  }));

  const storeEntries = useMemo(() => buildStoreEntries(websites, prices), [websites, prices]);
  if (!storeEntries.length) return null;

  return (
    <>
      <CustomText style={sharedStyles.sectionHeader}>
        {t("games.details.availableStores")}
      </CustomText>
      <View style={styles.storesContainer}>
        {storeEntries.map((entry) => {
          const Icon = STORE_ICONS[entry.type];
          if (!Icon || !entry.url) return null;
          return (
            <TouchableOpacity
              key={entry.key}
              style={styles.storeButton}
              onPress={() => openLink(entry.url)}
              accessibilityLabel={entry.url}
              accessibilityRole="link"
              accessibilityHint={t("games.details.openStoreHint")}
            >
              <Icon size={34} fill={colors.text} />
              {/* Spin only while this store's own lookup is still running. */}
              <StorePriceInfo
                price={entry.price}
                loading={!entry.price && Boolean(pricesLoading?.[entry.type])}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
};

export default memo(GameStores);
