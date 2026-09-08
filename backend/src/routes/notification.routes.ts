import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../services/permission.service';
import { listNotificationLogs, getNotificationConfigStatus } from '../controllers/notification.controller';

const router = Router();

router.use(requireAuth);

router.get('/config-status', getNotificationConfigStatus); // any authenticated user — read-only, informational
router.get('/logs', requirePermission('notifications.view'), listNotificationLogs);

export default router;
