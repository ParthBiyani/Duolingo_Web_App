/**
 * Fixed illustration colours. Icons are artwork, so they keep these values in both themes;
 * greys that must follow the theme read a CSS variable first and fall back to the hex.
 */
export const palette = {
  white: "#FFFFFF",
  green: "#58CC02",
  greenShade: "#58A700",
  greenLight: "#89E219",
  blue: "#1CB0F6",
  blueShade: "#1899D6",
  blueLight: "#84D8FF",
  blueLighter: "#C4EDFF",
  red: "#FF4B4B",
  redShade: "#EA2B2B",
  gold: "#FFC800",
  goldShade: "#E6A700",
  goldLight: "#FFE173",
  orange: "#FF9600",
  orangeShade: "#E07F00",
  purple: "#CE82FF",
  purpleShade: "#A568CC",
  wood: "#D5893A",
  woodLight: "#E8A04F",
  woodShade: "#A9631F",
  woodDark: "#7A4413",
  beige: "#FDE5BF",
  beigeShade: "#E9C690",
} as const;

/** Theme-aware greys: CSS variable first, light-theme value as the fallback. */
export const greys = {
  face: "var(--locked-face, #E5E5E5)",
  edge: "var(--locked-edge, #CECECE)",
  icon: "var(--locked-icon, #AFAFAF)",
} as const;

type Rgb = [number, number, number];

function parseHex(color: string): Rgb | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return null;
  const hex =
    match[1].length === 3
      ? match[1]
          .split("")
          .map((c) => c + c)
          .join("")
      : match[1];
  const value = Number.parseInt(hex, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function mix(color: string, target: Rgb, amount: number): string {
  const rgb = parseHex(color);
  if (!rgb) return color;
  return `#${rgb
    .map((c, i) => Math.round(c + (target[i] - c) * amount))
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Mixes a hex colour towards black. Non-hex values are returned unchanged. */
export function darken(color: string, amount = 0.18): string {
  return mix(color, [0, 0, 0], amount);
}

/** Mixes a hex colour towards white. Non-hex values are returned unchanged. */
export function lighten(color: string, amount = 0.3): string {
  return mix(color, [255, 255, 255], amount);
}
