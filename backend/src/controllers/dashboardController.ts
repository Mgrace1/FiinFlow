import { Response } from 'express';
import { Invoice, Expense, File as FileModel, Company } from '../models';
import { AuthRequest } from '../middleware/auth';
import { ProfitService } from '../services/profitService';

export const getDashboardData = async (req: AuthRequest, res: Response) =>{
  try {
    // Get overall profit data
    const profitData = await ProfitService.calculateOverallProfit(req.companyId!);

    // Get outstanding invoices
    const outstandingInvoices = await Invoice.find({
      companyId: req.companyId,
      status: { $in: ['draft', 'sent', 'overdue'] },
      $expr: {
        $lt: [
          { $ifNull: ['$amountPaid', 0] },
          { $ifNull: ['$totalAmount', '$amount'] },
        ],
      },
    }).countDocuments();

    // Get recent uploads
    const recentUploads = await FileModel.find({ companyId: req.companyId })
      .sort({ uploadedAt: -1 })
      .limit(10);

    // Get top 5 clients
    const topClients = await ProfitService.getTopClients(req.companyId!, 5);

    // Get monthly data for charts (last 6 months)
    const monthlyData = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthData = await ProfitService.getMonthlyProfit(
        req.companyId!,
        date.getFullYear(),
        date.getMonth() + 1
      );

      monthlyData.push({
        month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
        revenue: monthData.totalRevenue,
        expenses: monthData.totalExpenses,
        profit: monthData.profit,
      });
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: profitData.totalRevenue,
          totalExpenses: profitData.totalExpenses,
          profit: profitData.profit,
          profitMargin: profitData.profitMargin,
          outstandingInvoices,
        },
        topClients,
        monthlyData,
        recentUploads,
      },
    });
  } catch (error: any) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch dashboard data',
    });
  }
};

