import express from 'express';
import {
  login,
  setPassword,
  forgotPassword,
  resetPassword,
  getMyWorkspaces,
  switchWorkspace,
  createWorkspace,
} from '../controllers/authController';
import { verifyCompanyAccess, requireStaffAccess } from '../middleware/auth';

const router = express.Router();

router.post('/login', login);
router.post('/set-password', setPassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/workspaces', verifyCompanyAccess, requireStaffAccess, getMyWorkspaces);
router.post('/switch-workspace', verifyCompanyAccess, requireStaffAccess, switchWorkspace);
router.post('/workspaces', verifyCompanyAccess, requireStaffAccess, createWorkspace);

export default router;
