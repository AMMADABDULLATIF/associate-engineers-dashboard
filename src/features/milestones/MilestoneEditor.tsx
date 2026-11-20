import React, { useEffect, useState } from 'react';
import { DateInput } from '../../components/common/DateInput';
import { useApp } from '../../context/AppContext';
import type { MilestoneRecord } from '../../types';

interface MilestoneEditorProps {
  milestone: MilestoneRecord;
  onClose: () => void;
}

export const MilestoneEditor: React.FC<MilestoneEditorProps> = ({
  milestone,
  onClose,
}) => {
  const { saveMilestoneEntry, showToast, setPageHeaderOverride } = useApp();

  const [name, setName] = useState(milestone.name || '');
  const [startDate, setStartDate] = useState(milestone.startDate || '');
  const [targetDate, setTargetDate] = useState(milestone.targetDate || '');
  const [progress, setProgress] = useState<number>(
    Math.max(0, Math.min(100, Number(milestone.progress) || 0))
  );
  const [status, setStatus] = useState<string>(milestone.status || 'Pending');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPageHeaderOverride({
      crumb: 'MILESTONE EDITOR',
      title: 'Edit Milestone',
      subtitle: 'Update a saved construction milestone.',
    });
    return () => setPageHeaderOverride(null);
  }, [setPageHeaderOverride]);

  const handleProgressChange = (rawVal: number) => {
    const clamped = Math.max(0, Math.min(100, Number(rawVal) || 0));
    setProgress(clamped);
    if (clamped >= 100) setStatus('Completed');
    else if (clamped > 0) setStatus('In Progress');
    else setStatus('Pending');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      showToast('Please enter a milestone name.');
      return;
    }

    setSaving(true);
    try {
      await saveMilestoneEntry(milestone.id, {
        name: cleanName,
        startDate,
        targetDate,
        progress,
        status,
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      id="milestone-edit-screen"
      className="ae-milestone-editor space-y-6"
      aria-labelledby="milestone-editor-title"
    >
      <div className="ae-editor-topbar">
        <button type="button" onClick={onClose} className="ae-editor-back">
          <i className="fa-solid fa-arrow-left ae-icon-polished" />
          <span>Back to Milestones</span>
        </button>
        <span className="ae-editor-kicker">
          <i className="fa-solid fa-pen-to-square ae-icon-polished" /> PROJECT
          MANAGEMENT
        </span>
      </div>

      <div className="ae-editor-hero">
        <div className="ae-editor-icon">
          <i className="fa-solid fa-flag-checkered ae-icon-polished" />
        </div>
        <div>
          <p className="ae-editor-eyebrow">MILESTONE WORKSPACE</p>
          <h2 id="milestone-editor-title">Edit Milestone</h2>
          <p className="ae-editor-description">
            Update the saved milestone details below. Your changes will be saved
            to this site&apos;s milestone record.
          </p>
        </div>
      </div>

      <form
        id="milestone-edit-screen-form"
        onSubmit={handleSubmit}
        className="ae-editor-form"
      >
        <div className="ae-editor-section-title">
          <span>01</span>
          <div>
            <h3>Milestone details</h3>
            <p>Review and update the activity information.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label htmlFor="milestone-screen-name">
              Milestone Name <b>*</b>
            </label>
            <input
              id="milestone-screen-name"
              type="text"
              required
              maxLength={180}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Foundation & Excavation"
            />
          </div>

          <div>
            <label htmlFor="milestone-screen-start-date">Start Date</label>
            <DateInput
              id="milestone-screen-start-date"
              value={startDate}
              onChange={setStartDate}
            />
          </div>

          <div>
            <label htmlFor="milestone-screen-target-date">
              Target Completion Date
            </label>
            <DateInput
              id="milestone-screen-target-date"
              value={targetDate}
              onChange={setTargetDate}
            />
          </div>

          <div>
            <label htmlFor="milestone-screen-progress-range">
              Progress{' '}
              <span id="milestone-screen-progress-label">{progress}%</span>
            </label>
            <input
              id="milestone-screen-progress-range"
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => handleProgressChange(Number(e.target.value))}
              className="ae-editor-range"
            />
            <div className="ae-range-scale">
              <span>0% · Not started</span>
              <span>100% · Complete</span>
            </div>
          </div>

          <div>
            <label htmlFor="milestone-screen-progress-input">
              Progress (%)
            </label>
            <input
              id="milestone-screen-progress-input"
              type="number"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => handleProgressChange(Number(e.target.value))}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="milestone-screen-status">Current Status</label>
            <select
              id="milestone-screen-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="ae-editor-footer">
          <p>
            <i className="fa-solid fa-cloud-arrow-up ae-icon-polished" />{' '}
            Changes are saved to the active site&apos;s milestone record.
          </p>
          <div className="ae-editor-actions">
            <button type="button" onClick={onClose} className="ae-editor-cancel">
              Cancel
            </button>
            <button
              type="submit"
              id="milestone-screen-save-btn"
              disabled={saving}
              className="ae-editor-save"
            >
              <i
                className={`fa-solid ${
                  saving ? 'fa-circle-notch fa-spin' : 'fa-check'
                } ae-icon-polished`}
              />{' '}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};
