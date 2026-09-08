import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../services/permission.service';
import {
  listPermissionCatalog,
  getRolePermissionMatrix,
  updateRolePermission,
  getUserPermissionOverrides,
  setUserPermissionOverride,
} from '../controllers/permissions.controller';

const router = Router();

router.use(requireAuth, requirePermission('permissions.manage'));

router.get('/catalog', listPermissionCatalog);
router.get('/roles', getRolePermissionMatrix);
router.put('/roles', updateRolePermission);
router.get('/users/:id', getUserPermissionOverrides);
router.put('/users/:id', setUserPermissionOverride);

export default router;
