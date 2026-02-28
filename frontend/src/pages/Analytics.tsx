import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface AnalyticsData {
  totalIncome: number;
  totalExpense: number;
  topCategory: string;
  topCategoryAmount: number;
  monthlyData: Array<{
    month: string;
    income: number;
    expense: number;
  }>;
  categoryData: Array<{
    category: string;
    amount: number;
  }>;
}

const Analytics: React.FC = () =>{
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  useEffect(() =>{
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () =>{
    try {
      // Fetch dashboard stats and expenses
      const [dashboardRes, expensesRes] = await Promise.all([
        apiClient.get('/dashboard/stats'),
        apiClient.get('/expenses'),
      ]);

      const stats = dashboardRes.data.success ? dashboardRes.data.data.stats : null;
      const expenses = expensesRes.data.success ? expensesRes.data.data : [];

      if (stats) {
        // Calculate category spending
        const categoryMap = new Map<string, number>();
        expenses.forEach((exp: any) =>{
          const current = categoryMap.get(exp.category) || 0;
          categoryMap.set(exp.category, current + exp.amount);
        });

        const categoryData = Array.from(categoryMap.entries())
          .map(([category, amount]) =>({ category, amount }))
          .sort((a, b) => b.amount - a.amount);

        const topCategory = categoryData[0] || { category: 'Food', amount: 0 };

        // Generate monthly data (simplified - in real app, use actual monthly data)
        const monthlyData = [
          { month: 'Jan', income: 4500, expense: 2500 },
          { month: 'Feb', income: 2000, expense: 1000 },
          { month: 'Mar', income: 3000, expense: 9500 },
          { month: 'Apr', income: 3500, expense: 4000 },
          { month: 'May', income: 2000, expense: 4500 },
          { month: 'Jun', income: 3000, expense: 4000 },
        ];

        setAnalyticsData({
          totalIncome: stats.totalRevenue || 20940,
          totalExpense: stats.totalExpenses || 10606,
          topCategory: topCategory.category,
          topCategoryAmount: topCategory.amount,
          monthlyData,
          categoryData: categoryData.length > 0 ? categoryData : [
            { category: 'Food', amount: 450 },
            { category: 'Transportation', amount: 320 },
            { category: 'Entertainment', amount: 280 },
            { category: 'Utilities', amount: 200 },
            { category: 'Other', amount: 150 },
          ],
        });
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>{
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) return <LoadingOverlay message="Loading analytics..." />;

  if (!analyticsData) {
    return (
    <div className="text-center text-gray-500 py-12">
        No analytics data available
    </div>
    );
  }

  // Income vs Expense Bar Chart Data
  const incomeVsExpenseData = {
    labels: analyticsData.monthlyData.map((d) => d.month),
    datasets: [
      {
        label: 'Income',
        data: analyticsData.monthlyData.map((d) => d.income),
        backgroundColor: '#10b981',
      },
      {
        label: 'Expense',
        data: analyticsData.monthlyData.map((d) => d.expense),
        backgroundColor: '#ef4444',
      },
    ],
  };

  const incomeVsExpenseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '$' + value;
          },
        },
      },
    },
  };

  // Spending by Category Pie Chart Data
  const categoryColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  const spendingByCategoryData = {
    labels: analyticsData.categoryData.map((d) => d.category),
    datasets: [
      {
        data: analyticsData.categoryData.map((d) => d.amount),
        backgroundColor: categoryColors.slice(0, analyticsData.categoryData.length),
      },
    ],
  };

  const spendingByCategoryOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
    },
  };

  // Calculate summary metrics
  const savingsRate = analyticsData.totalIncome > 0
    ? Math.round(((analyticsData.totalIncome - analyticsData.totalExpense) / analyticsData.totalIncome) * 100)
    : 0;
  const avgMonthlyExpense = analyticsData.totalExpense / 6; // Assuming 6 months
  const avgMonthlyIncome = analyticsData.totalIncome / 6;

  return (
  <div>
      {/* Header */}
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics</h1>
      <p className="text-gray-600">Visualize your spending patterns and financial insights</p>
    </div>

      {/* Summary Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-sm text-gray-600 mb-1">Top Category</p>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(analyticsData.topCategoryAmount)}</p>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-sm text-gray-600 mb-1">Total Income (YTD)</p>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(analyticsData.totalIncome)}</p>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-sm text-gray-600 mb-1">Total Expense (YTD)</p>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(analyticsData.totalExpense)}</p>
      </div>
    </div>

      {/* Charts */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Income vs Expense Bar Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Income vs Expense</h2>
        <div className="h-64">
          <Bar data={incomeVsExpenseData} options={incomeVsExpenseOptions} />
        </div>
      </div>

        {/* Spending by Category Pie Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Spending by Category</h2>
        <div className="h-64">
          <Pie data={spendingByCategoryData} options={spendingByCategoryOptions} />
        </div>
        <div className="mt-4 space-y-2">
            {analyticsData.categoryData.map((item, index) =>(
            <div key={item.category} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: categoryColors[index] || '#gray' }}
                  />
                <span className="text-sm text-gray-600">{item.category}</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{formatCurrency(item.amount)}</span>
            </div>
            ))}
        </div>
      </div>
    </div>

      {/* Summary Section */}
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <p className="text-sm text-gray-600 mb-1">Savings Rate</p>
          <p className="text-3xl font-bold text-gray-900">{savingsRate}%</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">Average Monthly Expense</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(avgMonthlyExpense)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">Average Monthly Income</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(avgMonthlyIncome)}</p>
        </div>
      </div>
    </div>
  </div>
  );
};

export default Analytics;

