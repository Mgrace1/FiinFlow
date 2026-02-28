import { Router } from 'express';
import {
  uploadFile,
  getFiles,
  getFile,
  downloadFile,
  deleteFile,
  uploadInvoiceAttachment,
  getInvoiceAttachments,
  deleteInvoiceAttachment
} from '../controllers/fileController';
import { verifyCompanyAccess, requireFinanceAccess } from '../middleware/auth';
import { uploadSingle, handleUploadError } from '../middleware/upload';

const router = Router();

// All routes require company access
router.use(verifyCompanyAccess);

// General file routes
router.post('/', uploadSingle('file'), handleUploadError, uploadFile);
router.get('/', getFiles);
router.get('/:id', getFile);
router.get('/:id/download', downloadFile);
router.delete('/:id', deleteFile);

// Invoice attachment routes
router.post('/invoices/:invoiceId/attachments', uploadSingle('file'), handleUploadError, uploadInvoiceAttachment);
router.get('/invoices/:invoiceId/attachments', getInvoiceAttachments);
router.delete('/invoices/:invoiceId/attachments/:fileId', requireFinanceAccess, deleteInvoiceAttachment);

export default router;
