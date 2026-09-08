import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../services/permission.service';
import { listLeaveRequests, reviewLeaveRequest } from '../controllers/leaveRequest.controller';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('leaveRequests.view'), listLeaveRequests);
router.post('/:id/review', requirePermission('leaveRequests.review'), reviewLeaveRequest);

export default router;
