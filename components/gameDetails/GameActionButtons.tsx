import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import COLORS from "../../constants/colors";

interface Props {
  claimUrl?: string;
  store?: string;
  onAddToList: () => void;
}

const GameActionButtons: React.FC<Props> = ({ claimUrl, store = "", onAddToList }) => {
  const { t } = useTranslation();

  return (
    <View style={{ marginVertical: 20 }}>
      {claimUrl && (
        <View style={styles.addToList}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => Linking.openURL(claimUrl)} style={{ width: "100%" }}>
            <LinearGradient colors={["#516996", "#3b4d6e"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addToListBtn}>
              <Ionicons name="gift" size={24} color="#fff" style={{ marginRight: 10 }} />
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold", letterSpacing: 0.5 }}>
                {t("games.details.claimNow")}{store.charAt(0).toUpperCase() + store.slice(1)}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.addToList}>
        <TouchableOpacity onPress={onAddToList} style={{ width: "100%" }}>
          <LinearGradient colors={["#516996", "#3b4d6e"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addToListBtn}>
            <Ionicons name="add-circle-outline" size={24} color="white" />
            <Text style={{ color: COLORS.textLight, fontSize: 18, fontWeight: "600", marginLeft: 8 }}>
              {t("games.details.addToList") ?? "Add to List"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default memo(GameActionButtons);

const styles = StyleSheet.create({
  addToList: {
    alignItems: "center",
    margin: 10,
  },
  addToListBtn: {
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
});
