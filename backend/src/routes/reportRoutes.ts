import { Router } from 'express';
import {
  generateInvoicePDF,
  generateExpensesPDF,
  generateSummaryPDF,
  getPerformanceAnalytics,
} from '../controllers/reportController';
import { verifyCompanyAccess } from '../middleware/auth';

const router = Router();

// All report routes require company access
// PDF generation endpoints
router.get('/invoices/:invoiceId/pdf', verifyCompanyAccess, generateInvoicePDF);
router.get('/expenses/pdf', verifyCompanyAccess, generateExpensesPDF);
router.get('/summary/pdf', verifyCompanyAccess, generateSummaryPDF);
router.get('/performance', verifyCompanyAccess, getPerformanceAnalytics);

export default router;
