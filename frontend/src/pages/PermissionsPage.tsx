import { Fragment, useEffect, useState } from 'react';
import {
  fetchRoleMatrix,
  updateRolePermission,
  fetchUserOverrides,
  setUserPermissionOverride,
  PermissionDef,
  RoleKey,
  UserOverride,
} from '../services/permissions.service';
import { fetchUsers, ManagedUser } from '../services/auth.service';

const ROLES: RoleKey[] = ['MANAGER', 'ACCOUNTANT', 'HR_STAFF'];
const ROLE_LABELS: Record<RoleKey, string> = { MANAGER: 'Manager', ACCOUNTANT: 'Accountant', HR_STAFF: 'HR Staff' };

function groupByCategory(permissions: PermissionDef[]) {
  const groups: Record<string, PermissionDef[]> = {};
  for (const p of permissions) {
    if (!groups[p.category]) groups[p.category] = [];
    groups[p.category].push(p);
  }
  return groups;
}

export default function PermissionsPage() {
  const [tab, setTab] = useState<'roles' | 'users'>('roles');

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">Permissions</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Configure exactly what each role can do, or override a permission for one specific person.
      </p>

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab('roles')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
            tab === 'roles' ? 'bg-accent text-white border-accent' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
          }`}
        >
          Role Defaults
        </button>
        <button
          onClick={() => setTab('users')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
            tab === 'users' ? 'bg-accent text-white border-accent' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
          }`}
        >
          Per-Person Overrides
        </button>
      </div>

      {tab === 'roles' ? <RoleMatrixTab /> : <UserOverridesTab />}
    </div>
  );
}

function RoleMatrixTab() {
  const [permissions, setPermissions] = useState<PermissionDef[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Record<RoleKey, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchRoleMatrix();
      setPermissions(data.permissions);
      setMatrix(data.matrix);
    } finally {
      setLoading(false);
    }
  }

  async function toggle(role: RoleKey, permissionKey: string, current: boolean) {
    const cellId = `${role}:${permissionKey}`;
    setSavingKey(cellId);
    setError('');
    setMatrix((prev) => ({ ...prev, [permissionKey]: { ...prev[permissionKey], [role]: !current } }));
    try {
      await updateRolePermission(role, permissionKey, !current);
    } catch (err: any) {
      setMatrix((prev) => ({ ...prev, [permissionKey]: { ...prev[permissionKey], [role]: current } }));
      setError(err.response?.data?.error || 'Failed to update permission.');
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>;

  const groups = groupByCategory(permissions);

  return (
    <div>
      {error && <p className="text-red-600 text-xs mb-3">{error}</p>}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm text-gray-700 dark:text-gray-200">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-2">Permission</th>
              {ROLES.map((r) => (
                <th key={r} className="px-4 py-2 text-center">{ROLE_LABELS[r]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(groups).map(([category, perms]) => (
              <Fragment key={category}>
                <tr className="bg-gray-50 dark:bg-gray-900/50">
                  <td colSpan={4} className="px-4 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {category}
                  </td>
                </tr>
                {perms.map((p) => (
                  <tr key={p.key} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="px-4 py-2">{p.label}</td>
                    {ROLES.map((role) => {
                      const allowed = matrix[p.key]?.[role] ?? false;
                      const cellId = `${role}:${p.key}`;
                      const protectedCell = role === 'MANAGER' && (p.key === 'users.manage' || p.key === 'permissions.manage');
                      return (
                        <td key={role} className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={allowed}
                            disabled={savingKey === cellId || protectedCell}
                            title={protectedCell ? 'Cannot be removed from Manager — prevents self-lockout' : ''}
                            onChange={() => toggle(role, p.key, allowed)}
                            className="w-4 h-4"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserOverridesTab() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<PermissionDef[]>([]);
  const [overrides, setOverrides] = useState<UserOverride[]>([]);
  const [effective, setEffective] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers().then((data) => {
      setUsers(data);
      const firstNonManager = data.find((u) => u.role !== 'MANAGER');
      if (firstNonManager) setSelectedUserId(firstNonManager.id);
    });
    fetchRoleMatrix().then((data) => setPermissions(data.permissions));
  }, []);

  useEffect(() => {
    if (selectedUserId === null) return;
    loadOverrides(selectedUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  async function loadOverrides(userId: number) {
    setLoading(true);
    try {
      const data = await fetchUserOverrides(userId);
      setOverrides(data.overrides);
      setEffective(data.effectivePermissions);
    } finally {
      setLoading(false);
    }
  }

  async function setOverride(permissionKey: string, allowed: boolean | null) {
    if (selectedUserId === null) return;
    setSavingKey(permissionKey);
    try {
      await setUserPermissionOverride(selectedUserId, permissionKey, allowed);
      await loadOverrides(selectedUserId);
    } finally {
      setSavingKey(null);
    }
  }

  const selectedUser = users.find((u) => u.id === selectedUserId);
  const overrideMap = new Map(overrides.map((o) => [o.permissionKey, o]));
  const groups = groupByCategory(permissions);

  return (
    <div>
      <div className="mb-4">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Select person</label>
        <select
          value={selectedUserId ?? ''}
          onChange={(e) => setSelectedUserId(Number(e.target.value))}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
        >
          {users.filter((u) => u.role !== 'MANAGER').map((u) => (
            <option key={u.id} value={u.id}>{u.username} ({ROLE_LABELS[u.role as RoleKey]})</option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">Manager accounts always keep their full default permissions.</p>
      </div>

      {loading || !selectedUser ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm text-gray-700 dark:text-gray-200">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-2">Permission</th>
                <th className="px-4 py-2">Effective</th>
                <th className="px-4 py-2">Override</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groups).map(([category, perms]) => (
                <Fragment key={category}>
                  <tr className="bg-gray-50 dark:bg-gray-900/50">
                    <td colSpan={3} className="px-4 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {category}
                    </td>
                  </tr>
                  {perms.map((p) => {
                    const isEffective = effective.includes(p.key);
                    const override = overrideMap.get(p.key);
                    return (
                      <tr key={p.key} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="px-4 py-2">{p.label}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isEffective ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {isEffective ? 'Allowed' : 'Denied'}
                          </span>
                          {override && <span className="text-xs text-gray-400 ml-1">(override)</span>}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            <button
                              disabled={savingKey === p.key}
                              onClick={() => setOverride(p.key, null)}
                              className={`px-2 py-0.5 rounded text-xs border ${!override ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600' : 'border-gray-200 dark:border-gray-700'}`}
                            >
                              Default
                            </button>
                            <button
                              disabled={savingKey === p.key}
                              onClick={() => setOverride(p.key, true)}
                              className={`px-2 py-0.5 rounded text-xs border ${override?.allowed === true ? 'bg-green-100 text-green-700 border-green-300' : 'border-gray-200 dark:border-gray-700'}`}
                            >
                              Allow
                            </button>
                            <button
                              disabled={savingKey === p.key}
                              onClick={() => setOverride(p.key, false)}
                              className={`px-2 py-0.5 rounded text-xs border ${override?.allowed === false ? 'bg-red-100 text-red-700 border-red-300' : 'border-gray-200 dark:border-gray-700'}`}
                            >
                              Deny
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
