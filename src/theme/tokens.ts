/**
 * Citadel People Hub — Centralized Design Tokens & Theme System
 * Derived from the official Citadel Global Community Church brand assets.
 */

export const themeTokens = {
  // Brand Colors
  colors: {
    // Primary: Official Citadel Deep Royal Navy
    primary: {
      DEFAULT: '#0A1E3F',
      hover: '#152B52',
      dark: '#061328',
      light: '#1B3566',
      subtle: '#E8EEF8',
    },
    // Secondary: Official Citadel Heritage Gold (From the official logo mark)
    secondary: {
      DEFAULT: '#C59B27',
      hover: '#D4A836',
      dark: '#A67F1A',
      light: '#F5E6B8',
      subtle: '#FDF8EC',
    },
    // Accent: Warm Amber
    accent: {
      DEFAULT: '#E5A93C',
      light: '#FEF3C7',
      dark: '#B45309',
    },
    // Backgrounds & Canvas
    background: {
      canvas: '#F8FAFC', // Slate 50
      body: '#F1F5F9',   // Slate 100
      sidebar: '#0A1E3F', // Navy Sidebar
    },
    // Surfaces & Containers
    surface: {
      card: '#FFFFFF',
      elevated: '#FFFFFF',
      subtle: '#F8FAFC',
      muted: '#F1F5F9',
      overlay: 'rgba(10, 30, 63, 0.65)',
    },
    // Typography Text Colors
    text: {
      primary: '#0F172A',   // Slate 900
      secondary: '#475569', // Slate 600
      muted: '#64748B',     // Slate 500
      light: '#94A3B8',     // Slate 400
      onDark: '#FFFFFF',
      onDarkMuted: '#94A3B8',
      gold: '#C59B27',
    },
    // Borders & Dividers
    border: {
      DEFAULT: '#E2E8F0', // Slate 200
      subtle: '#F1F5F9',  // Slate 100
      strong: '#CBD5E1',  // Slate 300
      gold: 'rgba(197, 155, 39, 0.4)',
    },
    // Semantic States
    status: {
      success: {
        text: '#059669',
        bg: '#ECFDF5',
        border: '#A7F3D0',
      },
      warning: {
        text: '#D97706',
        bg: '#FFFBEB',
        border: '#FDE68A',
      },
      error: {
        text: '#DC2626',
        bg: '#FEF2F2',
        border: '#FECACA',
      },
      info: {
        text: '#0284C7',
        bg: '#F0F9FF',
        border: '#BAE6FD',
      },
    },
  },

  // Typography Tokens
  typography: {
    fonts: {
      heading: '"Plus Jakarta Sans", "Cinzel", Georgia, serif',
      body: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    },
  },

  // Layout Spacings & Radii
  radii: {
    button: '0.5rem',    // 8px
    card: '0.75rem',     // 12px
    modal: '1rem',       // 16px
    pill: '9999px',
  },
} as const;

export type ThemeTokens = typeof themeTokens;
