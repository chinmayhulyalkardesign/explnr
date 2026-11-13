// Colors from the dataviz skill's validated reference palette (light mode —
// this app has no dark theme). Categorical hues are in a fixed, pre-validated
// order (adjacent-pair colorblind-safe) — never reassign or cycle them.

export const CATEGORICAL = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#6250d6", // violet
  "#e34948", // red
] as const;

export const OTHER_COLOR = "#898781"; // muted — reserved for the "Other" bucket, not a real series

export const CHART_INK = {
  primary: "#0b0b0b",
  secondary: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  baseline: "#c3c2b7",
  surface: "#fcfcfb",
};

export function colorForIndex(i: number): string {
  if (i >= CATEGORICAL.length) return OTHER_COLOR;
  return CATEGORICAL[i];
}

// Sequential blue ramp, light->dark (dataviz skill palette.md), for magnitude
// encoding (heatmap cells, ranked-bar fills) — never used for identity/category.
const SEQUENTIAL_LIGHT = { r: 0xcd, g: 0xe2, b: 0xfb }; // step 100
const SEQUENTIAL_DARK = { r: 0x0d, g: 0x36, b: 0x6b }; // step 700
export const SEQUENTIAL_HUE = "#2a78d6"; // step 450 — flat fill (ranked bars)

export function sequentialShade(ratio: number): string {
  const t = Math.max(0, Math.min(1, ratio));
  const r = Math.round(SEQUENTIAL_LIGHT.r + (SEQUENTIAL_DARK.r - SEQUENTIAL_LIGHT.r) * t);
  const g = Math.round(SEQUENTIAL_LIGHT.g + (SEQUENTIAL_DARK.g - SEQUENTIAL_LIGHT.g) * t);
  const b = Math.round(SEQUENTIAL_LIGHT.b + (SEQUENTIAL_DARK.b - SEQUENTIAL_LIGHT.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

// Light cells need dark text; past ~55% toward the dark end, switch to white.
export function textColorForShade(ratio: number): string {
  return ratio > 0.55 ? "#ffffff" : CHART_INK.primary;
}

// Status colors (dataviz skill palette.md) — reserved for state, never reused
// as a categorical series. Always pair with an icon + label, never color alone.
export const STATUS = {
  critical: "#d03b3b",
};
