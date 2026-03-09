const COLORS = {
  primary: "#0c1a33",
  secondary: "#516996",
  button: "rgba(119, 155, 221, 0.2)",
  darkBackground: "#00001c",
  lightGray: "#779bdd",
  textLight: "#fff",
  background: "#0c1a33",
} as const;

export type ColorKey = keyof typeof COLORS;
export type ColorValue = (typeof COLORS)[ColorKey];
export default COLORS;