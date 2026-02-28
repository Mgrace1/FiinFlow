import { Router } from 'express';
import { getDashboardData, getReports, getDashboardStats } from '../controllers/dashboardController';
import { verifyCompanyAccess } from '../middleware/auth';

const router = Router();

// All routes require company access
router.use(verifyCompanyAccess);

router.get('/', getDashboardData);
router.get('/stats', getDashboardStats);
router.get('/reports', getReports);

export default router;
