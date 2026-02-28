import { Router } from 'express';
import { createCompany, getCompany, updateCompany, uploadCompanyLogo, deleteCompany, getAllCompanies, fixCompanyLoginUrl } from '../controllers/companyController';
import { verifyCompanyAccess, requireAdmin } from '../middleware/auth';
import { uploadCompanyLogo as uploadLogoMiddleware, handleUploadError } from '../middleware/upload';

const router = Router();

// Public route - create company
router.post('/', createCompany);

// Admin testing route - get all companies (no auth required for testing)
router.get('/all', getAllCompanies);

// Protected routes - require company access
router.get('/', verifyCompanyAccess, getCompany);
router.put('/', verifyCompanyAccess, requireAdmin, updateCompany);
router.delete('/:companyId', verifyCompanyAccess, requireAdmin, deleteCompany);
router.post('/logo', verifyCompanyAccess, requireAdmin, uploadLogoMiddleware.single('logo'), handleUploadError, uploadCompanyLogo);

router.patch('/:companyId/fix-login-url', verifyCompanyAccess, requireAdmin, fixCompanyLoginUrl);

export default router;
