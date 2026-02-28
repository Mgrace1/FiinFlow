import { Request, Response } from 'express';
import { Expense } from '../models';
import { initiatePayment, checkPaymentStatus } from '../services/kpayService';
import { AuthRequest } from '../middleware/auth';

export const initiatePaymentController = async (req: AuthRequest, res: Response) => {
  try {
    const { expenseId } = req.body;
    const expense = await Expense.findById(expenseId);

    if (!expense) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    const pmethod: 'momo' | 'cc' | 'spenn' = expense.paymentMethod === 'Mobile Money' ? 'momo' : 'cc';

    const paymentData = {
      msisdn: '250783000001', // Replace with actual customer phone number
      email: 'customer@example.com', // Replace with actual customer email
      details: expense.description || 'Expense payment',
      refid: expense._id.toString(),
      amount: expense.amount,
      cname: 'Customer Name', // Replace with actual customer name
      cnumber: '12345', // Replace with actual customer number
      pmethod,
      returl: 'https://localhost:5173/api/kpay/callback', // Replace with your callback URL
      redirecturl: 'https://localhost:5173/expenses', // Replace with your redirect URL
    };

    const kpayResponse = await initiatePayment(paymentData);

    res.json({ success: true, data: kpayResponse });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const checkPaymentStatusController = async (req: AuthRequest, res: Response) => {
  try {
    const { expenseId } = req.body;
    const expense = await Expense.findById(expenseId);

    if (!expense) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    const kpayResponse = await checkPaymentStatus(expense._id.toString());

    res.json({ success: true, data: kpayResponse });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const kpayCallbackController = async (req: Request, res: Response) => {
  try {
    const { refid, statusid } = req.body;

    let paymentStatus: 'pending' | 'paid' | 'failed' = 'pending';

    if (statusid === '01') {
      paymentStatus = 'paid';
    } else if (statusid === '02') {
      paymentStatus = 'failed';
    }

    await Expense.findByIdAndUpdate(refid, { paymentStatus });

    res.json({ refid, reply: 'OK' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
