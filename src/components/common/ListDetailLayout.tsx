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

  const selectedItem =
    (selectedId !== null ? items.find((it) => String(it.id) === String(selectedId)) : undefined) ||
    (items.length > 0 ? items[0] : null);

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
      className={`w-full bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[540px] lg:min-h-[640px] ${className}`}
    >
      {/* ======================================================== */}
      {/* LEFT LIST COLUMN (5 COLS ON LG, HIDDEN ON MOBILE IF DETAIL OPEN) */}
      {/* ======================================================== */}
      <div
        className={`lg:col-span-5 lg:border-r border-slate-200/80 flex flex-col bg-slate-50/35 ${
          mobileShowDetail ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Search Header */}
        <div className="p-4 bg-white border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                data-testid="list-detail-search-input"
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-[#E5E7EB] bg-[#F5F7FA] text-[#111827] placeholder:text-[#64748B] focus:outline-none focus:border-[#174EA6] focus:bg-white focus:ring-2 focus:ring-[#174EA6]/15 transition"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {listHeaderAction}
          </div>

          {/* Filter Tabs — flex-wrap ensures no tab ever clips horizontally */}
          {filterTabs && filterTabs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5" role="tablist">
              {filterTabs.map((tab) => {
                const isActive = activeFilterTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    data-testid={`filter-tab-${tab.id}`}
                    onClick={() => onFilterTabChange?.(tab.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer tabular-nums ${
                      isActive
                        ? 'bg-[#174EA6] text-white'
                        : 'bg-[#F5F7FA] text-[#64748B] hover:bg-[#E5E7EB]/60 hover:text-[#111827]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {typeof tab.count === 'number' && (
                      <span
                        className={`text-[10px] font-mono font-semibold tabular-nums ${
                          isActive
                            ? 'text-blue-100'
                            : 'text-[#64748B]'
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

        {/* Scrollable List Body — clean hairline rows */}
        <div className="flex-1 overflow-y-auto bg-white">
          {items.length === 0 ? (
            emptyState || (
              <div className="py-12 px-4 text-center text-xs text-slate-500">
                No matching records found.
              </div>
            )
          ) : (
            items.map((item) => {
              const isSelected = selectedItem !== null && String(selectedItem.id) === String(item.id);
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  data-testid={`list-item-${item.id}`}
                  onClick={() => handleSelect(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelect(item);
                    }
                  }}
                  className={`px-4 py-3.5 cursor-pointer transition-colors duration-150 flex items-start gap-3 border-l-[3px] border-t-0 border-r-0 border-b-0 shadow-[inset_0_-1px_0_#E5E7EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#174EA6] ${
                    isSelected
                      ? 'bg-[#EFF6FF] border-[#174EA6]'
                      : 'bg-white border-transparent hover:bg-[#F5F7FA]'
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
                        className={`text-[13px] font-semibold truncate ${
                          isSelected ? 'text-[#174EA6]' : 'text-slate-900'
                        }`}
                      >
                        {item.title}
                      </h4>
                      {item.timestamp && (
                        <span className="text-[11px] font-mono text-slate-500 shrink-0 tabular-nums">
                          {item.timestamp}
                        </span>
                      )}
                    </div>

                    {item.subtitle && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">
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
        <div className="lg:hidden px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBackToList}
            data-testid="list-detail-back-button"
            className="flex items-center gap-1.5 text-xs font-semibold text-[#174EA6] hover:underline cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to list</span>
          </button>
        </div>

        {/* Detail Content */}
        <div className="flex-1 p-5 sm:p-6">
          {selectedItem ? (
            renderDetail(selectedItem)
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 py-16">
              Select an item from the list to view full details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ListDetailLayout;
