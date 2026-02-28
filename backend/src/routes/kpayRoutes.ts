import { Router } from 'express';
import { initiatePaymentController, checkPaymentStatusController, kpayCallbackController } from '../controllers/kpayController';
import { verifyCompanyAccess } from '../middleware/auth';

const router = Router();

router.post('/pay', verifyCompanyAccess, initiatePaymentController);
router.post('/status', verifyCompanyAccess, checkPaymentStatusController);
router.post('/callback', kpayCallbackController);

export default router;
