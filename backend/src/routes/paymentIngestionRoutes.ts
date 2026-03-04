import { Router } from 'express';
import {
  createIngestionConnection,
  deleteIngestionConnection,
  getIngestionConnections,
  getIngestionEvents,
  gmailPushWebhook,
  ingestPaymentAlert,
} from '../controllers/paymentIngestionController';
import { requireFinanceAccess, verifyCompanyAccess } from '../middleware/auth';

const router = Router();

// External webhook (no JWT; protected by webhook secret)
router.post('/webhooks/gmail', gmailPushWebhook);

// Internal management and manual ingestion
router.use(verifyCompanyAccess);

router.get('/connections', requireFinanceAccess, getIngestionConnections);
router.post('/connections', requireFinanceAccess, createIngestionConnection);
router.delete('/connections/:id', requireFinanceAccess, deleteIngestionConnection);

router.post('/alerts', requireFinanceAccess, ingestPaymentAlert);
router.get('/events', requireFinanceAccess, getIngestionEvents);

export default router;
