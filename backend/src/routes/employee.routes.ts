import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../services/permission.service';
import {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from '../controllers/employee.controller';
import {
  downloadBulkImportTemplate,
  bulkImportEmployees,
  bulkImportUploadMiddleware,
} from '../controllers/employeeBulkImport.controller';
import { uploadEmployeePhoto, employeePhotoUploadMiddleware } from '../controllers/employeePhoto.controller';
import { generateLeaveRequestLink } from '../controllers/employeeLeaveLink.controller';

const router = Router();

router.use(requireAuth);

router.get('/bulk-import/template', requirePermission('employees.bulkImport'), downloadBulkImportTemplate);
router.post('/bulk-import', requirePermission('employees.bulkImport'), bulkImportUploadMiddleware, bulkImportEmployees);

router.get('/', requirePermission('employees.view'), listEmployees);
router.get('/:code', requirePermission('employees.view'), getEmployee);
router.post('/', requirePermission('employees.create'), createEmployee);
router.put('/:code', requirePermission('employees.edit'), updateEmployee);
router.delete('/:code', requirePermission('employees.delete'), deleteEmployee);
router.post('/:code/photo', requirePermission('employees.photo'), employeePhotoUploadMiddleware, uploadEmployeePhoto);
router.post('/:code/leave-link', requirePermission('employees.leaveLink'), generateLeaveRequestLink);

export default router;
