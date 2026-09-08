import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../services/permission.service';
import { getDashboardSummary } from '../controllers/dashboard.controller';

const router = Router();

router.use(requireAuth, requirePermission('dashboard.view'));
router.get('/summary', getDashboardSummary);

export default router;
