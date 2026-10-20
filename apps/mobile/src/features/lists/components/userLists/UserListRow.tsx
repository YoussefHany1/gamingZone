import React, { memo } from "react";
import { View, TouchableOpacity } from "react-native";
import { FolderOpen, List, Trash2 } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { UserList } from "../../types";

type UserListRowProps = {
  item: UserList;
  /** Already-localized list name (see `useListDisplayName`). */
  displayName: string;
  onPress: () => void;
  /** Omitted for default lists, which cannot be deleted. */
  onDelete?: (() => void) | undefined;
};

/**
 * A single row in the "My Lists" screen: an icon + name, plus an owner-only
 * delete button for custom lists.
 */
const UserListRow = memo<UserListRowProps>(
  ({ item, displayName, onPress, onDelete }) => {
    const colors = useThemeColors();

    const styles = useThemeStyles((c) => ({
      listItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 20,
        backgroundColor: c.surface,
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 12,
        alignItems: "center",
      },
      listName: { color: c.text, fontSize: 18, marginLeft: 10 },
    }));

    return (
      <TouchableOpacity style={styles.listItem} onPress={onPress}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {item.type === "default" ? (
            <List size={24} color={colors.accentText}/>
          ) : (
            <FolderOpen size={24} color={colors.accentText}/>
          )}
          <CustomText style={styles.listName}>{displayName}</CustomText>
        </View>
        {onDelete && (
          <TouchableOpacity onPress={onDelete}>
            <Trash2 size={20} color={colors.danger} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  },
);
UserListRow.displayName = "UserListRow";

export default UserListRow;
