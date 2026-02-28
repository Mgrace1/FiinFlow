import { Currency } from '../types';
import { Company } from '../models';
import { Types } from 'mongoose';

export class CurrencyService {
  /**
   * Convert amount to RWF based on company's exchange rate
   */
  static async convertToRWF(
    amount: number,
    currency: Currency,
    companyId: Types.ObjectId
  ): Promise<number>{
    if (currency === 'RWF') {
      return amount;
    }

    const company = await Company.findById(companyId);
    if (!company) {
      throw new Error('Company not found');
    }

    // USD to RWF conversion
    return amount * company.exchangeRateUSD;
  }

  /**
   * Convert amount from one currency to another
   */
  static async convertCurrency(
    amount: number,
    fromCurrency: Currency,
    toCurrency: Currency,
    companyId: Types.ObjectId
  ): Promise<number>{
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const company = await Company.findById(companyId);
    if (!company) {
      throw new Error('Company not found');
    }

    // Convert to RWF first
    const amountInRWF = fromCurrency === 'USD' ? amount * company.exchangeRateUSD : amount;

    // Then convert to target currency
    return toCurrency === 'USD' ? amountInRWF / company.exchangeRateUSD : amountInRWF;
  }

  /**
   * Format amount with currency symbol
   */
  static formatCurrency(amount: number, currency: Currency): string {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    return currency === 'RWF' ? `${formatted} RWF`: `$${formatted}`;
  }

  /**
   * Calculate tax amount
   */
  static calculateTax(amount: number, taxRate: number): number {
    return (amount * taxRate) / 100;
  }

  /**
   * Calculate total amount with tax
   */
  static calculateTotalWithTax(amount: number, taxRate: number): number {
    return amount + this.calculateTax(amount, taxRate);
  }
}
