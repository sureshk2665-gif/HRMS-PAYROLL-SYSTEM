import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCompanyBranding } from '../services/companyBranding.service';
import { resolveUploadUrl } from '../utils/uploadUrl';
import { UserRole } from '../services/auth.service';

interface NavItem {
  to: string;
  label: string;
  permission?: string; // omitted = visible to everyone who's logged in
}

// Each item's visibility is now driven by the logged-in user's effective
// permission list (role defaults + any per-person overrides), not a
// hardcoded role array — a Manager can grant/revoke access to any of
// these from the Permissions page without a code change.
const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', permission: 'dashboard.view' },
  { to: '/employees', label: 'Employees', permission: 'employees.view' },
  { to: '/departments', label: 'Departments', permission: 'departments.view' },
  { to: '/attendance', label: 'Attendance', permission: 'attendance.view' },
  { to: '/payroll', label: 'Payroll', permission: 'payroll.view' },
  { to: '/leave-requests', label: 'Leave Requests', permission: 'leaveRequests.view' },
  { to: '/reports', label: 'Reports', permission: 'reports.view' },
  { to: '/users', label: 'Users', permission: 'users.manage' },
  { to: '/permissions', label: 'Permissions', permission: 'permissions.manage' },
  { to: '/audit-log', label: 'Audit Log', permission: 'auditLog.view' },
  { to: '/notifications', label: 'Notifications', permission: 'notifications.view' },
  { to: '/settings', label: 'Settings', permission: 'settings.manage' },
];

const ROLE_LABELS: Record<UserRole, string> = {
  MANAGER: 'Manager',
  ACCOUNTANT: 'Accountant',
  HR_STAFF: 'HR Staff',
};

export default function Layout() {
  const { user, logout, can } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const branding = useCompanyBranding();
  const logoUrl = resolveUploadUrl(branding?.logoUrl);

  const visibleNavItems = navItems.filter((item) => !item.permission || can(item.permission));

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      <aside className="w-56 flex-shrink-0 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-r border-gray-200 dark:border-gray-700 p-4 relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-accent" />
        <div className="flex items-center gap-2 px-2 mb-1 mt-1">
          {logoUrl && <img src={logoUrl} alt="Company logo" className="w-7 h-7 rounded object-contain" />}
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate">
            {branding?.companyName || 'HRMS'}
          </h2>
        </div>
        <p className="text-xs text-gray-400 px-2 mb-4">Payroll Console</p>
        <nav className="space-y-1">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-accent-soft dark:hover:bg-gray-700'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 relative">
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent via-accent-2 to-transparent opacity-60" />
          <div />
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
            <span className="text-gray-500 dark:text-gray-400">
              {user?.username}
              {user && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded text-xs bg-accent text-white">
                  {ROLE_LABELS[user.role]}
                </span>
              )}
            </span>
            <NavLink to="/change-password" className="text-accent font-medium">
              Change Password
            </NavLink>
            <button onClick={logout} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600">
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-x-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
