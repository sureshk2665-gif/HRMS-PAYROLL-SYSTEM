import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchSalarySlipPdfBlob } from '../services/salarySlip.service';

export default function SalarySlipPage() {
  const { code, year, month } = useParams();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!code || !year || !month) return;
    setLoading(true);
    setError('');

    fetchSalarySlipPdfBlob(code, Number(year), Number(month))
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setPdfUrl(url);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Failed to load salary slip.');
      })
      .finally(() => setLoading(false));

    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, year, month]);

  function handleDownload() {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `${code}-${year}-${String(month).padStart(2, '0')}.pdf`;
    a.click();
  }

  function handlePrint() {
    if (!pdfUrl) return;
    const win = window.open(pdfUrl, '_blank');
    win?.addEventListener('load', () => win.print());
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link to="/payroll" className="text-accent text-sm">&larr; Back to Payroll</Link>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            disabled={!pdfUrl}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50"
          >
            Download
          </button>
          <button
            onClick={handlePrint}
            disabled={!pdfUrl}
            className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50"
          >
            Print
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden" style={{ height: '80vh' }}>
        {loading ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Generating salary slip…</p>
        ) : error ? (
          <p className="p-6 text-sm text-red-600">{error}</p>
        ) : (
          <iframe title="Salary Slip" src={pdfUrl || ''} className="w-full h-full border-0" />
        )}
      </div>
    </div>
  );
}
