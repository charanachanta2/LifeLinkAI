/**
 * LifeLink design tokens — the same black / green / red look as the website
 * (client/src/index.css dark theme + landing page).
 *
 * Change a colour here and the whole app follows.
 */
export const LL = {
  // Surfaces
  bg: "#050605", // page background
  surface: "#0C0F0D", // cards, sheets, tab bar
  elevated: "#111512", // inputs, chips, raised rows
  border: "#1E2621",
  borderSoft: "#151B17",

  // Text
  text: "#F2F5F3",
  textSoft: "#C3CEC8",
  textMuted: "#94A39B",
  textDim: "#6F7F77",
  white: "#FFFFFF",

  // Primary accent — green (buttons, links, active tabs, success)
  accent: "#1FE08A",
  accentHover: "#4EEAA4",
  accentSoft: "#0F2A1D",
  accentBorder: "#1B4630",
  accentDisabled: "#1A8F5F",
  onAccent: "#03150C", // text/icons on a solid green background

  // Emergency — red (SOS, alerts, destructive actions, errors)
  danger: "#F43F46",
  dangerHover: "#FF5A60",
  dangerDeep: "#B3202A",
  dangerText: "#FF6B70", // red text on dark surfaces
  dangerSoft: "#2E1013",
  dangerBorder: "#5C1E23",
  onDanger: "#FFFFFF",

  // Warnings / achievements — amber
  warning: "#E9BD5A",
  warningText: "#F0C169",
  warningSoft: "#2E2510",
  warningBorder: "#5A4716",

  // Police (kept blue so the four services stay easy to tell apart)
  info: "#5B9DFF",
  infoSoft: "#0F1D33",
  infoBorder: "#1E3A66",

  // Fire station
  fire: "#FB923C",
  fireSolid: "#EA580C", // fire-station buttons (white text on top)
  fireSoft: "#2B1807",

  // Solid status pills (white text on top)
  statusPending: "#C98A12",
  statusDispatched: "#F43F46",
  statusAccepted: "#2F6BDB",
  statusResolved: "#0E9F6E",
  statusCancelled: "#4B5A52",

  // Overlays & glass
  overlay: "rgba(0,0,0,0.6)",
  glass: "rgba(255,255,255,0.04)",
  glassBorder: "rgba(255,255,255,0.10)",
} as const;

export type LLColor = keyof typeof LL;
