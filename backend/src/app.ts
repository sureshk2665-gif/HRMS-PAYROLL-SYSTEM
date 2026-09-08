import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import 'express-async-errors';

const app = express();

// crossOriginResourcePolicy is disabled because the frontend (port 5173)
// loads uploaded images (employee photos, company logo) directly from this
// backend (port 5000) via <img src>, which helmet's default policy blocks
// as a cross-origin resource.
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Serve uploaded files (employee photos, company logo) as static assets.
const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads';
app.use('/uploads', express.static(path.resolve(UPLOADS_DIR)));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'hrms-payroll-backend', timestamp: new Date().toISOString() });
});

// ---- Route mounts ----
import authRoutes from './routes/auth.routes';
import employeeRoutes from './routes/employee.routes';
import departmentRoutes from './routes/department.routes';
import attendanceRoutes from './routes/attendance.routes';
import payrollRoutes from './routes/payroll.routes';
import reportRoutes from './routes/report.routes';
import dashboardRoutes from './routes/dashboard.routes';
import settingsRoutes from './routes/settings.routes';
import auditLogRoutes from './routes/auditLog.routes';
import leaveRequestRoutes from './routes/leaveRequest.routes';
import publicLeaveRequestRoutes from './routes/publicLeaveRequest.routes';
import permissionsRoutes from './routes/permissions.routes';
import notificationRoutes from './routes/notification.routes';

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/notifications', notificationRoutes);
// Public, no-auth — accessed via an employee's unique token link, not a login session.
app.use('/api/public/leave-requests', publicLeaveRequestRoutes);

// ---- 404 handler ----
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ---- Global error handler ----
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

export default app;
