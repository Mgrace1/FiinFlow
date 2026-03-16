import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import LoadingOverlay from '../components/common/LoadingOverlay';
import Badge from '../components/common/Badge';
import { formatDateDMY } from '../utils/formatDate';
import { formatCompanyMoney } from '../utils/currency';
import { useLanguage } from '../contexts/LanguageContext';
import {
  ArrowLeft, Mail, Phone, MapPin, User, FileText, Receipt,
  TrendingUp, TrendingDown, Minus, DollarSign, CheckCircle,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine,
} from 'recharts';

interface Client {
  _id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  status: string;
  dueDate: string;
  createdAt: string;
}

interface Expense {
  _id: string;
  supplier: string;
  category: string;
  amount: number;
  amountPaid: number;
  remainingAmount: number;
  currency: string;
  dueDate: string;
  paymentStatus: string;
}

interface Summary {
  totalInvoices: number;
  paidInvoices: number;
  unpaidInvoices: number;
  expenseCount: number;
  totalRevenue?: number;
  totalExpenses?: number;
  profit?: number;
  currency?: string;
}

const PIE_COLORS: Record<string, string> = {
  paid:      '#5f6f52',
  sent:      '#7b8a69',
  overdue:   '#dc2626',
  draft:     '#9ca3af',
  cancelled: '#d1d5db',
};

const PAGE_SIZE = 7;

