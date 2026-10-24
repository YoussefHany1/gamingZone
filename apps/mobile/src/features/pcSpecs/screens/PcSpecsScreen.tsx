import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { Cpu, HardDrive, MemoryStick } from "lucide-react-native";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useBottomInset } from "@/src/hooks/useBottomInset";
import CustomText from "@/src/components/CustomText";
import { PC_CPUS, PC_GPUS, searchHardware } from "@gaming-zone/utils";
import { usePcSpecsStore } from "@/src/store/usePcSpecsStore";
import type { PcCpu, PcGpu } from "@gaming-zone/core";

type PickerType = "cpu" | "gpu" | null;

const RAM_OPTIONS = [4, 6, 8, 12, 16, 32, 48, 64];
const STORAGE_OPTIONS = [50, 100, 200, 250, 500, 1000, 2000];

const PcSpecsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const bottomInset = useBottomInset();
  const { specs, save, saving, hydrate, hydrated } = usePcSpecsStore();

  const [cpuId, setCpuId] = useState(specs?.cpuId ?? "");
  const [gpuId, setGpuId] = useState(specs?.gpuId ?? "");
  const [ramGb, setRamGb] = useState(specs?.ramGb ?? 16);
  const [freeStorageGb, setFreeStorageGb] = useState(specs?.freeStorageGb ?? 200);
  const [picker, setPicker] = useState<PickerType>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  useEffect(() => {
    if (specs) {
      setCpuId(specs.cpuId);
      setGpuId(specs.gpuId);
      setRamGb(specs.ramGb);
      setFreeStorageGb(specs.freeStorageGb);
    }
  }, [specs]);

  const cpu = useMemo(() => PC_CPUS.find((item) => item.id === cpuId), [cpuId]);
  const gpu = useMemo(() => PC_GPUS.find((item) => item.id === gpuId), [gpuId]);

  const results = useMemo(() => {
    if (picker === "cpu") return searchHardware(PC_CPUS, query);
    if (picker === "gpu") return searchHardware(PC_GPUS, query);
    return [];
  }, [picker, query]);

  const styles = useThemeStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    container: { padding: 16, paddingBottom: bottomInset + 24, gap: 16 },
    card: {
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      gap: 12,
    },
    sectionTitle: { color: c.text, fontSize: 16, fontWeight: "700" },
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
    input: {
      backgroundColor: c.background,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: c.text,
    },
    list: { gap: 6 },
    listItem: {
      padding: 12,
      borderRadius: 10,
      backgroundColor: c.background,
      borderWidth: 1,
      borderColor: c.border,
    },
    listText: { color: c.text },
  }));

  const openPicker = (type: PickerType) => {
    setQuery("");
    setPicker(type);
  };

  const selectCpu = (item: PcCpu) => {
    setCpuId(item.id);
    setPicker(null);
    setQuery("");
  };

  const selectGpu = (item: PcGpu) => {
    setGpuId(item.id);
    setPicker(null);
    setQuery("");
  };

  const handleSave = async () => {
    if (!cpuId || !gpuId) {
      setError(t("pcSpecs.errors.partsRequired"));
      return;
    }
    setError(null);
    try {
      await save({ cpuId, gpuId, ramGb, freeStorageGb });
      navigation.goBack();
    } catch {
      setError(t("pcSpecs.errors.saveFailed"));
    }
  };

  if (picker) {
    return (
      <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
        <View style={[styles.container, { paddingTop: 12 }]}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("pcSpecs.picker.searchPlaceholder")}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoFocus
          />
          <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
            {results.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.listItem}
                onPress={() =>
                  picker === "cpu"
                    ? selectCpu(item as PcCpu)
                    : selectGpu(item as PcGpu)
                }
              >
                <CustomText style={styles.listText}>{item.label}</CustomText>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity onPress={() => setPicker(null)}>
            <CustomText style={styles.muted}>{t("common.cancel")}</CustomText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <CustomText style={styles.sectionTitle}>{t("pcSpecs.sections.hardware")}</CustomText>
          <TouchableOpacity style={styles.row} onPress={() => openPicker("cpu")}>
            <Cpu size={18} color={colors.textMuted} />
            <CustomText style={styles.rowText} numberOfLines={1}>
              {cpu?.label ?? t("pcSpecs.placeholders.cpu")}
            </CustomText>
            <CustomText style={styles.muted}>{t("common.edit")}</CustomText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => openPicker("gpu")}>
            <HardDrive size={18} color={colors.textMuted} />
            <CustomText style={styles.rowText} numberOfLines={1}>
              {gpu?.label ?? t("pcSpecs.placeholders.gpu")}
            </CustomText>
            <CustomText style={styles.muted}>{t("common.edit")}</CustomText>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <CustomText style={styles.sectionTitle}>{t("pcSpecs.sections.ram")}</CustomText>
          <View style={styles.grid}>
            {RAM_OPTIONS.map((value) => (
              <TouchableOpacity
                key={value}
                style={[styles.chip, ramGb === value && styles.chipActive]}
                onPress={() => setRamGb(value)}
              >
                <CustomText style={[styles.chipText, ramGb === value && styles.chipTextActive]}>
                  {value} GB
                </CustomText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <CustomText style={styles.sectionTitle}>{t("pcSpecs.sections.storage")}</CustomText>
          <View style={styles.row}>
            <MemoryStick size={18} color={colors.textMuted} />
            <CustomText style={styles.muted}>{t("pcSpecs.storage.free")}</CustomText>
          </View>
          <View style={styles.grid}>
            {STORAGE_OPTIONS.map((value) => (
              <TouchableOpacity
                key={value}
                style={[styles.chip, freeStorageGb === value && styles.chipActive]}
                onPress={() => setFreeStorageGb(value)}
              >
                <CustomText
                  style={[styles.chipText, freeStorageGb === value && styles.chipTextActive]}
                >
                  {value} GB
                </CustomText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {error && <CustomText style={{ color: "#ef4444" }}>{error}</CustomText>}

        <TouchableOpacity
          style={[styles.button, (saving || !cpuId || !gpuId) && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving || !cpuId || !gpuId}
        >
          {saving ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <CustomText style={styles.buttonText}>{t("pcSpecs.actions.save")}</CustomText>
          )}
        </TouchableOpacity>

        <CustomText style={styles.muted}>{t("pcSpecs.hints.estimate")}</CustomText>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PcSpecsScreen;
