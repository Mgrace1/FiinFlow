import { Response } from 'express';
import { Expense, Notification } from '../models';
import { AuthRequest } from '../middleware/auth';

const isSameCalendarDate = (a: Date, b: Date): boolean => (
  a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth()
  && a.getDate() === b.getDate()
);

const parseValidDate = (value: any): Date | null => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};


export const createExpense = async (req: AuthRequest, res: Response) =>{
  try {
    const { clientId, receiptFileId, supplier, category, amount, amountPaid, currency, dueDate, date, description, paymentMethod } = req.body;

    if (!supplier || !category || !amount || !dueDate || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields',
      });
    }

    const totalAmount = Number(amount);
    const paid = Number(amountPaid) || 0;
    const parsedDueDate = parseValidDate(dueDate);
    if (!parsedDueDate) {
      return res.status(400).json({
        success: false,
        error: 'Invalid due date',
      });
    }

    const parsedExplicitDate = parseValidDate(date);
    const dateMeta = parsedExplicitDate || parsedDueDate || new Date();

    const expense = await Expense.create({
      companyId: req.companyId,
      clientId,
      receiptFileId,
      supplier,
      category,
      amount: totalAmount,
      amountPaid: paid,
      date: dateMeta,
      currency: currency || 'RWF',
      dueDate: parsedDueDate,
      description,
      paymentMethod,
      paymentStatus: paid >= totalAmount ? 'paid' : 'pending',
      createdBy: req.userId,
    });

    await expense.populate('clientId');
    await expense.populate('receiptFileId');

    const expenseObj = expense.toObject() as any;
    expenseObj.remainingAmount = expenseObj.amount - expenseObj.amountPaid;

    const dueAt = parsedDueDate;
    const today = new Date();
    if (expenseObj.remainingAmount > 0 && isSameCalendarDate(dueAt, today)) {
      await Notification.create({
        companyId: req.companyId,
        type: 'expense_due_today',
        title: 'Expense Payment Due Today',
        message: `Expense for ${supplier} is due today with ${Number(expenseObj.remainingAmount || 0).toLocaleString()} ${(currency || 'RWF')} remaining.`,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: expenseObj,
    });
  } catch (error: any) {
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create expense',
    });
  }
};

export const getExpenses = async (req: AuthRequest, res: Response) =>{
  try {
    const { clientId, category, startDate, endDate } = req.query;
    const filter: any = req.userRole === 'super_admin' ? {} : { companyId: req.companyId };

    if (clientId) filter.clientId = clientId;
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.dueDate = {};
      if (startDate) {
        const parsedStartDate = parseValidDate(startDate as string);
        if (!parsedStartDate) {
          return res.status(400).json({
            success: false,
            error: 'Invalid start date',
          });
        }
        filter.dueDate.$gte = parsedStartDate;
      }
      if (endDate) {
        const parsedEndDate = parseValidDate(endDate as string);
        if (!parsedEndDate) {
          return res.status(400).json({
            success: false,
            error: 'Invalid end date',
          });
        }
        filter.dueDate.$lte = parsedEndDate;
      }
    }

    const expenses = await Expense.find(filter)
      .populate('clientId')
      .populate('receiptFileId')
      .sort({ dueDate: -1 });

    const expensesWithRemaining = expenses.map((e) => {
      const obj = e.toObject() as any;
      obj.date = obj.date || obj.createdAt || obj.dueDate;
      obj.remainingAmount = obj.amount - (obj.amountPaid || 0);
      return obj;
    });

    res.json({
      success: true,
      data: expensesWithRemaining,
    });
  } catch (error: any) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch expenses',
    });
  }
};

export const getExpense = async (req: AuthRequest, res: Response) =>{
  try {
    const isSuperAdmin = req.userRole === 'super_admin';
    const expense = await Expense.findOne(
      isSuperAdmin
        ? { _id: req.params.id }
        : { _id: req.params.id, companyId: req.companyId }
    )
      .populate('clientId')
      .populate('receiptFileId');

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
      });
    }

    const expenseObj = expense.toObject() as any;
    expenseObj.date = expenseObj.date || expenseObj.createdAt || expenseObj.dueDate;
    expenseObj.remainingAmount = expenseObj.amount - (expenseObj.amountPaid || 0);

    res.json({
      success: true,
      data: expenseObj,
    });
  } catch (error: any) {
    console.error('Get expense error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch expense',
    });
  }
};

export const updateExpense = async (req: AuthRequest, res: Response) =>{
  try {
    const updates = { ...req.body } as any;

    if (updates.dueDate !== undefined) {
      const parsedDueDate = parseValidDate(updates.dueDate);
      if (!parsedDueDate) {
        return res.status(400).json({
          success: false,
          error: 'Invalid due date',
        });
      }
      updates.dueDate = parsedDueDate;

      // Keep metadata date aligned when due date changes and explicit date is absent.
      if (updates.date === undefined) {
        updates.date = parsedDueDate;
      }
    }

    if (updates.date !== undefined) {
      const parsedDate = parseValidDate(updates.date);
      if (!parsedDate) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date',
        });
      }
      updates.date = parsedDate;
    }

    const isSuperAdmin = req.userRole === 'super_admin';
    const expense = await Expense.findOneAndUpdate(
      {
        _id: req.params.id,
        ...(isSuperAdmin ? {} : { companyId: req.companyId }),
      },
      updates,
      { new: true, runValidators: true }
    )
      .populate('clientId')
      .populate('receiptFileId');

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
      });
    }

    res.json({
      success: true,
      message: 'Expense updated successfully',
      data: {
        ...(expense.toObject() as any),
        date: (expense as any).date || (expense as any).createdAt || (expense as any).dueDate,
      },
    });
  } catch (error: any) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update expense',
    });
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response) =>{
  try {
    const isSuperAdmin = req.userRole === 'super_admin';
    const expense = await Expense.findOneAndDelete(
      isSuperAdmin
        ? { _id: req.params.id }
        : { _id: req.params.id, companyId: req.companyId }
    );

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
      });
    }

    res.json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete expense',
    });
  }
};
