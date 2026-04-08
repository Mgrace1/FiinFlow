import React, { useEffect, useMemo, useState } from 'react';
import { apiClient, getForecast } from '../api/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ForecastChart from '../components/forecasting/ForecastChart';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { getErrorMessage, notifyError } from '../utils/toast';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';

interface ClientPerformance {
  clientId: string;
  rank?: number;
  clientName: string;
  totalInvoices?: number;
  totalCollected: number;
  paidRate: number;
  collectionRate?: number;
  performanceScore: number;
}

interface PerformancePayload {
  clientsPerformance: ClientPerformance[];
}

interface ReportData {
  summary: {
    totalRevenue: number;
    totalPaid: number;
    totalPending: number;
    totalExpenses: number;
    profit: number;
    profitMargin: number;
  };
  invoices: any[];
  expenses: any[];
}

const DASHBOARD_COLORS = {
  income: '#0a853f',
  expense: '#ff9494',
  profit: '#3b82f6',
  pending: '#ffe070',
};

const GREEN_BG = '#99ffc5';

const hexToRgba = (hex: string, alpha: number) => {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface ForecastSummary {
  total_revenue: number;
  total_expenses: number;
  pending_amount: number;
  overdue_amount: number;
  avg_last_30: number;
  avg_prev_30: number;
  expected_net_90: number;
  expected_best_90: number;
  expected_worst_90: number;
  expected_net_365?: number;
  expected_best_365?: number;
  expected_worst_365?: number;
  expected_revenue_365?: number;
  expected_revenue_best_365?: number;
  expected_revenue_worst_365?: number;
}

interface ForecastRisk {
  score: number;
  level: 'low' | 'medium' | 'high';
  reasons?: string[];
}

interface ForecastInsight {
  type: 'info' | 'warning' | 'critical';
  message: string;
}

interface ForecastResponse {
  forecast_data: any[];
  summary?: ForecastSummary;
  risk?: ForecastRisk;
  insights?: ForecastInsight[];
  scope?: 'company' | 'client';
}

const getSafeDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const Reports: React.FC = () =>{
  const { t, lang } = useLanguage();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [forecastData, setForecastData] = useState<any | null>(null);
  const [isForecastLoading, setIsForecastLoading] = useState(false);
  const [forecastMeta, setForecastMeta] = useState<ForecastResponse | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedForecastClient, setSelectedForecastClient] = useState<string>('');
  const [performance, setPerformance] = useState<PerformancePayload | null>(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [showAllClients, setShowAllClients] = useState(false);
  const monthLabelFormatter = useMemo(
    () => new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short' }),
    [lang]
  );

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await apiClient.get('/clients');
        if (response.data?.success) {
          setClients(response.data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch clients for forecast:', error);
      }
    };
    fetchClients();
  }, []);

  const fetchReports = async () =>{
    setLoading(true);
    setPerformance(null);
    try {
      const params: any = {};
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;

      const response = await apiClient.get('/dashboard/reports', { params });
      if (response.data.success) {
        setReportData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
    fetchPerformance(dateRange.startDate || undefined, dateRange.endDate || undefined);
  };

  const fetchPerformance = async (start?: string, end?: string) => {
    setPerformanceLoading(true);
    try {
      const params: any = {};
      if (start) params.startDate = start;
      if (end) params.endDate = end;
      const response = await apiClient.get('/reports/performance', { params });
      if (response.data.success) {
        setPerformance(response.data.data);
      }
    } catch (error) {
      notifyError(t('reports.performance_error'));
    } finally {
      setPerformanceLoading(false);
    }
  };

  const scoreTone = (score: number) => {
    const color = score >= 80
      ? DASHBOARD_COLORS.income
      : score >= 60
        ? DASHBOARD_COLORS.pending
        : DASHBOARD_COLORS.expense;
    return {
      color,
      backgroundColor: score >= 80 ? GREEN_BG : hexToRgba(color, 0.15),
      borderColor: score >= 80 ? hexToRgba(GREEN_BG, 0.6) : hexToRgba(color, 0.35),
    };
  };

  const handleGenerateForecast = async () => {
    setIsForecastLoading(true);
    try {
      const response = await getForecast(selectedForecastClient ? { clientId: selectedForecastClient } : undefined);
      setForecastData(response.forecast_data);
      setForecastMeta(response);
    } catch (error) {
      console.error('Failed to generate forecast:', error);
      notifyError(getErrorMessage(error, 'Failed to generate forecast. Check forecasting service logs.'));
    } finally {
      setIsForecastLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>{
    let currency = 'RWF';
    try {
      const company = JSON.parse(localStorage.getItem('finflow_company') || '{}');
      if (company.defaultCurrency) currency = company.defaultCurrency;
    } catch { /* use default */ }
    // Use en-US for USD so it shows "$" only; use en-RW for RWF so it shows "RWF"
    const locale = currency === 'USD' ? 'en-US' : 'en-RW';
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  };

  const netCashflowData = useMemo(() => {
    if (!reportData) return [];

    const monthMap = new Map<string, { sortValue: number; month: string; collected: number; expenses: number }>();

    reportData.invoices.forEach((invoice: any) => {
      const date = getSafeDate(invoice.createdAt || invoice.updatedAt || invoice.dueDate);
      if (!date) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          sortValue: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
          month: monthLabelFormatter.format(date),
          collected: 0,
          expenses: 0,
        });
      }
      if (invoice.status === 'paid') {
        monthMap.get(key)!.collected += Number(invoice.totalAmount) || 0;
      }
    });

    reportData.expenses.forEach((expense: any) => {
      const date = getSafeDate(expense.date || expense.createdAt || expense.updatedAt);
      if (!date) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          sortValue: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
          month: monthLabelFormatter.format(date),
          collected: 0,
          expenses: 0,
        });
      }
      monthMap.get(key)!.expenses += Number(expense.amount) || 0;
    });

    return Array.from(monthMap.values())
      .sort((a, b) => a.sortValue - b.sortValue)
      .map((row) => ({
        month: row.month,
        collected: row.collected,
        expenses: row.expenses,
        net: row.collected - row.expenses,
      }));
  }, [reportData]);

  const topExpenseCategories = useMemo(() => {
    if (!reportData) return [];

    const categories = new Map<string, number>();
    reportData.expenses.forEach((expense: any) => {
      const category = String(expense.category || 'General');
      categories.set(category, (categories.get(category) || 0) + (Number(expense.amount) || 0));
    });

    return Array.from(categories.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [reportData]);

  const exportToPDF = () =>{
    if (!reportData) return;

    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text(t('reports.pdf_title'), 14, 20);

    // Date range
    doc.setFontSize(10);
    const dateRangeText = `${t('reports.pdf_period')}: ${dateRange.startDate || t('reports.pdf_all_time')} to ${dateRange.endDate || t('reports.pdf_present')}`;
    doc.text(dateRangeText, 14, 28);

    // Summary section
    doc.setFontSize(14);
    doc.text(t('reports.pdf_summary_title'), 14, 40);

    const summaryData = [
      [t('reports.total_revenue'), formatCurrency(reportData.summary.totalRevenue)],
      [t('reports.total_expenses'), formatCurrency(reportData.summary.totalExpenses)],
      [t('reports.net_profit'), formatCurrency(reportData.summary.profit)],
      [t('reports.margin'), `${reportData.summary.profitMargin.toFixed(2)}%`],
      [t('reports.total_paid'), formatCurrency(reportData.summary.totalPaid)],
      [t('reports.total_pending'), formatCurrency(reportData.summary.totalPending)],
    ];

    autoTable(doc, {
      startY: 45,
      head: [[t('reports.pdf_metric'), t('reports.pdf_value')]],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [30, 136, 229] },
    });

    // Forecast section (optional)
    if (forecastMeta?.summary) {
      const finalY = (doc as any).lastAutoTable?.finalY || 45;
      doc.setFontSize(14);
      doc.text(t('reports.ai_forecast_title'), 14, finalY + 15);

      const forecastSummary = [
        [t('reports.forecast_net_90'), formatCurrency(forecastMeta.summary.expected_net_90)],
        [t('reports.forecast_net_365'), formatCurrency(forecastMeta.summary.expected_net_365 || 0)],
        [t('reports.forecast_revenue_365'), formatCurrency(forecastMeta.summary.expected_revenue_365 || 0)],
      ];

      autoTable(doc, {
        startY: finalY + 20,
        head: [[t('reports.pdf_metric'), t('reports.pdf_value')]],
        body: forecastSummary,
        theme: 'striped',
        headStyles: { fillColor: [30, 136, 229] },
      });
    }

    // Invoices section
    if (reportData.invoices.length >0) {
      const finalY = (doc as any).lastAutoTable?.finalY || 45;
      doc.setFontSize(14);
      doc.text(t('reports.pdf_invoices'), 14, finalY + 15);

      const invoiceData = reportData.invoices.map((inv: any) =>[
        inv.invoiceNumber,
        inv.clientId?.name || 'N/A',
        formatCurrency(inv.totalAmount),
        inv.status,
        new Date(inv.dueDate).toLocaleDateString(),
      ]);

      autoTable(doc, {
        startY: finalY + 20,
        head: [[t('reports.pdf_invoice_number'), t('reports.pdf_client'), t('reports.pdf_amount'), t('reports.pdf_status'), t('reports.pdf_due_date')]],
        body: invoiceData,
        theme: 'striped',
        headStyles: { fillColor: [30, 136, 229] },
      });
    }

    // Expenses section
    if (reportData.expenses.length >0) {
      const finalY = (doc as any).lastAutoTable?.finalY || 45;
      doc.setFontSize(14);
      doc.text(t('reports.pdf_expenses'), 14, finalY + 15);

      const expenseData = reportData.expenses.map((exp: any) =>[
        exp.supplier,
        exp.category,
        formatCurrency(exp.amount),
        new Date(exp.date).toLocaleDateString(),
      ]);

      autoTable(doc, {
        startY: finalY + 20,
        head: [[t('reports.pdf_supplier'), t('reports.pdf_category'), t('reports.pdf_amount'), t('reports.pdf_date')]],
        body: expenseData,
        theme: 'striped',
        headStyles: { fillColor: [30, 136, 229] },
      });
    }

    // Save the PDF
    const fileName = `FinFlow_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  const exportToCSV = () =>{
    if (!reportData) return;

    let csvContent = `${t('reports.pdf_title')}\n`;
    csvContent += `${t('reports.csv_period')}: ${dateRange.startDate || t('reports.pdf_all_time')} to ${dateRange.endDate || t('reports.pdf_present')}\n\n`;

    // Summary
    csvContent += `${t('reports.csv_summary')}\n`;
    csvContent += `${t('reports.pdf_metric')},${t('reports.pdf_value')}\n`;
    csvContent += `${t('reports.total_revenue')},${reportData.summary.totalRevenue}\n`;
    csvContent += `${t('reports.total_expenses')},${reportData.summary.totalExpenses}\n`;
    csvContent += `${t('reports.net_profit')},${reportData.summary.profit}\n`;
    csvContent += `${t('reports.margin')},${reportData.summary.profitMargin.toFixed(2)}%\n`;
    csvContent += `${t('reports.total_paid')},${reportData.summary.totalPaid}\n`;
    csvContent += `${t('reports.total_pending')},${reportData.summary.totalPending}\n\n`;

    if (forecastMeta?.summary) {
      csvContent += `${t('reports.ai_forecast_title')}\n`;
      csvContent += `${t('reports.pdf_metric')},${t('reports.pdf_value')}\n`;
      csvContent += `${t('reports.forecast_net_90')},${forecastMeta.summary.expected_net_90}\n`;
      csvContent += `${t('reports.forecast_net_365')},${forecastMeta.summary.expected_net_365 ?? 0}\n`;
      csvContent += `${t('reports.forecast_revenue_365')},${forecastMeta.summary.expected_revenue_365 ?? 0}\n\n`;
    }

    // Invoices
    if (reportData.invoices.length >0) {
      csvContent += `${t('reports.csv_invoices')}\n`;
      csvContent += `${t('reports.pdf_invoice_number')},${t('reports.pdf_client')},${t('reports.pdf_amount')},${t('reports.pdf_status')},${t('reports.pdf_due_date')}\n`;
      reportData.invoices.forEach((inv: any) =>{
        csvContent += `${inv.invoiceNumber},${inv.clientId?.name || 'N/A'},${inv.totalAmount},${inv.status},${new Date(inv.dueDate).toLocaleDateString()}\n`;
      });
      csvContent += '\n';
    }

    // Expenses
    if (reportData.expenses.length >0) {
      csvContent += `${t('reports.csv_expenses')}\n`;
      csvContent += `${t('reports.pdf_supplier')},${t('reports.pdf_category')},${t('reports.pdf_amount')},${t('reports.pdf_date')}\n`;
      reportData.expenses.forEach((exp: any) =>{
        csvContent += `${exp.supplier},${exp.category},${exp.amount},${new Date(exp.date).toLocaleDateString()}\n`;
      });
    }

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `FinFlow_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
  <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6">
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('reports.title')}</h1>
        {reportData && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full sm:w-auto">
          <button onClick={exportToPDF} className="btn btn-success w-full sm:w-auto">
               {t('reports.export_pdf')}
          </button>
          <button onClick={exportToCSV} className="btn btn-success w-full sm:w-auto">
               {t('reports.export_csv')}
          </button>
        </div>
        )}
    </div>

    <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">{t('reports.filter_title')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('reports.start_date')}</label>
          <input
              type="date"
              value={dateRange.startDate}
              lang={lang === 'fr' ? 'fr' : 'en-GB'}
              onChange={(e) =>setDateRange({ ...dateRange, startDate: e.target.value })}
              className="input"
            />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('reports.end_date')}</label>
          <input
              type="date"
              value={dateRange.endDate}
              lang={lang === 'fr' ? 'fr' : 'en-GB'}
              onChange={(e) =>setDateRange({ ...dateRange, endDate: e.target.value })}
              className="input"
            />
        </div>
        <div className="flex items-end">
          <button onClick={fetchReports} disabled={loading} className="btn btn-primary w-full">
              {loading ? t('reports.loading') : t('reports.generate_report')}
          </button>
        </div>
      </div>
    </div>

      {reportData && (
      <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <p className="text-sm text-gray-600 mb-1">{t('reports.total_revenue')}</p>
            <p className="text-2xl font-bold" style={{ color: DASHBOARD_COLORS.income }}>
                {formatCurrency(reportData.summary.totalRevenue)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <p className="text-sm text-gray-600 mb-1">{t('reports.total_expenses')}</p>
            <p className="text-2xl font-bold" style={{ color: DASHBOARD_COLORS.expense }}>
                {formatCurrency(reportData.summary.totalExpenses)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <p className="text-sm text-gray-600 mb-1">{t('reports.net_profit')}</p>
            <p className="text-2xl font-bold" style={{ color: DASHBOARD_COLORS.profit }}>
                {formatCurrency(reportData.summary.profit)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
                {t('reports.margin')}: {reportData.summary.profitMargin.toFixed(2)}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{t('reports.net_cashflow')}</h3>
              <span className="text-xs text-gray-500">{t('reports.collected_minus_expenses')}</span>
            </div>
            <div className="h-64">
              {netCashflowData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={netCashflowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="reportNetFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.32} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="month" stroke="#6b7280" tickLine={false} axisLine={false} />
                    <YAxis stroke="#6b7280" tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value: number | string | undefined) => formatCurrency(Number(value || 0))} />
                    <Area type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2.5} fill="url(#reportNetFill)" name="Net cashflow" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-500">{t('reports.no_trend')}</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{t('reports.top_expense_categories')}</h3>
              <span className="text-xs text-gray-500">{t('reports.highest_spend')}</span>
            </div>
            <div className="h-64">
              {topExpenseCategories.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topExpenseCategories} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" stroke="#6b7280" tickLine={false} axisLine={false} />
                    <YAxis dataKey="category" type="category" stroke="#6b7280" tickLine={false} axisLine={false} width={110} />
                    <Tooltip formatter={(value: number | string | undefined) => formatCurrency(Number(value || 0))} />
                    <Bar dataKey="amount" fill={DASHBOARD_COLORS.expense} radius={[0, 6, 6, 0]} name="Expense" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-500">{t('reports.no_expense_categories')}</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">{t('reports.invoices_summary')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('reports.total_paid')}:</span>
                <span className="font-semibold" style={{ color: DASHBOARD_COLORS.income }}>
                    {formatCurrency(reportData.summary.totalPaid)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('reports.total_pending')}:</span>
                <span className="font-semibold" style={{ color: '#8a5b00' }}>
                    {formatCurrency(reportData.summary.totalPending)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-900 font-medium">{t('reports.total_invoices')}:</span>
                <span className="font-semibold">{reportData.invoices.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">{t('reports.expenses_summary')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('reports.total_expenses')}:</span>
                <span className="font-semibold" style={{ color: DASHBOARD_COLORS.expense }}>
                    {formatCurrency(reportData.summary.totalExpenses)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-900 font-medium">{t('reports.total_records')}:</span>
                <span className="font-semibold">{reportData.expenses.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Client Performance - only shown when clients have activity in the selected period */}
        {(() => {
          const activeClients = performance
            ? [...performance.clientsPerformance].filter((r) => (r.totalInvoices ?? 0) > 0).sort((a, b) => b.performanceScore - a.performanceScore)
            : [];
          if (!performanceLoading && activeClients.length === 0) return null;
          return (
            <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{t('reports.client_performance')}</h3>
                {!performanceLoading && activeClients.length > 5 && (
                  <button
                    onClick={() => setShowAllClients(!showAllClients)}
                    className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    {showAllClients ? t('reports.show_less') : `${t('reports.view_all')} (${activeClients.length})`}
                  </button>
                )}
              </div>
              {performanceLoading ? (
                <div className="p-8 text-center text-sm text-gray-500">{t('reports.loading_performance')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.pdf_client')}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('reports.collected')}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('reports.collection_rate')}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('reports.paid_rate')}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('reports.score')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activeClients
                        .slice(0, showAllClients ? undefined : 5)
                        .map((row, idx) => (
                          <tr key={row.clientId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-semibold text-gray-500">{idx + 1}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{row.clientName}</td>
                            <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(row.totalCollected)}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{row.collectionRate ?? 0}%</td>
                            <td className="px-4 py-3 text-right text-gray-700">{row.paidRate}%</td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className="inline-flex min-w-[56px] items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold"
                                style={scoreTone(row.performanceScore)}
                              >
                                {row.performanceScore}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}
      </>
      )}

      {!reportData && !loading && (
      <div className="bg-white rounded-lg shadow p-6 sm:p-12 text-center text-gray-500">
          {t('reports.empty_prompt')}
      </div>
      )}

    <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('reports.ai_forecast_title')}</h2>
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <p className="mb-4 text-gray-600">{t('reports.ai_forecast_desc')}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Forecast for</label>
              <select
                value={selectedForecastClient}
                onChange={(e) => setSelectedForecastClient(e.target.value)}
                className="input"
              >
                <option value="">Company-wide (all clients)</option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.name || client.contactPerson || 'Client'}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleGenerateForecast}
              disabled={isForecastLoading}
              className="btn btn-primary w-full sm:w-auto"
            >
              {isForecastLoading ? t('reports.generating_forecast') : t('reports.generate_forecast')}
            </button>
          </div>
        </div>
      </div>

      {isForecastLoading && <LoadingOverlay message={t('reports.ai_loading')} />}

      {forecastMeta?.summary && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500">{t('reports.forecast_net_90')}</p>
            <p
              className="text-xl font-bold"
              style={{ color: forecastMeta.summary.expected_net_90 >= 0 ? DASHBOARD_COLORS.income : DASHBOARD_COLORS.expense }}
            >
              {formatCurrency(forecastMeta.summary.expected_net_90)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t('reports.best')}: {formatCurrency(forecastMeta.summary.expected_best_90)} · {t('reports.worst')}: {formatCurrency(forecastMeta.summary.expected_worst_90)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500">{t('reports.forecast_risk')}</p>
            <p
              className="text-xl font-bold"
              style={{
                color:
                  forecastMeta.risk?.level === 'high'
                    ? DASHBOARD_COLORS.expense
                    : forecastMeta.risk?.level === 'medium'
                    ? '#8a5b00'
                    : DASHBOARD_COLORS.income,
              }}
            >
              {forecastMeta.risk?.level?.toUpperCase() || 'LOW'} ({forecastMeta.risk?.score ?? 0})
            </p>
            {forecastMeta.risk?.reasons?.length ? (
              <p className="text-xs text-gray-500 mt-1">{forecastMeta.risk.reasons[0]}</p>
            ) : null}
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500">{t('reports.pending_vs_overdue')}</p>
            <p className="text-xl font-bold" style={{ color: DASHBOARD_COLORS.profit }}>{formatCurrency(forecastMeta.summary.pending_amount)}</p>
            <p className="text-xs text-gray-500 mt-1">{t('reports.overdue')}: {formatCurrency(forecastMeta.summary.overdue_amount)}</p>
          </div>
        </div>
      )}

      {forecastMeta?.summary?.expected_net_365 !== undefined && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500">{t('reports.forecast_net_365')}</p>
            <p
              className="text-xl font-bold"
              style={{
                color:
                  (forecastMeta.summary.expected_net_365 || 0) >= 0
                    ? DASHBOARD_COLORS.income
                    : DASHBOARD_COLORS.expense,
              }}
            >
              {formatCurrency(forecastMeta.summary.expected_net_365 || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t('reports.best')}: {formatCurrency(forecastMeta.summary.expected_best_365 || 0)} · {t('reports.worst')}: {formatCurrency(forecastMeta.summary.expected_worst_365 || 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500">{t('reports.forecast_revenue_365')}</p>
            <p className="text-xl font-bold" style={{ color: DASHBOARD_COLORS.income }}>
              {formatCurrency(forecastMeta.summary.expected_revenue_365 || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t('reports.best')}: {formatCurrency(forecastMeta.summary.expected_revenue_best_365 || 0)} · {t('reports.worst')}: {formatCurrency(forecastMeta.summary.expected_revenue_worst_365 || 0)}
            </p>
          </div>
        </div>
      )}

      {forecastMeta?.insights?.length ? (
        <div className="mt-4 bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Forecast insights</h3>
          <div className="space-y-2">
            {forecastMeta.insights.map((insight, idx) => (
              <div
                key={`${insight.type}-${idx}`}
                className={`rounded-md border px-3 py-2 text-sm ${
                  insight.type === 'critical'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : insight.type === 'warning'
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                {insight.message}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {forecastData && (
        <ForecastChart data={forecastData} />
      )}

  </div>
  );
};

export default Reports;




