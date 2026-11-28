import React, { useEffect, useState } from 'react';
import {
  StickyNote,
  Plus,
  X,
  CheckCircle2,
} from 'lucide-react';
import { StatusPill } from '../common/StatusPill';
import { ListDetailLayout, ListItem } from '../common/ListDetailLayout';
import { useAuth } from '../../context/AuthContext';
import {
  buildNoteAvatars,
  loadTeamNotes,
  saveTeamNotes,
  type TeamNoteItem,
} from '../../services/teamNotesStore';

export const TeamNotesView: React.FC = () => {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState<TeamNoteItem[]>(() => loadTeamNotes());
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(() => loadTeamNotes()[0]?.id ?? null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      const latest = loadTeamNotes();
      setNotes(latest);
    };
    window.addEventListener('citadel:team-notes-updated', sync);
    return () => window.removeEventListener('citadel:team-notes-updated', sync);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopyNote = async (note: TeamNoteItem) => {
    const text = `${note.title} [${note.category}]\n${note.description}\n${note.collaborators}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      showToast('Note copied to clipboard!');
    } catch {
      showToast('Note ready to share.');
    }
  };

  // New Note
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState<'Incoming' | 'Ongoing' | 'In Progress'>('Incoming');
  const [newDesc, setNewDesc] = useState('');
  const [newCollab, setNewCollab] = useState('Sussan Afuwape, Blessing Okafor');

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
      title: newTitle.trim(),
      category: newCat,
      description: newDesc.trim(),
      collaborators: newCollab.trim() ? `Collaborate with ${newCollab.trim()}` : `Posted by ${currentUser.name}`,
      date: 'Just now',
      avatars: buildNoteAvatars(currentUser.name, newCollab),
    };

    const nextNotes = [note, ...notes];
    setNotes(nextNotes);
    saveTeamNotes(nextNotes);
    setSelectedNoteId(note.id);
    setIsModalOpen(false);
    setNewTitle('');
    setNewDesc('');
    showToast('Team note saved and synced.');
  };

  const listItems: ListItem<TeamNoteItem>[] = filteredNotes.map((n) => ({
    id: n.id,
    title: n.title,
    subtitle: n.description,
    timestamp: n.date,
    avatar: (
      <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#174EA6] border border-slate-200/80 flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
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
            type="button"
            onClick={() => void handleCopyNote(note)}
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
            <span className="text-[#174EA6] font-bold">Saved locally</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Notes created here persist across sessions and stay synchronized with the Executive Dashboard team notes widget.
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
            <StickyNote className="w-5 h-5 sm:w-6 sm:h-6 text-[#174EA6] shrink-0" />
            <span>Team Notes</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Shared notes, action items, and team handovers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-[#174EA6] hover:bg-[#0B1F3A] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs border border-[#174EA6] transition active:scale-95 cursor-pointer min-h-[38px] shrink-0"
        >
          <Plus className="w-4 h-4 text-white stroke-[2.5]" />
          <span className="font-bold">New note</span>
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
            <div className="bg-[#0B1F3A] text-white p-5 relative border-b border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-blue-300" />
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
                  placeholder="e.g. Monthly Payroll Handover"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#174EA6]"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">Status Category</label>
                <select
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value as TeamNoteItem['category'])}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-bold bg-white focus:outline-none focus:border-[#174EA6]"
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
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#174EA6]"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">Collaborators</label>
                <input
                  type="text"
                  value={newCollab}
                  onChange={(e) => setNewCollab(e.target.value)}
                  placeholder="e.g. Sussan Afuwape, Femi Olatunji"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#174EA6]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#174EA6] hover:bg-[#0B1F3A] text-white font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {toastMessage && (
        <div role="status" className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-blue-100" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default TeamNotesView;
