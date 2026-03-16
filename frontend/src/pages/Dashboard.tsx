import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  Clock3,
  FileText,
  Loader2,
  Receipt,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { formatCompanyMoney, getCurrencyConfig, convertCurrencyAmount } from '../utils/currency';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardStats {
  totalInvoices: number;
  totalPaid: number;
  totalOverdue: number;
  totalDrafts: number;
  totalCancelled: number;
  totalRevenue: number;
  pendingAmount: number;
  totalExpenses: number;
  netIncome: number;
}

interface InvoiceItem {
  _id: string;
  invoiceNumber: string;
  totalAmount: number;
  currency?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  clientId?: {
    name?: string;
  };
}

interface ExpenseItem {
  _id: string;
  supplier?: string;
  category?: string;
  amount: number;
  currency?: string;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DashboardResponse {
  stats?: DashboardStats;
  latestInvoices?: InvoiceItem[];
  latestExpenses?: ExpenseItem[];
}

interface MonthlyRow {
  month: string;
  pending: number;
  draft: number;
  collected: number;
  spent: number;
  net: number;
}

// Consistent color palette
const COLORS = {
  income: '#4dfec3',
  expense: '#ff9494',
  profit: '#3b82f6',
  pending: '#ffe070',
  draft: '#9ca3af',
  cancelled: '#b91c1c',
  overdue: '#ff9494',
};

const PIE_COLORS = {
  paid: COLORS.income,
  pending: COLORS.pending,
  overdue: COLORS.overdue,
  draft: COLORS.draft,
  cancelled: COLORS.cancelled,
};

const PIE_COLORS_ARRAY = [COLORS.income, COLORS.pending, COLORS.overdue, COLORS.draft, COLORS.cancelled];

const DASHBOARD_CARD =
  'rounded-2xl border border-slate-200 bg-white p-5 shadow-none hover:shadow-sm transition-shadow';

const getDateValue = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatCompactMoney = (amount: number) => {
  const cfg = getCurrencyConfig();
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: cfg.defaultCurrency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount || 0);
};

const formatMoney = (amount: number, currency = 'RWF') => {
  return formatCompanyMoney(amount, currency, getCurrencyConfig());
};

const formatCompactTitle = (amount: number) => formatMoney(amount);

const formatPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

