import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  Pressable,
  View,
} from "react-native";
import { Alert } from "@/src/lib/alert";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { Cpu, HardDrive, Trash2 } from "lucide-react-native";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useBottomInset } from "@/src/hooks/useBottomInset";
import CustomText from "@/src/components/CustomText";
import { PC_CPUS, PC_GPUS } from "@gaming-zone/utils";
import type { PcResolution } from "@gaming-zone/core";
import { usePcSpecsStore } from "@/src/store/usePcSpecsStore";
import HardwarePickerModal from "../components/HardwarePickerModal";
import PcScoreSummary from "../components/PcScoreSummary";
import {
  RAM_MAX_GB,
  RAM_MIN_GB,
  RAM_OPTIONS,
  RESOLUTION_OPTIONS,
  STORAGE_MAX_GB,
  STORAGE_MIN_GB,
  STORAGE_OPTIONS,
  isCustomGbInvalid,
  isCustomValue,
  parseCustomGb,
  type PcResolutionOption,
} from "../lib/pcSpecsForm";

type PickerType = "cpu" | "gpu" | null;

const RESOLUTION_LABEL_KEYS: Record<PcResolutionOption, string> = {
  "1080p": "pcSpecs.resolution.r1080p",
  "1440p": "pcSpecs.resolution.r1440p",
  "4k": "pcSpecs.resolution.r4k",
};

const PcSpecsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const bottomInset = useBottomInset();
  const headerHeight = useHeaderHeight();
  const specs = usePcSpecsStore((state) => state.specs);
  const save = usePcSpecsStore((state) => state.save);
  const clear = usePcSpecsStore((state) => state.clear);
  const saving = usePcSpecsStore((state) => state.saving);
  const hydrate = usePcSpecsStore((state) => state.hydrate);
  const hydrated = usePcSpecsStore((state) => state.hydrated);

  const [cpuId, setCpuId] = useState(specs?.cpuId ?? "");
  const [gpuId, setGpuId] = useState(specs?.gpuId ?? "");
  const [ramGb, setRamGb] = useState(specs?.ramGb ?? 16);
  const [freeStorageGb, setFreeStorageGb] = useState(specs?.freeStorageGb ?? 200);
  const [resolution, setResolution] = useState<PcResolution>(specs?.resolution ?? "1080p");
  const [picker, setPicker] = useState<PickerType>(null);
  const [error, setError] = useState<string | null>(null);

  // Custom-value inputs: shown when the current value is not a chip option.
  const [ramCustom, setRamCustom] = useState(isCustomValue(RAM_OPTIONS, ramGb));
  const [ramText, setRamText] = useState(String(ramGb));
  const [storageCustom, setStorageCustom] = useState(
    isCustomValue(STORAGE_OPTIONS, freeStorageGb),
  );
  const [storageText, setStorageText] = useState(String(freeStorageGb));

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  useEffect(() => {
    if (specs) {
      setCpuId(specs.cpuId);
      setGpuId(specs.gpuId);
      setRamGb(specs.ramGb);
      setFreeStorageGb(specs.freeStorageGb);
      setResolution(specs.resolution ?? "1080p");
      setRamCustom(isCustomValue(RAM_OPTIONS, specs.ramGb));
      setRamText(String(specs.ramGb));
      setStorageCustom(isCustomValue(STORAGE_OPTIONS, specs.freeStorageGb));
      setStorageText(String(specs.freeStorageGb));
    }
  }, [specs]);

  const cpu = useMemo(() => PC_CPUS.find((item) => item.id === cpuId), [cpuId]);
  const gpu = useMemo(() => PC_GPUS.find((item) => item.id === gpuId), [gpuId]);

  const styles = useThemeStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    kbView: { flex: 1 },
    container: { padding: 16, paddingBottom: bottomInset - 50, gap: 16 },
    card: {
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      gap: 12,
    },
    sectionTitle: { color: c.text, fontSize: 16, fontWeight: "700" },
    hint: { color: c.textMuted, fontSize: 13 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      borderRadius: 10,
      backgroundColor: c.background,
      borderWidth: 1,
      borderColor: c.border,
    },
    rowText: { color: c.text, flex: 1 },
    muted: { color: c.textMuted },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.background,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: { backgroundColor: c.accentSurface, borderColor: c.accentBorder },
    chipText: { color: c.textMuted },
    chipTextActive: { color: c.accentText, fontWeight: "600" },
    button: {
      backgroundColor: c.accent,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: "center",
    },
    buttonText: { color: c.onAccent, fontWeight: "700" },
    clearButton: {
      alignItems: "center",
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.danger,
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
    },
    clearText: { color: c.danger, fontWeight: "600" },
    input: {
      backgroundColor: c.background,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: c.text,
    },
  }));

  const applyRamText = (text: string) => {
    setRamText(text);
    if (isCustomGbInvalid(text, RAM_MIN_GB, RAM_MAX_GB)) return;
    const parsed = parseCustomGb(text, RAM_MIN_GB, RAM_MAX_GB);
    if (parsed !== null) setRamGb(parsed);
  };

  const applyStorageText = (text: string) => {
    setStorageText(text);
    if (isCustomGbInvalid(text, STORAGE_MIN_GB, STORAGE_MAX_GB)) return;
    const parsed = parseCustomGb(text, STORAGE_MIN_GB, STORAGE_MAX_GB);
    if (parsed !== null) setFreeStorageGb(parsed);
  };

  const handleSave = async () => {
    if (!cpuId || !gpuId) {
      setError(t("pcSpecs.errors.partsRequired"));
      return;
    }
    setError(null);
    try {
      await save({ cpuId, gpuId, ramGb, freeStorageGb, resolution });
      navigation.goBack();
    } catch {
      setError(t("pcSpecs.errors.saveFailed"));
    }
  };

  const handleClear = () => {
    Alert.alert(t("pcSpecs.actions.clearTitle"), t("pcSpecs.actions.clearMessage"), [
      { text: t("pcSpecs.actions.clearCancel"), style: "cancel" },
      {
        text: t("pcSpecs.actions.clearConfirm"),
        style: "destructive",
        onPress: () => {
          clear()
            .then(() => navigation.goBack())
            .catch(() => setError(t("pcSpecs.errors.saveFailed")));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.kbView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={headerHeight}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <PcScoreSummary specs={cpuId && gpuId ? { cpuId, gpuId } : null} />

          <View style={styles.card}>
            <CustomText style={styles.sectionTitle}>
              {t("pcSpecs.sections.hardware")}
            </CustomText>
            <Pressable
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
              onPress={() => setPicker("cpu")}
              android_ripple={{ color: "rgba(128,128,128,0.25)", borderless: false }}
              accessibilityRole="button"
            >
              <Cpu size={18} color={colors.textMuted} />
              <CustomText style={styles.rowText} numberOfLines={1}>
                {cpu?.label ?? t("pcSpecs.placeholders.cpu")}
              </CustomText>
              <CustomText style={styles.muted}>{t("common.edit")}</CustomText>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
              onPress={() => setPicker("gpu")}
              android_ripple={{ color: "rgba(128,128,128,0.25)", borderless: false }}
              accessibilityRole="button"
            >
              <HardDrive size={18} color={colors.textMuted} />
              <CustomText style={styles.rowText} numberOfLines={1}>
                {gpu?.label ?? t("pcSpecs.placeholders.gpu")}
              </CustomText>
              <CustomText style={styles.muted}>{t("common.edit")}</CustomText>
            </Pressable>
          </View>

          <View style={styles.card}>
            <CustomText style={styles.sectionTitle}>
              {t("pcSpecs.sections.resolution")}
            </CustomText>
            <View style={styles.grid}>
              {RESOLUTION_OPTIONS.map((option) => {
                const active = resolution === option;
                return (
                  <Pressable
                    key={option}
                    style={({ pressed }) => [
                      styles.chip,
                      active && styles.chipActive,
                      pressed && { opacity: 0.85 },
                    ]}
                    onPress={() => setResolution(option)}
                    android_ripple={{ color: "rgba(128,128,128,0.25)", borderless: false }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <CustomText style={[styles.chipText, active && styles.chipTextActive]}>
                      {t(RESOLUTION_LABEL_KEYS[option])}
                    </CustomText>
                  </Pressable>
                );
              })}
            </View>
            <CustomText style={styles.hint}>{t("pcSpecs.resolution.hint")}</CustomText>
          </View>

          <View style={styles.card}>
            <CustomText style={styles.sectionTitle}>{t("pcSpecs.sections.ram")}</CustomText>
            <View style={styles.grid}>
              {RAM_OPTIONS.map((value) => {
                const active = !ramCustom && ramGb === value;
                return (
                  <Pressable
                    key={value}
                    style={({ pressed }) => [
                      styles.chip,
                      active && styles.chipActive,
                      pressed && { opacity: 0.85 },
                    ]}
                    onPress={() => {
                      setRamCustom(false);
                      setRamText(String(value));
                      setRamGb(value);
                    }}
                    android_ripple={{ color: "rgba(128,128,128,0.25)", borderless: false }}
                    accessibilityRole="button"
                  >
                    <CustomText style={[styles.chipText, active && styles.chipTextActive]}>
                      {value} GB
                    </CustomText>
                  </Pressable>
                );
              })}
              <Pressable
                style={({ pressed }) => [
                  styles.chip,
                  ramCustom && styles.chipActive,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => setRamCustom(true)}
                android_ripple={{ color: "rgba(128,128,128,0.25)", borderless: false }}
                accessibilityRole="button"
              >
                <CustomText style={[styles.chipText, ramCustom && styles.chipTextActive]}>
                  {t("pcSpecs.custom.label")}
                </CustomText>
              </Pressable>
            </View>
            {ramCustom && (
              <TextInput
                value={ramText}
                onChangeText={applyRamText}
                placeholder={t("pcSpecs.custom.ramPlaceholder")}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                keyboardType="number-pad"
              />
            )}
          </View>

          <View style={styles.card}>
            <CustomText style={styles.sectionTitle}>
              {t("pcSpecs.sections.storage")}
            </CustomText>
            <View style={styles.grid}>
              {STORAGE_OPTIONS.map((value) => {
                const active = !storageCustom && freeStorageGb === value;
                return (
                  <Pressable
                    key={value}
                    style={({ pressed }) => [
                      styles.chip,
                      active && styles.chipActive,
                      pressed && { opacity: 0.85 },
                    ]}
                    onPress={() => {
                      setStorageCustom(false);
                      setStorageText(String(value));
                      setFreeStorageGb(value);
                    }}
                    android_ripple={{ color: "rgba(128,128,128,0.25)", borderless: false }}
                    accessibilityRole="button"
                  >
                    <CustomText
                      style={[styles.chipText, active && styles.chipTextActive]}
                    >
                      {value} GB
                    </CustomText>
                  </Pressable>
                );
              })}
              <Pressable
                style={({ pressed }) => [
                  styles.chip,
                  storageCustom && styles.chipActive,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => setStorageCustom(true)}
                android_ripple={{ color: "rgba(128,128,128,0.25)", borderless: false }}
                accessibilityRole="button"
              >
                <CustomText style={[styles.chipText, storageCustom && styles.chipTextActive]}>
                  {t("pcSpecs.custom.label")}
                </CustomText>
              </Pressable>
            </View>
            {storageCustom && (
              <TextInput
                value={storageText}
                onChangeText={applyStorageText}
                placeholder={t("pcSpecs.custom.storagePlaceholder")}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                keyboardType="number-pad"
              />
            )}
          </View>

          {error && <CustomText style={{ color: colors.danger }}>{error}</CustomText>}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              (saving || !cpuId || !gpuId) && { opacity: 0.5 },
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleSave}
            disabled={saving || !cpuId || !gpuId}
            android_ripple={{ color: "rgba(255,255,255,0.18)", borderless: false }}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <CustomText style={styles.buttonText}>{t("pcSpecs.actions.save")}</CustomText>
            )}
          </Pressable>

          {specs && (
            <Pressable
              style={({ pressed }) => [styles.clearButton, pressed && { opacity: 0.85 }]}
              onPress={handleClear}
              disabled={saving}
              android_ripple={{ color: "rgba(128,128,128,0.25)", borderless: false }}
              accessibilityRole="button"
            >
              <Trash2 size={16} color={colors.danger} />
              <CustomText style={styles.clearText}>{t("pcSpecs.actions.clear")}</CustomText>
            </Pressable>
          )}

          <CustomText style={styles.muted}>{t("pcSpecs.hints.estimate")}</CustomText>
        </ScrollView>
      </KeyboardAvoidingView>

      <HardwarePickerModal
        visible={picker !== null}
        kind={picker ?? "cpu"}
        selectedId={picker === "cpu" ? cpuId : gpuId}
        onSelect={(id) => {
          if (picker === "cpu") setCpuId(id);
          else if (picker === "gpu") setGpuId(id);
        }}
        onClose={() => setPicker(null)}
      />
    </SafeAreaView>
  );
};

export default PcSpecsScreen;
