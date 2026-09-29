const COLORS = {
  primary: "#0c1a33",
  secondary: "#516996",
  button: "rgba(119, 155, 221, 0.2)",
  darkBackground: "#00001c",
  lightGray: "#779bdd",
  light: "#fff",
  dark: "#000",
  gray: "#aaa",
  danger: "#ff3b30",
} as const;

export type ColorKey = keyof typeof COLORS;
export type ColorValue = (typeof COLORS)[ColorKey];
export default COLORS;
