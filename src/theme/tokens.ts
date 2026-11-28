/**
 * Citadel People Hub — Centralized Design Tokens & Theme System
 * Faithful implementation of the visual language from the reference designs:
 * - Hrivio HR Dashboard & Component Detail (Dark Forest Green primary action,
 *   pure white surfaces, bold key metrics with colored supporting text,
 *   restrained semantic status palette, rounded depth & soft separation)
 * - Pillio Medical Platform (List-and-detail split view with sticky search,
 *   selected card highlights, and rich detail inspector)
 */

export const themeTokens = {
  // Brand & Accent Colors (Strictly White, Gold, Black, and Blue)
  colors: {
    // Primary Action: Royal Blue (#174EA6) & Deep Navy (#0B1F3A)
    primary: {
      DEFAULT: '#174EA6',
      hover: '#0B1F3A',
      dark: '#0B1F3A',
      light: '#2563EB',
      subtle: '#EFF6FF',
      border: '#BFDBFE',
    },

    // Secondary / Action Accent: Restrained Royal Blue (#174EA6 / #0B1F3A)
    accent: {
      DEFAULT: '#174EA6',
      hover: '#0B1F3A',
      light: '#EFF6FF',
      subtle: '#EFF6FF',
      gold: '#174EA6',
    },

    // Canvas & Surfaces
    background: {
      canvas: '#F5F7FA',     // Muted light surface
      subtle: '#F5F7FA',
      card: '#FFFFFF',       // Pure white surface
      elevated: '#FFFFFF',
      sidebar: '#0B1F3A',    // Deep navy navigation rail
      hover: '#F5F7FA',
    },

    // Typography & Neutrals
    text: {
      primary: '#111827',     // Charcoal black primary text
      secondary: '#334155',
      muted: '#64748B',       // Supporting slate muted text
      light: '#94A3B8',
      onDark: '#FFFFFF',
      onDarkMuted: '#94A3B8',
    },

    // Borders & Dividers
    border: {
      DEFAULT: '#E5E7EB',     // Supporting hairline border
      subtle: '#F1F5F9',
      strong: '#CBD5E1',
      active: '#174EA6',      // Royal Blue selection border
      activeSubtle: '#BFDBFE',
    },

    // Semantic Status Colors
    status: {
      // Royal Blue for positive / in-progress / confirmed / online
      success: {
        text: '#174EA6',
        bg: '#EFF6FF',
        border: '#BFDBFE',
        dot: '#174EA6',
      },
      // Muted Amber/Slate for pending / away / review
      warning: {
        text: '#92400E',
        bg: '#FEF3C7',
        border: '#FDE68A',
        dot: '#D97706',
      },
      // Charcoal Black / Deep Navy for rejected / high priority / negative change
      error: {
        text: '#111827',
        bg: '#F5F7FA',
        border: '#111827',
        dot: '#111827',
      },
      // Deep Navy for ongoing / informational
      info: {
        text: '#0B1F3A',
        bg: '#EFF6FF',
        border: '#BFDBFE',
        dot: '#0B1F3A',
      },
      // Neutral / On Leave / Offline
      neutral: {
        text: '#64748B',
        bg: '#F5F7FA',
        border: '#E5E7EB',
        dot: '#64748B',
      },
    },
  },

  // Typography Tokens
  typography: {
    fonts: {
      heading: '"Plus Jakarta Sans", "DM Sans", system-ui, -apple-system, sans-serif',
      body: '"DM Sans", system-ui, -apple-system, sans-serif',
      mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    },
    sizes: {
      metric: 'clamp(1.75rem, 2.2vw, 2.125rem)',
      metricSub: '0.75rem',
    },
    weights: {
      bold: 700,
      extrabold: 800,
      black: 800,
    },
  },

  // Shape & Radii Tokens
  radii: {
    button: '0.75rem',
    card: '1.25rem',
    cardInner: '0.75rem',
    input: '0.75rem',
    modal: '1.25rem',
    pill: '9999px',
  },

  // Elevation & Shadows
  shadows: {
    card: '0 1px 2px rgba(15, 23, 42, 0.04)',
    cardHover: '0 4px 12px rgba(15, 23, 42, 0.06)',
    dropdown: '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
    modal: '0 25px 50px -12px rgba(15, 23, 42, 0.18)',
    buttonPrimary: '0 1px 3px rgba(8, 62, 52, 0.2)',
  },
} as const;

export type ThemeTokens = typeof themeTokens;
export default themeTokens;
