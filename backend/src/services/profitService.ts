import { Types } from 'mongoose';
import { Invoice, Expense, Client } from '../models';
import { CurrencyService } from './currencyService';

export interface ClientProfitData {
  clientId: Types.ObjectId;
  clientName: string;
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  currency: string;
}

export interface OverallProfitData {
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  profitMargin: number;
  currency: string;
}

export class ProfitService {
  /**
   * Calculate profit for a specific client
   */
  static async calculateClientProfit(
    companyId: Types.ObjectId,
    clientId: Types.ObjectId
  ): Promise<ClientProfitData>{
    // Get client details
    const client = await Client.findOne({ _id: clientId, companyId });
    if (!client) {
      throw new Error('Client not found');
    }

    // Get all paid invoices for this client
    const invoices = await Invoice.find({
      companyId,
      clientId,
      status: 'paid',
    });

    // Get all expenses for this client
    const expenses = await Expense.find({
      companyId,
      clientId,
    });

    // Calculate total revenue (convert all to RWF for consistency)
    let totalRevenue = 0;
    for (const invoice of invoices) {
      const amountInRWF = await CurrencyService.convertToRWF(
        invoice.totalAmount,
        invoice.currency,
        companyId
      );
      totalRevenue += amountInRWF;
    }

    // Calculate total expenses (convert all to RWF)
    let totalExpenses = 0;
    for (const expense of expenses) {
      const amountInRWF = await CurrencyService.convertToRWF(
        expense.amount,
        expense.currency,
        companyId
      );
      totalExpenses += amountInRWF;
    }

    const profit = totalRevenue - totalExpenses;

    return {
      clientId,
      clientName: client.name,
      totalRevenue,
      totalExpenses,
      profit,
      currency: 'RWF',
    };
  }

  /**
   * Calculate overall profit for the company
   */
  static async calculateOverallProfit(companyId: Types.ObjectId): Promise<OverallProfitData>{
    // Get all paid invoices
    const invoices = await Invoice.find({
      companyId,
      status: 'paid',
    });

    // Get all expenses
    const expenses = await Expense.find({ companyId });

    // Calculate total revenue (in RWF)
    let totalRevenue = 0;
    for (const invoice of invoices) {
      const amountInRWF = await CurrencyService.convertToRWF(
        invoice.totalAmount,
        invoice.currency,
        companyId
      );
      totalRevenue += amountInRWF;
    }

    // Calculate total expenses (in RWF)
    let totalExpenses = 0;
    for (const expense of expenses) {
      const amountInRWF = await CurrencyService.convertToRWF(
        expense.amount,
        expense.currency,
        companyId
      );
      totalExpenses += amountInRWF;
    }

    const profit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue >0 ? (profit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalExpenses,
      profit,
      profitMargin,
      currency: 'RWF',
    };
  }

  /**
   * Get top performing clients by profit
   */
  static async getTopClients(companyId: Types.ObjectId, limit: number = 5): Promise<ClientProfitData[]>{
    const clients = await Client.find({ companyId });
    const clientProfits: ClientProfitData[] = [];

    for (const client of clients) {
      try {
        const profitData = await this.calculateClientProfit(companyId, client._id);
        clientProfits.push(profitData);
      } catch (error) {
        console.error(`Error calculating profit for client ${client._id}:`, error);
      }
    }

    // Sort by profit (descending) and return top N
    return clientProfits.sort((a, b) =>b.profit - a.profit).slice(0, limit);
  }

  /**
   * Calculate monthly profit summary
   */
  static async getMonthlyProfit(
    companyId: Types.ObjectId,
    year: number,
    month: number
  ): Promise<OverallProfitData>{
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get invoices paid in this month
    const invoices = await Invoice.find({
      companyId,
      status: 'paid',
      paymentDate: { $gte: startDate, $lte: endDate },
    });

    // Get expenses in this month
    const expenses = await Expense.find({
      companyId,
      date: { $gte: startDate, $lte: endDate },
    });

    // Calculate revenue
    let totalRevenue = 0;
    for (const invoice of invoices) {
      const amountInRWF = await CurrencyService.convertToRWF(
        invoice.totalAmount,
        invoice.currency,
        companyId
      );
      totalRevenue += amountInRWF;
    }

    // Calculate expenses
    let totalExpenses = 0;
    for (const expense of expenses) {
      const amountInRWF = await CurrencyService.convertToRWF(
        expense.amount,
        expense.currency,
        companyId
      );
      totalExpenses += amountInRWF;
    }

    const profit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue >0 ? (profit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalExpenses,
      profit,
      profitMargin,
      currency: 'RWF',
    };
  }
}
