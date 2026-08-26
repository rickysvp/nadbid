/**
 * Concrete color values for contexts that cannot consume CSS variables
 * (e.g. recharts SVG props). Mirrors the tokens defined in src/index.css —
 * keep both in sync when the theme changes.
 */
export const THEME = {
  primary: '#7c3aed',
  secondary: '#10b981',
  tertiary: '#ffd23f',
  mutedText: '#71717a',
} as const;
