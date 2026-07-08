import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
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
          <Text style={sharedStyles.sectionHeader}>
            {t("games.details.genres")}
          </Text>
          {genres.map((g) => (
            <Text key={g.id} style={styles.cellText}>
              {g.name}
            </Text>
          ))}
        </View>
      )}

      {gameModes && (
        <View style={styles.cell}>
          <Text style={sharedStyles.sectionHeader}>
            {t("games.details.gameModes")}
          </Text>
          {gameModes.map((m) => (
            <Text key={m.id} style={styles.cellText}>
              {m.name}
            </Text>
          ))}
        </View>
      )}

      {developers.length > 0 && (
        <View style={styles.cell}>
          <Text style={sharedStyles.sectionHeader}>
            {t("games.details.developer")}
          </Text>
          {developers.map((c) => (
            <Text key={c.id} style={styles.cellText}>
              {c.company.name}
            </Text>
          ))}
        </View>
      )}

      {publishers.length > 0 && (
        <View style={styles.cell}>
          <Text style={sharedStyles.sectionHeader}>
            {t("games.details.publisher")}
          </Text>
          {publishers.map((c) => (
            <Text key={c.id} style={styles.cellText}>
              {c.company.name}
            </Text>
          ))}
        </View>
      )}

      {gameEngines && (
        <View style={styles.cell}>
          <Text style={sharedStyles.sectionHeader}>
            {t("games.details.engines")}
          </Text>
          {gameEngines.map((e) => (
            <Text key={e.id} style={styles.cellText}>
              {e.name}
            </Text>
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