export const getReports = async (req: AuthRequest, res: Response) =>{
  try {
    const { startDate, endDate, clientId } = req.query;
    const isSuperAdmin = req.userRole === 'super_admin';

    // Load company settings for currency conversion
    const company = await Company.findById(req.companyId).select('defaultCurrency exchangeRateUSD');
    const targetCurrency = String(company?.defaultCurrency || 'RWF').toUpperCase() === 'USD' ? 'USD' : 'RWF';
    const exchangeRateUSD = Number(company?.exchangeRateUSD || 1300) > 0 ? Number(company?.exchangeRateUSD) : 1300;
    const convert = (amount: number, sourceCurrency?: string) => {
      const safeAmount = Number(amount || 0);
      const source = String(sourceCurrency || 'RWF').toUpperCase() === 'USD' ? 'USD' : 'RWF';
      if (source === targetCurrency) return safeAmount;
      if (source === 'USD' && targetCurrency === 'RWF') return safeAmount * exchangeRateUSD;
      if (source === 'RWF' && targetCurrency === 'USD') return safeAmount / exchangeRateUSD;
      return safeAmount;
    };

    // Build date filter
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = new Date(startDate as string);
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    // Build invoice filter
    const invoiceFilter: any = isSuperAdmin ? {} : { companyId: req.companyId };
    if (clientId) invoiceFilter.clientId = clientId;
    if (Object.keys(dateFilter).length > 0) {
      invoiceFilter.createdAt = dateFilter;
    }

    // Build expense filter (use dueDate — the correct field name)
    const expenseFilter: any = isSuperAdmin ? {} : { companyId: req.companyId };
    if (clientId) expenseFilter.clientId = clientId;
    if (Object.keys(dateFilter).length > 0) {
      expenseFilter.dueDate = dateFilter;
    }

    // Get invoices and expenses for the filtered period
    const invoices = await Invoice.find(invoiceFilter).populate('clientId');
    const expenses = await Expense.find(expenseFilter).populate('clientId');

    // Calculate totals with currency conversion
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalPending = 0;

    invoices.forEach((inv: any) =>{
      const convertedTotal = convert(inv.totalAmount, inv.currency);
      const convertedPaid = Math.min(convert(inv.amountPaid || 0, inv.currency), convertedTotal);
      const convertedRemaining = Math.max(convertedTotal - convertedPaid, 0);

      totalPaid += convertedPaid;
      if (inv.status !== 'cancelled') {
        totalPending += convertedRemaining;
      }
      totalRevenue += convertedTotal;
    });

    let totalExpenses = 0;
    expenses.forEach((exp: any) =>{
      totalExpenses += convert(exp.amount, exp.currency);
    });

    // Profit is calculated from filtered data only (respects chosen date range)
    const profit = totalPaid - totalExpenses;
    const profitMargin = totalPaid > 0 ? (profit / totalPaid) * 100 : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalPaid,
          totalPending,
          totalExpenses,
          profit,
          profitMargin,
        },
        invoices,
        expenses,
      },
    });
  } catch (error: any) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch reports',
    });
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response) =>{
  try {
    const companyId = req.companyId;
    const isSuperAdmin = req.userRole === 'super_admin' || req.isSuperAdmin === true;
    const company = await Company.findById(companyId).select('defaultCurrency exchangeRateUSD');
    const targetCurrency = String(company?.defaultCurrency || 'RWF').toUpperCase() === 'USD' ? 'USD' : 'RWF';
    const exchangeRateUSD = Number(company?.exchangeRateUSD || 1300) > 0 ? Number(company?.exchangeRateUSD) : 1300;
    const convert = (amount: number, sourceCurrency?: string) => {
      const safeAmount = Number(amount || 0);
      const source = String(sourceCurrency || 'RWF').toUpperCase() === 'USD' ? 'USD' : 'RWF';
      if (source === targetCurrency) return safeAmount;
      if (source === 'USD' && targetCurrency === 'RWF') return safeAmount * exchangeRateUSD;
      if (source === 'RWF' && targetCurrency === 'USD') return safeAmount / exchangeRateUSD;
      return safeAmount;
    };

    // Last 6 months window (from the 1st day of the month 5 months ago).
    const now = new Date();
    const fromDate = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
    const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const getInvoiceRelevantDate = (inv: any) => {
      const status = String(inv?.status || '').toLowerCase();
      if (status === 'paid') return inv.paidAt || inv.updatedAt || inv.createdAt;
      if (status === 'sent' || status === 'overdue') return inv.dueDate || inv.updatedAt || inv.createdAt;
      return inv.updatedAt || inv.createdAt;
    };

    const getExpenseRelevantDate = (exp: any) => exp.date || exp.createdAt || exp.updatedAt;

    // Get invoices for the dashboard scope
    // - normal users: only their company
    // - super admin: all companies
    const invoicesAll = isSuperAdmin ? await Invoice.find({}) : await Invoice.find({ companyId });
    const invoices = invoicesAll.filter((inv: any) => {
      const d = getInvoiceRelevantDate(inv);
      if (!d) return false;
      const t = new Date(d).getTime();
      return t >= fromDate.getTime() && t <= toDate.getTime();
    });

    // Calculate stats
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter((inv) =>inv.status === 'paid');
    const overdueInvoices = invoices.filter((inv) =>inv.status === 'overdue');
    const draftInvoices = invoices.filter((inv) =>inv.status === 'draft');
    const cancelledInvoices = invoices.filter((inv) =>inv.status === 'cancelled');

    const totalRevenue = paidInvoices.reduce((sum, inv: any) => {
      const convertedTotal = convert(inv.totalAmount, inv.currency);
      const convertedPaid = Math.min(convert(inv.amountPaid || 0, inv.currency), convertedTotal);
      return sum + convertedPaid;
    }, 0);

    const pendingAmount = invoices
      .filter((inv) =>inv.status === 'sent' || inv.status === 'overdue')
      .reduce((sum, inv: any) => {
        const convertedTotal = convert(inv.totalAmount, inv.currency);
        const convertedPaid = Math.min(convert(inv.amountPaid || 0, inv.currency), convertedTotal);
        return sum + Math.max(convertedTotal - convertedPaid, 0);
      }, 0);

    // Get expenses for the dashboard scope
    // - normal users: only their company
    // - super admin: all companies
    const expensesAll = isSuperAdmin ? await Expense.find({}) : await Expense.find({ companyId });
    const expenses = expensesAll.filter((exp: any) => {
      const d = getExpenseRelevantDate(exp);
      if (!d) return false;
      const t = new Date(d).getTime();
      return t >= fromDate.getTime() && t <= toDate.getTime();
    });

    const totalExpenses = expenses.reduce((sum, exp: any) => sum + convert(exp.amount, exp.currency), 0);

    // Get invoices used by dashboard charts (all time).
    // For super admin, don't restrict by companyId.
    const latestInvoices = await Invoice.find(
      isSuperAdmin ? {} : { companyId }
    )
      .populate('clientId', 'name')
      .sort({ createdAt: -1 });

    // Get expenses used by dashboard charts (all time)
    const latestExpenses = await Expense.find(isSuperAdmin ? {} : { companyId })
      .sort({ date: -1, createdAt: -1 });

    res.json({
      success: true,
      data: {
        stats: {
          totalInvoices,
          totalPaid: paidInvoices.length,
          totalOverdue: overdueInvoices.length,
          totalDrafts: draftInvoices.length,
          totalCancelled: cancelledInvoices.length,
          totalRevenue,
          pendingAmount,
          totalExpenses,
          netIncome: totalRevenue - totalExpenses,
          currency: targetCurrency,
        },
        latestInvoices,
        latestExpenses,
      },
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get dashboard stats',
    });
  }
};