// Custom Tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 rounded-lg text-sm">
        <p className="font-medium text-slate-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-2 text-xs mb-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
            <span className="text-slate-600">{entry.name}:</span>
            <span className="font-medium text-slate-900">{formatMoney(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC = () => {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    totalPaid: 0,
    totalOverdue: 0,
    totalDrafts: 0,
    totalCancelled: 0,
    totalRevenue: 0,
    pendingAmount: 0,
    totalExpenses: 0,
    netIncome: 0,
  });
  const [latestInvoices, setLatestInvoices] = useState<InvoiceItem[]>([]);
  const [latestExpenses, setLatestExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);

  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short' }),
    [lang]
  );


  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await apiClient.get('/dashboard/stats');
        if (response.data?.success) {
          const data: DashboardResponse = response.data.data || {};
          if (data.stats) setStats(data.stats);
          if (data.latestInvoices) setLatestInvoices(data.latestInvoices);
          if (data.latestExpenses) setLatestExpenses(data.latestExpenses);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);


  const monthlyData = useMemo<MonthlyRow[]>(() => {
    const today = new Date();
    const seed = Array.from({ length: 6 }).map((_, idx) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (5 - idx), 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      return {
        key,
        month: monthFormatter.format(d),
        pending: 0,
        draft: 0,
        collected: 0,
        spent: 0,
      };
    });

    const monthMap = new Map(seed.map((row) => [row.key, row]));

    latestInvoices.forEach((invoice) => {
      if (invoice.status === 'cancelled') return;
      const dt = getDateValue(invoice.createdAt || invoice.updatedAt);
      if (!dt) return;
      const key = `${dt.getFullYear()}-${dt.getMonth()}`;
      const row = monthMap.get(key);
      if (!row) return;

      const amount = convertCurrencyAmount(
        Number(invoice.totalAmount) || 0,
        invoice.currency || 'RWF',
        getCurrencyConfig().defaultCurrency,
        getCurrencyConfig().exchangeRateUSD
      );
      const normalizedStatus = String(invoice.status || '').toLowerCase();
      if (normalizedStatus === 'paid') {
        row.collected += amount;
      } else if (normalizedStatus === 'draft') {
        row.draft += amount;
      } else {
        row.pending += amount;
      }
    });

    latestExpenses.forEach((expense) => {
      const dt = getDateValue(expense.date || expense.createdAt || expense.updatedAt);
      if (!dt) return;
      const key = `${dt.getFullYear()}-${dt.getMonth()}`;
      const row = monthMap.get(key);
      if (!row) return;

      row.spent += convertCurrencyAmount(
        Number(expense.amount) || 0,
        expense.currency || 'RWF',
        getCurrencyConfig().defaultCurrency,
        getCurrencyConfig().exchangeRateUSD
      );
    });

    return seed.map(({ month, pending, draft, collected, spent }) => ({
      month,
      pending,
      draft,
      collected,
      spent,
      net: collected - spent,
    }));
  }, [latestExpenses, latestInvoices]);

  const statusData = useMemo(() => {
    const paid = stats.totalPaid || 0;
    const overdue = stats.totalOverdue || 0;
    const drafts = stats.totalDrafts || 0;
    const cancelled = stats.totalCancelled || 0;
    const active = Math.max(stats.totalInvoices - paid - overdue - drafts - cancelled, 0);

    const data = [];
    if (paid > 0) data.push({ name: t('status.paid'), value: paid });
    if (active > 0) data.push({ name: t('status.pending'), value: active });
    if (overdue > 0) data.push({ name: t('status.overdue'), value: overdue });
    if (drafts > 0) data.push({ name: t('status.draft'), value: drafts });
    if (cancelled > 0) data.push({ name: t('status.cancelled'), value: cancelled });
    
    return data;
  }, [stats.totalCancelled, stats.totalDrafts, stats.totalInvoices, stats.totalOverdue, stats.totalPaid]);

  const activityFeed = useMemo(() => {
    const invoiceFeed = latestInvoices.map((invoice) => {
      const dt = getDateValue(invoice.createdAt || invoice.updatedAt);
      return {
        id: invoice._id,
        title: invoice.invoiceNumber,
        subtitle: invoice.clientId?.name || t('dashboard.client_invoice'),
        amount: Number(invoice.totalAmount) || 0,
        currency: invoice.currency || 'RWF',
        amountPrefix: '+',
        tone: invoice.status === 'paid' ? 'text-emerald-600' : 'text-slate-700',
        date: dt,
        type: 'invoice',
      };
    });

    const expenseFeed = latestExpenses.map((expense) => {
      const dt = getDateValue(expense.date || expense.createdAt || expense.updatedAt);
      return {
        id: expense._id,
        title: expense.supplier || t('dashboard.expense_title'),
        subtitle: expense.category || t('dashboard.operational_expense'),
        amount: Number(expense.amount) || 0,
        currency: expense.currency || 'RWF',
        amountPrefix: '-',
        tone: 'text-rose-600',
        date: dt,
        type: 'expense',
      };
    });

    return [...invoiceFeed, ...expenseFeed]
      .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0))
      .slice(0, 4);
  }, [latestExpenses, latestInvoices]);

  const marginPercent = useMemo(() => {
    const revenue = stats.totalRevenue || 0;
    if (!revenue) return 0;
    return (stats.netIncome / revenue) * 100;
  }, [stats.netIncome, stats.totalRevenue]);

  const spendRatioPercent = useMemo(() => {
    const revenue = stats.totalRevenue || 0;
    if (!revenue) return 0;
    return (stats.totalExpenses / revenue) * 100;
  }, [stats.totalExpenses, stats.totalRevenue]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{t('dashboard.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className={DASHBOARD_CARD}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('dashboard.income')}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900" title={formatCompactTitle(stats.totalRevenue)}>
                {formatCompactMoney(stats.totalRevenue)}
              </p>
            </div>
            <span className="rounded-full bg-green-100 p-2 text-green-600">
              <TrendingUp className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 flex items-center gap-1 text-xs text-green-600">
            <ArrowUpRight className="h-3.5 w-3.5" />
            {formatPct(Math.max(marginPercent, 0))} {t('dashboard.margin')}
          </p>
        </article>

        <article className={DASHBOARD_CARD}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('dashboard.expenses')}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900" title={formatCompactTitle(stats.totalExpenses)}>
                {formatCompactMoney(stats.totalExpenses)}
              </p>
            </div>
            <span className="rounded-full bg-red-100 p-2 text-red-600">
              <TrendingDown className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 flex items-center gap-1 text-xs text-red-600">
            <ArrowDownRight className="h-3.5 w-3.5" />
            {formatPct(spendRatioPercent)} {t('dashboard.spend_vs_revenue')}
          </p>
        </article>

        <article className={DASHBOARD_CARD}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('dashboard.pending_amount')}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900" title={formatCompactTitle(stats.pendingAmount)}>
                {formatCompactMoney(stats.pendingAmount)}
              </p>
            </div>
            <span className="rounded-full bg-yellow-100 p-2 text-yellow-700">
              <Clock3 className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 text-xs text-slate-500">{t('dashboard.outstanding_unpaid')}</p>
        </article>

        <article className={DASHBOARD_CARD}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('dashboard.profit')}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900" title={formatCompactTitle(stats.netIncome)}>
                {formatCompactMoney(stats.netIncome)}
              </p>
            </div>
            <span className="rounded-full bg-blue-100 p-2 text-blue-600">
              <CircleDollarSign className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            {stats.totalInvoices} {t('dashboard.invoices_tracked')} · {stats.totalCancelled || 0} {t('dashboard.cancelled')}
          </p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-[1.4fr_0.9fr]">
        <article className={`${DASHBOARD_CARD} p-6`}>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">{t('dashboard.cashflow_trends')}</h2>
            <p className="text-sm text-slate-500">{t('dashboard.last_6_months')}</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={monthlyData} 
                barSize={20} 
                barGap={4} 
                margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={(value) => `${Math.round((value || 0) / 1000)}k`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(251, 191, 36, 0.08)' }} />
                <Bar dataKey="pending" fill={COLORS.pending} radius={[4, 4, 0, 0]} maxBarSize={30} name={t('status.pending')} />
                <Bar dataKey="draft" fill="#9ca3af" radius={[4, 4, 0, 0]} maxBarSize={30} name={t('status.draft')} />
                <Bar dataKey="collected" fill={COLORS.income} radius={[4, 4, 0, 0]} maxBarSize={30} name={t('dashboard.income')} />
                <Bar dataKey="spent" fill={COLORS.expense} radius={[4, 4, 0, 0]} maxBarSize={30} name={t('dashboard.expenses')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Legend UNDER the graph */}
          <div className="mt-4 flex items-center justify-center gap-6 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.pending }}></span>
              <span className="text-slate-600">{t('status.pending')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#9ca3af' }}></span>
              <span className="text-slate-600">{t('status.draft')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.income }}></span>
              <span className="text-slate-600">{t('dashboard.income')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.expense }}></span>
              <span className="text-slate-600">{t('dashboard.expenses')}</span>
            </div>
          </div>
        </article>

        {/* Invoice Health */}
        <article className={`${DASHBOARD_CARD} p-6`}>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">{t('dashboard.invoice_health')}</h2>
            <p className="text-sm text-slate-500">{t('dashboard.invoice_health_subtitle')}</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData.length ? statusData : [{ name: t('dashboard.no_data'), value: 1 }]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={86}
                  paddingAngle={3}
                  label={false}
                  labelLine={false}
                >
                  {(statusData.length ? statusData : [{ name: t('dashboard.no_data'), value: 1 }]).map((entry, index) => {
                    // Map colors based on status name
                    let color = PIE_COLORS_ARRAY[index % PIE_COLORS_ARRAY.length];
                    if (entry.name === t('status.paid')) color = PIE_COLORS.paid;
                    if (entry.name === t('status.pending')) color = PIE_COLORS.pending;
                    if (entry.name === t('status.overdue')) color = PIE_COLORS.overdue;
                    if (entry.name === t('status.draft')) color = PIE_COLORS.draft;
                    if (entry.name === t('status.cancelled')) color = PIE_COLORS.cancelled;
                    
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Pie>
                {/* FIXED: Tooltip formatter - no more error */}
                <Tooltip 
                  formatter={(value: any) => {
                    if (value === undefined || value === null) return '';
                    return value.toLocaleString();
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {statusData.map((item, idx) => {
              // Map colors based on status name
              let color = PIE_COLORS_ARRAY[idx % PIE_COLORS_ARRAY.length];
              if (item.name === t('status.paid')) color = PIE_COLORS.paid;
              if (item.name === t('status.pending')) color = PIE_COLORS.pending;
              if (item.name === t('status.overdue')) color = PIE_COLORS.overdue;
              if (item.name === t('status.draft')) color = PIE_COLORS.draft;
              if (item.name === t('status.cancelled')) color = PIE_COLORS.cancelled;
              
              return (
                <div key={item.name} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-slate-600">{item.name}</span>
                  <span className="ml-auto font-medium text-slate-900">{item.value}</span>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      {/* Latest Invoices, Income vs Expenses, Transactions Feed */}
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-[1.15fr_1.15fr_0.9fr]">
        <article className={`${DASHBOARD_CARD} p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">{t('dashboard.latest_invoices')}</h3>
            <button
              onClick={() => navigate('/invoices')}
              className="text-sm font-semibold text-sky-600 hover:text-sky-700"
            >
              {t('dashboard.view_all')}
            </button>
          </div>
          <div className="space-y-3">
            {latestInvoices.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                {t('dashboard.no_invoices')}
              </p>
            ) : (
              latestInvoices.slice(0, 4).map((invoice) => (
                <div key={invoice._id} className="flex items-center justify-between px-3 py-3 border-b border-slate-100 last:border-b-0">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-slate-500">{invoice.clientId?.name || t('dashboard.client_label')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{formatMoney(invoice.totalAmount, invoice.currency || 'RWF')}</p>
                    <span className="inline-flex rounded-full bg-white px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600 border border-slate-200">
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className={`${DASHBOARD_CARD} p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">{t('dashboard.income_vs_expenses')}</h3>
            <span className="text-xs text-slate-500">{t('dashboard.recent_period')}</span>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={(value) => `${Math.round((value || 0) / 1000)}k`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="collected" stroke={COLORS.income} strokeWidth={2.4} dot={false} name={t('dashboard.income')} />
                <Line type="monotone" dataKey="spent" stroke={COLORS.expense} strokeWidth={2.4} dot={false} name={t('dashboard.expenses')} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-green-50 px-3 py-2 text-green-700">
              <p className="font-semibold">{t('dashboard.income')}</p>
              <p title={formatCompactTitle(monthlyData.reduce((acc, row) => acc + row.collected, 0))}>
                {formatCompactMoney(monthlyData.reduce((acc, row) => acc + row.collected, 0))}
              </p>
            </div>
            <div className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
              <p className="font-semibold">{t('dashboard.expenses')}</p>
              <p title={formatCompactTitle(monthlyData.reduce((acc, row) => acc + row.spent, 0))}>
                {formatCompactMoney(monthlyData.reduce((acc, row) => acc + row.spent, 0))}
              </p>
            </div>
          </div>
        </article>

        <article className={`${DASHBOARD_CARD} p-6`}>
          <h3 className="text-lg font-semibold text-slate-900">{t('dashboard.transactions_feed')}</h3>
          <p className="mb-3 text-sm text-slate-500">{t('dashboard.latest_activity')}</p>
          <div className="space-y-3">
            {activityFeed.length === 0 ? (
              <p className="text-sm text-slate-500">{t('dashboard.no_transactions')}</p>
            ) : (
              activityFeed.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-white p-1.5 text-slate-500">
                        {item.type === 'invoice' ? <FileText className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.subtitle}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold ${item.tone}`}>
                      {item.amountPrefix}{formatMoney(item.amount, item.currency || 'RWF')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

    </div>
  );
};

export default Dashboard;


