import React, { memo } from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDeferredReady } from "@/src/hooks/useDeferredReady";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import AdSlot from "@/src/components/AdSlot";
import LanguageOptionRow from "../components/language/LanguageOptionRow";
import { useChangeLanguage } from "../hooks/useChangeLanguage";
import { LANGUAGE_CODES, LANGUAGE_LABELS } from "../lib/languages";

const LanguageSelect = memo((): React.ReactElement => {
  const styles = useThemeStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    container: { padding: 40, paddingBottom: 90 },
  }));

  const isReady = useDeferredReady();
  const { currentLanguage, changeLanguage } = useChangeLanguage();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {LANGUAGE_CODES.map((code) => (
          <LanguageOptionRow
            key={code}
            code={code}
            label={LANGUAGE_LABELS[code]}
            isSelected={currentLanguage === code}
            onSelect={changeLanguage}
          />
        ))}

        <AdSlot visible={isReady} />
      </ScrollView>
    </SafeAreaView>
  );
});
LanguageSelect.displayName = "LanguageSelect";
export default LanguageSelect;
