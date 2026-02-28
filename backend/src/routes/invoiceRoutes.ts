import { Router } from 'express';
import {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  updateInvoiceStatus,
  markInvoiceAsPaid,
  deleteInvoice,
  uploadInvoiceAttachment,
  deleteInvoiceAttachment,
  getNextInvoiceNumber,
} from '../controllers/invoiceController';
import { verifyCompanyAccess, requireFinanceAccess, requireStaffAccess, requireDraftAccess } from '../middleware/auth';
import { uploadSingle, handleUploadError } from '../middleware/upload';

const router = Router();

// All routes require company access
router.use(verifyCompanyAccess);

// Staff can create draft invoices, Finance and Admin can create any status
router.post('/', requireStaffAccess, requireDraftAccess, createInvoice);

// Staff can only update drafts, Finance and Admin can update any
router.put('/:id', requireStaffAccess, requireDraftAccess, updateInvoice);

// Only Finance and Admin can change status, mark paid, and delete
router.patch('/:id/status', requireFinanceAccess, updateInvoiceStatus);
router.put('/:id/mark-paid', requireFinanceAccess, markInvoiceAsPaid);
router.delete('/:id', requireFinanceAccess, deleteInvoice);

// All can view
router.get('/', getInvoices);
router.get('/next-number', getNextInvoiceNumber);
router.get('/:id', getInvoice);

// Attachment management - Staff can upload, Finance can delete
router.post(
  '/:invoiceId/attachments',
  requireStaffAccess,
  uploadSingle('file'),
  handleUploadError,
  uploadInvoiceAttachment
);
router.delete(
  '/:invoiceId/attachments/:fileId',
  requireFinanceAccess,
  deleteInvoiceAttachment
);

export default router;
