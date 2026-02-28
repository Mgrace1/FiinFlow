import { Router } from 'express';
import { processReceipt } from '../controllers/aiController';
import { upload } from '../middleware/upload';


const router = Router();

// Route to process a receipt image
// The 'upload.single('receipt')' middleware handles the file upload
// 'protect' middleware ensures the user is authenticated
router.post('/process-receipt',  upload.single('receipt'), processReceipt);

export default router;
