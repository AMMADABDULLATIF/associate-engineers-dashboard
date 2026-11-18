import React, { useEffect, useMemo, useState } from 'react';
import {
  MATERIAL_NAME_SUGGESTIONS,
  QUICK_MATERIAL_PRESETS,
  SITE_STORAGE_CATEGORIES,
  SUPPLIER_SUGGESTIONS,
  UNIT_SUGGESTIONS,
} from '../../constants/defaults';
import { useApp } from '../../context/AppContext';
import {
  getCumulativeMaterialStats,
  getLocalTodayDate,
} from '../../services/storage';
import type { MaterialEntry } from '../../types';

interface MaterialEditorProps {
  entry: MaterialEntry | null;
  returnTo: 'main' | 'balance';
  onClose: () => void;
}

export const MaterialEditor: React.FC<MaterialEditorProps> = ({
  entry,
  returnTo,
  onClose,
}) => {
  const {
    materials,
    activeSite,
    currentUser,
    saveMaterialEntry,
    setFormDirty,
    showToast,
  } = useApp();

  const [materialName, setMaterialName] = useState(entry?.materialName || '');
  const [category, setCategory] = useState(entry?.category || '');
  const [unit, setUnit] = useState(entry?.unit || '');
  const [date, setDate] = useState(entry?.date || getLocalTodayDate());
  const [openingStock, setOpeningStock] = useState(
    entry ? String(entry.openingStock ?? 0) : '0'
  );
  const [receivedQty, setReceivedQty] = useState(
    entry ? String(entry.receivedQty ?? 0) : '0'
  );
  const [usedQty, setUsedQty] = useState(
    entry ? String(entry.usedQty ?? 0) : '0'
  );
  const [minAlertLimit, setMinAlertLimit] = useState(
    entry ? String(entry.minAlertLimit ?? 0) : '0'
  );
  const [supplier, setSupplier] = useState(entry?.supplier || '');
  const [note, setNote] = useState(entry?.note || '');
  const [openingHint, setOpeningHint] = useState(
    entry ? 'Editing existing record' : 'Auto-calculated'
  );

  useEffect(() => {
    setFormDirty('material-form', true);
    return () => {
      setFormDirty('material-form', false);
    };
  }, [setFormDirty]);

  const cumulativeStats = useMemo(
    () => getCumulativeMaterialStats(materials),
    [materials]
  );

  const allMaterialSuggestions = useMemo(() => {
    const set = new Set<string>(MATERIAL_NAME_SUGGESTIONS);
    materials.forEach((m) => {
      if (m.materialName && m.materialName.trim()) {
        set.add(m.materialName.trim());
      }
    });
    return Array.from(set);
  }, [materials]);

  const allSupplierSuggestions = useMemo(() => {
    const set = new Set<string>(SUPPLIER_SUGGESTIONS);
    materials.forEach((m) => {
      if (m.supplier && m.supplier.trim()) {
        set.add(m.supplier.trim());
      }
    });
    return Array.from(set);
  }, [materials]);

  const applyPreviousMaterialDefaults = (nameVal: string) => {
    if (entry) return;
    const key = nameVal.trim().toLowerCase();
    if (!key) {
      setOpeningHint('Auto-calculated');
      return;
    }
    const existing = cumulativeStats.find((s) => s.key === key);
    if (existing) {
      setCategory((prev) => prev.trim() || existing.category || '');
      setUnit((prev) => prev.trim() || existing.unit || '');
      setOpeningStock((prev) => {
        const currentVal = parseFloat(prev);
        if (!prev || currentVal === 0) {
          setOpeningHint(
            `Carried from previous balance (${existing.currentBalance} ${existing.unit})`
          );
          return String(existing.currentBalance);
        }
        return prev;
      });
      setMinAlertLimit((prev) => {
        const currentVal = parseFloat(prev);
        if ((!prev || currentVal === 0) && existing.minAlertLimit > 0) {
          return String(existing.minAlertLimit);
        }
        return prev;
      });
    } else {
      setOpeningHint('Auto-calculated');
    }
  };

  const handleMaterialNameChange = (value: string) => {
    setMaterialName(value);
    applyPreviousMaterialDefaults(value);
  };

  const handleSelectPreset = (
    name: string,
    presetCat: string,
    presetUnit: string
  ) => {
    setMaterialName(name);
    setCategory(presetCat);
    setUnit(presetUnit);
    if (!entry) {
      const key = name.trim().toLowerCase();
      const existing = cumulativeStats.find((s) => s.key === key);
      if (existing) {
        setOpeningStock(String(existing.currentBalance));
        setOpeningHint(
          `Carried from previous balance (${existing.currentBalance} ${existing.unit})`
        );
        if (existing.minAlertLimit > 0) {
          setMinAlertLimit(String(existing.minAlertLimit));
        }
      } else {
        setOpeningHint('Auto-calculated');
      }
    }
  };

  const openingNum = parseFloat(openingStock) || 0;
  const receivedNum = parseFloat(receivedQty) || 0;
  const usedNum = parseFloat(usedQty) || 0;
  const minAlertNum = parseFloat(minAlertLimit) || 0;
  const liveBalance =
    Math.round((openingNum + receivedNum - usedNum) * 100) / 100;
  const isLiveLowStock = minAlertNum > 0 && liveBalance < minAlertNum;
  const displayUnit = unit.trim() || 'Bags';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = materialName.trim();
    const cleanUnit = unit.trim();
    if (!cleanName) {
      showToast('Please enter a material name.');
      return;
    }
    if (!cleanUnit) {
      showToast('Please enter a measurement unit.');
      return;
    }

    const docId = entry?.id || 'mat_' + Date.now();
    const payload: MaterialEntry = {
      id: docId,
      materialName: cleanName,
      category: category.trim() || 'Civil & Structural',
      unit: cleanUnit,
      date: date || getLocalTodayDate(),
      openingStock: Math.round(openingNum * 100) / 100,
      receivedQty: Math.round(receivedNum * 100) / 100,
      usedQty: Math.round(usedNum * 100) / 100,
      balance: liveBalance,
      minAlertLimit: Math.round(minAlertNum * 100) / 100,
      supplier: supplier.trim(),
      note: note.trim(),
      siteId: activeSite?.id,
      siteName: activeSite?.name,
      supervisor: currentUser || entry?.supervisor || undefined,
      updatedAt: new Date().toISOString(),
    };

    saveMaterialEntry(docId, payload);
    setFormDirty('material-form', false);
    onClose();
  };

  const backLabel =
    returnTo === 'balance' ? 'Back to Balance Sheet' : 'Back to Site Store';

  return (
    <section
      id="material-edit-screen"
      className="ae-milestone-editor space-y-6"
      aria-labelledby="material-editor-title"
    >
      <div className="ae-editor-topbar">
        <button type="button" onClick={onClose} className="ae-editor-back">
          <i className="fa-solid fa-arrow-left ae-icon-polished" />
          <span>{backLabel}</span>
        </button>
        <span className="ae-editor-kicker">SITE STORE & MATERIALS</span>
      </div>

      <div className="ae-editor-hero">
        <div className="ae-editor-icon">
          <i className="fa-solid fa-boxes-stacked ae-icon-polished" />
        </div>
        <div>
          <p className="ae-editor-eyebrow">SITE STORE WORKSPACE</p>
          <h2 id="material-editor-title">
            {entry ? 'Edit Material' : 'Add Material'}
          </h2>
          <p className="ae-editor-description">
            Record incoming material deliveries, site consumption, and minimum
            stock safety thresholds.
          </p>
        </div>
      </div>

      <form
        id="material-form"
        onSubmit={handleSubmit}
        className="ae-editor-form"
      >
        {/* Section 01: Material Details */}
        <div className="ae-editor-section-block">
          <div className="ae-editor-section-title">
            <span>01</span>
            <div>
              <h3>Material Details</h3>
              <p>
                Identify the construction material, category, unit, and
                transaction date.
              </p>
            </div>
          </div>

          <div className="mat-chip-row">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider w-full font-semibold">
              Quick suggestions (click to fill):
            </span>
            {QUICK_MATERIAL_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() =>
                  handleSelectPreset(preset.name, preset.category, preset.unit)
                }
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] px-3 py-1.5 rounded-full border border-slate-700 transition"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label htmlFor="mat-form-name">
                <span>
                  Material Name <b>*</b>
                </span>
                <span className="text-[10px] text-amber-400 font-semibold">
                  Required
                </span>
              </label>
              <input
                type="text"
                id="mat-form-name"
                list="material-suggestions"
                required
                value={materialName}
                onChange={(e) => handleMaterialNameChange(e.target.value)}
                placeholder="Search or enter material name (e.g. Cement (OPC - 50kg Bags))"
                autoComplete="off"
              />
              <datalist id="material-suggestions">
                {allMaterialSuggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="mat-form-category">Material Category</label>
              <input
                type="text"
                id="mat-form-category"
                list="category-suggestions"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Select or enter category"
              />
              <datalist id="category-suggestions">
                {SITE_STORAGE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="mat-form-unit">
                <span>
                  Measurement Unit <b>*</b>
                </span>
                <span className="text-[10px] text-amber-400 font-semibold">
                  Required
                </span>
              </label>
              <input
                type="text"
                id="mat-form-unit"
                list="unit-suggestions"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Select or type unit (e.g. Bags, Tons, Cft)"
              />
              <datalist id="unit-suggestions">
                {UNIT_SUGGESTIONS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="mat-form-date">
                Material Date <b>*</b>
              </label>
              <input
                type="date"
                id="mat-form-date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 02: Stock & Quantity */}
        <div className="ae-editor-section-block">
          <div className="ae-editor-section-title">
            <span>02</span>
            <div className="flex-1 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3>Stock & Quantity</h3>
                <p>
                  Enter opening balance, incoming receipt, site consumption, and
                  alert threshold.
                </p>
              </div>
              <span
                id="mat-auto-opening-hint"
                className="text-[11px] text-slate-400 italic"
              >
                {openingHint}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="mat-form-opening">Opening Stock</label>
              <input
                type="number"
                id="mat-form-opening"
                step="any"
                min="0"
                value={openingStock}
                onChange={(e) => setOpeningStock(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <label htmlFor="mat-form-received">
                <span className="text-emerald-400">Received (+In)</span>
              </label>
              <input
                type="number"
                id="mat-form-received"
                step="any"
                min="0"
                value={receivedQty}
                onChange={(e) => setReceivedQty(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <label htmlFor="mat-form-used">
                <span className="text-amber-400">Used (-Out)</span>
              </label>
              <input
                type="number"
                id="mat-form-used"
                step="any"
                min="0"
                value={usedQty}
                onChange={(e) => setUsedQty(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <label htmlFor="mat-form-min-alert">
                <span className="text-rose-300">Min Alert Limit</span>
              </label>
              <input
                type="number"
                id="mat-form-min-alert"
                step="any"
                min="0"
                value={minAlertLimit}
                onChange={(e) => setMinAlertLimit(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Live Calculated Balance Bar */}
          <div className="mat-balance-bar">
            <div className="text-xs">
              <span className="text-slate-400">Balance Formula:</span>
              <code className="text-[11px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded ml-1.5">
                Opening + Received - Used
              </code>
            </div>
            <div className="mat-balance-current">
              <span className="text-xs text-slate-300 font-medium">
                Current Balance:
              </span>
              <span
                id="mat-live-balance-badge"
                className={`font-bold text-sm px-3 py-1 rounded-lg border ${
                  isLiveLowStock
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {liveBalance} {displayUnit}
              </span>
            </div>
          </div>

          {isLiveLowStock && (
            <div
              id="mat-live-low-stock-warning"
              className="mat-low-alert-inline text-xs text-rose-300 bg-rose-950/70 border border-rose-800/80"
            >
              <i className="fa-solid fa-triangle-exclamation text-rose-400 ae-icon-polished" />
              <span>
                <strong>Low Stock Alert:</strong> Calculated balance is below
                the minimum safety threshold.
              </span>
            </div>
          )}
        </div>

        {/* Section 03: Supplier & Remarks */}
        <div className="ae-editor-section-block">
          <div className="ae-editor-section-title">
            <span>03</span>
            <div>
              <h3>Supplier & Remarks</h3>
              <p>
                Optional supplier details and site delivery or consumption
                notes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="mat-form-supplier">Supplier / Vendor Name</label>
              <input
                type="text"
                id="mat-form-supplier"
                list="supplier-suggestions"
                autoComplete="off"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Select or type supplier (e.g. Bestway Cement)"
              />
              <datalist id="supplier-suggestions">
                {allSupplierSuggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="mat-form-note">Note / Delivery Remarks</label>
              <input
                type="text"
                id="mat-form-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Batch 4 for 3rd floor slab casting"
              />
            </div>
          </div>
        </div>

        <div className="ae-editor-footer">
          <p>
            <i className="fa-solid fa-cloud-arrow-up ae-icon-polished" />{' '}
            Changes are saved to the active site&apos;s store inventory record.
          </p>
          <div className="ae-editor-actions">
            <button
              type="button"
              onClick={onClose}
              className="ae-editor-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="mat-form-save-btn"
              className="ae-editor-save"
            >
              <i className="fa-solid fa-check ae-icon-polished" />
              <span>{entry ? 'Update Material' : 'Save Material'}</span>
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};
