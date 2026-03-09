import { Router } from 'express';
import { requireSuperAdmin, verifyCompanyAccess } from '../middleware/auth';
import {
  createCompanyGlobal,
  createUserGlobal,
  deleteCompanyGlobal,
  deleteUserGlobal,
  getCompanyById,
  listCompanies,
  listUsersGlobal,
  updateCompanyGlobal,
  updateUserGlobal,
} from '../controllers/platformController';

const router = Router();

router.use(verifyCompanyAccess, requireSuperAdmin);

router.get('/companies', listCompanies);
router.get('/companies/:companyId', getCompanyById);
router.post('/companies', createCompanyGlobal);
router.put('/companies/:companyId', updateCompanyGlobal);
router.delete('/companies/:companyId', deleteCompanyGlobal);

router.get('/users', listUsersGlobal);
router.post('/users', createUserGlobal);
router.put('/users/:userId', updateUserGlobal);
router.delete('/users/:userId', deleteUserGlobal);

export default router;
