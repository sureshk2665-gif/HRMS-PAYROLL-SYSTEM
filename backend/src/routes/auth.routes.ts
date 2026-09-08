import { Router } from 'express';
import {
  login,
  logout,
  me,
  changePassword,
  listUsers,
  createUser,
  setUserActiveStatus,
  resetUserPassword,
  deleteUser,
} from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../services/permission.service';

const router = Router();

// Public
router.post('/login', login);

// Any authenticated user
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);
router.post('/change-password', requireAuth, changePassword);

// Gated by users.manage — by default only MANAGER has it, but it's now
// configurable rather than hardcoded to the role.
router.get('/users', requireAuth, requirePermission('users.manage'), listUsers);
router.post('/users', requireAuth, requirePermission('users.manage'), createUser);
router.patch('/users/:id/status', requireAuth, requirePermission('users.manage'), setUserActiveStatus);
router.post('/users/:id/reset-password', requireAuth, requirePermission('users.manage'), resetUserPassword);
router.delete('/users/:id', requireAuth, requirePermission('users.manage'), deleteUser);

export default router;
