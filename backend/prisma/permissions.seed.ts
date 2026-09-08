import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The full catalog of configurable permissions. `category` groups them in
// the admin UI. Keys are stable strings referenced directly in route files
// via requirePermission('key') — renaming a key here means updating the
// route that uses it too.
export const PERMISSION_CATALOG: { key: string; label: string; category: string }[] = [
  { key: 'employees.view', label: 'View employees', category: 'Employees' },
  { key: 'employees.create', label: 'Add new employees', category: 'Employees' },
  { key: 'employees.edit', label: 'Edit employee details', category: 'Employees' },
  { key: 'employees.delete', label: 'Delete employees', category: 'Employees' },
  { key: 'employees.photo', label: 'Upload employee photos', category: 'Employees' },
  { key: 'employees.bulkImport', label: 'Bulk import employees (Excel)', category: 'Employees' },
  { key: 'employees.leaveLink', label: 'Generate employee leave-request links', category: 'Employees' },

  { key: 'departments.view', label: 'View departments', category: 'Departments' },
  { key: 'departments.manage', label: 'Add / rename / delete departments', category: 'Departments' },

  { key: 'attendance.view', label: 'View attendance', category: 'Attendance' },
  { key: 'attendance.mark', label: 'Mark / edit attendance', category: 'Attendance' },

  { key: 'payroll.view', label: 'View payroll', category: 'Payroll' },
  { key: 'payroll.generate', label: 'Generate / regenerate payroll', category: 'Payroll' },
  { key: 'payroll.adjust', label: 'Edit OT / LOP / advance adjustments', category: 'Payroll' },
  { key: 'payroll.slip', label: 'View / download salary slips', category: 'Payroll' },

  { key: 'reports.view', label: 'View reports', category: 'Reports' },
  { key: 'reports.export', label: 'Export reports (Excel/PDF)', category: 'Reports' },

  { key: 'leaveRequests.view', label: 'View leave requests', category: 'Leave Requests' },
  { key: 'leaveRequests.review', label: 'Approve / reject leave requests', category: 'Leave Requests' },

  { key: 'settings.manage', label: 'Edit company settings & payroll constants', category: 'Settings' },
  { key: 'settings.logo', label: 'Upload company logo', category: 'Settings' },

  { key: 'users.manage', label: 'Create / deactivate / delete user accounts', category: 'Users' },
  { key: 'permissions.manage', label: 'Configure role & user permissions', category: 'Users' },

  { key: 'auditLog.view', label: 'View the audit log', category: 'Audit Log' },

  { key: 'notifications.send', label: 'Email payslips / trigger manual notifications', category: 'Notifications' },
  { key: 'notifications.view', label: 'View notification send history', category: 'Notifications' },

  { key: 'dashboard.view', label: 'View the dashboard', category: 'Dashboard' },
];

// Default allow/deny per role, matching the behavior that was previously
// hardcoded via requireRole(...) — this seed is what makes the switch to
// a configurable system behavior-neutral on first migration.
const MANAGER_KEYS = PERMISSION_CATALOG.map((p) => p.key); // Manager gets everything by default
const ACCOUNTANT_KEYS = [
  'dashboard.view',
  'employees.view',
  'departments.view',
  'attendance.view',
  'payroll.view', 'payroll.generate', 'payroll.adjust', 'payroll.slip',
  'reports.view', 'reports.export',
  'notifications.send', 'notifications.view',
];
const HR_STAFF_KEYS = [
  'dashboard.view',
  'employees.view', 'employees.create', 'employees.edit', 'employees.delete', 'employees.photo', 'employees.bulkImport', 'employees.leaveLink',
  'departments.view', 'departments.manage',
  'attendance.view', 'attendance.mark',
  'payroll.view', 'payroll.slip',
  'reports.view', 'reports.export',
  'leaveRequests.view', 'leaveRequests.review',
];

const DEFAULT_ROLE_PERMISSIONS: Record<'MANAGER' | 'ACCOUNTANT' | 'HR_STAFF', string[]> = {
  MANAGER: MANAGER_KEYS,
  ACCOUNTANT: ACCOUNTANT_KEYS,
  HR_STAFF: HR_STAFF_KEYS,
};

export async function seedPermissions() {
  // Upsert the permission catalog itself.
  for (const perm of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { label: perm.label, category: perm.category },
      create: perm,
    });
  }

  const allPermissions = await prisma.permission.findMany();
  const permissionByKey = new Map(allPermissions.map((p) => [p.key, p]));

  // Upsert role defaults. Every (role, permission) pair gets an explicit
  // row — including explicit `allowed: false` ones — so the admin UI has
  // something to toggle for every cell in the matrix, not just the ones
  // that happen to be true.
  const roles: ('MANAGER' | 'ACCOUNTANT' | 'HR_STAFF')[] = ['MANAGER', 'ACCOUNTANT', 'HR_STAFF'];
  for (const role of roles) {
    const allowedKeys = new Set(DEFAULT_ROLE_PERMISSIONS[role]);
    for (const perm of allPermissions) {
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role, permissionId: perm.id } },
        update: {}, // never overwrite an existing row on re-seed — an admin may have already customized it
        create: { role, permissionId: perm.id, allowed: allowedKeys.has(perm.key) },
      });
    }
  }

  console.log(`Seeded ${allPermissions.length} permissions across ${roles.length} roles.`);
}
