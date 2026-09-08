import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../services/permission.service';
import {
  listAttendanceStatuses,
  listLeaveTypes,
  getAttendanceForDate,
  markAttendance,
  getMonthlyAttendanceReport,
} from '../controllers/attendance.controller';

const router = Router();

router.use(requireAuth);

router.get('/statuses', requirePermission('attendance.view'), listAttendanceStatuses);
router.get('/leave-types', requirePermission('attendance.view'), listLeaveTypes);
router.get('/report', requirePermission('attendance.view'), getMonthlyAttendanceReport);
router.get('/', requirePermission('attendance.view'), getAttendanceForDate);
router.post('/', requirePermission('attendance.mark'), markAttendance);

export default router;
