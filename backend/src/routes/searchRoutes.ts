import { Router } from 'express';
import { verifyCompanyAccess } from '../middleware/auth';
import { searchRecords } from '../controllers/searchController';

const router = Router();

router.use(verifyCompanyAccess);
router.get('/', searchRecords);

export default router;
