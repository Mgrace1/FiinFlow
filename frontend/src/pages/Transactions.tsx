import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/common/ConfirmModal';
import EmptyDocumentState from '../components/common/EmptyDocumentState';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { Search, Link2 } from 'lucide-react';
import { notifyInfo } from '../utils/toast';
import { getUserRole } from '../utils/roleUtils';
import { formatCompanyMoney, getCurrencyConfig } from '../utils/currency';
import { useLanguage } from '../contexts/LanguageContext';

interface Transaction {
  _id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  name: string;
  currency: string;
  status: string;
  createdAt: string;
}

// -- linked-ID helpers (persisted in localStorage) --
const getLinkedIds = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem('finflow_linked_ids') || '[]')); }
  catch { return new Set(); }
};

const Transactions: React.FC = () => {
  const { t, lang } = useLanguage();
  const role = getUserRole();
  const isAdmin = role === 'admin' || role === 'super_admin';
  const navigate = useNavigate();
  const currencyConfig = getCurrencyConfig();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkedIds, setLinkedIds] = useState<Set<string>>(getLinkedIds);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; transactionId: string | null }>({
    show: false, transactionId: null,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'bank' | 'sales' | 'expenses'>('bank');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [visibleCount, setVisibleCount] = useState(8);

  const companyName = (() => {
    try {
      const company = JSON.parse(localStorage.getItem('finflow_company') || '{}');
      return company.displayName || company.name || t('common.your_company');
    } catch { return t('common.your_company'); }
  })();

  useEffect(() => { fetchTransactions(); }, []);

  useEffect(() => {
    const onFocus = () => setLinkedIds(getLinkedIds());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => { filterTransactions(); }, [transactions, searchQuery, activeTab, startDate, endDate]);

  const fetchTransactions = async () => {
    try {
      const [expensesRes, invoicesRes] = await Promise.all([
        apiClient.get('/expenses'),
        apiClient.get('/invoices'),
      ]);
      const expenses: Transaction[] = expensesRes.data.success
        ? expensesRes.data.data.map((exp: any) => ({
            _id: exp._id,
            type: 'expense' as const,
            amount: exp.amount,
            date: exp.date || exp.dueDate || exp.createdAt,
            createdAt: exp.createdAt || exp.date || exp.dueDate,
            name: exp.supplier || exp.description || t('transactions.fallback_expense'),
            currency: exp.currency,
            status: exp.paymentStatus,
          }))
        : [];
      const invoices: Transaction[] = invoicesRes.data.success
        ? invoicesRes.data.data.map((inv: any) => ({
            _id: inv._id, type: 'income' as const,
            amount: inv.totalAmount, date: inv.createdAt || inv.dueDate, createdAt: inv.createdAt || inv.dueDate,
            name: inv.clientId?.name || inv.clientName || t('transactions.fallback_client'),
            currency: inv.currency, status: inv.status,
          }))
        : [];
      setTransactions(
        [...expenses, ...invoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];
    if (activeTab === 'sales') filtered = filtered.filter((t) => t.type === 'income');
    else if (activeTab === 'expenses') filtered = filtered.filter((t) => t.type === 'expense');

    if (startDate || endDate) {
      filtered = filtered.filter((t) => {
        const d = new Date(t.date);
        const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        if (startDate) { const f = new Date(startDate); if (day < new Date(f.getFullYear(), f.getMonth(), f.getDate())) return false; }
        if (endDate)   { const e = new Date(endDate);   if (day > new Date(e.getFullYear(), e.getMonth(), e.getDate())) return false; }
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

  const handleDelete = async () => {
    if (!deleteConfirm.transactionId) return;
    setDeleteConfirm({ show: false, transactionId: null });
    notifyInfo(t('transactions.delete_soon'));
  };

  const handleUnlink = (txId: string) => {
    const next = new Set(linkedIds);
    next.delete(txId);
    localStorage.setItem('finflow_linked_ids', JSON.stringify([...next]));
    setLinkedIds(next);
    notifyInfo(t('transactions.unlink'));
  };

  const formatMoney = (amount: number, currency: string) =>
    formatCompanyMoney(amount, currency, currencyConfig);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-GB');

  /** Navigate to the filtered list page and highlight the specific item */
  const handleLinkClick = (tx: Transaction) => {
    if (linkedIds.has(tx._id)) {
      notifyInfo(t('transactions.already_linked'));
      return;
    }

    const params = new URLSearchParams({
      highlight: tx._id,
      sourceId: tx._id,
      linkAmount: String(Number(tx.amount) || 0),
      linkCurrency: tx.currency || 'RWF',
    });

    if (tx.type === 'income') {
      params.set('status', 'sent,overdue');
      navigate(`/invoices?${params.toString()}`);
    } else {
      params.set('status', 'pending');
      navigate(`/expenses?${params.toString()}`);
    }
  };

  if (loading) return <LoadingOverlay message={t('transactions.loading')} />;

  const displayedTransactions = filteredTransactions.slice(0, visibleCount);
  const hasFilters = Boolean(searchQuery || startDate || endDate || activeTab !== 'bank');

  const tabClass = (tab: typeof activeTab) =>
    `pb-3 border-b-2 transition text-sm font-medium whitespace-nowrap ${
      activeTab === tab
        ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100 font-semibold'
        : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
    }`;

  const TypeBadge = ({ type }: { type: 'income' | 'expense' }) => (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
      type === 'income'
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
        : 'bg-orange-200 text-orange-900 dark:bg-orange-900/30 dark:text-orange-300'
    }`}>
      {type === 'income' ? t('transactions.invoice') : t('transactions.expense')}
    </span>
  );

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-4 pt-4 pb-4 sm:px-6 sm:pt-5 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{companyName}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('transactions.title')}</h1>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-6 pt-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-5 sm:gap-8 overflow-x-auto scrollbar-hide">
            <button onClick={() => setActiveTab('bank')} className={tabClass('bank')}>{t('transactions.tab_all')}</button>
            <button onClick={() => setActiveTab('sales')} className={tabClass('sales')}>{t('transactions.tab_income')}</button>
            <button onClick={() => setActiveTab('expenses')} className={tabClass('expenses')}>{t('transactions.tab_expenses')}</button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-2">
          <input type="date" value={startDate} lang={lang === 'fr' ? 'fr' : 'en-GB'} onChange={(e) => setStartDate(e.target.value)}
            className="min-w-0 w-full sm:w-auto sm:flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="date" value={endDate} lang={lang === 'fr' ? 'fr' : 'en-GB'} onChange={(e) => setEndDate(e.target.value)}
            className="min-w-0 w-full sm:w-auto sm:flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder={t('transactions.search_placeholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Content */}
        <div>
          {displayedTransactions.length === 0 ? (
            <div className="p-6">
              <EmptyDocumentState
                title={t('transactions.empty_title')}
                subtitle={hasFilters ? t('transactions.empty_subtitle_filtered') : t('transactions.empty_subtitle')}
                buttonLabel={t('transactions.clear_filters')}
                variant="compact"
                hideAction={!hasFilters}
                onAction={() => {
                  if (hasFilters) {
                    setSearchQuery('');
                    setStartDate('');
                    setEndDate('');
                    setActiveTab('bank');
                  }
                }}
              />
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {displayedTransactions.map((tx) => {
                  const isLinked = linkedIds.has(tx._id);
                  return (
                    <div key={tx._id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(tx.date)}</p>
                          <p className="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 truncate">{tx.name}</p>
                          <TypeBadge type={tx.type} />
                        </div>
                        {isLinked ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium shrink-0 mt-1">
                            <Link2 size={12} /> {t('transactions.linked')}
                          </span>
                        ) : (
                          <button onClick={() => handleLinkClick(tx)}
                            className="flex items-center gap-1 text-sky-500 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 font-semibold text-sm shrink-0">
                            <Link2 size={14} /><span>{t('transactions.link')}</span>
                          </button>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-md bg-gray-50 dark:bg-gray-800 px-3 py-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('transactions.spent')}</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {tx.type === 'expense' ? formatMoney(tx.amount, tx.currency) : '-'}
                          </p>
                        </div>
                        <div className="rounded-md bg-gray-50 dark:bg-gray-800 px-3 py-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('transactions.received')}</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {tx.type === 'income' ? formatMoney(tx.amount, tx.currency) : '-'}
                          </p>
                        </div>
                      </div>
                      {isLinked && (
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => handleUnlink(tx._id)}
                            className="text-xs font-semibold text-red-600 hover:text-red-600"
                          >
                            {t('transactions.unlink')}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <tr className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">{t('transactions.date')}</th>
                      <th className="px-4 py-3 text-left">{t('transactions.name')}</th>
                      <th className="px-4 py-3 text-left">{t('transactions.type')}</th>
                      <th className="px-4 py-3 text-right">{t('transactions.spent')}</th>
                      <th className="px-4 py-3 text-right">{t('transactions.received')}</th>
                      <th className="px-4 py-3 text-right">{t('transactions.action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {displayedTransactions.map((tx) => {
                      const isLinked = linkedIds.has(tx._id);
                      return (
                        <tr key={tx._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatDate(tx.date)}</td>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 max-w-[200px] truncate">{tx.name}</td>
                          <td className="px-4 py-3"><TypeBadge type={tx.type} /></td>
                          <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100 font-medium whitespace-nowrap">
                            {tx.type === 'expense' ? formatMoney(tx.amount, tx.currency) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100 font-medium whitespace-nowrap">
                            {tx.type === 'income' ? formatMoney(tx.amount, tx.currency) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isLinked ? (
                              <div className="inline-flex items-center gap-3">
                                <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                                  <Link2 size={12} /> {t('transactions.linked')}
                                </span>
                                <button
                                  onClick={() => handleUnlink(tx._id)}
                                  className="text-xs font-semibold text-red-600 hover:text-red-600"
                                >
                                  {t('transactions.unlink')}
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => handleLinkClick(tx)}
                                className="inline-flex items-center gap-1 text-sky-500 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 font-semibold text-sm">
                                <Link2 size={14} /><span>{t('transactions.link')}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Load More */}
        {filteredTransactions.length > visibleCount && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 text-center">
            <button onClick={() => setVisibleCount((p) => p + 8)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium">
              {t('transactions.load_more')}
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={isAdmin && deleteConfirm.show}
        title={t('transactions.delete_title')}
        message={t('transactions.delete_message')}
        confirmText={t('common.delete')} cancelText={t('common.cancel')} variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ show: false, transactionId: null })}
      />
    </div>
  );
};

export default Transactions;



