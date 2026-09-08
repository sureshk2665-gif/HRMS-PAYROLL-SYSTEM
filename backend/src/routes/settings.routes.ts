import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../services/permission.service';
import { getSettings, updateSettings } from '../controllers/settings.controller';
import { uploadCompanyLogo, logoUploadMiddleware } from '../controllers/companyLogo.controller';

const router = Router();

router.use(requireAuth);
router.get('/', getSettings); // reading company name/logo is needed app-wide (sidebar), not permission-gated
router.put('/', requirePermission('settings.manage'), updateSettings);
router.post('/logo', requirePermission('settings.logo'), logoUploadMiddleware, uploadCompanyLogo);

export default router;
