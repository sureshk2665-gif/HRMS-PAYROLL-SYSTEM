import { useEffect, useRef, useState } from 'react';
import { Employee, Department, EmployeeListParams } from '../types/employee';
import { fetchEmployees, deleteEmployee as deleteEmployeeApi, uploadEmployeePhoto, generateLeaveRequestLink } from '../services/employee.service';
import { fetchDepartments } from '../services/department.service';
import EmployeeFormModal from '../components/EmployeeFormModal';
import BulkImportModal from '../components/BulkImportModal';
import { resolveUploadUrl } from '../utils/uploadUrl';

function fmtCurrency(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<EmployeeListParams['sortBy']>('code');
  const [sortDir, setSortDir] = useState<EmployeeListParams['sortDir']>('asc');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [uploadingPhotoFor, setUploadingPhotoFor] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoTargetCode, setPhotoTargetCode] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchEmployees({
        search: search || undefined,
        departmentId: departmentId ? Number(departmentId) : undefined,
        status: (status as any) || undefined,
        page,
        pageSize: 20,
        sortBy,
        sortDir,
      });
      setEmployees(data.employees);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDepartments().then(setDepartments).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, departmentId, status, page, sortBy, sortDir]);

  function toggleSort(col: EmployeeListParams['sortBy']) {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  }

  async function handleDelete(emp: Employee) {
    if (!confirm(`Delete employee ${emp.name} (${emp.code})? This cannot be undone.`)) return;
    try {
      await deleteEmployeeApi(emp.code);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete employee');
    }
  }

  async function handleCopyLeaveLink(emp: Employee) {
    try {
      const { path } = await generateLeaveRequestLink(emp.code);
      const fullUrl = `${window.location.origin}${path}`;
      await navigator.clipboard.writeText(fullUrl);
      alert(`Leave request link copied for ${emp.name}:\n${fullUrl}\n\nShare this with them directly (WhatsApp, email, etc). Generating a new link invalidates the old one.`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to generate the link.');
    }
  }

  function triggerPhotoUpload(code: string) {
    setPhotoTargetCode(code);
    photoInputRef.current?.click();
  }

  async function handlePhotoSelected() {
    const file = photoInputRef.current?.files?.[0];
    if (!file || !photoTargetCode) return;
    setUploadingPhotoFor(photoTargetCode);
    try {
      await uploadEmployeePhoto(photoTargetCode, file);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload photo');
    } finally {
      setUploadingPhotoFor(null);
      setPhotoTargetCode(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }

  function netSalary(e: Employee) {
    const gross = e.basic + e.hra + e.da + e.specialAllow + e.medicalAllow + e.conveyance + e.washingAllow + e.otherAllow;
    const ded = e.pfDeduction + e.professionalTax + e.otherDeduction + e.rentDeduction;
    return gross - ded;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Employees</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setImportModalOpen(true)}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200"
          >
            Bulk Import
          </button>
          <button
            onClick={() => { setEditingEmployee(null); setModalOpen(true); }}
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold"
          >
            + Add Employee
          </button>
        </div>
      </div>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handlePhotoSelected}
        className="hidden"
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          placeholder="Search name, code, mobile…"
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
        />
        <select
          value={departmentId}
          onChange={(e) => { setPage(1); setDepartmentId(e.target.value); }}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => { setPage(1); setStatus(e.target.value); }}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {error && <p className="text-red-600 text-xs mb-3">{error}</p>}

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading…</p>
        ) : employees.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No employees found.</p>
        ) : (
          <table className="w-full text-sm text-gray-700 dark:text-gray-200">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="p-3">Photo</th>
                <th className="p-3 cursor-pointer" onClick={() => toggleSort('code')}>Code {sortBy === 'code' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                <th className="p-3 cursor-pointer" onClick={() => toggleSort('name')}>Name {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                <th className="p-3">Department</th>
                <th className="p-3">Designation</th>
                <th className="p-3">Mobile</th>
                <th className="p-3">Net Salary</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.code} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="p-3">
                    <button
                      onClick={() => triggerPhotoUpload(e.code)}
                      disabled={uploadingPhotoFor === e.code}
                      className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 flex items-center justify-center bg-gray-50 dark:bg-gray-900 hover:opacity-80"
                      title="Click to upload photo"
                    >
                      {resolveUploadUrl(e.photoUrl) ? (
                        <img src={resolveUploadUrl(e.photoUrl)!} alt={e.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-gray-400">
                          {uploadingPhotoFor === e.code ? '…' : e.name.charAt(0)}
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="p-3">{e.code}</td>
                  <td className="p-3">{e.name}</td>
                  <td className="p-3">{e.department?.name || '-'}</td>
                  <td className="p-3">{e.designation || '-'}</td>
                  <td className="p-3">{e.mobile || '-'}</td>
                  <td className="p-3">{fmtCurrency(netSalary(e))}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${e.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="p-3 space-x-3">
                    <button onClick={() => { setEditingEmployee(e); setModalOpen(true); }} className="text-accent text-xs font-semibold">Edit</button>
                    <button onClick={() => handleCopyLeaveLink(e)} className="text-accent text-xs font-semibold">Copy Leave Link</button>
                    <button onClick={() => handleDelete(e)} className="text-red-600 text-xs font-semibold">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
          <span>{total} employee(s) total</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40">
              Prev
            </button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      )}

      {modalOpen && (
        <EmployeeFormModal
          employee={editingEmployee}
          departments={departments}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
        />
      )}

      {importModalOpen && (
        <BulkImportModal
          onClose={() => setImportModalOpen(false)}
          onImported={load}
        />
      )}
    </div>
  );
}
