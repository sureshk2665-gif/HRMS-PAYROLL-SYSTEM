import { useEffect, useState } from 'react';
import { fetchAdjustments, saveAdjustments } from '../services/payroll.service';
import { AdjustmentEntry } from '../types/payroll';

interface Props {
  year: number;
  month: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function AdjustmentsModal({ year, month, onClose, onSaved }: Props) {
  const [entries, setEntries] = useState<AdjustmentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAdjustments(year, month)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [year, month]);

  function updateField(employeeId: number, field: keyof AdjustmentEntry, value: string) {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.employeeId !== employeeId) return e;
        if (field === 'lopOverride') {
          return { ...e, lopOverride: value === '' ? null : Number(value) };
        }
        return { ...e, [field]: value === '' ? 0 : Number(value) };
      })
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveAdjustments(year, month, entries);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-auto p-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-4xl">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
          Monthly Adjustments — {month}/{year}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          LOP auto-fills from Attendance unless overridden here. Add OT hours, advances, tax or a one-off
          allowance, save, then Generate/Regenerate Payroll to apply.
        </p>

        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        ) : (
          <div className="overflow-x-auto max-h-[50vh]">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-2 py-2">Code</th>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">LOP Override</th>
                  <th className="px-2 py-2">OT Hours</th>
                  <th className="px-2 py-2">Advance</th>
                  <th className="px-2 py-2">Tax</th>
                  <th className="px-2 py-2">One-off Allowance</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.employeeId} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="px-2 py-1.5">{e.code}</td>
                    <td className="px-2 py-1.5">{e.name}</td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        step="0.5"
                        className="w-20 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        value={e.lopOverride ?? ''}
                        placeholder="auto"
                        onChange={(ev) => updateField(e.employeeId, 'lopOverride', ev.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        className="w-16 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        value={e.otHours}
                        onChange={(ev) => updateField(e.employeeId, 'otHours', ev.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        className="w-20 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        value={e.advance}
                        onChange={(ev) => updateField(e.employeeId, 'advance', ev.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        className="w-16 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        value={e.tax}
                        onChange={(ev) => updateField(e.employeeId, 'tax', ev.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        className="w-24 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        value={e.otherAllowanceOneOff}
                        onChange={(ev) => updateField(e.employeeId, 'otherAllowanceOneOff', ev.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Adjustments'}
          </button>
        </div>
      </div>
    </div>
  );
}
