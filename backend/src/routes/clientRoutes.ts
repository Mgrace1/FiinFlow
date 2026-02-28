import { Router } from 'express';
import { createClient, getClients, getClient, updateClient, deleteClient } from '../controllers/clientController';
import { verifyCompanyAccess, requireFinanceAccess } from '../middleware/auth';

const router = Router();

// All routes require company access
router.use(verifyCompanyAccess);

// Finance and admin can manage clients
router.post('/', requireFinanceAccess, createClient);
router.put('/:id', requireFinanceAccess, updateClient);
router.delete('/:id', requireFinanceAccess, deleteClient);

// All can view
router.get('/', getClients);
router.get('/:id', getClient);

export default router;
