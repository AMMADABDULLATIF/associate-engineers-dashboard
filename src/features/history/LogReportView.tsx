import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { downloadLogPDF } from '../../services/exports';

interface LogReportViewProps {
  logId: string;
  onClose: () => void;
}

export const LogReportView: React.FC<LogReportViewProps> = ({
  logId,
  onClose,
}) => {
  const {
    activeSite,
    logs,
    machinery,
    materials,
    openLightbox,
    showToast,
    setPageHeaderOverride,
  } = useApp();

  const log = logs.find((l) => l.id === logId);

  useEffect(() => {
    setPageHeaderOverride({
      crumb: 'LOG ARCHIVE · VIEW LOG',
      title: 'Daily Site Report',
      subtitle: 'Detailed daily construction log, materials, and machinery report.',
    });
    return () => setPageHeaderOverride(null);
  }, [setPageHeaderOverride]);

  if (!log || !activeSite) return null;

  const laborChips: Array<{ trade: string; count: number; shift: string }> = [];
  if (log.laborBreakdown) {
    Object.entries(log.laborBreakdown).forEach(([trade, data]) => {
      const count =
        typeof data === 'object' && data !== null
          ? Number(data.count) || 0
          : Number(data) || 0;
      const shift =
        typeof data === 'object' && data !== null ? data.shift || 'Day' : 'Day';
      if (count > 0) {
        laborChips.push({ trade, count, shift });
      }
    });
  }

  const dayMaterials = materials.filter((m) => m.date === log.date);
  const dayMachinery = machinery.filter((m) => m.date === log.date);
  const completedTasks = Array.isArray(log.completedTasks)
    ? log.completedTasks
    : [];
  const pendingTasks = Array.isArray(log.pendingTasks)
    ? log.pendingTasks
    : [];
  const delays = Array.isArray(log.delays) ? log.delays : [];
  const logImages = Array.isArray(log.images) ? log.images : [];

  return (
    <section
      id="modal-log-detail"
      className="ae-milestone-editor space-y-6 print-card"
      aria-labelledby="modal-site-title"
    >
      <div className="ae-editor-topbar no-print">
        <button type="button" onClick={onClose} className="ae-editor-back">
          <i className="fa-solid fa-arrow-left ae-icon-polished" />
          <span>Back to Log Archive</span>
        </button>
        <span className="ae-editor-kicker">LOG ARCHIVE REPORT</span>
      </div>

      <div className="ae-editor-hero">
        <div className="ae-report-hero-main">
          <div className="ae-editor-icon">
            <i className="fa-solid fa-clipboard-check ae-icon-polished" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="ae-editor-eyebrow">ASSOCIATE ENGINEERS · SITE REPORT</p>
            <h2 id="modal-site-title">{activeSite.name}</h2>
            <p className="ae-editor-description">
              Daily construction site activity, materials &amp; machinery report
            </p>
          </div>
        </div>

        <div className="ae-report-hero-meta">
          <span id="modal-log-date" className="ae-report-date-pill">
            {log.date}
          </span>
          <p id="modal-log-weather" className="text-xs text-slate-300 m-0">
            Weather: {log.weather || 'Clear'}
          </p>
        </div>
      </div>

      <div className="ae-editor-form">
        <div id="modal-detail-content" className="text-xs text-slate-200">
          <div className="ae-report-grid">
            {/* 01 Labour Deployment */}
            <div className="ae-report-section ae-report-full">
              <div className="ae-report-section-head">
                <div className="ae-report-section-title">
                  <span>01</span>
                  <div>
                    <h3>Labour Deployment Summary</h3>
                    <p>Workforce trades and shifts recorded for this date</p>
                  </div>
                </div>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-lg text-xs font-bold">
                  Total: {log.totalLabor} Workers
                </span>
              </div>
              <div className="ae-labor-grid">
                {laborChips.length === 0 ? (
                  <span className="text-slate-400 text-xs">
                    No labor counted
                  </span>
                ) : (
                  laborChips.map((item) => (
                    <span key={item.trade} className="ae-labor-chip">
                      <span className="ae-labor-name">
                        {item.trade} <small>({item.shift})</small>
                      </span>
                      <strong>{item.count}</strong>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* 02 Site Store & Materials */}
            <div className="ae-report-section ae-report-full">
              <div className="ae-report-section-head">
                <div className="ae-report-section-title">
                  <span>02</span>
                  <div>
                    <h3>Site Store &amp; Materials (Log Date: {log.date})</h3>
                    <p>
                      Logged date material deliveries, consumption, and stock
                      status
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  {dayMaterials.length} Material{' '}
                  {dayMaterials.length === 1 ? 'Entry' : 'Entries'}
                </span>
              </div>
              {dayMaterials.length === 0 ? (
                <p className="text-slate-400 text-xs italic py-1">
                  No materials logged for this date.
                </p>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-xs text-left min-w-[680px]">
                    <thead>
                      <tr>
                        <th>Material Name</th>
                        <th>Category</th>
                        <th className="text-right">Opening</th>
                        <th className="text-right text-emerald-400">
                          Received (+In)
                        </th>
                        <th className="text-right text-amber-400">
                          Used (-Out)
                        </th>
                        <th className="text-right font-bold">Balance</th>
                        <th className="text-center">Unit</th>
                        <th>Supplier / Note</th>
                        <th className="text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayMaterials.map((m) => {
                        const isLow =
                          (Number(m.minAlertLimit) || 0) > 0 &&
                          (Number(m.balance) || 0) <
                            (Number(m.minAlertLimit) || 0);
                        const supplierNote =
                          [m.supplier, m.note].filter(Boolean).join(' — ') ||
                          '-';
                        return (
                          <tr key={m.id}>
                            <td className="font-semibold text-white">
                              {m.materialName || ''}
                            </td>
                            <td className="whitespace-nowrap">
                              <span className="ae-cat-tag">
                                {m.category || 'General'}
                              </span>
                            </td>
                            <td className="text-right text-slate-400">
                              {m.openingStock ?? 0}
                            </td>
                            <td className="text-right text-emerald-400 font-medium">
                              +{m.receivedQty ?? 0}
                            </td>
                            <td className="text-right text-amber-400 font-medium">
                              -{m.usedQty ?? 0}
                            </td>
                            <td
                              className={`text-right font-bold ${
                                isLow ? 'text-rose-400' : 'text-amber-400'
                              }`}
                            >
                              {m.balance ?? 0}
                            </td>
                            <td className="text-center text-slate-400">
                              {m.unit || 'Units'}
                            </td>
                            <td className="text-slate-300">{supplierNote}</td>
                            <td className="text-center">
                              {isLow ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800/80 inline-flex items-center justify-center gap-1 whitespace-nowrap">
                                  <i className="fa-solid fa-triangle-exclamation text-rose-400 ae-icon-polished" />{' '}
                                  Low Stock
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 inline-flex items-center justify-center gap-1 whitespace-nowrap">
                                  <i className="fa-solid fa-circle-check text-emerald-400 ae-icon-polished" />{' '}
                                  In Stock
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 03 Machinery & Heavy Equipment */}
            <div className="ae-report-section ae-report-full">
              <div className="ae-report-section-head">
                <div className="ae-report-section-title">
                  <span>03</span>
                  <div>
                    <h3>
                      Machinery &amp; Heavy Equipment Log ({dayMachinery.length})
                    </h3>
                    <p>Equipment run-hours, fuel consumed, and operator remarks</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {dayMachinery.length === 0 ? (
                  <p className="text-slate-400 text-xs italic">
                    No machinery logged for this date.
                  </p>
                ) : (
                  dayMachinery.map((mach) => (
                    <div key={mach.id} className="ae-report-mach-card">
                      <div>
                        <strong className="text-white text-xs">
                          {mach.name || ''}
                        </strong>
                        {mach.remarks && (
                          <span className="text-slate-400 text-[11px] block mt-0.5">
                            Operator/Note: {mach.remarks}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5 text-amber-400 font-semibold text-xs">
                        <span>{mach.hours || 0} Hrs</span>
                        <span>•</span>
                        <span>{mach.fuel || 0} Ltr Fuel</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 04 Work Completed */}
            <div className="ae-report-section">
              <div className="ae-report-section-head">
                <div className="ae-report-section-title">
                  <span>04</span>
                  <div>
                    <h3>Work Completed Today</h3>
                    <p>Executed tasks and site zones</p>
                  </div>
                </div>
              </div>
              {completedTasks.length === 0 ? (
                <p className="text-slate-400 text-xs italic">
                  No completed tasks logged.
                </p>
              ) : (
                <div className="space-y-2">
                  {completedTasks.map((c, idx) => (
                    <div
                      key={idx}
                      className="ae-report-subcard text-slate-200 text-xs"
                    >
                      <strong>{c.task || ''}</strong>
                      {c.location && (
                        <span className="text-slate-400 block mt-0.5">
                          Zone: {c.location}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 05 Remaining / Pending Work */}
            <div className="ae-report-section">
              <div className="ae-report-section-head">
                <div className="ae-report-section-title">
                  <span>05</span>
                  <div>
                    <h3>Remaining / Pending Work</h3>
                    <p>Scheduled follow-up items &amp; target dates</p>
                  </div>
                </div>
              </div>
              {pendingTasks.length === 0 ? (
                <p className="text-slate-400 text-xs italic">
                  No pending work logged.
                </p>
              ) : (
                <div className="space-y-2">
                  {pendingTasks.map((p, idx) => (
                    <div
                      key={idx}
                      className="ae-report-subcard text-slate-200 text-xs"
                    >
                      <strong>{p.task || ''}</strong>
                      {p.targetDate && (
                        <span className="text-slate-400 block mt-0.5">
                          Target Date: {p.targetDate}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 06 Delays & Reasons Analysis */}
            <div className="ae-report-section ae-report-full">
              <div className="ae-report-section-head">
                <div className="ae-report-section-title">
                  <span>06</span>
                  <div>
                    <h3>Delays &amp; Reasons Analysis</h3>
                    <p>
                      Schedule blockers and root causes documented for this
                      shift
                    </p>
                  </div>
                </div>
              </div>
              {delays.length === 0 ? (
                <p className="text-slate-400 text-xs italic">
                  No work delays reported today.
                </p>
              ) : (
                <div className="space-y-2">
                  {delays.map((d, idx) => (
                    <div key={idx} className="ae-report-delay-card text-xs">
                      <div className="font-semibold text-rose-300">
                        Scheduled Work: {d.task || ''}
                      </div>
                      <div className="text-slate-400 mt-1">
                        <strong>Reason for Delay:</strong> {d.reason || ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 07 Site Progress Photos */}
            {logImages.length > 0 && (
              <div className="ae-report-section ae-report-full">
                <div className="ae-report-section-head">
                  <div className="ae-report-section-title">
                    <span>07</span>
                    <div>
                      <h3>Site Progress Photos ({logImages.length})</h3>
                      <p>Click any photo thumbnail to inspect in full screen</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {logImages.map((src, imgIdx) => (
                    <img
                      key={imgIdx}
                      src={src}
                      alt={`Site progress photo ${imgIdx + 1}`}
                      className="w-20 h-20 object-cover rounded-xl border border-slate-700 cursor-zoom-in hover:opacity-85 transition"
                      onClick={() => openLightbox(logImages, imgIdx)}
                      title="Click to preview photo"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="ae-editor-footer no-print">
          <p>
            <i className="fa-solid fa-user-check ae-icon-polished" />
            <span id="modal-log-author">
              Prepared by Supervisor: {log.supervisor || ''}
            </span>
          </p>
          <div className="ae-editor-actions">
            <button type="button" onClick={onClose} className="ae-editor-cancel">
              Close
            </button>
            <button
              type="button"
              onClick={() =>
                downloadLogPDF(log, activeSite, materials, machinery, showToast)
              }
              className="ae-editor-save"
              title="Download complete PDF with Daily Log, Materials, and Machinery Log"
            >
              <i className="fa-solid fa-file-pdf ae-icon-polished" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
