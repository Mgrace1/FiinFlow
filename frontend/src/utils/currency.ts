export type AppCurrency = 'RWF' | 'USD';

export interface CurrencyConfig {
  defaultCurrency: AppCurrency;
  exchangeRateUSD: number;
  taxRate: number;
}

export const getCurrencyConfig = (): CurrencyConfig => {
  try {
    const raw = localStorage.getItem('finflow_company');
    const company = raw ? JSON.parse(raw) : {};
    const defaultCurrency = String(company?.defaultCurrency || 'RWF').toUpperCase() === 'USD' ? 'USD' : 'RWF';
    const exchangeRateUSD = Number(company?.exchangeRateUSD || 1300);
    const taxRate = Number(company?.taxRate ?? 18);
    return {
      defaultCurrency,
      exchangeRateUSD: Number.isFinite(exchangeRateUSD) && exchangeRateUSD > 0 ? exchangeRateUSD : 1300,
      taxRate: Number.isFinite(taxRate) && taxRate >= 0 ? taxRate : 18,
    };
  } catch {
    return { defaultCurrency: 'RWF', exchangeRateUSD: 1300, taxRate: 18 };
  }
};

export const convertCurrencyAmount = (
  amount: number,
  fromCurrency: string | undefined,
  toCurrency: AppCurrency,
  exchangeRateUSD: number
): number => {
  const safeAmount = Number(amount || 0);
  const from = String(fromCurrency || 'RWF').toUpperCase() === 'USD' ? 'USD' : 'RWF';
  if (from === toCurrency) return safeAmount;
  if (from === 'USD' && toCurrency === 'RWF') return safeAmount * exchangeRateUSD;
  if (from === 'RWF' && toCurrency === 'USD') return safeAmount / exchangeRateUSD;
  return safeAmount;
};

export const formatCompanyMoney = (
  amount: number,
  sourceCurrency?: string,
  config: CurrencyConfig = getCurrencyConfig()
) => {
  const converted = convertCurrencyAmount(amount, sourceCurrency, config.defaultCurrency, config.exchangeRateUSD);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: config.defaultCurrency,
    maximumFractionDigits: config.defaultCurrency === 'RWF' ? 0 : 2,
  }).format(converted || 0);
};
