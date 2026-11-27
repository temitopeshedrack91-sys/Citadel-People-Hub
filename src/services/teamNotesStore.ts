export interface TeamNoteItem {
  id: string;
  title: string;
  category: 'Incoming' | 'Ongoing' | 'In Progress';
  description: string;
  collaborators: string;
  date: string;
  avatars: { initials: string; bg: string; name: string }[];
}

const STORAGE_KEY = 'citadel_team_notes_v2';

export const DEFAULT_CITADEL_TEAM_NOTES: TeamNoteItem[] = [
  {
    id: 'note-1',
    title: 'Employee Onboarding',
    category: 'Incoming',
    description:
      'Prepare onboarding access, staff ID badges, and HR dossiers for new hires joining CSOG and CGCC Protocol divisions.',
    collaborators: 'Collaborate with Sussan Afuwape, Blessing Okafor',
    date: 'Today, 09:30 AM',
    avatars: [
      { initials: 'SA', bg: 'bg-[#083E34]', name: 'Mrs. Sussan Afuwape' },
      { initials: 'BO', bg: 'bg-teal-700', name: 'Blessing Okafor' },
    ],
  },
  {
    id: 'note-2',
    title: 'Performance Review Cycle',
    category: 'Ongoing',
    description:
      'Review probation confirmations, biometric attendance scores, and quarterly KPI sign-offs for GEC Business Heads.',
    collaborators: 'Collaborate with Bukola Adeleke, Chinedu Okeke',
    date: 'Yesterday, 04:15 PM',
    avatars: [
      { initials: 'BA', bg: 'bg-emerald-700', name: 'Dr. Bukola Adeleke' },
      { initials: 'CO', bg: 'bg-amber-600', name: 'Dr. Chinedu Okeke' },
    ],
  },
  {
    id: 'note-3',
    title: 'Biometric & Payroll Reconciliation',
    category: 'In Progress',
    description:
      'Validate monthly attendance grace-period exceptions and reconcile approved leave deductions ahead of payroll lock.',
    collaborators: 'Collaborate with Femi Olatunji, Sussan Afuwape',
    date: 'Recent',
    avatars: [
      { initials: 'FO', bg: 'bg-[#083E34]', name: 'Engr. Femi Olatunji' },
      { initials: 'SA', bg: 'bg-emerald-600', name: 'Mrs. Sussan Afuwape' },
    ],
  },
];

export function loadTeamNotes(): TeamNoteItem[] {
  if (typeof window === 'undefined') return DEFAULT_CITADEL_TEAM_NOTES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CITADEL_TEAM_NOTES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as TeamNoteItem[]) : DEFAULT_CITADEL_TEAM_NOTES;
  } catch {
    return DEFAULT_CITADEL_TEAM_NOTES;
  }
}

export function saveTeamNotes(notes: TeamNoteItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    window.dispatchEvent(new CustomEvent('citadel:team-notes-updated'));
  } catch {
    // Ignore storage quota exceptions
  }
}

export function buildNoteAvatars(authorName?: string, collaboratorInput?: string): { initials: string; bg: string; name: string }[] {
  const names = [
    authorName || 'Dr. Bukola Adeleke',
    ...(collaboratorInput || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  ].slice(0, 3);

  const palette = ['bg-[#083E34]', 'bg-emerald-700', 'bg-amber-600', 'bg-teal-700'];
  return names.map((name, idx) => {
    const parts = name
      .replace(/^(Dr\.|Mrs\.|Mr\.|Ms\.|Engr\.|Pastor|Prof\.)\s+/i, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase();
    return {
      initials,
      bg: palette[idx % palette.length],
      name,
    };
  });
}
