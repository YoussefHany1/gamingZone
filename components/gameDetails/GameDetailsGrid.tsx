import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import COLORS from "../../constants/colors";
import type { Genre, GameMode, Engine } from "./types";

interface InvolvedCompany {
  id: number;
  developer: boolean;
  publisher: boolean;
  company: { id: number; name: string };
}

interface Props {
  genres?: Genre[];
  gameModes?: GameMode[];
  involvedCompanies?: InvolvedCompany[];
  gameEngines?: Engine[];
}

const GameDetailsGrid: React.FC<Props> = ({ genres, gameModes, involvedCompanies, gameEngines }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.details}>
      {genres && (
        <View style={styles.textCard}>
          <Text style={styles.detailsHeader}>{t("games.details.genres")}</Text>
          {genres.map((g) => <Text key={g.id} style={styles.detailsText}>{g.name}</Text>)}
        </View>
      )}
      {gameModes && (
        <View style={styles.textCard}>
          <Text style={styles.detailsHeader}>{t("games.details.gameModes")}</Text>
          {gameModes.map((m) => <Text key={m.id} style={styles.detailsText}>{m.name}</Text>)}
        </View>
      )}
      {involvedCompanies && (
        <>
          {involvedCompanies.some((c) => c.developer) && (
            <View style={styles.textCard}>
              <Text style={styles.detailsHeader}>{t("games.details.developer")}</Text>
              {involvedCompanies.filter((c) => c.developer).map((c) => (
                <Text key={c.id} style={styles.detailsText}>{c.company.name}</Text>
              ))}
            </View>
          )}
          {involvedCompanies.some((c) => c.publisher) && (
            <View style={styles.textCard}>
              <Text style={styles.detailsHeader}>{t("games.details.publisher")}</Text>
              {involvedCompanies.filter((c) => c.publisher).map((c) => (
                <Text key={c.id} style={styles.detailsText}>{c.company.name}</Text>
              ))}
            </View>
          )}
        </>
      )}
      {gameEngines && (
        <View style={styles.textCard}>
          <Text style={styles.detailsHeader}>{t("games.details.engines")}</Text>
          {gameEngines.map((e) => <Text key={e.id} style={styles.detailsText}>{e.name}</Text>)}
        </View>
      )}
    </View>
  );
};

export default memo(GameDetailsGrid);

const styles = StyleSheet.create({
  details: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  textCard: {
    width: "50%",
  },
  detailsHeader: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: "600",
    textDecorationLine: "underline",
    marginTop: 10,
  },
  detailsText: {
    color: "#9f9f9f",
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 3,
    flexWrap: "wrap",

  },
});
