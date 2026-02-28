import React, { useMemo, useState } from 'react';
import { apiClient, getForecast } from '../api/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ForecastChart from '../components/forecasting/ForecastChart';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { notifyError } from '../utils/toast';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

interface ClientPerformance {
  clientId: string;
  rank?: number;
  clientName: string;
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

const monthLabelFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });

const getSafeDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const Reports: React.FC = () =>{
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [forecastData, setForecastData] = useState<any | null>(null);
  const [isForecastLoading, setIsForecastLoading] = useState(false);
  const [performance, setPerformance] = useState<PerformancePayload | null>(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [showAllClients, setShowAllClients] = useState(false);

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
      notifyError('Failed to load performance data');
    } finally {
      setPerformanceLoading(false);
    }
  };

  const scoreTone = (score: number) => {
    if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  const handleGenerateForecast = async () => {
    setIsForecastLoading(true);
    try {
      const response = await getForecast();
      setForecastData(response.forecast_data);
    } catch (error) {
      console.error('Failed to generate forecast:', error);
      notifyError('Failed to generate forecast. Please ensure the forecasting service is running.');
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
    doc.text('FiinFlow Financial Report', 14, 20);

    // Date range
    doc.setFontSize(10);
    const dateRangeText = `Period: ${dateRange.startDate || 'All time'} to ${dateRange.endDate || 'Present'}`;
    doc.text(dateRangeText, 14, 28);

    // Summary section
    doc.setFontSize(14);
    doc.text('Financial Summary', 14, 40);

    const summaryData = [
      ['Total Revenue', formatCurrency(reportData.summary.totalRevenue)],
      ['Total Expenses', formatCurrency(reportData.summary.totalExpenses)],
      ['Net Profit', formatCurrency(reportData.summary.profit)],
      ['Profit Margin', `${reportData.summary.profitMargin.toFixed(2)}%`],
      ['Total Paid', formatCurrency(reportData.summary.totalPaid)],
      ['Total Pending', formatCurrency(reportData.summary.totalPending)],
    ];

    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [30, 136, 229] },
    });

    // Invoices section
    if (reportData.invoices.length >0) {
      const finalY = (doc as any).lastAutoTable.finalY || 45;
      doc.setFontSize(14);
      doc.text('Invoices', 14, finalY + 15);

      const invoiceData = reportData.invoices.map((inv: any) =>[
        inv.invoiceNumber,
        inv.clientId?.name || 'N/A',
        formatCurrency(inv.totalAmount),
        inv.status,
        new Date(inv.dueDate).toLocaleDateString(),
      ]);

      autoTable(doc, {
        startY: finalY + 20,
        head: [['Invoice #', 'Client', 'Amount', 'Status', 'Due Date']],
        body: invoiceData,
        theme: 'striped',
        headStyles: { fillColor: [30, 136, 229] },
      });
    }

    // Expenses section
    if (reportData.expenses.length >0) {
      const finalY = (doc as any).lastAutoTable.finalY || 45;
      doc.setFontSize(14);
      doc.text('Expenses', 14, finalY + 15);

      const expenseData = reportData.expenses.map((exp: any) =>[
        exp.supplier,
        exp.category,
        formatCurrency(exp.amount),
        new Date(exp.date).toLocaleDateString(),
      ]);

      autoTable(doc, {
        startY: finalY + 20,
        head: [['Supplier', 'Category', 'Amount', 'Date']],
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

    let csvContent = 'FiinFlow Financial Report\n';
    csvContent += `Period: ${dateRange.startDate || 'All time'} to ${dateRange.endDate || 'Present'}\n\n`;

    // Summary
    csvContent += 'FINANCIAL SUMMARY\n';
    csvContent += 'Metric,Value\n';
    csvContent += `Total Revenue,${reportData.summary.totalRevenue}\n`;
    csvContent += `Total Expenses,${reportData.summary.totalExpenses}\n`;
    csvContent += `Net Profit,${reportData.summary.profit}\n`;
    csvContent += `Profit Margin,${reportData.summary.profitMargin.toFixed(2)}%\n`;
    csvContent += `Total Paid,${reportData.summary.totalPaid}\n`;
    csvContent += `Total Pending,${reportData.summary.totalPending}\n\n`;

    // Invoices
    if (reportData.invoices.length >0) {
      csvContent += 'INVOICES\n';
      csvContent += 'Invoice #,Client,Amount,Status,Due Date\n';
      reportData.invoices.forEach((inv: any) =>{
        csvContent += `${inv.invoiceNumber},${inv.clientId?.name || 'N/A'},${inv.totalAmount},${inv.status},${new Date(inv.dueDate).toLocaleDateString()}\n`;
      });
      csvContent += '\n';
    }

    // Expenses
    if (reportData.expenses.length >0) {
      csvContent += 'EXPENSES\n';
      csvContent += 'Supplier,Category,Amount,Date\n';
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
  <div>
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
        {reportData && (
        <div className="flex space-x-3">
          <button onClick={exportToPDF} className="btn btn-success">
               Export PDF
          </button>
          <button onClick={exportToCSV} className="btn btn-success">
               Export CSV
          </button>
        </div>
        )}
    </div>

    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Filter Reports</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>setDateRange({ ...dateRange, startDate: e.target.value })}
              className="input"
            />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>setDateRange({ ...dateRange, endDate: e.target.value })}
              className="input"
            />
        </div>
        <div className="flex items-end">
          <button onClick={fetchReports} disabled={loading} className="btn btn-primary w-full">
              {loading ? 'Loading...' : 'Generate Report'}
          </button>
        </div>
      </div>
    </div>

      {reportData && (
      <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-success-500">
                {formatCurrency(reportData.summary.totalRevenue)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
            <p className="text-2xl font-bold text-danger-500">
                {formatCurrency(reportData.summary.totalExpenses)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Net Profit</p>
            <p className="text-2xl font-bold text-primary-500">
                {formatCurrency(reportData.summary.profit)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
                Margin: {reportData.summary.profitMargin.toFixed(2)}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Net cashflow trend</h3>
              <span className="text-xs text-gray-500">Collected - Expenses</span>
            </div>
            <div className="h-64">
              {netCashflowData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={netCashflowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="reportNetFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f8b80" stopOpacity={0.32} />
                        <stop offset="95%" stopColor="#4f8b80" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="month" stroke="#6b7280" tickLine={false} axisLine={false} />
                    <YAxis stroke="#6b7280" tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Area type="monotone" dataKey="net" stroke="#4f8b80" strokeWidth={2.5} fill="url(#reportNetFill)" name="Net cashflow" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-500">No trend data for selected period</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Top expense categories</h3>
              <span className="text-xs text-gray-500">Highest spend categories</span>
            </div>
            <div className="h-64">
              {topExpenseCategories.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topExpenseCategories} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" stroke="#6b7280" tickLine={false} axisLine={false} />
                    <YAxis dataKey="category" type="category" stroke="#6b7280" tickLine={false} axisLine={false} width={110} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="amount" fill="#4f8b80" radius={[0, 6, 6, 0]} name="Expense" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-500">No expense categories for selected period</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Invoices Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Paid:</span>
                <span className="font-semibold text-success-500">
                    {formatCurrency(reportData.summary.totalPaid)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Pending:</span>
                <span className="font-semibold text-warning-500">
                    {formatCurrency(reportData.summary.totalPending)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-900 font-medium">Total Invoices:</span>
                <span className="font-semibold">{reportData.invoices.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Expenses Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Expenses:</span>
                <span className="font-semibold text-danger-500">
                    {formatCurrency(reportData.summary.totalExpenses)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-900 font-medium">Total Records:</span>
                <span className="font-semibold">{reportData.expenses.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Client Performance — only shown when clients have activity in the selected period */}
        {(() => {
          const activeClients = performance
            ? [...performance.clientsPerformance].filter(r => r.totalInvoices > 0).sort((a, b) => b.performanceScore - a.performanceScore)
            : [];
          if (!performanceLoading && activeClients.length === 0) return null;
          return (
            <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Client Performance</h3>
                {!performanceLoading && activeClients.length > 5 && (
                  <button
                    onClick={() => setShowAllClients(!showAllClients)}
                    className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    {showAllClients ? 'Show Less' : `View All (${activeClients.length})`}
                  </button>
                )}
              </div>
              {performanceLoading ? (
                <div className="p-8 text-center text-sm text-gray-500">Loading performance data...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Collected</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Collection Rate</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid Rate</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Score</th>
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
                              <span className={`inline-flex min-w-[56px] items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold ${scoreTone(row.performanceScore)}`}>
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
      <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          Select a date range and click "Generate Report" to view financial data
      </div>
      )}

    <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">AI-Powered Forecast</h2>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="mb-4 text-gray-600">
            Click the button below to generate a 90-day cash flow forecast based on your historical data.
            This feature uses AI to predict future financial trends.
          </p>
          <button
            onClick={handleGenerateForecast}
            disabled={isForecastLoading}
            className="btn btn-primary"
          >
            {isForecastLoading ? 'Generating Forecast...' : 'Generate 90-Day Forecast'}
          </button>
        </div>
      </div>

      {isForecastLoading && <LoadingOverlay message="AI is analyzing your data..." />}

      {forecastData && (
        <ForecastChart data={forecastData} />
      )}

  </div>
  );
};

export default Reports;
