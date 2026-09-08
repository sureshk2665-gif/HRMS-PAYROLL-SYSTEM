import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import EmployeesPage from './pages/EmployeesPage';
import DepartmentsPage from './pages/DepartmentsPage';
import AttendancePage from './pages/AttendancePage';
import PayrollPage from './pages/PayrollPage';
import SalarySlipPage from './pages/SalarySlipPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';
import AuditLogPage from './pages/AuditLogPage';
import LeaveRequestsPage from './pages/LeaveRequestsPage';
import PublicLeaveRequestPage from './pages/PublicLeaveRequestPage';
import PermissionsPage from './pages/PermissionsPage';
import NotificationLogsPage from './pages/NotificationLogsPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Public, no-login — accessed via an employee's unique token link */}
            <Route path="/leave-request/:code/:token" element={<PublicLeaveRequestPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/departments" element={<DepartmentsPage />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/payroll" element={<PayrollPage />} />
              <Route path="/payroll/slip/:code/:year/:month" element={<SalarySlipPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/permissions" element={<PermissionsPage />} />
              <Route path="/audit-log" element={<AuditLogPage />} />
              <Route path="/notifications" element={<NotificationLogsPage />} />
              <Route path="/leave-requests" element={<LeaveRequestsPage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
