import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../services/permission.service';
import { listAuditLogs, listAuditEntityTypes } from '../controllers/auditLog.controller';

const router = Router();

router.use(requireAuth, requirePermission('auditLog.view'));

router.get('/entity-types', listAuditEntityTypes);
router.get('/', listAuditLogs);

export default router;
