import React, { memo, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import COLORS from "@/src/constants/colors";
import { openLink } from "@/src/lib/browser";
import type { GameActionButtonsProps } from "../../types";

/** Capitalises the first character of a string. */
function capitalise(str: string): string {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

const GRADIENT_COLORS: [string, string] = ["#516996", "#3b4d6e"];
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 0 };

const GameActionButtons: React.FC<GameActionButtonsProps> = ({
  claimUrl,
  store = "",
  onAddToList,
}) => {
  const { t } = useTranslation();

  const handleClaimPress = useCallback(() => {
    if (claimUrl) openLink(claimUrl);
  }, [claimUrl]);

  return (
    <View style={styles.container}>
      {claimUrl && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleClaimPress}
          style={styles.buttonWrapper}
          accessibilityLabel={`${t("games.details.claimNow")} ${capitalise(store)}`}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={GRADIENT_COLORS}
            start={GRADIENT_START}
            end={GRADIENT_END}
            style={styles.button}
          >
            <Ionicons
              name="gift"
              size={24}
              color="#fff"
              style={styles.claimIcon}
            />
            <Text style={styles.buttonText}>
              {t("games.details.claimNow")}
              {capitalise(store)}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={onAddToList}
        style={styles.buttonWrapper}
        accessibilityLabel={t("games.details.addToList")}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={GRADIENT_COLORS}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={styles.button}
        >
          <Ionicons
            name="add-circle-outline"
            size={24}
            color={COLORS.textLight}
          />
          <Text style={[styles.buttonText, styles.addToListText]}>
            {t("games.details.addToList")}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default memo(GameActionButtons);

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  buttonWrapper: {
    alignItems: "center",
    marginVertical: 10,
    width: "100%",
  },
  button: {
    padding: 15,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#516996",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    width: "100%",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  claimIcon: {
    marginRight: 10,
  },
  addToListText: {
    fontWeight: "600",
    letterSpacing: 0,
    marginLeft: 8,
  },
});
