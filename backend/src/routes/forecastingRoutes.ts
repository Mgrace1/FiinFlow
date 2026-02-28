import { Router } from 'express';
import { getFinancialForecast } from '../controllers/forecastingController';
import { verifyCompanyAccess } from '../middleware/auth';

const router = Router();

router.get('/forecast', verifyCompanyAccess, getFinancialForecast);

export default router;
