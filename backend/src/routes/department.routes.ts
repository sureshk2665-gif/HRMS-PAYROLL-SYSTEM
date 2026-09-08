import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../services/permission.service';
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/department.controller';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('departments.view'), listDepartments);
router.post('/', requirePermission('departments.manage'), createDepartment);
router.put('/:id', requirePermission('departments.manage'), updateDepartment);
router.delete('/:id', requirePermission('departments.manage'), deleteDepartment);

export default router;
