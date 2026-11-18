import React, { useMemo, useState } from 'react';
import { DateInput } from '../../components/common/DateInput';
import { Pagination } from '../../components/common/Pagination';
import { PAGE_SIZES, SITE_STORAGE_CATEGORIES } from '../../constants/defaults';
import { useApp } from '../../context/AppContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import type { MaterialEntry } from '../../types';

interface BalanceSheetScreenProps {
  onBack: () => void;
  onAddNew: () => void;
  onEdit: (entry: MaterialEntry) => void;
}

export const BalanceSheetScreen: React.FC<BalanceSheetScreenProps> = ({
  onBack,
  onAddNew,
  onEdit,
}) => {
  const { materials, activeSite, deleteMaterialEntry } = useApp();

  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');

  const debouncedSearch = useDebounce(search, 180);

  const suppliers = useMemo(() => {
    const set = new Set<string>();
    materials.forEach((m) => {
      if (m.supplier && m.supplier.trim()) {
        set.add(m.supplier.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [materials]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return materials.filter((m) => {
      if (dateFilter && m.date !== dateFilter) return false;
      if (categoryFilter && (m.category || '') !== categoryFilter) return false;
      if (supplierFilter && (m.supplier || '') !== supplierFilter) return false;
      if (q) {
        const hay = `${m.materialName || ''} ${m.category || ''} ${
          m.supplier || ''
        } ${m.note || ''} ${m.unit || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [materials, debouncedSearch, dateFilter, categoryFilter, supplierFilter]);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    paginatedItems,
  } = usePagination(filtered, PAGE_SIZES.BALANCE_SHEET, [
    debouncedSearch,
    dateFilter,
    categoryFilter,
    supplierFilter,
  ]);

  const clearFilters = () => {
    setSearch('');
    setDateFilter('');
    setCategoryFilter('');
    setSupplierFilter('');
  };

  return (
    <section
      id="material-balance-screen"
      className="ae-milestone-editor space-y-6"
      aria-labelledby="balance-sheet-title"
    >
      <div className="ae-editor-topbar">
        <button type="button" onClick={onBack} className="ae-editor-back">
          <i className="fa-solid fa-arrow-left ae-icon-polished" />
          <span>Back to Site Store</span>
        </button>
        <button type="button" onClick={onAddNew} className="ae-editor-save">
          <i className="fa-solid fa-plus ae-icon-polished" />
          <span>Add Material</span>
        </button>
      </div>

      <div className="ae-editor-hero">
        <div className="ae-editor-icon">
          <i className="fa-solid fa-table-list ae-icon-polished" />
        </div>
        <div>
          <p className="ae-editor-eyebrow">SITE STORE LEDGER</p>
          <h2 id="balance-sheet-title">Balance Sheet</h2>
          <p
            className="ae-editor-description"
            id="balance-sheet-site-subtitle"
          >
            {activeSite
              ? `Comprehensive ledger of material inwards, consumption, and store balances for ${activeSite.name}.`
              : 'Comprehensive ledger of material inwards, consumption, and store balances.'}
          </p>
        </div>
      </div>

      <div className="ae-editor-form space-y-5">
        {/* Responsive Filter & Search Toolbar */}
        <div className="ae-bs-toolbar">
          <div className="ae-bs-filters">
            <div className="ae-search-wrap">
              <i className="fa-solid fa-magnifying-glass ae-icon-polished" />
              <input
                type="text"
                id="bs-search-input"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ae-search-input"
              />
            </div>

            <DateInput
              id="bs-filter-date"
              value={dateFilter}
              onChange={setDateFilter}
              placeholder="mm/dd/yyyy"
              title="Filter by date"
            />

            <select
              id="bs-filter-category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {SITE_STORAGE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              id="bs-filter-supplier"
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
            >
              <option value="">All Suppliers</option>
              {suppliers.map((sup) => (
                <option key={sup} value={sup}>
                  {sup}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition inline-flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <i className="fa-solid fa-rotate-left ae-icon-polished" />
            <span>Clear Filters</span>
          </button>
        </div>

        {paginatedItems.length === 0 ? (
          <div
            id="bs-empty-state"
            className="py-12 text-center text-slate-500"
          >
            <i className="fa-solid fa-table-list text-3xl mb-2 block ae-icon-polished" />
            <p className="text-xs font-medium">
              No material ledger records match your search or filter.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="ae-bs-desktop-table custom-scrollbar">
              <table className="w-full text-xs text-left min-w-[780px]">
                <thead className="bg-slate-800 text-slate-300 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Material Name</th>
                    <th className="p-3 text-right">Opening Qty</th>
                    <th className="p-3 text-right text-emerald-400">
                      Received (+In)
                    </th>
                    <th className="p-3 text-right text-amber-400">
                      Used (-Out)
                    </th>
                    <th className="p-3 text-right font-bold text-slate-100">
                      Total Balance
                    </th>
                    <th className="p-3 text-center">Unit</th>
                    <th className="p-3">Supplier</th>
                    <th className="p-3 text-center">Alert</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody
                  id="bs-tbody"
                  className="divide-y divide-slate-800 text-slate-200"
                >
                  {paginatedItems.map((m) => {
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
                      <tr key={m.id}>
                        <td className="p-3 whitespace-nowrap">{m.date}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]">
                            {m.category || 'General'}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-white">
                          <div>{m.materialName}</div>
                          {m.note && (
                            <div className="text-[10px] text-slate-400 italic font-normal mt-0.5">
                              {m.note}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">{opening}</td>
                        <td className="p-3 text-right text-emerald-400 font-semibold">
                          +{received}
                        </td>
                        <td className="p-3 text-right text-amber-400 font-semibold">
                          -{used}
                        </td>
                        <td className="p-3 text-right font-bold text-white">
                          {bal}
                        </td>
                        <td className="p-3 text-center">{m.unit || 'Units'}</td>
                        <td className="p-3">{m.supplier || '—'}</td>
                        <td className="p-3 text-center">
                          {isLow ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-700/60 whitespace-nowrap">
                              Low (&lt; {minLimit})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-700/50 whitespace-nowrap">
                              In Stock
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onEdit(m)}
                              className="ae-btn-edit p-1.5 rounded text-amber-400 hover:text-amber-300 transition"
                              title="Edit Material"
                            >
                              <i className="fa-solid fa-pen-to-square text-xs ae-icon-polished" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteMaterialEntry(m.id)}
                              className="ae-btn-delete p-1.5 rounded text-rose-400 hover:text-rose-300 transition"
                              title="Delete Material"
                            >
                              <i className="fa-solid fa-trash-can text-xs ae-icon-polished" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Card View */}
            <div id="bs-mobile-cards" className="ae-bs-mobile-cards">
              {paginatedItems.map((m) => {
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
                  <div
                    key={m.id}
                    className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-3"
                  >
                    <div className="mat-entry-head">
                      <div className="mat-entry-title-wrap">
                        <h4 className="bs-card-title">{m.materialName}</h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-400">
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
                          onClick={() => onEdit(m)}
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
              })}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              startIndex={startIndex}
              endIndex={endIndex}
              itemLabel="ledger entries"
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </section>
  );
};