const ClientDetail: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [client,    setClient]   = useState<Client | null>(null);
  const [summary,   setSummary]  = useState<Summary | null>(null);
  const [invoices,  setInvoices] = useState<Invoice[]>([]);
  const [expenses,  setExpenses] = useState<Expense[]>([]);
  const [loading,   setLoading]  = useState(true);
  const [activeTab, setActiveTab] = useState<'invoices' | 'expenses'>('invoices');
  const [showAllInvoices, setShowAllInvoices] = useState(false);
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  useEffect(() => { fetchAll(); }, [clientId]);

  const fetchAll = async () => {
    try {
      const [cRes, iRes, eRes] = await Promise.all([
        apiClient.get(`/clients/${clientId}`),
        apiClient.get(`/invoices?clientId=${clientId}`),
        apiClient.get(`/expenses?clientId=${clientId}`),
      ]);
      if (cRes.data.success) { setClient(cRes.data.data.client); setSummary(cRes.data.data.summary); }
      if (iRes.data.success) setInvoices(iRes.data.data || []);
      if (eRes.data.success) setExpenses(eRes.data.data || []);
    } catch (err) {
      console.error('Failed to load client data:', err);
    } finally {
      setLoading(false);
    }
  };

  const revenue     = summary?.totalRevenue  ?? 0;
  const expTotal    = summary?.totalExpenses ?? 0;
  const profit      = summary?.profit        ?? 0;
  const summaryCurrency = summary?.currency || 'RWF';
  const paymentRate = summary && summary.totalInvoices > 0
    ? Math.round((summary.paidInvoices / summary.totalInvoices) * 100)
    : 0;

  const statusCounts: Record<string, number> = {};
  invoices.forEach(inv => { statusCounts[inv.status] = (statusCounts[inv.status] || 0) + 1; });
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  const barData = [
    { name: t('client_detail.revenue'),  value: revenue,          fill: '#5f6f52' },
    { name: t('client_detail.expenses'), value: expTotal,          fill: '#dc2626' },
    { name: t('client_detail.profit'),   value: profit,            fill: profit >= 0 ? '#7b8a69' : '#dc2626' },
  ];

  const visibleInvoices = showAllInvoices ? invoices : invoices.slice(0, PAGE_SIZE);
  const visibleExpenses = showAllExpenses ? expenses : expenses.slice(0, PAGE_SIZE);

  const getInvVariant = (s: string): any =>
    ({ paid:'paid', overdue:'overdue', sent:'sent', draft:'draft', cancelled:'cancelled' }[s] || 'default');
  const getExpVariant = (s: string): any =>
    ({ pending:'pending', paid:'paid', failed:'failed' }[s] || 'default');

  if (loading) return <LoadingOverlay message={t('client_detail.loading')} />;
  if (!client) return (
    <div className="text-center py-20 px-4">
      <p className="text-gray-500">{t('client_detail.not_found')}</p>
      <button onClick={() => navigate('/clients')} className="mt-4 btn btn-secondary">{t('client_detail.back_clients')}</button>
    </div>
  );

  return (
    <div className="space-y-5 px-0">

      {/* Header */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => navigate('/clients')}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          title={t('common.back')}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{client.name}</h1>
          <p className="text-sm text-gray-500">{t('client_detail.client_since')} {formatDateDMY(client.createdAt)}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('client_detail.revenue')}</span>
            <span className="w-7 h-7 sm:w-8 sm:h-8 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
              <DollarSign size={14} className="text-green-400" />
            </span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">
            {formatCompanyMoney(revenue, summaryCurrency)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{t('client_detail.currency_label')} · {t('client_detail.paid_invoices')}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('client_detail.expenses')}</span>
            <span className="w-7 h-7 sm:w-8 sm:h-8 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
              <Receipt size={14} className="text-red-600" />
            </span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">
            {formatCompanyMoney(expTotal, summaryCurrency)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{t('client_detail.currency_label')} · {expenses.length} {t('client_detail.records')}</p>
        </div>

        <div className={`rounded-xl border shadow-sm p-3 sm:p-4 ${profit >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('client_detail.net_profit')}</span>
            <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              {profit > 0
                ? <TrendingUp size={14} className="text-green-400" />
                : profit < 0
                  ? <TrendingDown size={14} className="text-red-600" />
                  : <Minus size={14} className="text-gray-400" />}
            </span>
          </div>
          <p className={`text-lg sm:text-xl font-bold truncate ${profit >= 0 ? 'text-green-400' : 'text-red-600'}`}>
            {formatCompanyMoney(profit, summaryCurrency)}
          </p>
          <p className="text-xs text-gray-500 mt-1">{t('client_detail.currency_label')} · {t('client_detail.revenue_minus_expenses')}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('client_detail.payment_rate')}</span>
            <span className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
              <CheckCircle size={14} className="text-blue-600" />
            </span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-gray-900">{paymentRate}%</p>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${paymentRate >= 70 ? 'bg-green-300' : paymentRate >= 40 ? 'bg-amber-600' : 'bg-red-600'}`}
              style={{ width: `${paymentRate}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{summary?.paidInvoices ?? 0} {t('client_detail.of')} {summary?.totalInvoices ?? 0} {t('client_detail.paid')}</p>
        </div>
      </div>

      {/* Charts */}
      {(invoices.length > 0 || expenses.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {pieData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('client_detail.invoice_status_breakdown')}</h3>
              <div className="flex items-center gap-4 sm:gap-6">
                <div style={{ width: 140, height: 140 }} className="shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={3} dataKey="value">
                        {pieData.map(entry => (
                          <Cell key={entry.name} fill={PIE_COLORS[entry.name] || '#94a3b8'} />
                        ))}
                      </Pie>
                      <ReTooltip
                        formatter={(v: any, n: any) => [`${v} ${v !== 1 ? t('client_detail.invoices_label') : t('client_detail.invoice_label')}`, n]}
                        contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[d.name] || '#94a3b8' }} />
                        <span className="text-sm text-gray-600 capitalize truncate">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-sm font-bold text-gray-900">{d.value}</span>
                        <span className="text-xs text-gray-400">
                          ({Math.round((d.value / invoices.length) * 100)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('client_detail.revenue_vs_expenses')}</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
                  width={36}
                  domain={['auto', 'auto']}
                />
                <ReTooltip
                  formatter={(v: any) => [formatCompanyMoney(Number(v), summaryCurrency)]}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                />
                <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="4 4" />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {barData.map(d => <Cell key={d.name} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Contact info + Transaction tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Contact card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">{t('client_detail.contact_info')}</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 min-w-0">
                <User size={15} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">{t('client_detail.contact_person')}</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{client.contactPerson}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 min-w-0">
                <Mail size={15} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">{t('common.email')}</p>
                  <a href={`mailto:${client.email}`} className="text-sm font-medium text-blue-600 hover:underline truncate block">{client.email}</a>
                </div>
              </div>
              <div className="flex items-start gap-3 min-w-0">
                <Phone size={15} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">{t('common.phone')}</p>
                  <a href={`tel:${client.phone}`} className="text-sm font-medium text-gray-900">{client.phone}</a>
                </div>
              </div>
              <div className="flex items-start gap-3 min-w-0">
                <MapPin size={15} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">{t('common.address')}</p>
                  <p className="text-sm font-medium text-gray-900 whitespace-pre-line">{client.address}</p>
                </div>
              </div>
            </div>
          </div>

          {summary && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">{t('client_detail.quick_stats')}</h2>
              <div className="space-y-2.5">
                {[
                  { label: t('client_detail.total_invoices'), value: summary.totalInvoices, color: 'text-gray-900' },
                  { label: t('client_detail.paid_invoices_label'), value: summary.paidInvoices, color: 'text-green-400' },
                  { label: t('client_detail.unpaid_invoices'), value: summary.unpaidInvoices, color: 'text-red-600' },
                  { label: t('client_detail.linked_expenses'), value: summary.expenseCount, color: 'text-gray-900' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-500">{row.label}</span>
                    <span className={`text-sm font-bold ${row.color}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex border-b border-gray-100">
              {(['invoices', 'expenses'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-4 sm:px-5 py-3 sm:py-3.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'invoices' ? <FileText size={14} /> : <Receipt size={14} />}
                  <span>{tab === 'invoices' ? t('client_detail.tab_invoices') : t('client_detail.tab_expenses')}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                    {tab === 'invoices' ? invoices.length : expenses.length}
                  </span>
                </button>
              ))}
            </div>

            {activeTab === 'invoices' && (
              invoices.length === 0
                ? <div className="py-12 text-center px-4">
                    <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">{t('client_detail.no_invoices')}</p>
                  </div>
                : <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                          <tr>
                            {[t('client_detail.invoice_number'), t('client_detail.amount'), t('client_detail.due_date'), t('client_detail.status')].map(h => (
                              <th key={h} className="px-4 sm:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {visibleInvoices.map(inv => (
                            <tr key={inv._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/invoices/${inv._id}`)}>
                              <td className="px-4 sm:px-5 py-3 text-sm font-medium text-blue-600 whitespace-nowrap">{inv.invoiceNumber}</td>
                              <td className="px-4 sm:px-5 py-3 text-sm text-gray-900 whitespace-nowrap">{formatCompanyMoney(inv.totalAmount, inv.currency)}</td>
                              <td className="px-4 sm:px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDateDMY(inv.dueDate)}</td>
                              <td className="px-4 sm:px-5 py-3 whitespace-nowrap"><Badge variant={getInvVariant(inv.status)}>{inv.status}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {invoices.length > PAGE_SIZE && (
                      <div className="px-5 py-3 border-t border-gray-100">
                        <button
                          onClick={() => setShowAllInvoices(!showAllInvoices)}
                          className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                        >
                          {showAllInvoices ? t('client_detail.show_less') : `${t('client_detail.view_all')} (${invoices.length})`}
                        </button>
                      </div>
                    )}
                  </>
            )}

            {activeTab === 'expenses' && (
              expenses.length === 0
                ? <div className="py-12 text-center px-4">
                    <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">{t('client_detail.no_expenses')}</p>
                  </div>
                : <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                          <tr>
                            {[t('client_detail.supplier'), t('client_detail.category'), t('client_detail.total'), t('client_detail.remaining'), t('client_detail.due_date'), t('client_detail.status')].map(h => (
                              <th key={h} className="px-4 sm:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {visibleExpenses.map(exp => (
                            <tr key={exp._id} className="hover:bg-gray-50">
                              <td className="px-4 sm:px-5 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{exp.supplier}</td>
                              <td className="px-4 sm:px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{exp.category}</td>
                              <td className="px-4 sm:px-5 py-3 text-sm text-gray-900 whitespace-nowrap">{formatCompanyMoney(exp.amount, exp.currency)}</td>
                              <td className={`px-4 sm:px-5 py-3 text-sm font-medium whitespace-nowrap ${exp.remainingAmount > 0 ? 'text-red-600' : 'text-green-400'}`}>
                                {formatCompanyMoney(exp.remainingAmount, exp.currency)}
                              </td>
                              <td className="px-4 sm:px-5 py-3 text-sm text-gray-500 whitespace-nowrap">
                                {exp.remainingAmount > 0 ? formatDateDMY(exp.dueDate) : t('common.na')}
                              </td>
                              <td className="px-4 sm:px-5 py-3 whitespace-nowrap"><Badge variant={getExpVariant(exp.paymentStatus)}>{exp.paymentStatus}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {expenses.length > PAGE_SIZE && (
                      <div className="px-5 py-3 border-t border-gray-100">
                        <button
                          onClick={() => setShowAllExpenses(!showAllExpenses)}
                          className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                        >
                          {showAllExpenses ? t('client_detail.show_less') : `${t('client_detail.view_all')} (${expenses.length})`}
                        </button>
                      </div>
                    )}
                  </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDetail;






