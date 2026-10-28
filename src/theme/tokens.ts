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
  // Brand & Accent Colors
  colors: {
    // Primary Action: Deep Forest Green (#083E34 / #0D4A3E)
    // Used for Quick Actions, active calendar day, progress gauge stroke, primary CTA buttons
    primary: {
      DEFAULT: '#083E34',
      hover: '#052C25',
      dark: '#031E19',
      light: '#0F5447',
      subtle: '#EBF5F2',
      border: '#A3D4C7',
    },

    // Secondary / Action Accent (Lightning bolt, highlights)
    accent: {
      DEFAULT: '#F59E0B',
      hover: '#D97706',
      light: '#FEF3C7',
      subtle: '#FFFBEB',
    },

    // Canvas & Surfaces
    background: {
      canvas: '#F4F6F9',     // Clean soft grey-white canvas
      subtle: '#F8FAFC',
      card: '#FFFFFF',       // Pure white cards matching reference
      elevated: '#FFFFFF',
      sidebar: '#FFFFFF',    // Crisp white sidebar matching Hrivio/Pillio
      hover: '#F8FAFC',
    },

    // Typography & Neutrals
    text: {
      primary: '#0F172A',     // Slate 900 dark grey primary
      secondary: '#334155',   // Slate 700
      muted: '#64748B',       // Slate 500
      light: '#94A3B8',       // Slate 400
      onDark: '#FFFFFF',
      onDarkMuted: '#94A3B8',
    },

    // Borders & Dividers
    border: {
      DEFAULT: '#E2E8F0',     // Slate 200
      subtle: '#EDF2F7',      // Very soft card borders
      strong: '#CBD5E1',      // Slate 300
      active: '#083E34',      // Primary selection border
      activeSubtle: '#B2DDD4',
    },

    // Semantic Status Colors (Color + Text label pattern)
    status: {
      // Light green for positive / in-progress / confirmed / online
      success: {
        text: '#059669',      // Emerald 600
        bg: '#ECFDF5',        // Emerald 50
        border: '#A7F3D0',    // Emerald 200
        dot: '#10B981',
      },
      // Yellow / amber for pending / away / review
      warning: {
        text: '#D97706',      // Amber 600
        bg: '#FFFBEB',        // Amber 50
        border: '#FDE68A',    // Amber 200
        dot: '#F59E0B',
      },
      // Red for rejected / high priority / negative change
      error: {
        text: '#DC2626',      // Red 600
        bg: '#FEF2F2',        // Red 50
        border: '#FECACA',    // Red 200
        dot: '#EF4444',
      },
      // Info / Ongoing / In Review
      info: {
        text: '#0284C7',      // Sky 600
        bg: '#F0F9FF',        // Sky 50
        border: '#BAE6FD',    // Sky 200
        dot: '#0EA5E9',
      },
      // Neutral / On Leave / Offline
      neutral: {
        text: '#334155',      // Slate 700
        bg: '#F1F5F9',        // Slate 100
        border: '#CBD5E1',    // Slate 300
        dot: '#64748B',
      },
    },
  },

  // Typography Tokens
  typography: {
    fonts: {
      heading: '"DM Sans", system-ui, -apple-system, sans-serif',
      body: '"DM Sans", system-ui, -apple-system, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    },
    sizes: {
      metric: 'clamp(1.75rem, 2.5vw, 2.25rem)', // Large bold key numbers (headcount, attendance %, leave balance)
      metricSub: '0.75rem',                      // Smaller supporting text beneath key numbers
    },
    weights: {
      bold: 700,
      extrabold: 800,
      black: 900,
    },
  },

  // Shape & Radii Tokens
  radii: {
    button: '0.75rem',    // 12px rounded
    card: '1.25rem',      // 20px rounded cards
    cardInner: '0.875rem',// 14px nested items
    input: '0.875rem',    // 14px rounded input fields
    modal: '1.25rem',     // 20px modal dialogs
    pill: '9999px',       // Full pill shape (status pills, search bar, chips)
  },

  // Elevation & Shadows
  shadows: {
    card: '0 2px 10px rgba(15, 23, 42, 0.03)',
    cardHover: '0 6px 18px rgba(15, 23, 42, 0.06)',
    dropdown: '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
    modal: '0 25px 50px -12px rgba(15, 23, 42, 0.18)',
    buttonPrimary: '0 2px 6px rgba(8, 62, 52, 0.22)',
  },
} as const;

export type ThemeTokens = typeof themeTokens;
export default themeTokens;
