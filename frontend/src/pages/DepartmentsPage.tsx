import { useEffect, useState } from 'react';
import { Department } from '../types/employee';
import {
  fetchDepartments,
  createDepartment as createDepartmentApi,
  deleteDepartment as deleteDepartmentApi,
} from '../services/department.service';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      setDepartments(await fetchDepartments());
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    if (!newName.trim()) return;
    setError('');
    try {
      await createDepartmentApi(newName.trim());
      setNewName('');
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create department');
    }
  }

  async function handleDelete(d: Department) {
    if (!confirm(`Delete department "${d.name}"?`)) return;
    setError('');
    try {
      await deleteDepartmentApi(d.id);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete department');
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Departments</h1>

      <div className="flex gap-2 mb-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="New department name"
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
        />
        <button onClick={handleAdd} className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold">
          + Add Department
        </button>
      </div>

      {error && <p className="text-red-600 text-xs mb-3">{error}</p>}

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading…</p>
        ) : departments.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No departments yet.</p>
        ) : (
          <table className="w-full text-sm text-gray-700 dark:text-gray-200">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="p-3">Department</th>
                <th className="p-3">Employees</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.id} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="p-3">{d.name}</td>
                  <td className="p-3">{d.employeeCount}</td>
                  <td className="p-3">
                    <button onClick={() => handleDelete(d)} className="text-red-600 text-xs font-semibold">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
