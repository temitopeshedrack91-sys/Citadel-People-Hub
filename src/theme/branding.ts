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
  
  // Color Palette Tokens
  colors: {
    // Primary Action: Deep Forest Green matching Hrivio/Citadel reference
    primary: '#083E34',
    primaryLight: '#0F5447',
    primaryDark: '#052C25',
    primarySubtle: '#EBF5F2',
    
    // Accent: Pure Citadel Gold (Official Church brand color from Onboarding SOP)
    accent: '#D4AF37',
    accentLight: '#FAF5EB',
    accentDark: '#B8860B',
    gold: '#D4AF37',
    goldLight: '#FAF5EB',
    goldHover: '#C59B27',
    goldDark: '#B8860B',
    goldBorder: '#F2E4B8',
    citadelGold: '#D4AF37',
    
    // Supporting Neutrals
    slate900: '#0F172A',
    slate800: '#1E293B',
    slate700: '#334155',
    slate600: '#475569',
    slate400: '#94A3B8',
    slate200: '#E2E8F0',
    slate100: '#F1F5F9',
    slate50: '#F8FAFC',
    pureWhite: '#FFFFFF',

    // Semantic Status Colors (Color + Text label pattern)
    status: {
      success: '#059669', // Approved / Active / Confirmed
      successBg: '#ECFDF5',
      warning: '#D97706', // Pending / Away / Review
      warningBg: '#FFFBEB',
      danger: '#DC2626',  // Rejected / High Alert / Cancelled
      dangerBg: '#FEF2F2',
      info: '#0284C7',    // Ongoing / In Review / Informational
      infoBg: '#F0F9FF',
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
      shortCode: 'Holdings',
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
