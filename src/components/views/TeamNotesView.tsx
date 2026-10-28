import React, { useState } from 'react';
import {
  StickyNote,
  Plus,
  Search,
  MessageSquare,
  Users,
  Calendar,
  X,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../common/Card';
import { StatusPill } from '../common/StatusPill';
import { ListDetailLayout, ListItem } from '../common/ListDetailLayout';

interface TeamNoteItem {
  id: string;
  title: string;
  category: 'Incoming' | 'Ongoing' | 'In Progress';
  description: string;
  collaborators: string;
  date: string;
  avatars: { initials: string; bg: string; name: string }[];
}

const initialNotes: TeamNoteItem[] = [
  {
    id: 'note-1',
    title: 'Employee Onboarding',
    category: 'Incoming',
    description:
      'Prepare onboarding access, security keycards, and HR documents for new employees joining CSOG and Church protocol divisions next Monday.',
    collaborators: 'Collaborate with Mia, Harper',
    date: 'Today, 09:30 AM',
    avatars: [
      { initials: 'MA', bg: 'bg-emerald-600', name: 'Mia Anderson' },
      { initials: 'HL', bg: 'bg-indigo-600', name: 'Harper Lee' },
    ],
  },
  {
    id: 'note-2',
    title: 'Performance Review',
    category: 'Ongoing',
    description:
      'Review employee progress, attendance biometric scores, and quarterly OKRs for department head sign-offs before the GEC executive committee.',
    collaborators: 'Collaborate with Chloe, Ethan',
    date: 'Yesterday, 04:15 PM',
    avatars: [
      { initials: 'CM', bg: 'bg-rose-600', name: 'Chloe Martin' },
      { initials: 'EB', bg: 'bg-amber-600', name: 'Ethan Brooks' },
    ],
  },
  {
    id: 'note-3',
    title: 'Design system V2',
    category: 'In Progress',
    description:
      'Finalize Hrivio visual standards, dark green primary action tokens, and Pillio list-detail components for production readiness.',
    collaborators: 'Collaborate with Femi, Blessing',
    date: 'Oct 24, 02:00 PM',
    avatars: [
      { initials: 'FO', bg: 'bg-[#083E34]', name: 'Engr. Femi Olatunji' },
      { initials: 'BO', bg: 'bg-teal-600', name: 'Blessing Okafor' },
    ],
  },
];

export const TeamNotesView: React.FC = () => {
  const [notes, setNotes] = useState<TeamNoteItem[]>(initialNotes);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(initialNotes[0].id);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Note
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState<'Incoming' | 'Ongoing' | 'In Progress'>('Incoming');
  const [newDesc, setNewDesc] = useState('');
  const [newCollab, setNewCollab] = useState('Mia, Harper');

  const filterTabs = [
    { id: 'all', label: 'All Notes', count: notes.length },
    {
      id: 'incoming',
      label: 'Incoming',
      count: notes.filter((n) => n.category === 'Incoming').length,
    },
    {
      id: 'ongoing',
      label: 'Ongoing',
      count: notes.filter((n) => n.category === 'Ongoing').length,
    },
    {
      id: 'in-progress',
      label: 'In Progress',
      count: notes.filter((n) => n.category === 'In Progress').length,
    },
  ];

  const filteredNotes = notes.filter((n) => {
    if (activeTab === 'incoming' && n.category !== 'Incoming') return false;
    if (activeTab === 'ongoing' && n.category !== 'Ongoing') return false;
    if (activeTab === 'in-progress' && n.category !== 'In Progress') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.description.toLowerCase().includes(q);
    }
    return true;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const note: TeamNoteItem = {
      id: `note-${Date.now()}`,
      title: newTitle,
      category: newCat,
      description: newDesc,
      collaborators: `Collaborate with ${newCollab}`,
      date: 'Just now',
      avatars: [
        { initials: 'BA', bg: 'bg-[#083E34]', name: 'Dr. Bukola Adeleke' },
        { initials: 'PC', bg: 'bg-emerald-600', name: 'PCCM Team' },
      ],
    };

    setNotes([note, ...notes]);
    setSelectedNoteId(note.id);
    setIsModalOpen(false);
    setNewTitle('');
    setNewDesc('');
  };

  const listItems: ListItem<TeamNoteItem>[] = filteredNotes.map((n) => ({
    id: n.id,
    title: n.title,
    subtitle: n.description,
    timestamp: n.date,
    avatar: (
      <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#083E34] border border-slate-200/80 flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
        <StickyNote className="w-5 h-5" />
      </div>
    ),
    badge: (
      <div className="flex items-center gap-1.5 flex-wrap">
        <StatusPill
          status={
            n.category === 'Incoming'
              ? 'incoming'
              : n.category === 'Ongoing'
              ? 'ongoing'
              : 'in-progress'
          }
          label={n.category}
          size="sm"
        />
        <span className="text-[11px] font-semibold text-slate-500">
          {n.collaborators}
        </span>
      </div>
    ),
    data: n,
  }));

  const renderDetail = (item: ListItem<TeamNoteItem>) => {
    const note = item.data;
    if (!note) return null;

    return (
      <div className="space-y-6 animate-fade-in" data-testid="team-note-detail-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {note.title}
              </h3>
              <StatusPill
                status={
                  note.category === 'Incoming'
                    ? 'incoming'
                    : note.category === 'Ongoing'
                    ? 'ongoing'
                    : 'in-progress'
                }
                label={note.category}
                size="sm"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">{note.date}</p>
          </div>
          <button
            onClick={() => showToast('Note copied to clipboard!')}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <span>Copy Note</span>
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Operational Note Details
          </h4>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {note.description}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Assigned Collaborators
          </h4>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2 overflow-hidden">
              {note.avatars.map((av, idx) => (
                <div
                  key={idx}
                  title={av.name}
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs ring-2 ring-white select-none ${av.bg} shrink-0`}
                >
                  {av.initials}
                </div>
              ))}
            </div>
            <span className="text-xs font-bold text-slate-700">
              {note.collaborators}
            </span>
          </div>
        </div>

        {/* Activity & Audit Trail Note */}
        <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-200/70 text-xs text-slate-500 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span>Governance &amp; Handover Status</span>
            <span className="text-emerald-700 font-bold">Synchronized</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Updates to this note are logged in the compliance audit trail and visible to assigned division leads.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <StickyNote className="w-5 h-5 sm:w-6 sm:h-6 text-[#083E34] shrink-0" />
            <span>Team Notes</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Shared notes, action items, and team handovers.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-[#083E34] hover:bg-[#062f28] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer min-h-[38px] shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New note</span>
        </button>
      </div>

      <ListDetailLayout<TeamNoteItem>
        items={listItems}
        selectedId={selectedNoteId}
        onSelectItem={(item) => setSelectedNoteId(item.id)}
        renderDetail={renderDetail}
        searchPlaceholder="Search notes by title or content..."
        searchValue={search}
        onSearchChange={setSearch}
        filterTabs={filterTabs}
        activeFilterTab={activeTab}
        onFilterTabChange={setActiveTab}
      />

      {/* Add Note Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="bg-[#083E34] text-white p-5 relative border-b border-emerald-800 shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-amber-300" />
                <span>Add Team Note</span>
              </h3>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-slate-800 font-bold mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Employee Onboarding"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#083E34]"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">Status Category</label>
                <select
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-bold bg-white focus:outline-none focus:border-[#083E34]"
                >
                  <option value="Incoming">Incoming</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="In Progress">In Progress</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Operational details..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#083E34]"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">Collaborators</label>
                <input
                  type="text"
                  value={newCollab}
                  onChange={(e) => setNewCollab(e.target.value)}
                  placeholder="e.g. Mia, Harper"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#083E34]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#083E34] hover:bg-[#052C25] text-white font-bold rounded-xl transition shadow-xs"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamNotesView;
