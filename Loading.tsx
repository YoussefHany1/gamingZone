import React, { memo } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import COLORS from "./constants/colors";

const Loading: React.FC = memo(() => {
  const { t } = useTranslation();

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#779bdd" />
      <Text style={styles.loadingText}>{t("common.loading")}</Text>
    </View>
  );
});

Loading.displayName = "Loading";

export default Loading;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    zIndex: 100,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.secondary,
    marginTop: 10,
    fontSize: 16,
  },
});