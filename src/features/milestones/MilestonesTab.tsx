import React, { useMemo, useState } from 'react';
import { Pagination } from '../../components/common/Pagination';
import { PAGE_SIZES } from '../../constants/defaults';
import { useApp } from '../../context/AppContext';
import { usePagination } from '../../hooks/usePagination';
import type { MilestoneRecord } from '../../types';
import { MilestoneEditor } from './MilestoneEditor';

const MILESTONE_CHIPS = [
  'Foundation & Excavation',
  'Structural Framing / Columns',
  'Brick / Block Masonry',
  'Plastering & Finishing',
  'Roof Slab / Waterproofing',
  'Electrical & Plumbing Rough-in',
  'Flooring & Tiling',
  'Final Paint & Handover',
];

export const MilestonesTab: React.FC = () => {
  const { milestones, saveMilestoneEntry, deleteMilestoneEntry, showToast } =
    useApp();

  const [editingMilestone, setEditingMilestone] =
    useState<MilestoneRecord | null>(null);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>('Pending');

  const stats = useMemo(() => {
    let totalProgress = 0;
    let inProgress = 0;
    let completed = 0;
    milestones.forEach((m) => {
      totalProgress += Number(m.progress) || 0;
      if (m.status === 'In Progress') inProgress++;
      if (m.status === 'Completed') completed++;
    });
    const overall =
      milestones.length > 0 ? Math.round(totalProgress / milestones.length) : 0;
    return {
      overall,
      total: milestones.length,
      inProgress,
      completed,
    };
  }, [milestones]);

  const sortedMilestones = useMemo(() => {
    const statusOrder: Record<string, number> = {
      'In Progress': 0,
      Pending: 1,
      Completed: 2,
    };
    return [...milestones].sort(
      (a, b) => (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0)
    );
  }, [milestones]);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    paginatedItems,
  } = usePagination(sortedMilestones, PAGE_SIZES.MILESTONES);

  const handleProgressChange = (rawVal: number) => {
    const clamped = Math.max(0, Math.min(100, Number(rawVal) || 0));
    setProgress(clamped);
    if (clamped >= 100) setStatus('Completed');
    else if (clamped > 0) setStatus('In Progress');
    else setStatus('Pending');
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      showToast('Please enter a milestone name.');
      return;
    }

    const docId = 'milestone_' + Date.now();
    await saveMilestoneEntry(docId, {
      name: cleanName,
      startDate,
      targetDate,
      progress: Math.max(0, Math.min(100, progress)),
      status,
      updatedAt: new Date().toISOString(),
    });

    setName('');
    setStartDate('');
    setTargetDate('');
    setProgress(0);
    setStatus('Pending');
  };

  const handleQuickProgress = async (
    milestone: MilestoneRecord,
    newProgress: number
  ) => {
    const nextStatus =
      newProgress >= 100
        ? 'Completed'
        : newProgress > 0
        ? 'In Progress'
        : 'Pending';
    await saveMilestoneEntry(milestone.id, {
      name: milestone.name,
      startDate: milestone.startDate || '',
      targetDate: milestone.targetDate || '',
      progress: newProgress,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    });
    showToast(`Milestone progress updated to ${newProgress}%!`);
  };

  if (editingMilestone) {
    return (
      <div id="tab-content-milestones" className="space-y-6">
        <MilestoneEditor
          milestone={editingMilestone}
          onClose={() => {
            setEditingMilestone(null);
            window.scrollTo({ top: 0, behavior: 'auto' });
          }}
        />
      </div>
    );
  }

  return (
    <div id="tab-content-milestones" className="space-y-6">
      {/* Overall Project Completion Gauge */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full -ml-24 -mb-24" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-amber-500/20 p-2.5 rounded-xl">
              <i className="fa-solid fa-chart-line text-amber-400 text-xl ae-icon-polished" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">
                Overall Project Completion
              </h3>
              <p className="text-xs text-slate-400">
                Aggregate progress of all milestones
              </p>
            </div>
          </div>

          <div className="flex items-end gap-4 mt-4">
            <div>
              <span
                id="overall-progress-percentage"
                className="text-5xl font-black text-amber-400"
              >
                {stats.overall}
              </span>
              <span className="text-2xl font-bold text-amber-400">%</span>
            </div>
            <div className="flex-grow pb-2">
              <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
                <div
                  id="overall-progress-bar"
                  className="milestone-progress-bar h-full rounded-full"
                  style={{ width: `${stats.overall}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 text-center">
              <div
                className="text-lg font-bold text-white"
                id="milestone-total-count"
              >
                {stats.total}
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                Total
              </div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 text-center">
              <div
                className="text-lg font-bold text-blue-400"
                id="milestone-inprogress-count"
              >
                {stats.inProgress}
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                In Progress
              </div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 text-center">
              <div
                className="text-lg font-bold text-emerald-400"
                id="milestone-completed-count"
              >
                {stats.completed}
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                Completed
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Milestone Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-amber-400 text-sm sm:text-base flex items-center gap-2">
              <i className="fa-solid fa-circle-plus text-white ae-icon-polished" />
              Add New Milestone
            </h3>
            <p className="text-xs text-slate-400">
              Define a major construction milestone and track its progress
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider w-full mb-1">
            Quick suggestions (click to fill):
          </span>
          {MILESTONE_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setName(chip)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] px-2.5 py-1 rounded-full border border-slate-700 transition"
            >
              {chip}
            </button>
          ))}
        </div>

        <form
          id="milestone-form"
          onSubmit={handleCreateMilestone}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <i className="fa-solid fa-flag-checkered text-amber-400 ae-icon-polished" />
                Milestone Name *
              </label>
              <input
                type="text"
                id="milestone-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Foundation & Excavation"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <i className="fa-solid fa-calendar-plus text-amber-400 ae-icon-polished" />
                Start Date
              </label>
              <input
                type="date"
                id="milestone-start-date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <i className="fa-solid fa-calendar-check text-amber-400 ae-icon-polished" />
                Target Completion Date
              </label>
              <input
                type="date"
                id="milestone-target-date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <i className="fa-solid fa-chart-simple text-amber-400 ae-icon-polished" />
                Progress (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  id="milestone-progress-range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => handleProgressChange(Number(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, #f59e0b 0%, #d97706 ${progress}%, #334155 ${progress}%, #334155 100%)`,
                  }}
                  className="flex-grow accent-amber-500 h-2 rounded-lg bg-slate-700 cursor-pointer"
                />
                <input
                  type="number"
                  id="milestone-progress-input"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => handleProgressChange(Number(e.target.value))}
                  className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 text-sm font-bold text-center focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <i className="fa-solid fa-circle-half-stroke text-amber-400 ae-icon-polished" />
                Status
              </label>
              <select
                id="milestone-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              id="milestone-submit-btn"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-6 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <i className="fa-solid fa-plus text-slate-950 ae-icon-polished" />
              <span id="milestone-submit-text">Add Milestone</span>
            </button>
          </div>
        </form>
      </div>

      {/* Milestones List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-amber-400 text-sm sm:text-base flex items-center gap-2">
              <i className="fa-solid fa-list-check text-white ae-icon-polished" />
              Milestone Tracker
            </h3>
            <p className="text-xs text-slate-400">
              All construction milestones with progress tracking
            </p>
          </div>
        </div>

        <div id="milestones-list" className="space-y-3">
          {paginatedItems.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 col-span-full">
              <i className="fa-solid fa-list-check text-4xl mb-3 text-slate-600 ae-icon-polished" />
              <p className="font-medium text-sm">No milestones added yet.</p>
              <p className="text-xs text-slate-500 mt-1">
                Use the form above to add your first construction milestone.
              </p>
            </div>
          ) : (
            paginatedItems.map((milestone) => {
              const prog = Number(milestone.progress) || 0;
              const isOverdue = Boolean(
                milestone.targetDate &&
                  milestone.status !== 'Completed' &&
                  new Date(milestone.targetDate) < new Date()
              );

              const statusClass =
                milestone.status === 'In Progress'
                  ? 'status-badge-inprogress'
                  : milestone.status === 'Completed'
                  ? 'status-badge-completed'
                  : 'status-badge-pending';

              const statusIcon =
                milestone.status === 'In Progress'
                  ? 'fa-spinner'
                  : milestone.status === 'Completed'
                  ? 'fa-circle-check'
                  : 'fa-circle';

              const leadIcon =
                milestone.status === 'Completed'
                  ? 'fa-circle-check text-emerald-400'
                  : milestone.status === 'In Progress'
                  ? 'fa-spinner text-blue-400'
                  : 'fa-circle text-amber-400';

              return (
                <div
                  key={milestone.id}
                  className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3"
                >
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div className="flex items-start gap-2">
                      <i
                        className={`fa-solid ${leadIcon} mt-0.5 ae-icon-polished`}
                      />
                      <div>
                        <h4 className="font-bold text-white text-sm">
                          {milestone.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400">
                          {milestone.startDate && (
                            <span>
                              <i className="fa-solid fa-play mr-1 ae-icon-polished" />
                              {milestone.startDate}
                            </span>
                          )}
                          {milestone.targetDate && (
                            <span
                              className={
                                isOverdue ? 'text-rose-400 font-semibold' : ''
                              }
                            >
                              <i className="fa-solid fa-flag mr-1 ae-icon-polished" />
                              {milestone.targetDate}
                              {isOverdue ? ' ⚠ Overdue' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${statusClass}`}
                      >
                        <i
                          className={`fa-solid ${statusIcon} mr-1 ae-icon-polished`}
                        />
                        {milestone.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMilestone(milestone);
                          window.scrollTo({ top: 0, behavior: 'auto' });
                        }}
                        className="ae-btn-edit text-amber-400 hover:text-amber-300 p-1.5 rounded transition"
                        title="Edit Milestone"
                      >
                        <i className="fa-solid fa-pen-to-square text-xs ae-icon-polished" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMilestoneEntry(milestone.id)}
                        className="ae-btn-delete text-rose-400 hover:text-rose-300 p-1.5 rounded transition"
                        title="Delete Milestone"
                      >
                        <i className="fa-solid fa-trash-can text-xs ae-icon-polished" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Progress</span>
                      <span className="font-bold text-white">{prog}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          prog >= 100 ? 'bg-emerald-500' : 'milestone-progress-bar'
                        }`}
                        style={{ width: `${prog}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    {[25, 50, 75].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        disabled={prog >= pct}
                        onClick={() => handleQuickProgress(milestone, pct)}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] px-2.5 py-1 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        +{pct}%
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={prog >= 100}
                      onClick={() => handleQuickProgress(milestone, 100)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] px-2.5 py-1 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Mark Complete
                    </button>
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
          itemLabel="milestones"
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};
export default MilestonesTab;
