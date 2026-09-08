import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../services/permission.service';
import {
  generatePayroll,
  getPayrollForMonth,
  getPayrollForEmployee,
  getAdjustments,
  saveAdjustments,
  emailPayslip,
  emailAllPayslips,
} from '../controllers/payroll.controller';
import { getSalarySlipPdf } from '../controllers/salarySlip.controller';

const router = Router();

router.use(requireAuth);

router.get('/adjustments', requirePermission('payroll.view'), getAdjustments);
router.post('/adjustments', requirePermission('payroll.adjust'), saveAdjustments);
router.post('/generate', requirePermission('payroll.generate'), generatePayroll);
router.post('/email-all', requirePermission('notifications.send'), emailAllPayslips);
router.get('/:employeeCode/slip', requirePermission('payroll.slip'), getSalarySlipPdf);
router.post('/:employeeCode/email-slip', requirePermission('notifications.send'), emailPayslip);
router.get('/:employeeCode', requirePermission('payroll.view'), getPayrollForEmployee);
router.get('/', requirePermission('payroll.view'), getPayrollForMonth);

export default router;
