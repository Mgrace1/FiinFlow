import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import ConfirmModal from '../components/common/ConfirmModal';
import EmptyState from '../components/common/EmptyState';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { Search, Plus, X, Calendar, Upload } from 'lucide-react';
import { getErrorMessage, notifyError, notifyInfo, notifySuccess } from '../utils/toast';
import { getUserRole } from '../utils/roleUtils';

interface Transaction {
  _id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  description: string;
  currency: string;
}

const Transactions: React.FC = () =>{
  const isAdmin = getUserRole() === 'admin';


  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; transactionId: string | null }>({
    show: false,
    transactionId: null,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'bank' | 'receipts' | 'sales' | 'expenses'>('bank');
  const [dateFilter, setDateFilter] = useState<'all' | 'this_month' | 'last_30'>('all');
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [visibleCount, setVisibleCount] = useState(8);
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [formData, setFormData] = useState({
    amount: '',
    category: 'Salary',
    date: new Date().toISOString().split('T')[0],
    description: '',
    receipt: null as File | null,
  });
  const companyName = (() =>{
    try {
      const company = JSON.parse(localStorage.getItem('finflow_company') || '{}');
      return company.displayName || company.name || 'Your Company';
    } catch {
      return 'Your Company';
    }
  })();

  useEffect(() =>{
    fetchTransactions();
  }, []);

  useEffect(() =>{
    filterTransactions();
  }, [transactions, searchQuery, activeTab, dateFilter, transactionFilter]);

  const fetchTransactions = async () =>{
    try {
      // Fetch both expenses and invoices
      const [expensesRes, invoicesRes] = await Promise.all([
        apiClient.get('/expenses'),
        apiClient.get('/invoices'),
      ]);

      const expenses = expensesRes.data.success ? expensesRes.data.data.map((exp: any) =>({
        _id: exp._id,
        type: 'expense' as const,
        amount: exp.amount,
        category: exp.category,
        date: exp.date,
        description: exp.supplier || exp.description || '',
        currency: exp.currency,
      })) : [];

      const invoices = invoicesRes.data.success ? invoicesRes.data.data.map((inv: any) =>({
        _id: inv._id,
        type: 'income' as const,
        amount: inv.totalAmount,
        category: 'Salary',
        date: inv.createdAt,
        description: inv.invoiceNumber || 'Invoice',
        currency: inv.currency,
      })) : [];

      const allTransactions = [...expenses, ...invoices].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () =>{
    let filtered = [...transactions];

    if (activeTab === 'sales') {
      filtered = filtered.filter((t) => t.type === 'income');
    } else if (activeTab === 'expenses') {
      filtered = filtered.filter((t) => t.type === 'expense');
    } else if (activeTab === 'receipts') {
      filtered = filtered.filter((t) => t.type === 'expense');
    }

    if (transactionFilter !== 'all') {
      filtered = filtered.filter((t) => t.type === transactionFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter((t) =>{
        const txDate = new Date(t.date);
        if (dateFilter === 'this_month') {
          return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
        }
        if (dateFilter === 'last_30') {
          const threshold = new Date();
          threshold.setDate(now.getDate() - 30);
          return txDate >= threshold;
        }
        return true;
      });
    }

    if (searchQuery) {
      filtered = filtered.filter((t) =>
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTransactions(filtered);
    setVisibleCount(8);
  };

  const handleSubmit = async (e: React.FormEvent) =>{
    e.preventDefault();
    try {
      if (transactionType === 'expense') {
        await apiClient.post('/expenses', {
          supplier: formData.description || 'Expense',
          category: formData.category,
          amount: parseFloat(formData.amount),
          currency: 'USD',
          date: formData.date,
          description: formData.description,
        });
      } else {
        // For income, we'd need to create an invoice or use a different endpoint
        // For now, we'll just show a message
        notifyInfo('Income transactions are added via invoices');
      }
      fetchTransactions();
      setShowModal(false);
      resetForm();
      notifySuccess('Transaction created successfully');
    } catch (error) {
      console.error('Failed to create transaction:', error);
      notifyError(getErrorMessage(error, 'Failed to create transaction'));
    }
  };

  const handleDelete = async () =>{
    if (!deleteConfirm.transactionId) return;
    try {
      const transaction = transactions.find((t) => t._id === deleteConfirm.transactionId);
      if (transaction?.type === 'expense') {
        await apiClient.delete(`/expenses/${deleteConfirm.transactionId}`);
      }
      fetchTransactions();
      setDeleteConfirm({ show: false, transactionId: null });
      notifySuccess('Transaction deleted successfully');
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      notifyError(getErrorMessage(error, 'Failed to delete transaction'));
    }
  };

  const resetForm = () =>{
    setFormData({
      amount: '',
      category: 'Salary',
      date: new Date().toISOString().split('T')[0],
      description: '',
      receipt: null,
    });
    setTransactionType('expense');
  };

  const formatCurrency = (amount: number) =>{
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) =>{
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  if (loading) return <LoadingOverlay message="Loading transactions..." />;

  const displayedTransactions = filteredTransactions.slice(0, visibleCount);

  return (
  <div className="max-w-6xl mx-auto">
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Top Header */}
      <div className="px-6 pt-5 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">{companyName}</p>
          <button
            onClick={() =>setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition"
          >
            <Plus className="w-4 h-4" />
            Add account
          </button>
        </div>
        <h1 className="text-4xl font-bold text-gray-900">Transactions</h1>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4 border-b border-gray-200">
        <div className="flex items-center gap-8 text-sm">
          <button
            onClick={() =>setActiveTab('bank')}
            className={`pb-3 border-b-2 transition ${
              activeTab === 'bank' ? 'border-gray-900 text-gray-900 font-semibold' : 'border-transparent text-gray-400'
            }`}
          >
            Bank transactions
          </button>
          <button
            onClick={() =>setActiveTab('receipts')}
            className={`pb-3 border-b-2 transition ${
              activeTab === 'receipts' ? 'border-gray-900 text-gray-900 font-semibold' : 'border-transparent text-gray-400'
            }`}
          >
            Receipts
          </button>
          <button
            onClick={() =>setActiveTab('sales')}
            className={`pb-3 border-b-2 transition ${
              activeTab === 'sales' ? 'border-gray-900 text-gray-900 font-semibold' : 'border-transparent text-gray-400'
            }`}
          >
            Income
          </button>
          <button
            onClick={() =>setActiveTab('expenses')}
            className={`pb-3 border-b-2 transition ${
              activeTab === 'expenses' ? 'border-gray-900 text-gray-900 font-semibold' : 'border-transparent text-gray-400'
            }`}
          >
            Expenses
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-6 py-4 border-b border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          value={dateFilter}
          onChange={(e) =>setDateFilter(e.target.value as 'all' | 'this_month' | 'last_30')}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="all">All dates</option>
          <option value="this_month">This month</option>
          <option value="last_30">Last 30 days</option>
        </select>
        <select
          value={transactionFilter}
          onChange={(e) =>setTransactionFilter(e.target.value as 'all' | 'income' | 'expense')}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="all">All transactions</option>
          <option value="income">Income only</option>
          <option value="expense">Expenses only</option>
        </select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search transactions"
            value={searchQuery}
            onChange={(e) =>setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto">
        {displayedTransactions.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon=""
              title="No transactions found"
              subtitle="Try changing filters or add a new transaction."
              action={{
                label: '+ Add Transaction',
                onClick: () =>setShowModal(true),
              }}
            />
          </div>
        ) : (
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <th className="px-4 py-3 text-left w-10">
                  <input type="checkbox" className="rounded border-gray-300" />
                </th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-right">Spent</th>
                <th className="px-4 py-3 text-right">Received</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {displayedTransactions.map((transaction) =>(
                <tr key={transaction._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded border-gray-300" />
                  </td>
                  <td className="px-4 py-3 text-gray-700">{formatDate(transaction.date)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{transaction.description}</td>
                  <td className="px-4 py-3 text-gray-700">{transaction.category}</td>
                  <td className="px-4 py-3 text-right text-gray-900 font-medium">
                    {transaction.type === 'expense' ? formatCurrency(transaction.amount) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 font-medium">
                    {transaction.type === 'income' ? formatCurrency(transaction.amount) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => notifyInfo('This action will be available soon')}
                      className="text-sky-500 hover:text-sky-700 font-semibold text-sm"
                    >
                      Add
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      {filteredTransactions.length > visibleCount && (
        <div className="px-6 py-4 border-t border-gray-200 text-center">
          <button
            onClick={() => setVisibleCount((prev) => prev + 8)}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium"
          >
            Load more
          </button>
        </div>
      )}
    </div>

      {/* Add Transaction Modal */}
      {showModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Add Transaction</h2>
            <button
                onClick={() =>{
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-gray-600 mb-6">Record a new income or expense transaction</p>

          <form onSubmit={handleSubmit} className="space-y-4">
              {/* Transaction Type Selector */}
            <div className="flex gap-2 mb-4">
              <button
                  type="button"
                  onClick={() =>setTransactionType('expense')}
                  className={`flex-1 px-4 py-2 rounded-full font-medium transition-colors ${
                    transactionType === 'expense'
                      ? 'bg-white text-gray-900 border-2 border-gray-300'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  Expense
              </button>
              <button
                  type="button"
                  onClick={() =>setTransactionType('income')}
                  className={`flex-1 px-4 py-2 rounded-full font-medium transition-colors ${
                    transactionType === 'income'
                      ? 'bg-white text-gray-900 border-2 border-gray-300'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  Income
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
              <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>setFormData({ ...formData, amount: e.target.value })}
                  required
                  placeholder="$ 0.00"
                  className="input w-full"
                />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                  value={formData.category}
                  onChange={(e) =>setFormData({ ...formData, category: e.target.value })}
                  required
                  className="input w-full"
                >
                <option value="Salary">Salary</option>
                <option value="Food">Food</option>
                <option value="Transportation">Transportation</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Utilities">Utilities</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <div className="relative">
                <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>setFormData({ ...formData, date: e.target.value })}
                    required
                    className="input w-full"
                  />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>setFormData({ ...formData, description: e.target.value })}
                  required
                  placeholder="e.g., Grocery shopping, Monthly rent..."
                  className="input w-full"
                />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receipt (Optional)</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-500 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to upload receipt image</p>
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>setFormData({ ...formData, receipt: e.target.files?.[0] || null })}
                    className="hidden"
                    id="receipt-upload"
                  />
                <label htmlFor="receipt-upload" className="cursor-pointer" />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                  type="button"
                  onClick={() =>{
                    setShowModal(false);
                    resetForm();
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
              </button>
              <button type="submit" className="btn btn-primary flex-1 bg-green-500 hover:bg-green-600">
                  Add Transaction
              </button>
            </div>
          </form>
        </div>
      </div>
      )}

      {/* Delete Confirmation Modal */}
    <ConfirmModal
        isOpen={isAdmin && deleteConfirm.show}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() =>setDeleteConfirm({ show: false, transactionId: null })}
      />
  </div>
  );
};

export default Transactions;

