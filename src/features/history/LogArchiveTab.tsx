import React, { useMemo, useState } from 'react';
import { DateInput } from '../../components/common/DateInput';
import { Pagination } from '../../components/common/Pagination';
import { PAGE_SIZES } from '../../constants/defaults';
import { useApp } from '../../context/AppContext';
import { usePagination } from '../../hooks/usePagination';
import { exportSiteLogsExcel } from '../../services/exports';
import { LogReportView } from './LogReportView';

export const LogArchiveTab: React.FC = () => {
  const {
    activeSite,
    logs,
    machinery,
    materials,
    viewingLogId,
    setViewingLogId,
    startEditLog,
    deleteDailyLogEntry,
    showToast,
  } = useApp();

  const [filterDate, setFilterDate] = useState('');

  const totalLabourCount = useMemo(
    () => logs.reduce((sum, l) => sum + (Number(l.totalLabor) || 0), 0),
    [logs]
  );

  const totalPhotoCount = useMemo(
    () =>
      logs.reduce(
        (sum, l) => sum + (Array.isArray(l.images) ? l.images.length : 0),
        0
      ),
    [logs]
  );

  const filteredLogs = useMemo(() => {
    let list = [...logs];
    if (filterDate) {
      list = list.filter((l) => l.date === filterDate);
    }
    list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return list;
  }, [logs, filterDate]);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    paginatedItems,
  } = usePagination(filteredLogs, PAGE_SIZES.HISTORY, [filterDate]);

  if (viewingLogId) {
    return (
      <div id="tab-content-history" className="space-y-6">
        <LogReportView
          logId={viewingLogId}
          onClose={() => {
            setViewingLogId(null);
            window.scrollTo({ top: 0, behavior: 'auto' });
          }}
        />
      </div>
    );
  }

  return (
    <div id="tab-content-history" className="space-y-6">
      <div id="history-main-view" className="space-y-6">
        {/* Hero Header & KPI Overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden">
          <div id="history-hero-header">
            <div id="history-hero-brand">
              <div id="history-hero-badge">
                <i className="fa-solid fa-clock-rotate-left text-amber-400 ae-icon-polished" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-white text-lg sm:text-xl">
                  Site Activity Logs Archive
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Real-Time Cloud synced records for site:{' '}
                  <strong id="history-site-title" className="text-amber-400">
                    {activeSite?.name || '--'}
                  </strong>
                </p>
              </div>
            </div>

            <div id="history-hero-actions">
              <div className="ae-hist-filter-group">
                <label
                  htmlFor="history-filter-date"
                  className="text-xs text-slate-400 whitespace-nowrap font-medium"
                >
                  Filter Date:
                </label>
                <DateInput
                  id="history-filter-date"
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

              <button
                type="button"
                onClick={() =>
                  activeSite &&
                  exportSiteLogsExcel(activeSite, logs, materials, showToast)
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 rounded-xl font-bold shadow-md transition inline-flex items-center gap-1.5"
              >
                <i className="fa-solid fa-file-excel ae-icon-polished" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          <div id="history-kpi-grid">
            <div className="rounded-xl">
              <span className="text-xs text-slate-400 font-medium">
                Total Logs
              </span>
              <div
                id="hist-stat-total-logs"
                className="text-2xl font-bold text-white"
              >
                {logs.length}
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                Recorded Reports
              </span>
            </div>
            <div className="rounded-xl">
              <span className="text-xs text-slate-400 font-medium">
                Workers Logged
              </span>
              <div
                id="hist-stat-total-labour"
                className="text-2xl font-bold text-emerald-400"
              >
                {totalLabourCount}
              </div>
              <span className="text-[10px] text-emerald-400 uppercase tracking-wider">
                Total Manpower
              </span>
            </div>
            <div className="rounded-xl">
              <span className="text-xs text-slate-400 font-medium">
                Machines Logged
              </span>
              <div
                id="hist-stat-total-machinery"
                className="text-2xl font-bold text-cyan-400"
              >
                {machinery.length}
              </div>
              <span className="text-[10px] text-cyan-400 uppercase tracking-wider">
                Equipment Entries
              </span>
            </div>
            <div className="rounded-xl">
              <span className="text-xs text-slate-400 font-medium">
                Site Photos
              </span>
              <div
                id="hist-stat-total-photos"
                className="text-2xl font-bold text-indigo-400"
              >
                {totalPhotoCount}
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                Progress Media
              </span>
            </div>
          </div>
        </div>

        {/* Archived Daily Logs Tracker Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-amber-400 text-sm sm:text-base flex items-center gap-2">
                <i className="fa-solid fa-folder-open text-white ae-icon-polished" />
                Daily Log Tracker
              </h3>
              <p className="text-xs text-slate-400">
                Browse, inspect, edit, or export daily construction site logs
              </p>
            </div>
            <span
              id="history-records-count-label"
              className="text-xs text-slate-400 font-semibold"
            >
              {filteredLogs.length} {filteredLogs.length === 1 ? 'Log' : 'Logs'}{' '}
              Shown
            </span>
          </div>

          <div id="history-records-list">
            {paginatedItems.length === 0 ? (
              <div className="hist-empty-card bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
                <i className="fa-solid fa-folder-open text-4xl mb-3 text-slate-500 ae-icon-polished" />
                <p className="font-medium text-sm">
                  No daily logs found in history.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Add a log from the &quot;Daily Site Log&quot; tab to sync
                  across devices.
                </p>
              </div>
            ) : (
              paginatedItems.map((log) => {
                const machCount = machinery.filter(
                  (m) => m.date === log.date
                ).length;
                const imagesCount = log.images ? log.images.length : 0;
                const dayStoreMaterials = materials.filter(
                  (m) => m.date === log.date
                );
                const matSummary = dayStoreMaterials.length
                  ? dayStoreMaterials
                      .map((m) => {
                        const name = m.materialName || 'Material';
                        const unit = m.unit || '';
                        const rec = Number(m.receivedQty) || 0;
                        const used = Number(m.usedQty) || 0;
                        const parts: string[] = [];
                        if (rec > 0) parts.push(`+${rec} In`);
                        if (used > 0) parts.push(`-${used} Out`);
                        if (parts.length === 0) {
                          parts.push(`Bal: ${m.balance ?? 0}`);
                        }
                        return `${name} (${parts.join(', ')}${
                          unit ? ' ' + unit : ''
                        })`;
                      })
                      .join(', ')
                  : 'None logged';

                return (
                  <div
                    key={log.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl hover:border-slate-700 transition space-y-4"
                  >
                    <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800 pb-2.5">
                      <div className="hist-date-group">
                        <span className="text-base sm:text-lg font-bold text-white">
                          {log.date}
                        </span>
                        <span className="hist-weather-badge text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg font-medium">
                          {log.weather || 'Clear'}
                        </span>
                      </div>
                      <div className="hist-badges">
                        {imagesCount > 0 && (
                          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5">
                            <i className="fa-solid fa-camera ae-icon-polished" />{' '}
                            {imagesCount} Photos
                          </span>
                        )}
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5">
                          <i className="fa-solid fa-users ae-icon-polished" />
                          {log.totalLabor} Workers
                        </span>
                        {machCount > 0 && (
                          <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5">
                            <i className="fa-solid fa-tractor ae-icon-polished" />{' '}
                            {machCount} Machines
                          </span>
                        )}
                        {log.delays && log.delays.length > 0 ? (
                          <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5">
                            <i className="fa-solid fa-triangle-exclamation ae-icon-polished" />
                            {log.delays.length} Delays
                          </span>
                        ) : (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5">
                            <i className="fa-solid fa-circle-check ae-icon-polished" />
                            No Delays
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="hist-stat-strip text-xs text-slate-300">
                      <div className="hist-stat-full">
                        <strong className="text-slate-400 block mb-0.5 text-[11px]">
                          Site Store Materials:
                        </strong>
                        <p className="leading-snug">{matSummary}</p>
                      </div>
                      <div>
                        <strong className="text-slate-400 block mb-0.5 text-[11px]">
                          Work Completed:
                        </strong>
                        <p className="leading-snug">
                          {log.completedTasks && log.completedTasks.length > 0
                            ? log.completedTasks.map((c) => c.task).join(', ')
                            : 'None logged'}
                        </p>
                      </div>
                      <div>
                        <strong className="text-slate-400 block mb-0.5 text-[11px]">
                          Delays / Issues:
                        </strong>
                        <p className="text-rose-300 leading-snug">
                          {log.delays && log.delays.length > 0
                            ? log.delays
                                .map((d) => `${d.task}: ${d.reason || ''}`)
                                .join('; ')
                            : 'None'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-slate-800/80 text-xs mt-auto">
                      <span className="text-slate-500">
                        Prepared by:{' '}
                        <strong className="text-slate-300">
                          {log.supervisor || ''}
                        </strong>
                      </span>

                      <div className="hist-actions flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEditLog(log.id)}
                          className="ae-btn-edit bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg font-medium transition inline-flex items-center gap-1.5"
                        >
                          <i className="fa-solid fa-pen-to-square ae-icon-polished" />
                          Edit Log
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setViewingLogId(log.id);
                            window.scrollTo({ top: 0, behavior: 'auto' });
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 font-medium transition inline-flex items-center gap-1.5"
                        >
                          <i className="fa-solid fa-eye ae-icon-polished" />
                          View Log
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteDailyLogEntry(log.id)}
                          className="ae-btn-delete bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-lg font-medium transition inline-flex items-center gap-1.5"
                          title="Delete Log permanently"
                        >
                          <i className="fa-solid fa-trash-can ae-icon-polished" />
                          Delete Log
                        </button>
                      </div>
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
            itemLabel="logs"
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
};
export default LogArchiveTab;
