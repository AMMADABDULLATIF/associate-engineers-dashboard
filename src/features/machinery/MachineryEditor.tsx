import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getLocalTodayDate } from '../../services/storage';
import type { MachineryRecord } from '../../types';

const EQUIPMENT_CHIPS = [
  'Excavator',
  'Tower Crane',
  'Concrete Mixer',
  'Diesel Generator',
  'Wheel Loader / Dumper',
];

const EQUIPMENT_DATALIST = [
  'Excavator',
  'Tower Crane',
  'Mobile Crane',
  'Concrete Mixer',
  'Concrete Pump',
  'Diesel Generator',
  'Wheel Loader / Dumper',
  'Vibrator Roller / Compactor',
  'Transit Mixer Truck',
];

interface MachineryEditorProps {
  entry: MachineryRecord | null;
  onClose: () => void;
}

export const MachineryEditor: React.FC<MachineryEditorProps> = ({
  entry,
  onClose,
}) => {
  const { currentUser, saveMachineryEntry, setPageHeaderOverride } = useApp();
  const isEditing = Boolean(entry);

  const [date, setDate] = useState<string>(
    () => entry?.date || getLocalTodayDate()
  );
  const [name, setName] = useState<string>(() => entry?.name || '');
  const [hours, setHours] = useState<string>(() =>
    entry?.hours !== undefined ? String(entry.hours) : ''
  );
  const [fuel, setFuel] = useState<string>(() =>
    entry?.fuel !== undefined ? String(entry.fuel) : ''
  );
  const [remarks, setRemarks] = useState<string>(() => entry?.remarks || '');

  useEffect(() => {
    setPageHeaderOverride({
      crumb: 'MACHINERY WORKSPACE',
      title: isEditing ? 'Edit Machinery Entry' : 'Add Machinery Entry',
      subtitle: isEditing
        ? 'Update equipment hours, fuel consumption, or operator notes.'
        : 'Record heavy equipment runtime, diesel usage, and operator notes.',
    });
    return () => setPageHeaderOverride(null);
  }, [isEditing, setPageHeaderOverride]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || !date) return;

    const docId = entry?.id || 'mach_' + Date.now();
    const oldDate = entry?.date || null;

    saveMachineryEntry(
      docId,
      {
        date,
        name: cleanName,
        hours: parseFloat(hours) || 0,
        fuel: parseFloat(fuel) || 0,
        remarks: remarks.trim(),
        supervisor: currentUser || 'Supervisor',
        updatedAt: new Date().toISOString(),
      },
      oldDate
    );

    onClose();
  };

  return (
    <section
      id="machinery-edit-screen"
      className="ae-milestone-editor space-y-6"
      aria-labelledby="machinery-editor-title"
    >
      <div className="ae-editor-topbar">
        <button type="button" onClick={onClose} className="ae-editor-back">
          <i className="fa-solid fa-arrow-left ae-icon-polished" />
          <span>Back to Plant &amp; Machinery</span>
        </button>
        <span className="ae-editor-kicker">PLANT &amp; MACHINERY</span>
      </div>

      <div className="ae-editor-hero">
        <div className="ae-editor-icon">
          <i className="fa-solid fa-truck-monster ae-icon-polished" />
        </div>
        <div>
          <p className="ae-editor-eyebrow">MACHINERY WORKSPACE</p>
          <h2 id="machinery-editor-title">
            {isEditing ? 'Edit Machinery Entry' : 'Add Machinery Entry'}
          </h2>
          <p className="ae-editor-description">
            Record heavy equipment runtime hours, diesel or fuel consumption,
            and operator notes.
          </p>
        </div>
      </div>

      <form
        id="machinery-form"
        onSubmit={handleSubmit}
        className="ae-editor-form"
      >
        <div className="ae-editor-section-title">
          <span>01</span>
          <div>
            <h3>Equipment &amp; Fuel Details</h3>
            <p>
              Select equipment type, working date, operating hours, and fuel
              usage.
            </p>
          </div>
        </div>

        <div className="mat-chip-row">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider w-full font-semibold">
            Quick equipment suggestions (click to fill):
          </span>
          {EQUIPMENT_CHIPS.map((eq) => (
            <button
              key={eq}
              type="button"
              onClick={() => setName(eq)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] px-3 py-1.5 rounded-full border border-slate-700 transition"
            >
              {eq}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="mach-date">
              <span>
                Date <b>*</b>
              </span>
              <span className="text-[10px] text-amber-400 font-semibold">
                Required
              </span>
            </label>
            <input
              type="date"
              id="mach-date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="mach-name">
              <span>
                Equipment Name / Type <b>*</b>
              </span>
              <span className="text-[10px] text-amber-400 font-semibold">
                Required
              </span>
            </label>
            <input
              type="text"
              id="mach-name"
              list="machinery-suggestions"
              required
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Excavator / Crane / Concrete Mixer / Generator"
            />
            <datalist id="machinery-suggestions">
              {EQUIPMENT_DATALIST.map((eq) => (
                <option key={eq} value={eq} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="mach-hours">Working Hours (Hrs)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              id="mach-hours"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="e.g. 8"
            />
          </div>

          <div>
            <label htmlFor="mach-fuel">Fuel Consumed (Liters)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              id="mach-fuel"
              value={fuel}
              onChange={(e) => setFuel(e.target.value)}
              placeholder="e.g. 45"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="mach-remarks">Operator Name &amp; Remarks</label>
            <input
              type="text"
              id="mach-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Operator Ahmed / Main foundation digging"
            />
          </div>
        </div>

        <div className="ae-editor-footer">
          <p>
            <i className="fa-solid fa-cloud-arrow-up ae-icon-polished" />{' '}
            Changes are saved to the active site&apos;s machinery log record.
          </p>
          <div className="ae-editor-actions">
            <button type="button" onClick={onClose} className="ae-editor-cancel">
              Cancel
            </button>
            <button
              type="submit"
              id="machinery-save-btn"
              className="ae-editor-save"
            >
              <i className="fa-solid fa-check ae-icon-polished" />
              <span>{isEditing ? 'Save Changes' : 'Save Entry'}</span>
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};
