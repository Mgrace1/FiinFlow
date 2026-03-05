import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { Link } from 'react-router-dom';
import ConfirmModal from '../components/common/ConfirmModal';
import EmptyState from '../components/common/EmptyState';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { Search } from 'lucide-react';
import { notifyInfo } from '../utils/toast';
import { getUserRole } from '../utils/roleUtils';

interface Transaction {
  _id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  name: string;
  currency: string;
}

const Transactions: React.FC = () =>{
  const isAdmin = getUserRole() === 'admin';


  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; transactionId: string | null }>({
    show: false,
    transactionId: null,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'bank' | 'receipts' | 'sales' | 'expenses'>('bank');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [visibleCount, setVisibleCount] = useState(8);
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
  }, [transactions, searchQuery, activeTab, startDate, endDate]);

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
        date: exp.date,
        name: exp.supplier || exp.description || 'Expense',
        currency: exp.currency,
      })) : [];

      const invoices = invoicesRes.data.success ? invoicesRes.data.data.map((inv: any) =>({
        _id: inv._id,
        type: 'income' as const,
        amount: inv.totalAmount,
        date: inv.createdAt,
        name: inv.clientId?.name || inv.clientName || 'Client',
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

    if (startDate || endDate) {
      filtered = filtered.filter((t) =>{
        const txDate = new Date(t.date);
        const txDateOnly = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());

        if (startDate) {
          const from = new Date(startDate);
          const fromOnly = new Date(from.getFullYear(), from.getMonth(), from.getDate());
          if (txDateOnly < fromOnly) return false;
        }
        if (endDate) {
          const to = new Date(endDate);
          const toOnly = new Date(to.getFullYear(), to.getMonth(), to.getDate());
          if (txDateOnly > toOnly) return false;
        }
        return true;
      });
    }

    if (searchQuery) {
      filtered = filtered.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t._id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTransactions(filtered);
    setVisibleCount(8);
  };

  const handleDelete = async () =>{
    if (!deleteConfirm.transactionId) return;
    setDeleteConfirm({ show: false, transactionId: null });
    notifyInfo('Delete action will be available soon');
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
  <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6">
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Top Header */}
      <div className="px-4 pt-4 pb-4 sm:px-6 sm:pt-5 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">{companyName}</p>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Transactions</h1>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-6 pt-4 border-b border-gray-200">
        <div className="flex items-center gap-5 sm:gap-8 text-sm overflow-x-auto scrollbar-hide whitespace-nowrap">
          <button
            onClick={() =>setActiveTab('bank')}
            className={`pb-3 border-b-2 transition ${
              activeTab === 'bank' ? 'border-gray-900 text-gray-900 font-semibold' : 'border-transparent text-gray-400'
            }`}
          >
            Transactions
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
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          aria-label="Start date"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          aria-label="End date"
        />
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

      {/* Transactions Table / Mobile Cards */}
      <div>
        {displayedTransactions.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon=""
              title="No transactions found"
              subtitle="Try changing filters."
            />
          </div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-gray-200">
              {displayedTransactions.map((transaction) => (
                <div key={transaction._id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-500">{formatDate(transaction.date)}</p>
                      <p className="mt-1 font-semibold text-gray-900">{transaction.name}</p>
                    </div>
                    <Link
                      to={transaction.type === 'income' ? `/invoices/${transaction._id}` : `/expenses/${transaction._id}`}
                      className="text-sky-500 hover:text-sky-700 font-semibold text-sm"
                    >
                      Link
                    </Link>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md bg-gray-50 px-3 py-2">
                      <p className="text-xs text-gray-500">Spent</p>
                      <p className="font-medium text-gray-900">
                        {transaction.type === 'expense' ? formatCurrency(transaction.amount) : '-'}
                      </p>
                    </div>
                    <div className="rounded-md bg-gray-50 px-3 py-2">
                      <p className="text-xs text-gray-500">Received</p>
                      <p className="font-medium text-gray-900">
                        {transaction.type === 'income' ? formatCurrency(transaction.amount) : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-right">Spent</th>
                    <th className="px-4 py-3 text-right">Received</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayedTransactions.map((transaction) =>(
                    <tr key={transaction._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{formatDate(transaction.date)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{transaction.name}</td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium">
                        {transaction.type === 'expense' ? formatCurrency(transaction.amount) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium">
                        {transaction.type === 'income' ? formatCurrency(transaction.amount) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={transaction.type === 'income' ? `/invoices/${transaction._id}` : `/expenses/${transaction._id}`}
                          className="text-sky-500 hover:text-sky-700 font-semibold text-sm"
                        >
                          Link
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
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

