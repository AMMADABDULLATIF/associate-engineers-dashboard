import React, { useMemo } from 'react';
import { Pagination } from '../../components/common/Pagination';
import { DEFAULT_TRADES, PAGE_SIZES } from '../../constants/defaults';
import { useApp } from '../../context/AppContext';
import { usePagination } from '../../hooks/usePagination';

export const AnalyticsTab: React.FC = () => {
  const { logs, machinery, materials, showToast } = useApp();

  const summary = useMemo(() => {
    let totalLabor = 0;
    let totalDelays = 0;
    const tradeTotals: Record<string, number> = {};
    const materialTotals: Record<string, { totalQty: number; unit: string }> =
      {};

    DEFAULT_TRADES.forEach((t) => {
      tradeTotals[t.label] = 0;
    });

    logs.forEach((log) => {
      totalLabor += Number(log.totalLabor) || 0;
      if (Array.isArray(log.delays)) {
        totalDelays += log.delays.length;
      }
      if (log.laborBreakdown) {
        Object.entries(log.laborBreakdown).forEach(([tradeName, data]) => {
          const count =
            typeof data === 'object' && data !== null
              ? parseInt(String(data.count), 10) || 0
              : parseInt(String(data), 10) || 0;
          if (tradeTotals[tradeName] === undefined) {
            tradeTotals[tradeName] = 0;
          }
          tradeTotals[tradeName] += count;
        });
      }
    });

    materials.forEach((mat) => {
      const itemName = (mat.materialName || '').trim();
      if (!itemName) return;
      const recQty = Number(mat.receivedQty) || 0;
      if (!materialTotals[itemName]) {
        materialTotals[itemName] = { totalQty: 0, unit: mat.unit || '' };
      }
      materialTotals[itemName].totalQty += recQty;
    });

    const totalMachHours = machinery.reduce(
      (sum, m) => sum + (Number(m.hours) || 0),
      0
    );

    const sortedMaterials = Object.entries(materialTotals).sort(
      (a, b) => b[1].totalQty - a[1].totalQty
    );
    const sortedTrades = Object.entries(tradeTotals).sort(
      (a, b) => b[1] - a[1]
    );

    return {
      totalLogs: logs.length,
      totalLabor,
      totalDelays,
      totalMachHours: Math.round(totalMachHours * 100) / 100,
      sortedMaterials,
      sortedTrades,
    };
  }, [logs, machinery, materials]);

  const materialsPagination = usePagination(
    summary.sortedMaterials,
    PAGE_SIZES.ANALYTICS
  );
  const tradesPagination = usePagination(
    summary.sortedTrades,
    PAGE_SIZES.ANALYTICS
  );

  return (
    <div id="tab-content-analytics" className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
        <div className="flex flex-wrap justify-between items-center border-b border-slate-800 pb-4 gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-amber-400 text-base sm:text-lg flex items-center gap-2">
              <i className="fa-solid fa-chart-pie text-white ae-icon-polished" />
              Site Analytics &amp; Performance Summary
            </h3>
            <p className="text-xs text-slate-400">
              Real-time calculated totals for labour deployment, material
              consumption, and project delays
            </p>
          </div>
          <button
            type="button"
            onClick={() => showToast('Analytics refreshed')}
            className="bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
          >
            <i className="fa-solid fa-arrows-rotate ae-icon-polished" /> Refresh
            Analytics
          </button>
        </div>

        {/* Top Summary Cards Grid */}
        <div id="analytics-kpi-grid">
          <div className="rounded-xl">
            <span className="text-xs text-slate-400 font-medium">
              Total Recorded Logs
            </span>
            <div
              id="stat-total-logs"
              className="text-2xl font-bold text-white"
            >
              {summary.totalLogs}
            </div>
            <span className="text-[10px] text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <i className="fa-solid fa-circle-check ae-icon-polished" /> Synced
              with Cloud
            </span>
          </div>

          <div className="rounded-xl">
            <span className="text-xs text-slate-400 font-medium">
              Total Labour Deployed
            </span>
            <div
              id="stat-total-labour"
              className="text-2xl font-bold text-amber-400"
            >
              {summary.totalLabor}
            </div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
              Cumulative worker count
            </span>
          </div>

          <div className="rounded-xl">
            <span className="text-xs text-slate-400 font-medium">
              Total Delays / Issues
            </span>
            <div
              id="stat-total-delays"
              className="text-2xl font-bold text-rose-400"
            >
              {summary.totalDelays}
            </div>
            <span className="text-[10px] text-rose-300 uppercase tracking-wider">
              Bottlenecks recorded
            </span>
          </div>

          <div className="rounded-xl">
            <span className="text-xs text-slate-400 font-medium">
              Machinery Hours Logged
            </span>
            <div
              id="stat-total-machinery-hrs"
              className="text-2xl font-bold text-indigo-400"
            >
              {summary.totalMachHours} Hrs
            </div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
              Total equipment run time
            </span>
          </div>
        </div>

        {/* Detailed Breakdown Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          <div className="bg-slate-800/50 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-3 min-w-0">
            <h4 className="font-bold text-amber-400 text-sm flex items-center gap-2">
              <i className="fa-solid fa-boxes-stacked text-white ae-icon-polished" />
              Top Consumed Materials Summary
            </h4>
            <div id="analytics-materials-list" className="space-y-2">
              {materialsPagination.paginatedItems.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">
                  No material delivery logs recorded yet.
                </p>
              ) : (
                materialsPagination.paginatedItems.map(([name, data]) => (
                  <div
                    key={name}
                    className="bg-slate-900 border border-slate-700/60 p-2.5 rounded-xl flex justify-between items-center gap-2 text-xs min-w-0"
                  >
                    <span className="font-medium text-white truncate">
                      {name}
                    </span>
                    <span className="text-amber-400 font-bold shrink-0">
                      {data.totalQty} {data.unit}
                    </span>
                  </div>
                ))
              )}
            </div>
            <Pagination
              currentPage={materialsPagination.currentPage}
              totalPages={materialsPagination.totalPages}
              totalItems={materialsPagination.totalItems}
              startIndex={materialsPagination.startIndex}
              endIndex={materialsPagination.endIndex}
              itemLabel="materials"
              onPageChange={materialsPagination.setCurrentPage}
            />
          </div>

          <div className="bg-slate-800/50 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-3 min-w-0">
            <h4 className="font-bold text-amber-400 text-sm flex items-center gap-2">
              <i className="fa-solid fa-users text-white ae-icon-polished" />
              Labour Distribution by Trade
            </h4>
            <div id="analytics-trades-list" className="space-y-2">
              {tradesPagination.paginatedItems.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">
                  No labour counts recorded yet.
                </p>
              ) : (
                tradesPagination.paginatedItems.map(([trade, count]) => (
                  <div
                    key={trade}
                    className="bg-slate-900 border border-slate-700/60 p-2.5 rounded-xl flex justify-between items-center gap-2 text-xs min-w-0"
                  >
                    <span className="font-medium text-white truncate">
                      {trade}
                    </span>
                    <span className="text-amber-400 font-bold shrink-0">
                      {count} Total Workers
                    </span>
                  </div>
                ))
              )}
            </div>
            <Pagination
              currentPage={tradesPagination.currentPage}
              totalPages={tradesPagination.totalPages}
              totalItems={tradesPagination.totalItems}
              startIndex={tradesPagination.startIndex}
              endIndex={tradesPagination.endIndex}
              itemLabel="trades"
              onPageChange={tradesPagination.setCurrentPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
export default AnalyticsTab;
