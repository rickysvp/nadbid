/**
 * Design Tokens — 从现有 DEMO 代码提取，TS 可引用
 * 与 index.css 中的 CSS variables 保持一致
 */

export const colors = {
  bg: {
    canvas: '#000000',
    card: '#161616',
    inner: '#0f0f0f',
    input: '#0a0a0a',
    hover: 'rgba(255,255,255,0.02)',
  },
  border: {
    default: 'rgba(255,255,255,0.04)',
    strong: 'rgba(255,255,255,0.08)',
    input: 'rgba(255,255,255,0.1)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255,255,255,0.5)',
    tertiary: 'rgba(255,255,255,0.4)',
    quaternary: 'rgba(255,255,255,0.3)',
  },
  accent: {
    green: '#3ec470',
    greenHover: '#4ade80',
    greenSoft: 'rgba(62,196,112,0.1)',
    greenBorder: 'rgba(62,196,112,0.3)',
    greenGlow: 'rgba(62,196,112,0.1)',
    purple: '#a855f7',
    amber: '#fbbf24',
    red: '#ef4444',
  },
} as const;

export const typography = {
  fontFamily: {
    sans: "'Inter', system-ui, sans-serif",
    mono: "'IBM Plex Mono', monospace",
  },
  fontSize: {
    label: '9px',
    small: '11px',
    body: '13px',
    base: '14px',
    heading: '16px',
    title: '24px',
    display: '32px',
    hero: '48px',
  },
  letterSpacing: {
    label: '0.15em',
    tight: '-0.02em',
  },
} as const;

export const radius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

export const shadows = {
  greenGlow: '0 0 15px rgba(62,196,112,0.1)',
  greenGlowStrong: '0 0 25px rgba(62,196,112,0.2)',
} as const;

export const spacing = {
  pageTop: '128px', // pt-32
  pageBottom: '96px', // pb-24
  contentMax: '1200px',
  contentMaxWide: '1400px',
} as const;
