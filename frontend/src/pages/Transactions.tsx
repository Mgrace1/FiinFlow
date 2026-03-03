import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import ConfirmModal from '../components/common/ConfirmModal';
import EmptyState from '../components/common/EmptyState';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { Search, Plus, X, Calendar, Upload, TrendingUp, TrendingDown } from 'lucide-react';
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
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [formData, setFormData] = useState({
    amount: '',
    category: 'Salary',
    date: new Date().toISOString().split('T')[0],
    description: '',
    receipt: null as File | null,
  });

  const categories = ['All Categories', 'Salary', 'Food', 'Transportation', 'Entertainment', 'Utilities', 'Other'];

  useEffect(() =>{
    fetchTransactions();
  }, []);

  useEffect(() =>{
    filterTransactions();
  }, [transactions, searchQuery, selectedCategory]);

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

    if (searchQuery) {
      filtered = filtered.filter((t) =>
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'All Categories') {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    setFilteredTransactions(filtered);
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) return <LoadingOverlay message="Loading transactions..." />;

  return (
  <div>
      {/* Header */}
    <div className="mb-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Transactions</h1>
      <p className="text-gray-600">View and manage your transactions</p>
    </div>

      {/* Search and Filter */}
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) =>setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
      </div>
      <div className="w-full md:w-64">
        <select
            value={selectedCategory}
            onChange={(e) =>setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            {categories.map((cat) =>(
            <option key={cat} value={cat}>
                {cat}
            </option>
            ))}
        </select>
      </div>
      <button
          onClick={() =>setShowModal(true)}
          className="btn btn-primary flex items-center gap-2 whitespace-nowrap"
        >
        <Plus className="w-4 h-4" />
        Add Transaction
      </button>
    </div>

      {/* Transactions List */}
    <div className="bg-white rounded-lg shadow">
        {filteredTransactions.length === 0 ? (
        <EmptyState
            icon=""
            title="No transactions found"
            subtitle="Add your first transaction to get started"
            action={{
              label: '+ Add Transaction',
              onClick: () =>setShowModal(true),
            }}
          />
        ) : (
          <div className="divide-y divide-gray-200">
              {filteredTransactions.map((transaction) =>(
              <div
                  key={transaction._id}
                  className="p-4 hover:bg-gray-50 flex items-center justify-between"
                >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                      {transaction.type === 'income' ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-sm text-gray-600">{transaction.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-sm text-gray-500">{formatDate(transaction.date)}</p>
                  </div>
                  {isAdmin && (
                    <button
                        onClick={(e) =>{
                          e.stopPropagation();
                          setDeleteConfirm({ show: true, transactionId: transaction._id });
                        }}
                        className="text-red-500 hover:text-red-700 px-2"
                      >
                        Delete
                    </button>
                  )}
                </div>
              </div>
              ))}
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

