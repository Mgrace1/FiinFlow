import { Response } from 'express';
import { Expense } from '../models';
import { AuthRequest } from '../middleware/auth';

export const createExpense = async (req: AuthRequest, res: Response) =>{
  try {
    const { clientId, supplier, category, amount, amountPaid, currency, dueDate, description, paymentMethod } = req.body;

    if (!supplier || !category || !amount || !dueDate || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields',
      });
    }

    const totalAmount = Number(amount);
    const paid = Number(amountPaid) || 0;

    const expense = await Expense.create({
      companyId: req.companyId,
      clientId,
      supplier,
      category,
      amount: totalAmount,
      amountPaid: paid,
      currency: currency || 'RWF',
      dueDate,
      description,
      paymentMethod,
      paymentStatus: paid >= totalAmount ? 'paid' : 'pending',
      createdBy: req.userId,
    });

    await expense.populate('clientId');

    const expenseObj = expense.toObject() as any;
    expenseObj.remainingAmount = expenseObj.amount - expenseObj.amountPaid;

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
    const filter: any = { companyId: req.companyId };

    if (clientId) filter.clientId = clientId;
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.dueDate = {};
      if (startDate) filter.dueDate.$gte = new Date(startDate as string);
      if (endDate) filter.dueDate.$lte = new Date(endDate as string);
    }

    const expenses = await Expense.find(filter)
      .populate('clientId')
      .sort({ dueDate: -1 });

    const expensesWithRemaining = expenses.map((e) => {
      const obj = e.toObject() as any;
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
    const expense = await Expense.findOne({
      _id: req.params.id,
      companyId: req.companyId,
    })
      .populate('clientId');

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
      });
    }

    const expenseObj = expense.toObject() as any;
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
    const updates = req.body;

    const expense = await Expense.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.companyId,
      },
      updates,
      { new: true, runValidators: true }
    )
      .populate('clientId');

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
      });
    }

    res.json({
      success: true,
      message: 'Expense updated successfully',
      data: expense,
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
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      companyId: req.companyId,
    });

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
