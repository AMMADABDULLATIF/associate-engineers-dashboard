import React, { useMemo, useState } from 'react';
import { DateInput } from '../../components/common/DateInput';
import { Pagination } from '../../components/common/Pagination';
import { PAGE_SIZES } from '../../constants/defaults';
import { useApp } from '../../context/AppContext';
import { usePagination } from '../../hooks/usePagination';
import type { MachineryRecord } from '../../types';
import { MachineryEditor } from './MachineryEditor';

export const MachineryTab: React.FC = () => {
  const { machinery, deleteMachineryEntry } = useApp();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MachineryRecord | null>(null);
  const [filterDate, setFilterDate] = useState('');

  const filteredMachinery = useMemo(() => {
    let list = [...machinery];
    if (filterDate) {
      list = list.filter((m) => m.date === filterDate);
    }
    list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return list;
  }, [machinery, filterDate]);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    paginatedItems,
  } = usePagination(filteredMachinery, PAGE_SIZES.MACHINERY, [filterDate]);

  if (editorOpen) {
    return (
      <div id="tab-content-machinery" className="space-y-6">
        <MachineryEditor
          entry={editingItem}
          onClose={() => {
            setEditorOpen(false);
            setEditingItem(null);
            window.scrollTo({ top: 0, behavior: 'auto' });
          }}
        />
      </div>
    );
  }

  return (
    <div id="tab-content-machinery" className="space-y-6">
      <div id="machinery-main-view" className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
          <div className="flex flex-wrap justify-between items-center mb-4 border-b border-slate-800 pb-3 gap-2">
            <div>
              <h3 className="font-bold text-amber-400 text-sm sm:text-base flex items-center gap-2">
                <i className="fa-solid fa-tractor text-white ae-icon-polished" />
                Machinery &amp; Heavy Equipment Log
              </h3>
              <p className="text-xs text-slate-400">
                Track working hours and fuel consumption synced live with
                Firebase
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setEditorOpen(true);
                window.scrollTo({ top: 0, behavior: 'auto' });
              }}
              className="ae-btn-add-machinery bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <i className="fa-solid fa-plus text-slate-950 ae-icon-polished" />
              <span>Add Machinery Entry</span>
            </button>
          </div>

          <div id="machinery-filter-bar" className="ae-mach-filter-bar">
            <div className="ae-hist-filter-group">
              <label
                htmlFor="machinery-filter-date"
                className="text-xs text-slate-400 whitespace-nowrap font-medium"
              >
                Filter Date:
              </label>
              <DateInput
                id="machinery-filter-date"
                value={filterDate}
                onChange={setFilterDate}
                wrapClassName="ae-hist-date-wrap"
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 min-w-0 w-full"
              />
            </div>

            <button
              type="button"
              onClick={() => setFilterDate('')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-xl border border-slate-700 font-semibold transition inline-flex items-center gap-1.5"
            >
              <i className="fa-solid fa-rotate-left text-amber-400 ae-icon-polished" />
              <span>Clear</span>
            </button>

            <span className="ae-mach-filter-count text-xs text-slate-400 font-semibold whitespace-nowrap">
              {filteredMachinery.length}{' '}
              {filteredMachinery.length === 1 ? 'Entry' : 'Entries'} Shown
            </span>
          </div>

          <div id="machinery-records-list" className="space-y-3">
            {paginatedItems.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 col-span-full">
                <i className="fa-solid fa-tractor text-4xl mb-3 text-slate-600 ae-icon-polished" />
                <p className="font-medium text-sm">
                  {filterDate
                    ? `No machinery logs found for ${filterDate}.`
                    : 'No machinery logs found.'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {filterDate
                    ? 'Click "Clear" to view all machinery records or add a new entry.'
                    : 'Click "Add Machinery Entry" to track equipment and fuel consumption.'}
                </p>
              </div>
            ) : (
              paginatedItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-wrap justify-between items-center gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {item.name}
                      </span>
                      <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md">
                        {item.date}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 flex flex-wrap gap-3">
                      <span>
                        <strong className="text-amber-400">
                          {item.hours || 0}
                        </strong>{' '}
                        Working Hours
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-amber-400">
                          {item.fuel || 0}
                        </strong>{' '}
                        Liters Fuel
                      </span>
                      {item.remarks && (
                        <>
                          <span>•</span>
                          <span className="text-slate-400">
                            Note: {item.remarks}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(item);
                        setEditorOpen(true);
                        window.scrollTo({ top: 0, behavior: 'auto' });
                      }}
                      className="ae-btn-edit bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1"
                    >
                      <i className="fa-solid fa-pen-to-square ae-icon-polished" />{' '}
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMachineryEntry(item.id)}
                      className="ae-btn-delete bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1"
                    >
                      <i className="fa-solid fa-trash-can ae-icon-polished" />{' '}
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            itemLabel="machinery entries"
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
};
export default MachineryTab;
