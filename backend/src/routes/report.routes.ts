import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../services/permission.service';
import {
  employeeReport,
  departmentReport,
  attendanceReport,
  payrollReport,
  salaryReport,
  leaveReport,
} from '../controllers/report.controller';

const router = Router();

// A report's own JSON view only needs reports.view; the ?format=xlsx/pdf
// export paths are the same handlers, so reports.export is checked inside
// each controller via respondWithReport rather than at the route level —
// see report.controller.ts.
router.use(requireAuth, requirePermission('reports.view'));

router.get('/employees', employeeReport);
router.get('/departments', departmentReport);
router.get('/attendance', attendanceReport);
router.get('/payroll', payrollReport);
router.get('/salary', salaryReport);
router.get('/leave', leaveReport);

export default router;
