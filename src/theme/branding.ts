/**
 * Citadel People Hub — Centralized Brand & Theme Tokens
 * Visual Identity inspired by Citadel Global Community Church (CGCC)
 * Tagline: People • Culture • Performance • Growth
 */

export const CITADEL_BRAND = {
  name: 'Citadel People Hub',
  tagline: 'People • Culture • Performance • Growth',
  organization: 'Citadel Global Community Church & Associated Entities',
  primaryHrFunction: 'People, Culture & Change Management (PCCM)',
  officialHrRole: 'People, Culture & Change Manager (PCCM)',
  
  // Color Palette Tokens (Restrained Dark Navy, Royal Blue, and Neutral Slate)
  colors: {
    // Primary Action: Royal Blue (#174EA6) & Deep Navy (#0B1F3A)
    primary: '#174EA6',
    primaryLight: '#2563EB',
    primaryDark: '#0B1F3A',
    primarySubtle: '#EFF6FF',

    // Accent: Restrained Royal Blue & Slate
    accent: '#174EA6',
    accentLight: '#EFF6FF',
    accentDark: '#0B1F3A',
    gold: '#174EA6',
    goldLight: '#EFF6FF',
    goldHover: '#0B1F3A',
    goldDark: '#0B1F3A',
    goldBorder: '#BFDBFE',
    citadelGold: '#174EA6',

    // Supporting Neutrals
    slate900: '#111827',
    slate800: '#1E293B',
    slate700: '#334155',
    slate600: '#64748B',
    slate400: '#94A3B8',
    slate200: '#E5E7EB',
    slate100: '#F5F7FA',
    slate50: '#F5F7FA',
    pureWhite: '#FFFFFF',

    // Semantic Status Colors
    status: {
      success: '#174EA6',
      successBg: '#EFF6FF',
      warning: '#475569',
      warningBg: '#F8FAFC',
      danger: '#111827',
      dangerBg: '#F5F7FA',
      info: '#0B1F3A',
      infoBg: '#EFF6FF',
    }
  },

  // Typography Tokens
  typography: {
    fontFamilyHeading: '"Cinzel", "Plus Jakarta Sans", serif',
    fontFamilyBody: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
  },

  // Supported Organization Entities
  entities: [
    {
      id: 'entity-cgcc',
      name: 'Citadel Global Community Church (CGCC)',
      shortCode: 'CGCC',
      description: 'The flagship spiritual and community assembly comprising pastoral, operational, protocol and administrative wings.',
      departments: [
        'Finance',
        'People, Culture & Change',
        'Facilities',
        'Security',
        "S.O.'s Office / Admin",
        'Protocol',
        'ICT',
        'Transport & Logistics',
      ],
    },
    {
      id: 'entity-csog',
      name: 'Citadel School of Government',
      shortCode: 'CSOG',
      description: 'Premier executive academy equipping ethical, competent leaders for public governance, civil service, and civic policy.',
      departments: [
        'Academy & Programmes',
        'Admin & Operations',
      ],
    },
    {
      id: 'entity-holdings',
      name: 'Citadel Holdings',
      shortCode: 'HOLDINGS',
      description: 'Commercial enterprise umbrella driving community commerce, hospitality, co-working, and sustainable enterprise.',
      departments: [
        'Bookshop',
        'Cafe',
        'Workstation',
        'Asabi Aladire',
        'Sales & Business Development',
      ],
    },
  ],
};
