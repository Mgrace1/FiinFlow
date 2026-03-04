import { Router } from 'express';
import authRoutes from './auth';
import companyRoutes from './companyRoutes';
import userRoutes from './userRoutes';
import clientRoutes from './clientRoutes';
import invoiceRoutes from './invoiceRoutes';
import expenseRoutes from './expenseRoutes';
import fileRoutes from './fileRoutes';
import dashboardRoutes from './dashboardRoutes';
import notificationRoutes from './notificationRoutes';
import reportRoutes from './reportRoutes';
import aiRoutes from './aiRoutes';
import kpayRoutes from './kpayRoutes';
import searchRoutes from './searchRoutes';
import paymentIngestionRoutes from './paymentIngestionRoutes';

import { fixCompanyLoginUrl } from '../controllers/companyController';
import { testEmail } from '../controllers/mailerController';
import forecastingRoutes from './forecastingRoutes';

const router = Router();

// Health check
router.get('/health', (_req, res) =>{
  res.json({
    success: true,
    message: 'FinFlow API is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/companies', companyRoutes);
router.use('/users', userRoutes);
router.use('/clients', clientRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/expenses', expenseRoutes);
router.use('/files', fileRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/ai', aiRoutes);
router.use('/forecasting', forecastingRoutes);
router.use('/kpay', kpayRoutes);
router.use('/search', searchRoutes);
router.use('/payment-ingestion', paymentIngestionRoutes);

// Additional routes
router.get('/mailer/test', testEmail);

export default router;
