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
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileText,
  Loader2,
  Receipt,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { getUserRole } from '../utils/roleUtils';
import ConfirmModal from '../components/common/ConfirmModal';
import { formatCompanyMoney, getCurrencyConfig, convertCurrencyAmount } from '../utils/currency';

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
  billed: number;
  collected: number;
  spent: number;
  net: number;
}

// Consistent color palette
const PIE_COLORS = {
  paid: '#10b981',      // green
  inProgress: '#0ea5e9', // blue
  overdue: '#f59e0b',    // amber
  draft: '#f97316',      // orange
  cancelled: '#94a3b8',  // slate
};

const PIE_COLORS_ARRAY = ['#10b981', '#0ea5e9', '#f59e0b', '#f97316', '#94a3b8'];

const DASHBOARD_CARD =
  'rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_40px_-24px_rgba(15,23,42,0.35)]';

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });

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

const formatPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

const getTimeGreeting = (date: Date) => {
  const hour = date.getHours();
  if (hour >= 1 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 23) return 'Good evening';
  return 'Good night';
};

// Custom Tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg text-sm">
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
  const [showPDFConfirm, setShowPDFConfirm] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const company = JSON.parse(localStorage.getItem('finflow_company') || '{}');
  const userRole = getUserRole();

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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const monthlyData = useMemo<MonthlyRow[]>(() => {
    const today = new Date();
    const seed = Array.from({ length: 6 }).map((_, idx) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (5 - idx), 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      return {
        key,
        month: monthFormatter.format(d),
        billed: 0,
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
      row.billed += amount;
      if (invoice.status === 'paid') {
        row.collected += amount;
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

    return seed.map(({ month, billed, collected, spent }) => ({
      month,
      billed,
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
    if (paid > 0) data.push({ name: 'Paid', value: paid });
    if (active > 0) data.push({ name: 'In progress', value: active });
    if (overdue > 0) data.push({ name: 'Overdue', value: overdue });
    if (drafts > 0) data.push({ name: 'Draft', value: drafts });
    if (cancelled > 0) data.push({ name: 'Cancelled', value: cancelled });
    
    return data;
  }, [stats.totalCancelled, stats.totalDrafts, stats.totalInvoices, stats.totalOverdue, stats.totalPaid]);

  const activityFeed = useMemo(() => {
    const invoiceFeed = latestInvoices.map((invoice) => {
      const dt = getDateValue(invoice.createdAt || invoice.updatedAt);
      return {
        id: invoice._id,
        title: invoice.invoiceNumber,
        subtitle: invoice.clientId?.name || 'Client invoice',
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
        title: expense.supplier || 'Expense',
        subtitle: expense.category || 'Operational expense',
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

  const handleDownloadSummaryPDF = async () => {
    try {
      const response = await apiClient.get('/reports/summary/pdf', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const today = new Date().toLocaleDateString('en-GB').split('/').join('-');
      link.setAttribute('download', `summary-report-${today}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setShowPDFConfirm(false);
    } catch (error) {
      alert('Failed to download summary PDF');
      setShowPDFConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Overview</p>
            <h1 className="text-2xl font-bold text-slate-900">
              {getTimeGreeting(currentTime)}{company?.displayName ? `, ${company.displayName}` : ''}
            </h1>
            <p className="text-sm text-slate-600">Here is how your business is performing today.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {(userRole === 'admin' || userRole === 'finance_manager') && (
              <button
                onClick={() => setShowPDFConfirm(true)}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Export summary PDF
              </button>
            )}
            <button
              onClick={() => navigate('/invoices')}
              className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Create invoice
            </button>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className={DASHBOARD_CARD}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Income</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{formatCompactMoney(stats.totalRevenue)}</p>
            </div>
            <span className="rounded-full bg-emerald-100 p-2 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 flex items-center gap-1 text-xs text-emerald-600">
            <ArrowUpRight className="h-3.5 w-3.5" />
            {formatPct(Math.max(marginPercent, 0))} margin
          </p>
        </article>

        <article className={DASHBOARD_CARD}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Expenses</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{formatCompactMoney(stats.totalExpenses)}</p>
            </div>
            <span className="rounded-full bg-rose-100 p-2 text-rose-600">
              <TrendingDown className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 flex items-center gap-1 text-xs text-rose-600">
            <ArrowDownRight className="h-3.5 w-3.5" />
            {formatPct(spendRatioPercent)} spend vs revenue
          </p>
        </article>

        <article className={DASHBOARD_CARD}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Pending amount</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{formatCompactMoney(stats.pendingAmount)}</p>
            </div>
            <span className="rounded-full bg-amber-100 p-2 text-amber-600">
              <Clock3 className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 text-xs text-slate-500">Outstanding from unpaid invoices</p>
        </article>

        <article className={DASHBOARD_CARD}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Profit</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{formatCompactMoney(stats.netIncome)}</p>
            </div>
            <span className="rounded-full bg-sky-100 p-2 text-sky-600">
              <CircleDollarSign className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            {stats.totalInvoices} invoices tracked this cycle · {stats.totalCancelled || 0} cancelled
          </p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_0.9fr]">
        <article className={`${DASHBOARD_CARD} p-6`}>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Cashflow trends</h2>
            <p className="text-sm text-slate-500">Last 6 months of income, expenses, and pending amounts.</p>
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
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(14, 165, 233, 0.05)' }} />
                <Bar dataKey="billed" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={30} name="Pending" />
                <Bar dataKey="collected" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} name="Income" />
                <Bar dataKey="spent" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={30} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Legend UNDER the graph */}
          <div className="mt-4 flex items-center justify-center gap-6 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#0ea5e9' }}></span>
              <span className="text-slate-600">Pending</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#10b981' }}></span>
              <span className="text-slate-600">Income</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f97316' }}></span>
              <span className="text-slate-600">Expenses</span>
            </div>
          </div>
        </article>

        {/* Invoice Health */}
        <article className={`${DASHBOARD_CARD} p-6`}>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Invoice health</h2>
            <p className="text-sm text-slate-500">Current invoice status distribution.</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData.length ? statusData : [{ name: 'No data', value: 1 }]}
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
                  {(statusData.length ? statusData : [{ name: 'No data', value: 1 }]).map((entry, index) => {
                    // Map colors based on status name
                    let color = PIE_COLORS_ARRAY[index % PIE_COLORS_ARRAY.length];
                    if (entry.name === 'Paid') color = PIE_COLORS.paid;
                    if (entry.name === 'In progress') color = PIE_COLORS.inProgress;
                    if (entry.name === 'Overdue') color = PIE_COLORS.overdue;
                    if (entry.name === 'Draft') color = PIE_COLORS.draft;
                    if (entry.name === 'Cancelled') color = PIE_COLORS.cancelled;
                    
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
              if (item.name === 'Paid') color = PIE_COLORS.paid;
              if (item.name === 'In progress') color = PIE_COLORS.inProgress;
              if (item.name === 'Overdue') color = PIE_COLORS.overdue;
              if (item.name === 'Draft') color = PIE_COLORS.draft;
              if (item.name === 'Cancelled') color = PIE_COLORS.cancelled;
              
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
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_1.15fr_0.9fr]">
        <article className={`${DASHBOARD_CARD} p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Latest invoices</h3>
            <button
              onClick={() => navigate('/invoices')}
              className="text-sm font-semibold text-sky-600 hover:text-sky-700"
            >
              View all
            </button>
          </div>
          <div className="space-y-3">
            {latestInvoices.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No invoices yet. Create your first invoice to start tracking collections.
              </p>
            ) : (
              latestInvoices.slice(0, 4).map((invoice) => (
                <div key={invoice._id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3 hover:bg-slate-100 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-slate-500">{invoice.clientId?.name || 'Client'}</p>
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
            <h3 className="text-lg font-semibold text-slate-900">Income vs expenses</h3>
            <span className="text-xs text-slate-500">Recent period</span>
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
                <Line type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={2.4} dot={false} name="Income" />
                <Line type="monotone" dataKey="spent" stroke="#f97316" strokeWidth={2.4} dot={false} name="Expenses" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
              <p className="font-semibold">Income</p>
              <p>{formatCompactMoney(monthlyData.reduce((acc, row) => acc + row.collected, 0))}</p>
            </div>
            <div className="rounded-lg bg-orange-50 px-3 py-2 text-orange-700">
              <p className="font-semibold">Expenses</p>
              <p>{formatCompactMoney(monthlyData.reduce((acc, row) => acc + row.spent, 0))}</p>
            </div>
          </div>
        </article>

        <article className={`${DASHBOARD_CARD} p-6`}>
          <h3 className="text-lg font-semibold text-slate-900">Transactions feed</h3>
          <p className="mb-3 text-sm text-slate-500">Latest business activity</p>
          <div className="space-y-3">
            {activityFeed.length === 0 ? (
              <p className="text-sm text-slate-500">No recent transactions to show.</p>
            ) : (
              activityFeed.map((item) => (
                <div key={`${item.type}-${item.id}`} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 hover:bg-slate-100 transition-colors">
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

      {/* Quick Action Buttons */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <button
          onClick={() => navigate('/clients')}
          className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-slate-100 p-2 text-slate-600">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Add new client</h4>
              <p className="mt-1 text-xs text-slate-500">Create and organize client profiles.</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => navigate('/invoices')}
          className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-slate-100 p-2 text-slate-600">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Create invoice</h4>
              <p className="mt-1 text-xs text-slate-500">Generate and share invoices quickly.</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => navigate('/expenses')}
          className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-slate-100 p-2 text-slate-600">
              <TrendingDown className="h-5 w-5" />
            </span>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Add expense</h4>
              <p className="mt-1 text-xs text-slate-500">Keep spending records up to date.</p>
            </div>
          </div>
        </button>
      </section>

      <ConfirmModal
        isOpen={showPDFConfirm}
        title="Generate Summary PDF"
        message="This will generate and download a comprehensive financial summary PDF. This may take a few seconds."
        confirmText="Download PDF"
        cancelText="Cancel"
        variant="primary"
        onConfirm={handleDownloadSummaryPDF}
        onCancel={() => setShowPDFConfirm(false)}
      />
    </div>
  );
};

export default Dashboard;
