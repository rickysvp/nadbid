/**
 * Static color fallbacks for places that cannot consume CSS variables
 * (e.g. recharts SVG props, inline styles in computed objects).
 *
 * These values are a 1:1 mirror of the token set defined in `src/index.css`
 * (busy.land Design System v1.0 — spec/design.md).  Keep both files in
 * sync when the theme changes, and prefer CSS tokens (Tailwind classes)
 * whenever they're usable.
 */
export const THEME = {
  // Canvas / panels
  background: '#F7F6F2',
  backgroundDeep: '#ECE9E2',
  surface: '#FFFEFD',
  surfaceDim: '#ECE9E2',
  onSurface: '#111111',
  mutedText: '#696761',

  // Borders
  border: 'rgba(17,17,17,0.24)',
  borderStrong: '#111111',
  borderSubtle: 'rgba(17,17,17,0.11)',

  // Brand (Lime Yellow family — primary CTA)
  primary: '#DDEA54',
  primaryPressed: '#CADB35',
  primaryContainer: '#F2F6A5',
  primaryDeep: '#9DAC1F',

  // Accent (Coral Red family)
  secondary: '#F1715B',
  accentSoft: 'rgba(241,113,91,0.12)',

  // Tertiary = compat alias for yellow banner / highlight backgrounds
  tertiary: '#DDEA54',

  // Functional ROI colors — locked by spec (never substitute)
  success: '#2D8A4E',
  warning: '#D18A28',
  error: '#C94545',

  // Continent palette — locked globally by spec §2.5
  continent: {
    americas: '#4CAF50',
    europe: '#5B9BD5',
    africa: '#F4B942',
    asia: '#E8734A',
    oceania: '#9C6BD5',
  },
} as const;
