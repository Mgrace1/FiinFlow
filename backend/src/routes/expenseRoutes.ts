import { Router } from 'express';
import {
  createExpense,
  getExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
} from '../controllers/expenseController';
import { verifyCompanyAccess, requireFinanceAccess } from '../middleware/auth';

const router = Router();

// All routes require company access
router.use(verifyCompanyAccess);

// All authenticated users can create expenses
router.post('/', createExpense);

// Finance and admin can manage expenses
router.put('/:id', requireFinanceAccess, updateExpense);
router.delete('/:id', requireFinanceAccess, deleteExpense);

// All can view
router.get('/', getExpenses);
router.get('/:id', getExpense);

export default router;
