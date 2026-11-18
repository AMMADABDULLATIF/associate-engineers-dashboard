import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_TRADES, WEATHER_OPTIONS } from '../../constants/defaults';
import { useApp } from '../../context/AppContext';
import { compressImageFile } from '../../services/imageUtils';
import {
  clearDailyDraft,
  getDailyDraft,
  getLocalTodayDate,
  saveDailyDraft,
} from '../../services/storage';
import type {
  CompletedTaskRow,
  DelayTaskRow,
  LaborTradeDefinition,
  PendingTaskRow,
} from '../../types';

export const DailyLogTab: React.FC = () => {
  const {
    activeSite,
    currentUser,
    logs,
    machinery,
    editingLogId,
    setEditingLogId,
    switchTab,
    saveDailyLogEntry,
    showToast,
    openLightbox,
    setFormDirty,
    adjustImageReads,
  } = useApp();

  const [date, setDate] = useState<string>(() => getLocalTodayDate());
  const [weather, setWeather] = useState<string>('Sunny / Clear');
  const [trades, setTrades] = useState<LaborTradeDefinition[]>(() => [
    ...DEFAULT_TRADES,
  ]);
  const [laborValues, setLaborValues] = useState<
    Record<string, { count: number | string; shift: string }>
  >({});
  const [newTradeInput, setNewTradeInput] = useState('');
  const [completedTasks, setCompletedTasks] = useState<CompletedTaskRow[]>([
    { task: '', location: '' },
  ]);
  const [pendingTasks, setPendingTasks] = useState<PendingTaskRow[]>([
    { task: '', targetDate: '' },
  ]);
  const [delays, setDelays] = useState<DelayTaskRow[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draftTimerRef = useRef<number | null>(null);
  const initializedSiteRef = useRef<string | null>(null);

  const totalLabor = useMemo(() => {
    return trades.reduce((sum, t) => {
      const val = laborValues[t.label]?.count;
      return sum + (parseInt(String(val ?? 0), 10) || 0);
    }, 0);
  }, [trades, laborValues]);

  const existingLogForDate = useMemo(() => {
    if (!date) return undefined;
    return logs.find((l) => l.date === date);
  }, [logs, date]);

  const resetFormFresh = useCallback(() => {
    if (activeSite) clearDailyDraft(activeSite.id);
    setEditingLogId(null);
    setDate(getLocalTodayDate());
    setWeather('Sunny / Clear');
    setTrades([...DEFAULT_TRADES]);
    setLaborValues({});
    setNewTradeInput('');
    setCompletedTasks([{ task: '', location: '' }]);
    setPendingTasks([{ task: '', targetDate: '' }]);
    setDelays([]);
    setImages([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFormDirty('daily-log-form', false);
  }, [activeSite, setEditingLogId, setFormDirty]);

  // Restore draft on first mount for activeSite
  useEffect(() => {
    if (!activeSite) return;
    if (initializedSiteRef.current === activeSite.id) return;
    initializedSiteRef.current = activeSite.id;

    if (editingLogId) return;
    const draft = getDailyDraft(activeSite.id);
    if (draft) {
      if (draft.editingLogId) setEditingLogId(draft.editingLogId);
      setDate(draft.date || getLocalTodayDate());
      setWeather(draft.weather || 'Sunny / Clear');
      if (
        Array.isArray(draft.currentLaborTrades) &&
        draft.currentLaborTrades.length > 0
      ) {
        setTrades(draft.currentLaborTrades);
      }
      setLaborValues(draft.laborCounts || {});
      setCompletedTasks(
        draft.completedTasks?.length
          ? draft.completedTasks
          : [{ task: '', location: '' }]
      );
      setPendingTasks(
        draft.pendingTasks?.length
          ? draft.pendingTasks
          : [{ task: '', targetDate: '' }]
      );
      setDelays(draft.delays || []);
      setImages(draft.images || []);
    }
  }, [activeSite, editingLogId, setEditingLogId]);

  // Populate form when editingLogId is set from Log Archive
  useEffect(() => {
    if (!editingLogId) return;
    const log = logs.find((l) => l.id === editingLogId);
    if (!log) return;

    setDate(log.date || getLocalTodayDate());
    setWeather(log.weather || 'Sunny / Clear');

    const nextTrades = [...DEFAULT_TRADES];
    const nextValues: Record<string, { count: number | string; shift: string }> =
      {};
    if (log.laborBreakdown) {
      Object.entries(log.laborBreakdown).forEach(([label, d]) => {
        if (!nextTrades.some((t) => t.label === label)) {
          nextTrades.push({
            id: 'trade_' + Date.now() + Math.random().toString(36).slice(2, 6),
            label,
          });
        }
        if (typeof d === 'object' && d !== null) {
          nextValues[label] = {
            count: d.count !== undefined ? d.count : 0,
            shift: d.shift || 'Day',
          };
        } else {
          nextValues[label] = { count: Number(d) || 0, shift: 'Day' };
        }
      });
    }
    setTrades(nextTrades);
    setLaborValues(nextValues);

    setCompletedTasks(
      log.completedTasks && log.completedTasks.length > 0
        ? log.completedTasks.map((c) => ({
            task: c.task || '',
            location: c.location || '',
          }))
        : [{ task: '', location: '' }]
    );
    setPendingTasks(
      log.pendingTasks && log.pendingTasks.length > 0
        ? log.pendingTasks.map((p) => ({
            task: p.task || '',
            targetDate: p.targetDate || '',
          }))
        : [{ task: '', targetDate: '' }]
    );
    setDelays(
      log.delays && log.delays.length > 0
        ? log.delays.map((d) => ({
            task: d.task || '',
            reason: d.reason || '',
          }))
        : []
    );
    setImages(log.images ? [...log.images] : []);
  }, [editingLogId, logs]);

  const flushDraftSave = useCallback(() => {
    if (!activeSite) return;
    const laborCounts: Record<string, { count: number; shift: string }> = {};
    trades.forEach((trade) => {
      const entry = laborValues[trade.label];
      laborCounts[trade.label] = {
        count: parseInt(String(entry?.count ?? 0), 10) || 0,
        shift: entry?.shift || 'Day',
      };
    });

    const hasContent =
      Boolean(editingLogId) ||
      totalLabor > 0 ||
      images.length > 0 ||
      completedTasks.some((c) => c.task.trim()) ||
      pendingTasks.some((p) => p.task.trim()) ||
      delays.some((d) => d.task.trim() || (d.reason || '').trim());

    setFormDirty('daily-log-form', hasContent);

    saveDailyDraft(activeSite.id, {
      editingLogId: editingLogId || null,
      date,
      weather,
      supervisor: currentUser || '',
      currentLaborTrades: trades,
      laborCounts,
      totalLabor,
      completedTasks: completedTasks
        .map((c) => ({ task: c.task.trim(), location: (c.location || '').trim() }))
        .filter((c) => c.task),
      pendingTasks: pendingTasks
        .map((p) => ({ task: p.task.trim(), targetDate: p.targetDate || '' }))
        .filter((p) => p.task),
      delays: delays
        .map((d) => ({ task: d.task.trim(), reason: (d.reason || '').trim() }))
        .filter((d) => d.task || d.reason),
      images,
      savedAt: Date.now(),
    });
  }, [
    activeSite,
    completedTasks,
    currentUser,
    date,
    delays,
    editingLogId,
    images,
    laborValues,
    pendingTasks,
    setFormDirty,
    totalLabor,
    trades,
    weather,
  ]);

  // Debounced auto-draft save whenever form state changes
  useEffect(() => {
    if (!activeSite) return;
    if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
    draftTimerRef.current = window.setTimeout(() => {
      flushDraftSave();
    }, 200);
    return () => {
      if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
    };
  }, [activeSite, flushDraftSave]);

  // Android low-memory gallery pickup resilience via visibilitychange
  useEffect(() => {
    const onVisChange = () => {
      if (!activeSite) return;
      if (document.visibilityState === 'hidden') {
        flushDraftSave();
      } else if (document.visibilityState === 'visible') {
        if (totalLabor === 0 && images.length === 0) {
          const draft = getDailyDraft(activeSite.id);
          if (draft && (draft.totalLabor > 0 || draft.images?.length > 0)) {
            setDate(draft.date || getLocalTodayDate());
            setWeather(draft.weather || 'Sunny / Clear');
            if (draft.currentLaborTrades?.length) {
              setTrades(draft.currentLaborTrades);
            }
            setLaborValues(draft.laborCounts || {});
            setImages(draft.images || []);
          }
        }
      }
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => document.removeEventListener('visibilitychange', onVisChange);
  }, [activeSite, flushDraftSave, images.length, totalLabor]);

  const handleAddCustomTrade = () => {
    const val = newTradeInput.trim();
    if (!val) return;
    if (trades.some((t) => t.label.toLowerCase() === val.toLowerCase())) {
      showToast('Trade category already exists!');
      return;
    }
    setTrades((prev) => [...prev, { id: 'trade_' + Date.now(), label: val }]);
    setNewTradeInput('');
    showToast(`Trade "${val}" added successfully!`);
  };

  const handleRemoveTrade = (trade: LaborTradeDefinition) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the "${trade.label}" trade category from this form?`
    );
    if (!confirmed) return;
    setTrades((prev) => prev.filter((t) => t.id !== trade.id));
    setLaborValues((prev) => {
      const next = { ...prev };
      delete next[trade.label];
      return next;
    });
    showToast(`Trade "${trade.label}" removed successfully.`);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;

    flushDraftSave();
    adjustImageReads(1);
    showToast(
      files.length === 1
        ? 'Optimizing site photo...'
        : `Optimizing ${files.length} site photos...`
    );

    try {
      for (let i = 0; i < files.length; i++) {
        try {
          const compressed = await compressImageFile(files[i], 1280, 1280, 0.75);
          if (compressed) {
            setImages((prev) => [...prev, compressed]);
          }
        } catch (err) {
          console.error('Photo compression error:', err);
        }
      }
    } finally {
      adjustImageReads(-1);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    const confirmed = window.confirm(
      'Are you sure you want to remove this site photo?'
    );
    if (!confirmed) return;
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCancelEdit = () => {
    resetFormFresh();
    showToast('Edit cancelled.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSite) return;

    if (!editingLogId && existingLogForDate) {
      showToast(
        `Log already exists for ${date}! Please edit it from History.`
      );
      return;
    }

    const laborBreakdown: Record<string, { count: number; shift: string }> = {};
    trades.forEach((trade) => {
      const entry = laborValues[trade.label];
      laborBreakdown[trade.label] = {
        count: parseInt(String(entry?.count ?? 0), 10) || 0,
        shift: entry?.shift || 'Day',
      };
    });

    const cleanCompleted = completedTasks
      .map((c) => ({
        task: c.task.trim(),
        location: (c.location || '').trim(),
      }))
      .filter((c) => c.task);

    const cleanPending = pendingTasks
      .map((p) => ({
        task: p.task.trim(),
        targetDate: p.targetDate || '',
      }))
      .filter((p) => p.task);

    const cleanDelays = delays
      .map((d) => ({
        task: d.task.trim(),
        reason: (d.reason || '').trim(),
      }))
      .filter((d) => d.task);

    const dayMachineryLogs = machinery.filter((m) => m.date === date);
    const isNewLog = !editingLogId;
    const docId = editingLogId || existingLogForDate?.id || 'log_' + date;

    saveDailyLogEntry(
      docId,
      {
        date,
        weather,
        supervisor: currentUser || '',
        totalLabor,
        laborBreakdown,
        completedTasks: cleanCompleted,
        pendingTasks: cleanPending,
        delays: cleanDelays,
        machineryLogs: dayMachineryLogs,
        images,
        updatedAt: new Date().toISOString(),
      },
      isNewLog
    );

    resetFormFresh();
  };

  return (
    <div id="tab-content-entry" className="space-y-6">
      <form id="daily-log-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Metadata Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h3 className="font-bold text-amber-400 text-sm sm:text-base flex items-center gap-2">
              <i className="fa-solid fa-calendar-day text-white ae-icon-polished" />
              Basic Site Information
            </h3>
            <span
              id="form-mode-badge"
              className={
                editingLogId
                  ? 'text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-md font-bold'
                  : 'text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-md'
              }
            >
              {editingLogId ? 'Editing Mode' : 'New Entry Mode'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="log-date"
                className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1"
              >
                <i className="fa-solid fa-calendar text-amber-400 ae-icon-polished" />
                Select Date *
              </label>
              <input
                type="date"
                id="log-date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label
                htmlFor="log-weather"
                className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1"
              >
                <i className="fa-solid fa-cloud-sun text-amber-400 ae-icon-polished" />
                Weather Condition
              </label>
              <select
                id="log-weather"
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              >
                {WEATHER_OPTIONS.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="log-supervisor"
                className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1"
              >
                <i className="fa-solid fa-user-check text-amber-400 ae-icon-polished" />
                Log Prepared By
              </label>
              <input
                type="text"
                id="log-supervisor"
                readOnly
                value={currentUser || ''}
                className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-slate-400 text-sm cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Labour Count Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
          <div className="flex flex-wrap justify-between items-center mb-4 border-b border-slate-800 pb-3 gap-2">
            <div>
              <h3 className="font-bold text-amber-400 text-sm sm:text-base flex items-center gap-2">
                <i className="fa-solid fa-users-gear text-white ae-icon-polished" />
                Daily Labour Count Breakdown &amp; Shift
              </h3>
              <p className="text-xs text-slate-400">
                Enter quantity and select shift (Day/Night) for each trade
              </p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl text-amber-400 text-xs font-bold flex items-center gap-2">
              <span>TOTAL LABOUR:</span>
              <span
                id="total-labour-badge"
                className="text-sm text-white font-extrabold"
              >
                {totalLabor}
              </span>
            </div>
          </div>

          <div
            id="labour-fields-container"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {trades.map((trade) => {
              const entry = laborValues[trade.label] || {
                count: 0,
                shift: 'Day',
              };
              return (
                <div
                  key={trade.id}
                  className="bg-slate-800/80 border border-slate-700/80 p-2.5 rounded-xl flex flex-col justify-between relative group"
                >
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-semibold text-slate-300 truncate pr-6">
                      {trade.label}
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveTrade(trade)}
                      className="ae-btn-delete absolute top-2 right-2 text-rose-400 hover:text-rose-300 text-xs transition"
                      title="Delete Trade Category"
                      aria-label={`Delete ${trade.label}`}
                    >
                      <i className="fa-solid fa-trash-can ae-icon-polished" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      placeholder="Qty"
                      value={entry.count}
                      onChange={(e) =>
                        setLaborValues((prev) => ({
                          ...prev,
                          [trade.label]: {
                            count: e.target.value,
                            shift: prev[trade.label]?.shift || 'Day',
                          },
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-bold text-sm focus:outline-none focus:border-amber-500"
                    />
                    <select
                      value={entry.shift}
                      onChange={(e) =>
                        setLaborValues((prev) => ({
                          ...prev,
                          [trade.label]: {
                            count: prev[trade.label]?.count ?? 0,
                            shift: e.target.value,
                          },
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="Day">Day Shift</option>
                      <option value="Night">Night Shift</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
            <input
              type="text"
              id="new-trade-input"
              value={newTradeInput}
              onChange={(e) => setNewTradeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomTrade();
                }
              }}
              placeholder="Add custom trade (e.g. Scaffolder)"
              className="flex-grow bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={handleAddCustomTrade}
              className="bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs px-3 py-2 rounded-lg font-medium transition flex items-center gap-1"
            >
              <i className="fa-solid fa-plus text-white ae-icon-polished" />
              Add Trade Category
            </button>
          </div>
        </div>

        {/* Work Progress Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Work Completed Today */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-emerald-400 text-sm sm:text-base flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-white ae-icon-polished" />
                  Work Completed Today
                  <span className="text-[10px] text-slate-400 font-normal">
                    (Optional)
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Completed tasks today</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCompletedTasks((prev) => [
                    ...prev,
                    { task: '', location: '' },
                  ])
                }
                className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1"
              >
                <i className="fa-solid fa-plus text-white ae-icon-polished" />
                Add Task
              </button>
            </div>

            <div id="completed-tasks-container" className="space-y-2.5">
              {completedTasks.map((row, idx) => (
                <div
                  key={idx}
                  className="completed-row flex flex-wrap sm:flex-nowrap items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Work task description..."
                    value={row.task}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCompletedTasks((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, task: val } : item
                        )
                      );
                    }}
                    className="comp-task min-w-0 w-full sm:w-auto sm:flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="Zone / Location"
                    value={row.location || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCompletedTasks((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, location: val } : item
                        )
                      );
                    }}
                    className="comp-loc min-w-0 flex-1 sm:flex-none sm:w-1/3 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setCompletedTasks((prev) =>
                        prev.filter((_, i) => i !== idx)
                      )
                    }
                    className="ae-btn-delete shrink-0 text-rose-400 hover:text-rose-300 p-1.5 rounded transition"
                    aria-label="Remove task row"
                  >
                    <i className="fa-solid fa-trash-can ae-icon-polished" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Remaining Work / Pending Tasks */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-amber-400 text-sm sm:text-base flex items-center gap-2">
                  <i className="fa-solid fa-spinner text-white ae-icon-polished" />
                  Remaining Work / Pending Tasks
                </h3>
                <p className="text-xs text-slate-400">
                  Tasks in progress or remaining
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setPendingTasks((prev) => [
                    ...prev,
                    { task: '', targetDate: '' },
                  ])
                }
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-xs px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1"
              >
                <i className="fa-solid fa-plus text-white ae-icon-polished" />
                Add Task
              </button>
            </div>

            <div id="pending-tasks-container" className="space-y-2.5">
              {pendingTasks.map((row, idx) => (
                <div
                  key={idx}
                  className="pending-row flex flex-wrap sm:flex-nowrap items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Pending work description..."
                    value={row.task}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPendingTasks((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, task: val } : item
                        )
                      );
                    }}
                    className="pend-task min-w-0 w-full sm:w-auto sm:flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="date"
                    value={row.targetDate || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPendingTasks((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, targetDate: val } : item
                        )
                      );
                    }}
                    className="pend-target min-w-0 flex-1 sm:flex-none sm:w-auto bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPendingTasks((prev) =>
                        prev.filter((_, i) => i !== idx)
                      )
                    }
                    className="ae-btn-delete shrink-0 text-rose-400 hover:text-rose-300 p-1.5 rounded transition"
                    aria-label="Remove pending task"
                  >
                    <i className="fa-solid fa-trash-can ae-icon-polished" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Delays & Issues Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
          <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-rose-400 text-sm sm:text-base flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation text-white ae-icon-polished" />
                Delays &amp; Issues (Delay Reasons)
              </h3>
              <p className="text-xs text-slate-400">
                Delayed scheduled work and specific reasons
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setDelays((prev) => [...prev, { task: '', reason: '' }])
              }
              className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1"
            >
              <i className="fa-solid fa-plus text-white ae-icon-polished" />
              Log Delay / Issue
            </button>
          </div>

          <div id="delay-tasks-container" className="space-y-3">
            {delays.map((row, idx) => (
              <div
                key={idx}
                className="delay-row bg-slate-800/80 border border-slate-700/80 p-3 rounded-xl space-y-2 relative"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                    <i className="fa-solid fa-triangle-exclamation ae-icon-polished" />
                    Delay / Bottleneck
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setDelays((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="ae-btn-delete text-rose-400 hover:text-rose-300 text-xs transition inline-flex items-center gap-1 px-2 py-1"
                  >
                    <i className="fa-solid fa-trash-can ae-icon-polished" />
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Scheduled work task that was delayed..."
                    value={row.task}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDelays((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, task: val } : item
                        )
                      );
                    }}
                    className="delay-task bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-rose-500"
                  />
                  <input
                    type="text"
                    placeholder="Reason for delay (e.g. Rain, Material short)..."
                    value={row.reason || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDelays((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, reason: val } : item
                        )
                      );
                    }}
                    className="delay-reason bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Site Images Upload Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
          <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-amber-400 text-sm sm:text-base flex items-center gap-2">
                <i className="fa-solid fa-camera text-white ae-icon-polished" />
                Site Images / Photos Upload
              </h3>
              <p className="text-xs text-slate-400">
                Capture or attach site progress photos
              </p>
            </div>

            <label
              onClick={flushDraftSave}
              onTouchStart={flushDraftSave}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1"
            >
              <i className="fa-solid fa-upload text-white ae-icon-polished" />
              Select Photos
              <input
                ref={fileInputRef}
                type="file"
                id="site-images-input"
                accept="image/*"
                multiple
                className="hidden"
                onClick={flushDraftSave}
                onChange={handleImageUpload}
              />
            </label>
          </div>

          <div
            id="site-images-preview"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
          >
            {images.length === 0 ? (
              <p className="text-xs text-slate-500 col-span-full py-2">
                No site photos attached yet.
              </p>
            ) : (
              images.map((imgSrc, idx) => (
                <div
                  key={idx}
                  className="relative group bg-slate-800 border border-slate-700 rounded-xl overflow-hidden h-24"
                >
                  <img
                    src={imgSrc}
                    alt={`Site photo ${idx + 1}`}
                    className="w-full h-full object-cover cursor-zoom-in"
                    role="button"
                    tabIndex={0}
                    aria-label={`Open photo ${idx + 1}`}
                    onClick={() => openLightbox(images, idx)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openLightbox(images, idx);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(idx);
                    }}
                    className="ae-btn-delete absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white w-6 h-6 rounded-full text-xs flex items-center justify-center shadow transition"
                    title="Remove Photo"
                    aria-label="Remove Photo"
                  >
                    <i className="fa-solid fa-xmark ae-icon-polished" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Save & Submit Controls */}
        <div className="ae-save-controls-row flex flex-wrap justify-between items-center gap-3 pt-2">
          {editingLogId && (
            <div className="ae-edit-status-bar flex flex-wrap items-center gap-3">
              <div
                id="editing-indicator"
                className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 rounded-xl flex items-center gap-2"
              >
                <i className="fa-solid fa-pen-to-square ae-icon-polished" />
                Editing Log Entry for
                <span id="editing-date-display" className="font-bold text-white">
                  {date}
                </span>
              </div>

              <button
                type="button"
                id="cancel-edit-btn"
                onClick={handleCancelEdit}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-4 py-2 rounded-xl font-semibold transition inline-flex items-center gap-2"
              >
                <i className="fa-solid fa-xmark ae-icon-polished" />
                <span>Cancel Edit</span>
              </button>
            </div>
          )}

          {!editingLogId && existingLogForDate && (
            <div
              id="log-exists-notice"
              className="text-xs text-amber-300 bg-slate-800 border border-amber-500/40 px-3.5 py-2 rounded-xl flex items-center gap-2"
            >
              <i className="fa-solid fa-circle-check text-emerald-400 ae-icon-polished" />
              Log already saved for this date! To modify it, go to
              <strong
                className="underline cursor-pointer text-amber-400 hover:text-white ml-1"
                onClick={() => switchTab('history')}
              >
                History Archive
              </strong>
              and click &quot;Edit Log&quot;.
            </div>
          )}

          <div className="flex items-center gap-3 ml-auto w-full sm:w-auto">
            {!editingLogId ? (
              <button
                type="submit"
                id="save-log-btn"
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-8 py-3 rounded-xl text-sm shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-cloud-arrow-up text-slate-950 ae-icon-polished" />
                <span>Save Daily Site Log</span>
              </button>
            ) : (
              <button
                type="submit"
                id="update-log-btn"
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-8 py-3 rounded-xl text-sm shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-arrows-rotate text-slate-950 ae-icon-polished" />
                <span>Update Site Log</span>
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
export default DailyLogTab;
