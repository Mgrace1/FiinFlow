import { Router } from 'express';
import {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  inviteUser,
  resendInvite,
  changePassword,
  getCurrentUser,
} from '../controllers/userController';
import { verifyCompanyAccess, requireAdmin } from '../middleware/auth';

const router = Router();

// All routes require company access
router.use(verifyCompanyAccess);

// Admin only routes
router.post('/', requireAdmin, createUser);
router.post('/invite', requireAdmin, inviteUser);
router.post('/:id/resend-invite', requireAdmin, resendInvite);


// All users can view
router.get('/', getUsers);
router.get('/me', getCurrentUser);
router.put('/change-password', changePassword);

// These routes should be last
router.put('/:id', requireAdmin, updateUser);
router.delete('/:id', requireAdmin, deleteUser);
router.get('/:id', getUser);

export default router;
