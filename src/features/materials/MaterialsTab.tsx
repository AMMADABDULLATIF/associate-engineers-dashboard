import React, { useMemo, useState } from 'react';
import { Pagination } from '../../components/common/Pagination';
import { PAGE_SIZES, SITE_STORAGE_CATEGORIES } from '../../constants/defaults';
import { useApp } from '../../context/AppContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import { getCumulativeMaterialStats } from '../../services/storage';
import type { MaterialEntry } from '../../types';
import { BalanceSheetScreen } from './BalanceSheetScreen';
import { MaterialEditor } from './MaterialEditor';

type MaterialsSubView = 'main' | 'editor' | 'balance';

export const MaterialsTab: React.FC = () => {
  const { materials, deleteMaterialEntry } = useApp();

  const [subView, setSubView] = useState<MaterialsSubView>('main');
  const [editingEntry, setEditingEntry] = useState<MaterialEntry | null>(null);
  const [returnTo, setReturnTo] = useState<'main' | 'balance'>('main');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const debouncedSearch = useDebounce(search, 180);

  const cumulativeStats = useMemo(
    () => getCumulativeMaterialStats(materials),
    [materials]
  );

  const kpis = useMemo(() => {
    const totalReceived =
      Math.round(
        materials.reduce((acc, m) => acc + (Number(m.receivedQty) || 0), 0) *
          100
      ) / 100;
    const totalUsed =
      Math.round(
        materials.reduce((acc, m) => acc + (Number(m.usedQty) || 0), 0) * 100
      ) / 100;
    const lowStockItems = cumulativeStats.filter((s) => s.isLowStock);
    return {
      uniqueTypes: cumulativeStats.length,
      totalReceived,
      totalUsed,
      lowStockItems,
    };
  }, [materials, cumulativeStats]);

  const filteredMaterials = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return materials.filter((m) => {
      if (categoryFilter && (m.category || '') !== categoryFilter) {
        return false;
      }
      if (q) {
        const hay = `${m.materialName || ''} ${m.category || ''} ${
          m.supplier || ''
        } ${m.note || ''} ${m.unit || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [materials, debouncedSearch, categoryFilter]);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    paginatedItems,
  } = usePagination(filteredMaterials, PAGE_SIZES.MATERIALS, [
    debouncedSearch,
    categoryFilter,
  ]);

  const openEditor = (
    entry: MaterialEntry | null,
    origin: 'main' | 'balance'
  ) => {
    setEditingEntry(entry);
    setReturnTo(origin);
    setSubView('editor');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  if (subView === 'editor') {
    return (
      <div id="tab-content-materials" className="space-y-6">
        <MaterialEditor
          entry={editingEntry}
          returnTo={returnTo}
          onClose={() => {
            setSubView(returnTo);
            setEditingEntry(null);
            window.scrollTo({ top: 0, behavior: 'auto' });
          }}
        />
      </div>
    );
  }

  if (subView === 'balance') {
    return (
      <div id="tab-content-materials" className="space-y-6">
        <BalanceSheetScreen
          onBack={() => {
            setSubView('main');
            window.scrollTo({ top: 0, behavior: 'auto' });
          }}
          onAddNew={() => openEditor(null, 'balance')}
          onEdit={(entry) => openEditor(entry, 'balance')}
        />
      </div>
    );
  }

  const hasLowAlerts = kpis.lowStockItems.length > 0;

  return (
    <div id="tab-content-materials" className="space-y-6">
      <div id="materials-main-view" className="space-y-6">
        {/* Hero Header & KPI Overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden">
          <div id="mat-hero-header">
            <div id="mat-hero-brand">
              <div id="mat-hero-badge">
                <i className="fa-solid fa-boxes-stacked text-amber-400 ae-icon-polished" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-white text-lg sm:text-xl">
                  Site Store &amp; Materials Management
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Manage site inventory, inward deliveries, site usage, and live
                  stock balances
                </p>
              </div>
            </div>

            <div id="mat-hero-actions">
              <button
                type="button"
                onClick={() => openEditor(null, 'main')}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-lg transition inline-flex items-center justify-center text-xs"
              >
                <i className="fa-solid fa-plus text-slate-950 ae-icon-polished" />
                <span>Add Material</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubView('balance');
                  window.scrollTo({ top: 0, behavior: 'auto' });
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-semibold rounded-xl transition inline-flex items-center justify-center text-xs"
              >
                <i className="fa-solid fa-table-list text-amber-400 ae-icon-polished" />
                <span>Balance Sheet</span>
              </button>
            </div>
          </div>

          {/* 4 Stock Summary Metrics Cards */}
          <div id="mat-kpi-grid">
            <div className="rounded-xl">
              <div className="text-xs text-slate-400 font-medium">
                Total Materials
              </div>
              <div
                id="mat-stat-total-types"
                className="text-2xl font-bold text-white"
              >
                {kpis.uniqueTypes}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                Unique types
              </div>
            </div>

            <div className="rounded-xl">
              <div className="text-xs text-slate-400 font-medium">
                Total Received (+In)
              </div>
              <div
                id="mat-stat-total-received"
                className="text-2xl font-bold text-emerald-400"
              >
                {kpis.totalReceived}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                Incoming qty
              </div>
            </div>

            <div className="rounded-xl">
              <div className="text-xs text-slate-400 font-medium">
                Total Used (-Out)
              </div>
              <div
                id="mat-stat-total-used"
                className="text-2xl font-bold text-amber-400"
              >
                {kpis.totalUsed}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                Site consumption
              </div>
            </div>

            <div
              id="mat-stat-alert-card"
              className={`rounded-xl ${hasLowAlerts ? 'is-critical' : ''}`}
            >
              <div className="text-xs text-slate-400 font-medium">
                Low Stock Alerts
              </div>
              <div
                id="mat-stat-low-alerts"
                className={`text-2xl font-bold ${
                  hasLowAlerts ? 'text-rose-400' : 'text-slate-100'
                }`}
              >
                {kpis.lowStockItems.length}
              </div>
              <div
                id="mat-stat-alert-sub"
                className={`text-[10px] uppercase tracking-wider ${
                  hasLowAlerts ? 'text-rose-300' : 'text-emerald-400'
                }`}
              >
                {hasLowAlerts
                  ? `${kpis.lowStockItems.length} item(s) below limit`
                  : 'All stock levels safe'}
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Alert Banner */}
        {hasLowAlerts && (
          <div
            id="mat-low-stock-banner"
            className="bg-rose-950/70 border border-rose-800/80 rounded-2xl shadow-lg text-rose-200"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-900/60 rounded-xl text-rose-400 flex-shrink-0 text-base">
                <i className="fa-solid fa-triangle-exclamation ae-icon-polished" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-bold text-rose-200 text-sm">
                    Critical Low Stock Warning
                  </h4>
                  <span
                    id="mat-low-stock-count-badge"
                    className="px-2.5 py-0.5 rounded-full text-[10px] bg-rose-600 text-white font-bold"
                  >
                    {kpis.lowStockItems.length}{' '}
                    {kpis.lowStockItems.length === 1 ? 'Item' : 'Items'}
                  </span>
                </div>
                <p className="text-xs text-rose-300/90 mt-1">
                  The following construction materials have dropped below their
                  minimum safety alert limit:
                </p>
                <div
                  id="mat-low-stock-chips"
                  className="flex flex-wrap gap-2 mt-2"
                >
                  {kpis.lowStockItems.map((item) => (
                    <span
                      key={item.key}
                      className="px-3 py-1 rounded-full bg-rose-900/60 border border-rose-700/70 text-[11px] font-semibold text-rose-100"
                    >
                      {item.materialName}:{' '}
                      <strong>
                        {item.currentBalance} {item.unit}
                      </strong>{' '}
                      (Min: {item.minAlertLimit})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Material Log Entries */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
          <div id="mat-recent-header">
            <div>
              <h3 className="font-bold text-amber-400 text-sm sm:text-base flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-white ae-icon-polished" />
                Recent Material Log Entries
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Latest site store deliveries, consumption records, and balance
                snapshots
              </p>
            </div>

            <div id="mat-recent-controls">
              <div className="ae-search-wrap">
                <i className="fa-solid fa-magnifying-glass ae-icon-polished" />
                <input
                  type="text"
                  id="mat-search-input"
                  placeholder="Search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ae-search-input w-full bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div id="mat-filter-pair">
                <select
                  id="mat-category-filter"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500 truncate"
                >
                  <option value="">All Categories</option>
                  {SITE_STORAGE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  id="mat-full-balance-btn"
                  onClick={() => {
                    setSubView('balance');
                    window.scrollTo({ top: 0, behavior: 'auto' });
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition"
                >
                  <span className="truncate">Full Balance Sheet</span>
                  <i className="fa-solid fa-arrow-right ae-icon-polished shrink-0" />
                </button>
              </div>
            </div>
          </div>

          <div id="materials-recent-list">
            {paginatedItems.length === 0 ? (
              <div className="mat-empty-card col-span-full py-10 text-center text-slate-400">
                <i className="fa-solid fa-boxes-stacked text-4xl mb-3 text-slate-600 ae-icon-polished" />
                <p className="font-medium text-sm">
                  {materials.length === 0
                    ? 'No material entries recorded yet.'
                    : 'No material entries match your search or category filter.'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {materials.length === 0
                    ? 'Click "Add Material" above to record your first delivery or usage.'
                    : 'Try clearing the search query or selecting All Categories.'}
                </p>
              </div>
            ) : (
              paginatedItems.map((m) => {
                const opening = Number(m.openingStock) || 0;
                const received = Number(m.receivedQty) || 0;
                const used = Number(m.usedQty) || 0;
                const bal =
                  m.balance !== undefined
                    ? Number(m.balance) || 0
                    : Math.round((opening + received - used) * 100) / 100;
                const minLimit = Number(m.minAlertLimit) || 0;
                const isLow = minLimit > 0 && bal < minLimit;

                return (
                  <div key={m.id} className="mat-entry-card">
                    <div className="mat-entry-head">
                      <div className="mat-entry-title-wrap">
                        <h4 className="mat-entry-title">{m.materialName}</h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px] text-slate-400">
                          <span>{m.date}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300">
                            {m.category || 'General'}
                          </span>
                          {isLow ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-700/60">
                              Low (&lt; {minLimit})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-700/50">
                              In Stock
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mat-entry-actions">
                        <button
                          type="button"
                          onClick={() => openEditor(m, 'main')}
                          className="ae-btn-edit text-amber-400 hover:text-amber-300 transition"
                          title="Edit Material"
                        >
                          <i className="fa-solid fa-pen-to-square text-xs ae-icon-polished" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMaterialEntry(m.id)}
                          className="ae-btn-delete text-rose-400 hover:text-rose-300 transition"
                          title="Delete Material"
                        >
                          <i className="fa-solid fa-trash-can text-xs ae-icon-polished" />
                        </button>
                      </div>
                    </div>

                    <div className="mat-stat-strip">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                          Opening
                        </span>
                        <span className="text-xs font-bold text-slate-200">
                          {opening}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                          In (+Rec)
                        </span>
                        <span className="text-xs font-bold text-emerald-400">
                          +{received}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                          Out (-Used)
                        </span>
                        <span className="text-xs font-bold text-amber-400">
                          -{used}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                          Balance
                        </span>
                        <span className="text-xs font-bold text-white">
                          {bal} {m.unit || 'Units'}
                        </span>
                      </div>
                    </div>

                    <div className="mat-entry-footer">
                      <div>
                        Supplier:{' '}
                        <strong className="text-slate-200">
                          {m.supplier || 'N/A'}
                        </strong>
                      </div>
                      {m.note && <p className="mat-entry-note">{m.note}</p>}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            itemLabel="material entries"
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
};
export default MaterialsTab;
