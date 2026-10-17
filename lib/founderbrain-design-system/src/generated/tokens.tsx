/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "background": "#FBF8F1",
      "foreground": "#2A2331",
      "border": "#E8E0D5",
      "card": "#FFFDF9",
      "cardForeground": "#2A2331",
      "popover": "#FFFDF9",
      "popoverForeground": "#2A2331",
      "primary": "#51327B",
      "primaryForeground": "#FFFFFF",
      "secondary": "#F0EADF",
      "secondaryForeground": "#332C3A",
      "muted": "#F4F0E9",
      "mutedForeground": "#706875",
      "accent": "#E7D7B1",
      "accentForeground": "#302719",
      "destructive": "#A93343",
      "destructiveForeground": "#FFFFFF",
      "input": "#DDD5CA",
      "ring": "#7855A3",
      "chart1": "#64438D",
      "chart2": "#C69B55",
      "chart3": "#356A9B",
      "chart4": "#5B8B70",
      "chart5": "#C27652",
      "sidebar": "#342048",
      "sidebarForeground": "#F8F3EA",
      "sidebarBorder": "#4C3760",
      "sidebarPrimary": "#DDBB73",
      "sidebarPrimaryForeground": "#281E31",
      "sidebarAccent": "#48315A",
      "sidebarAccentForeground": "#FFFDF9",
      "sidebarRing": "#E4CD97"
    },
    "dark": {
      "background": "#19151F",
      "foreground": "#F5F0E8",
      "border": "#403748",
      "card": "#221C29",
      "cardForeground": "#F5F0E8",
      "popover": "#2B2332",
      "popoverForeground": "#F5F0E8",
      "primary": "#C7A9F0",
      "primaryForeground": "#271A39",
      "secondary": "#352D3D",
      "secondaryForeground": "#F0EAE2",
      "muted": "#2D2634",
      "mutedForeground": "#BBAFC2",
      "accent": "#4D3B25",
      "accentForeground": "#F0CF85",
      "destructive": "#7F2F3C",
      "destructiveForeground": "#FFE6E9",
      "input": "#403748",
      "ring": "#D7BB82",
      "chart1": "#B89AE8",
      "chart2": "#E3BC74",
      "chart3": "#75A9D6",
      "chart4": "#83BA9B",
      "chart5": "#E09570",
      "sidebar": "#21172B",
      "sidebarForeground": "#F6F0E8",
      "sidebarBorder": "#3D2D49",
      "sidebarPrimary": "#E0BD75",
      "sidebarPrimaryForeground": "#2D2036",
      "sidebarAccent": "#352540",
      "sidebarAccentForeground": "#F6F0E8",
      "sidebarRing": "#D8B974"
    }
  },
  "fontFamily": {
    "sans": [
      "Inter",
      "sans-serif"
    ],
    "serif": [
      "Georgia",
      "serif"
    ],
    "mono": [
      "Geist Mono",
      "monospace"
    ]
  },
  "radius": "0.5rem",
  "spacing": "0.25rem"
} as const;

export type Tokens = typeof tokens;
export default tokens;
