import React, { useState } from 'react';
import { Search, ChevronLeft, SlidersHorizontal, X } from 'lucide-react';

export interface ListItem<T = any> {
  id: string;
  title: string;
  subtitle?: string;
  timestamp?: string;
  badge?: React.ReactNode;
  avatar?: React.ReactNode;
  data: T;
  unread?: boolean;
}

export interface ListDetailLayoutProps<T = any> {
  items: ListItem<T>[];
  selectedId: string | null;
  onSelectItem: (item: ListItem<T>) => void;
  renderDetail: (item: ListItem<T>) => React.ReactNode;
  searchPlaceholder?: string;
  filterTabs?: { id: string; label: string; count?: number }[];
  activeFilterTab?: string;
  onFilterTabChange?: (tabId: string) => void;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  emptyState?: React.ReactNode;
  listHeaderAction?: React.ReactNode;
  className?: string;
  dataTestId?: string;
}

/**
 * Reusable Pillio List-and-Detail Pattern Component:
 * - Left column: sticky search bar, optional filter tabs, scrollable list with active card outline
 * - Right panel: comprehensive detail view with sticky header, actions, and tabs
 * - Fully responsive: switches to full-width detail with a Back button on mobile screens (< 1024px)
 */
export function ListDetailLayout<T = any>({
  items,
  selectedId,
  onSelectItem,
  renderDetail,
  searchPlaceholder = 'Search records, employees, or files...',
  filterTabs,
  activeFilterTab,
  onFilterTabChange,
  searchValue,
  onSearchChange,
  emptyState,
  listHeaderAction,
  className = '',
  dataTestId,
}: ListDetailLayoutProps<T>) {
  const [internalSearch, setInternalSearch] = useState('');
  const query = searchValue ?? internalSearch;
  const setQuery = onSearchChange ?? setInternalSearch;

  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const selectedItem = items.find((it) => it.id === selectedId) || (items.length > 0 ? items[0] : null);

  const handleSelect = (item: ListItem<T>) => {
    onSelectItem(item);
    setMobileShowDetail(true);
  };

  const handleBackToList = () => {
    setMobileShowDetail(false);
  };

  return (
    <div
      data-testid={dataTestId || 'list-detail-layout'}
      className={`w-full bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.03)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px] ${className}`}
    >
      {/* ======================================================== */}
      {/* LEFT LIST COLUMN (5 COLS ON LG, HIDDEN ON MOBILE IF DETAIL OPEN) */}
      {/* ======================================================== */}
      <div
        className={`lg:col-span-5 border-r border-slate-200/80 flex flex-col bg-slate-50/50 ${
          mobileShowDetail ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Search Header */}
        <div className="p-4 bg-white border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                data-testid="list-detail-search-input"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083E34] focus:bg-white transition"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {listHeaderAction}
          </div>

          {/* Filter Tabs if provided */}
          {filterTabs && filterTabs.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar scroll-smooth" role="tablist">
              {filterTabs.map((tab) => {
                const isActive = activeFilterTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    data-testid={`filter-tab-${tab.id}`}
                    onClick={() => onFilterTabChange?.(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-[#FF9900] text-slate-950 shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {typeof tab.count === 'number' && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive
                            ? 'bg-slate-950/15 text-slate-950'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Scrollable List Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {items.length === 0 ? (
            emptyState || (
              <div className="py-12 text-center text-xs text-slate-400">
                No matching records found.
              </div>
            )
          ) : (
            items.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <div
                  key={item.id}
                  data-testid={`list-item-${item.id}`}
                  onClick={() => handleSelect(item)}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all duration-150 flex items-start gap-3 border ${
                    isSelected
                      ? 'bg-white border-[#083E34] shadow-xs ring-1 ring-[#083E34]/25'
                      : 'bg-white border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/80'
                  }`}
                >
                  {/* Left Avatar */}
                  {item.avatar && (
                    <div className="shrink-0 mt-0.5">{item.avatar}</div>
                  )}

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4
                        className={`text-xs font-bold truncate ${
                          isSelected ? 'text-[#083E34]' : 'text-slate-900'
                        }`}
                      >
                        {item.title}
                      </h4>
                      {item.timestamp && (
                        <span className="text-[10px] font-medium text-slate-400 shrink-0">
                          {item.timestamp}
                        </span>
                      )}
                    </div>

                    {item.subtitle && (
                      <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                        {item.subtitle}
                      </p>
                    )}

                    {item.badge && <div className="mt-2">{item.badge}</div>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT DETAIL PANEL (7 COLS ON LG, FULL-WIDTH ON MOBILE) */}
      {/* ======================================================== */}
      <div
        className={`lg:col-span-7 flex flex-col bg-white overflow-y-auto ${
          mobileShowDetail ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {/* Mobile Back Button Bar */}
        <div className="lg:hidden p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <button
            onClick={handleBackToList}
            data-testid="list-detail-back-button"
            className="flex items-center gap-1.5 text-xs font-bold text-[#083E34] hover:underline"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to list</span>
          </button>
        </div>

        {/* Detail Content */}
        <div className="flex-1 p-6">
          {selectedItem ? (
            renderDetail(selectedItem)
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 py-16">
              Select an item from the list to view full details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ListDetailLayout;
