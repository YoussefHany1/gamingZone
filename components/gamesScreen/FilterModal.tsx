import React, { memo, useCallback, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import COLORS from "../../constants/colors";

// Types

export interface GameFilters {
  year: string | null;
  genre: string | null;
  platform: string | null;
  sort: string | null;
}

interface FilterModalProps {
  visible: boolean;
  filters: GameFilters;
  onApply: (filters: GameFilters) => void;
  onClose: () => void;
}

// Filter data

const YEARS: string[] = Array.from({ length: 35 }, (_, i) =>
  String(2025 - i)
);

// Exact IGDB genre names (sent as `genre` param to server)
const GENRES: { id: string; label: string }[] = [
  { id: "Role-playing (RPG)", label: "games.filter.genres.rpg" },
  { id: "Shooter", label: "games.filter.genres.shooter" },
  { id: "Fighting", label: "games.filter.genres.fighting" },
  { id: "Music", label: "games.filter.genres.music" },
  { id: "Platform", label: "games.filter.genres.platform" },
  { id: "Puzzle", label: "games.filter.genres.puzzle" },
  { id: "Racing", label: "games.filter.genres.racing" },
  { id: "Real Time Strategy (RTS)", label: "games.filter.genres.rts" },
  { id: "Simulator", label: "games.filter.genres.simulator" },
  { id: "Sport", label: "games.filter.genres.sport" },
  { id: "Strategy", label: "games.filter.genres.strategy" },
  { id: "Turn-based strategy (TBS)", label: "games.filter.genres.turnBased" },
  { id: "Tactical", label: "games.filter.genres.tactical" },
  { id: "Hack and slash/Beat 'em up", label: "games.filter.genres.hackSlash" },
  { id: "Quiz/Trivia", label: "games.filter.genres.quiz" },
  { id: "Adventure", label: "games.filter.genres.adventure" },
  { id: "Indie", label: "games.filter.genres.indie" },
  { id: "Arcade", label: "games.filter.genres.arcade" },
  { id: "MOBA", label: "games.filter.genres.moba" },
];

// Exact IGDB platform names (sent as `platform` param to server)
const PLATFORMS: { id: string; label: string }[] = [
  { id: "PC (Microsoft Windows)", label: "games.filter.platforms.pc" },
  { id: "PlayStation 5", label: "games.filter.platforms.ps5" },
  { id: "PlayStation 4", label: "games.filter.platforms.ps4" },
  { id: "Xbox Series X|S", label: "games.filter.platforms.xboxSeries" },
  { id: "Xbox One", label: "games.filter.platforms.xboxOne" },
  { id: "Nintendo Switch", label: "games.filter.platforms.switch" },
  { id: "Linux", label: "games.filter.platforms.linux" },
  { id: "Mac", label: "games.filter.platforms.mac" },
  { id: "Android", label: "games.filter.platforms.android" },
  { id: "iOS", label: "games.filter.platforms.ios" },
];

const SORT_OPTIONS: { id: string; label: string }[] = [
  { id: "relevance", label: "games.filter.sortOptions.relevance" },
  { id: "title", label: "games.filter.sortOptions.title" },
  { id: "release_date", label: "games.filter.sortOptions.release_date" },
  { id: "rating", label: "games.filter.sortOptions.rating" },
];

interface SectionProps {
  title: string;
  items: { id: string; label: string }[] | string[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  hideAny?: boolean;
}

const FilterSection = memo<SectionProps>(({ title, items, selected, onSelect, hideAny }) => {
  const { t } = useTranslation();
  const normalizedItems: { id: string; label: string }[] =
    typeof items[0] === "string"
      ? (items as string[]).map((s) => ({ id: s, label: s }))
      : (items as { id: string; label: string }[]);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {/* "Any" chip — hidden for sections that always need a selection (e.g. Sort) */}
        {!hideAny && (
          <TouchableOpacity
            style={[styles.chip, selected === null && styles.chipActive]}
            onPress={() => onSelect(null)}
          >
            <Text style={[styles.chipText, selected === null && styles.chipTextActive]}>
              {t("games.filter.any")}
            </Text>
          </TouchableOpacity>
        )}

        {normalizedItems.map((item) => {
          const isActive = selected === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => onSelect(isActive ? null : item.id)}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {t(item.label)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});
FilterSection.displayName = "FilterSection";

// Main

function FilterModal({ visible, filters, onApply, onClose }: FilterModalProps) {
  const { t } = useTranslation();

  // Local draft state – changes are only applied when user taps "Apply"
  const [draft, setDraft] = useState<GameFilters>(filters);

  // Sync draft when modal opens
  const handleShow = useCallback(() => {
    setDraft(filters);
  }, [filters]);

  const handleApply = useCallback(() => {
    onApply(draft);
    onClose();
  }, [draft, onApply, onClose]);

  const handleReset = useCallback(() => {
    const empty: GameFilters = { year: null, genre: null, platform: null, sort: "relevance" };
    setDraft(empty);
    onApply(empty);
    onClose();
  }, [onApply, onClose]);

  const activeCount =
    (draft.year ? 1 : 0) + (draft.genre ? 1 : 0) + (draft.platform ? 1 : 0) + (draft.sort && draft.sort !== "relevance" ? 1 : 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onShow={handleShow}
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      {/* Sheet */}
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {t("games.filter.title")}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color="#ccc" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.body}
        >
          <FilterSection
            title={t("games.filter.sort")}
            items={SORT_OPTIONS}
            selected={draft.sort}
            onSelect={(v) => setDraft((prev) => ({ ...prev, sort: v }))}
            hideAny
          />
          <FilterSection
            title={t("games.filter.year")}
            items={YEARS}
            selected={draft.year}
            onSelect={(v) => setDraft((prev) => ({ ...prev, year: v }))}
          />
          <FilterSection
            title={t("games.filter.genre")}
            items={GENRES}
            selected={draft.genre}
            onSelect={(v) => setDraft((prev) => ({ ...prev, genre: v }))}
          />
          <FilterSection
            title={t("games.filter.platform")}
            items={PLATFORMS}
            selected={draft.platform}
            onSelect={(v) => setDraft((prev) => ({ ...prev, platform: v }))}
          />
        </ScrollView>

        {/* Footer buttons */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetText}>
              {t("games.filter.reset")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
            <Text style={styles.applyText}>
              {t("games.filter.apply")}
              {activeCount > 0 ? ` (${activeCount})` : ""}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
export default memo(FilterModal);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    backgroundColor: "#111c30",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "75%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.secondary,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  body: {
    paddingBottom: 12,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    alignItems: "center",
  },
  resetText: {
    color: COLORS.lightGray,
    fontWeight: "600",
    fontSize: 15,
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
  },
  applyText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  // Section Style
  wrapper: { marginBottom: 20 },
  title: {
    color: COLORS.lightGray,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  row: { flexDirection: "row", paddingBottom: 4 },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    backgroundColor: "transparent",
  },
  chipActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.lightGray,
  },
  chipText: { color: "#aaa", fontSize: 13, fontWeight: "500" },
  chipTextActive: { color: "#fff", fontWeight: "700" },
});
