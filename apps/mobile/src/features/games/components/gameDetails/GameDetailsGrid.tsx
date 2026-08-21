import React, { memo, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useTranslation } from "react-i18next";
import { sharedStyles } from "./shared";
import type { GameDetailsGridProps } from "../../types";

const GameDetailsGrid: React.FC<GameDetailsGridProps> = ({
  genres,
  gameModes,
  involvedCompanies,
  gameEngines,
}) => {
  const { t } = useTranslation();

  // Split companies once instead of calling .some() + .filter() per render
  const { developers, publishers } = useMemo(() => {
    if (!involvedCompanies) return { developers: [], publishers: [] };
    return {
      developers: involvedCompanies.filter((c) => c.developer),
      publishers: involvedCompanies.filter((c) => c.publisher),
    };
  }, [involvedCompanies]);

  return (
    <View style={styles.grid}>
      {genres && (
        <View style={styles.cell}>
          <CustomText style={sharedStyles.sectionHeader}>
            {t("games.details.genres")}
          </CustomText>
          {genres.map((g) => (
            <CustomText key={g.id} style={styles.cellText}>
              {g.name}
            </CustomText>
          ))}
        </View>
      )}

      {gameModes && (
        <View style={styles.cell}>
          <CustomText style={sharedStyles.sectionHeader}>
            {t("games.details.gameModes")}
          </CustomText>
          {gameModes.map((m) => (
            <CustomText key={m.id} style={styles.cellText}>
              {m.name}
            </CustomText>
          ))}
        </View>
      )}

      {developers.length > 0 && (
        <View style={styles.cell}>
          <CustomText style={sharedStyles.sectionHeader}>
            {t("games.details.developer")}
          </CustomText>
          {developers.map((c) => (
            <CustomText key={c.id} style={styles.cellText}>
              {c.company.name}
            </CustomText>
          ))}
        </View>
      )}

      {publishers.length > 0 && (
        <View style={styles.cell}>
          <CustomText style={sharedStyles.sectionHeader}>
            {t("games.details.publisher")}
          </CustomText>
          {publishers.map((c) => (
            <CustomText key={c.id} style={styles.cellText}>
              {c.company.name}
            </CustomText>
          ))}
        </View>
      )}

      {gameEngines && (
        <View style={styles.cell}>
          <CustomText style={sharedStyles.sectionHeader}>
            {t("games.details.engines")}
          </CustomText>
          {gameEngines.map((e) => (
            <CustomText key={e.id} style={styles.cellText}>
              {e.name}
            </CustomText>
          ))}
        </View>
      )}
    </View>
  );
};

export default memo(GameDetailsGrid);

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  cell: {
    width: "50%",
  },
  cellText: {
    color: "#9f9f9f",
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 3,
    flexWrap: "wrap",
  },
});
