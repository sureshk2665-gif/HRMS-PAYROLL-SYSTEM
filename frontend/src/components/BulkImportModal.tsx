import { useRef, useState } from 'react';
import {
  downloadBulkImportTemplate,
  bulkImportEmployees,
  BulkImportResult,
} from '../services/employee.service';

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export default function BulkImportModal({ onClose, onImported }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleDownloadTemplate() {
    setDownloading(true);
    try {
      await downloadBulkImportTemplate();
    } finally {
      setDownloading(false);
    }
  }

  async function handleFileSelected() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setFileError('');
    setUploading(true);
    setResult(null);
    try {
      const res = await bulkImportEmployees(file);
      setResult(res);
      if (res.createdCount > 0) onImported();
    } catch (err: any) {
      setFileError(err.response?.data?.error || 'Failed to import the file.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-auto p-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">Bulk Import Employees</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Download the template, fill in one row per employee, then upload it back here.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">1. Download the template</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Includes column headers, an example row, and a Read Me sheet with instructions.
              </p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              disabled={downloading}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50 whitespace-nowrap"
            >
              {downloading ? 'Downloading…' : 'Download Template'}
            </button>
          </div>

          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">2. Upload the filled file</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">.xlsx files only, max 5MB.</p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={handleFileSelected}
                disabled={uploading}
                className="text-xs text-gray-600 dark:text-gray-300"
              />
            </div>
          </div>

          {uploading && <p className="text-sm text-gray-500 dark:text-gray-400">Importing…</p>}
          {fileError && <p className="text-sm text-red-600">{fileError}</p>}

          {result && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">{result.message}</p>
              {result.errors.length > 0 && (
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                        <th className="py-1 pr-2">Row</th>
                        <th className="py-1 pr-2">Employee</th>
                        <th className="py-1">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((e, i) => (
                        <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50">
                          <td className="py-1 pr-2">{e.row}</td>
                          <td className="py-1 pr-2">{e.employeeName}</td>
                          <td className="py-1 text-red-600">{e.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {result.createdCount > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  Go to the Employees list to open each new employee and add a photo if needed.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
