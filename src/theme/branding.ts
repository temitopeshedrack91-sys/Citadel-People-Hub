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
    // Citadel Royal Navy (Authority, Dignity, Enterprise)
    primary: '#0A1E3F',
    primaryLight: '#152B52',
    primaryDark: '#061328',
    
    // Citadel Heritage Gold (Excellence, Growth, Honor)
    accent: '#C5A059',
    accentLight: '#DFBF7F',
    accentDark: '#A37E36',
    
    // Supporting Citadel Neutrals
    slate900: '#0F172A',
    slate800: '#1E293B',
    slate700: '#334155',
    slate600: '#475569',
    slate400: '#94A3B8',
    slate200: '#E2E8F0',
    slate100: '#F1F5F9',
    slate50: '#F8FAFC',
    pureWhite: '#FFFFFF',

    // Semantic Status Colors
    status: {
      success: '#059669', // Approved / Active / Cleared
      successBg: '#ECFDF5',
      warning: '#D97706', // Pending Review / In Progress
      warningBg: '#FFFBEB',
      danger: '#E11D48',  // Rejected / Terminated / High Alert
      dangerBg: '#FFF1F2',
      info: '#0284C7',    // In Review / Notice
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
