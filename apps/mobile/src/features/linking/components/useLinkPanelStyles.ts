/**
 * useLinkPanelStyles — the visual chrome shared by every linked-account panel.
 *
 * One hook (instead of one stylesheet per panel) keeps the sign-in screens
 * pixel-identical and lets the WebView box scale with the screen height.
 */
import { useWindowDimensions } from "react-native";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

export function useLinkPanelStyles() {
  const { height } = useWindowDimensions();

  return useThemeStyles(
    (c) => ({
      title: {
        color: c.text,
        fontSize: 19,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 6,
      },
      description: {
        color: c.textSubtle,
        fontSize: 13,
        textAlign: "center",
        marginBottom: 14,
      },
      webviewBox: {
        height: Math.min(320, Math.round(height * 0.42)),
        borderRadius: 10,
        overflow: "hidden",
      },
      primaryBtn: {
        backgroundColor: c.accent,
        padding: 12,
        borderRadius: 10,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
      },
      primaryBtnText: { color: c.onAccent, fontWeight: "bold", fontSize: 15 },
      secondaryBtn: {
        padding: 11,
        borderRadius: 10,
        alignItems: "center",
        borderWidth: 1,
        borderColor: c.border,
      },
      secondaryBtnText: { color: c.text, fontWeight: "600", fontSize: 14 },
      mtSmall: { marginTop: 8 },
      mbMedium: { marginBottom: 12 },
      inputWrap: { backgroundColor: c.surface, color: c.text, marginBottom: 10 },
      manualLink: { alignSelf: "center", padding: 6, marginBottom: 8 },
      manualLinkText: {
        color: c.textSubtle,
        fontSize: 12,
        textDecorationLine: "underline",
      },
    }),
    [height],
  );
}
