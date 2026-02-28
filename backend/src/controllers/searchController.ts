import { Response } from 'express';
import { Client, Expense, Invoice } from '../models';
import { AuthRequest } from '../middleware/auth';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const searchRecords = async (req: AuthRequest, res: Response) => {
  try {
    const rawQuery = (req.query.q as string | undefined)?.trim() || '';
    const query = rawQuery.slice(0, 120);

    if (!query) {
      return res.json({
        success: true,
        data: {
          clients: [],
          invoices: [],
          expenses: [],
        },
      });
    }

    const requestedLimit = Number(req.query.limit);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 25)
      : 8;

    const regex = new RegExp(escapeRegex(query), 'i');
    const companyId = req.companyId;

    const [clients, invoices, expenses] = await Promise.all([
      Client.find({
        companyId,
        $or: [
          { name: regex },
          { contactPerson: regex },
          { email: regex },
          { phone: regex },
          { address: regex },
        ],
      })
        .select('_id name contactPerson email phone address createdAt')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),

      Invoice.find({
        companyId,
        $or: [
          { invoiceNumber: regex },
          { status: regex },
          { notes: regex },
          { description: regex },
        ],
      })
        .populate('clientId', 'name')
        .select('_id invoiceNumber clientId status totalAmount amount dueDate createdAt')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),

      Expense.find({
        companyId,
        $or: [
          { supplier: regex },
          { category: regex },
          { description: regex },
          { paymentStatus: regex },
        ],
      })
        .select('_id supplier category description amount currency date paymentStatus createdAt')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
    ]);

    return res.json({
      success: true,
      data: {
        clients,
        invoices,
        expenses,
      },
    });
  } catch (error: any) {
    console.error('Search records error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to search records',
    });
  }
};
