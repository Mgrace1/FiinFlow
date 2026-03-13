import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '../api/client';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/common/ConfirmModal';
import LoadingOverlay from '../components/common/LoadingOverlay';
import EmptyDocumentState from '../components/common/EmptyDocumentState';
import { formatDateDMY } from '../utils/formatDate';
import Badge from '../components/common/Badge';
import { FaTimes, FaTrash, FaFileAlt } from 'react-icons/fa';
import { getErrorMessage, notifyError, notifySuccess, notifyWarning } from '../utils/toast';
import { convertCurrencyAmount, formatCompanyMoney, getCurrencyConfig } from '../utils/currency';
import { getUserRole } from '../utils/roleUtils';
import { useLanguage } from '../contexts/LanguageContext';

interface Expense {
  _id: string;
  supplier: string;
  category: string;
  receiptFileId?: string | { _id?: string; originalName?: string; mimeType?: string };
  amount: number;
  amountPaid: number;
  remainingAmount: number;
  currency: string;
  dueDate: string;
  createdAt: string;
  description?: string;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
}

interface Client {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
}

const getLinkedIds = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem('finflow_linked_ids') || '[]')); }
  catch { return new Set(); }
};

const Expenses: React.FC = () =>{
  const { t, lang } = useLanguage();
  const role = getUserRole();
  const isAdmin = role === 'admin' || role === 'super_admin';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlStatusFilter = searchParams.get('status');
  const highlightId = searchParams.get('highlight');
  const sourceId = searchParams.get('sourceId');
  const linkAmountParam = Number(searchParams.get('linkAmount') || 0);
  const linkAmount = Number.isFinite(linkAmountParam) ? Math.max(0, linkAmountParam) : 0;
  const linkCurrency = String(searchParams.get('linkCurrency') || 'RWF').toUpperCase();
  const isLinkingFlow = Boolean(sourceId);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkConfirm, setLinkConfirm] = useState<{ show: boolean; expense: Expense | null }>({ show: false, expense: null });
  const highlightRef = useRef<HTMLTableRowElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; expenseId: string | null }> ({
    show: false,
    expenseId: null,
  });
  const [showPDFConfirm, setShowPDFConfirm] = useState(false);
  const [formError, setFormError] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [formData, setFormData] = useState({
    clientId: '',
    supplier: '',
    category: 'Other',
    amount: '',
    amountPaid: '',
    dueDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    description: '',
    paymentMethod: 'Bank',
    receiptFile: null as File | null,
  });

  useEffect(() =>{
    fetchExpenses();
    fetchClients();
  }, []);

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }
  }, [highlightId, expenses]);

  const handleLinkConfirm = async () => {
    if (!linkConfirm.expense) return;
    const expense = linkConfirm.expense;
    const ids = getLinkedIds();
    const markerId = sourceId || expense._id;
    if (ids.has(markerId)) {
      setLinkConfirm({ show: false, expense: null });
      notifyWarning(t('transactions.already_linked'));
      return;
    }
    ids.add(markerId);
    localStorage.setItem('finflow_linked_ids', JSON.stringify([...ids]));
    setLinkConfirm({ show: false, expense: null });

    if (linkAmount <= 0) {
      notifySuccess(t('expenses.linked_success'));
      return;
    }

    const currencyCfg = getCurrencyConfig();
    const targetCurrency = String(expense.currency || currencyCfg.defaultCurrency).toUpperCase() === 'USD' ? 'USD' : 'RWF';
    const amountToApply = Math.max(
      0,
      convertCurrencyAmount(linkAmount, linkCurrency, targetCurrency, currencyCfg.exchangeRateUSD)
    );
    const total = Math.max(0, Number(expense.amount || 0));
    const currentPaid = Math.max(0, Number(expense.amountPaid || 0));
    const nextPaid = Math.min(total, currentPaid + amountToApply);

    if (nextPaid <= currentPaid) {
      notifySuccess(t('expenses.linked_success'));
      return;
    }

    try {
      await apiClient.put(`/expenses/${expense._id}`, {
        amountPaid: nextPaid,
        paymentStatus: nextPaid >= total ? 'paid' : 'pending',
      });
      await fetchExpenses();
      const remaining = Math.max(0, total - nextPaid);
      notifySuccess(`${t('expenses.linked_updated')} ${formatCompanyMoney(remaining, targetCurrency)}`);
    } catch (error) {
      notifyError(getErrorMessage(error, t('expenses.linked_failed_apply')));
    }
  };

  const fetchExpenses = async () =>{
    try {
      const response = await apiClient.get('/expenses');
      if (response.data.success) {
        setExpenses(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () =>{
    try {
      const response = await apiClient.get('/clients');
      if (response.data.success) {
        setClients(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) =>{
    e.preventDefault();
    setFormError('');

    const parsedAmount = Number(formData.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError(t('expenses.form_invalid_total'));
      return;
    }

    const parsedAmountPaid = Number(formData.amountPaid) || 0;
    if (parsedAmountPaid < 0) {
      setFormError(t('expenses.form_negative_paid'));
      return;
    }
    if (parsedAmountPaid > parsedAmount) {
      setFormError(t('expenses.form_paid_exceeds'));
      return;
    }

    const linkedClient = clients.find((c) => c._id === formData.clientId);
    const resolvedSupplier = linkedClient?.name || formData.supplier.trim();
    if (!resolvedSupplier) {
      setFormError(t('expenses.form_supplier_required'));
      return;
    }

    const detailLines: string[] = [];
    if (formData.referenceNumber.trim()) {
      detailLines.push(`Reference: ${formData.referenceNumber.trim()}`);
    }
    if (formData.description.trim()) {
      detailLines.push(formData.description.trim());
    }

    const resolvedCategory = formData.category === 'Other' && customCategory.trim()
      ? customCategory.trim()
      : formData.category;

    let receiptFileId: string | undefined;
    if (formData.receiptFile) {
      const filePayload = new FormData();
      filePayload.append('file', formData.receiptFile);
      filePayload.append('type', 'receipt');
      const uploaded = await apiClient.post('/files', filePayload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      receiptFileId = uploaded?.data?.data?._id;
    }

    const payload = {
      clientId: formData.clientId || undefined,
      receiptFileId,
      supplier: resolvedSupplier,
      category: resolvedCategory,
      amount: parsedAmount,
      amountPaid: parsedAmountPaid,
      dueDate: formData.dueDate,
      description: detailLines.join('\n'),
      paymentMethod: formData.paymentMethod,
    };

    try {
      await apiClient.post('/expenses', payload);
      window.dispatchEvent(new Event('finflow:notifications:refresh'));
      fetchExpenses();
      closeModal();
      notifySuccess(t('expenses.created_success'));
    } catch (error) {
      console.error('Failed to create expense:', error);
      setFormError(t('expenses.create_failed'));
      notifyError(getErrorMessage(error, t('expenses.create_failed')));
    }
  };

  const handleDelete = async () =>{
    if (!deleteConfirm.expenseId) return;
    try {
      await apiClient.delete(`/expenses/${deleteConfirm.expenseId}`);
      fetchExpenses();
      setDeleteConfirm({ show: false, expenseId: null });
      notifySuccess(t('expenses.deleted_success'));
    } catch (error) {
      console.error('Failed to delete expense:', error);
      notifyError(getErrorMessage(error, t('expenses.delete_failed')));
    } 
  };

  const getReceiptId = (expense: Expense): string | null => {
    if (!expense.receiptFileId) return null;
    if (typeof expense.receiptFileId === 'string') return expense.receiptFileId;
    return expense.receiptFileId._id || null;
  };

  const handleViewReceipt = async (expense: Expense) => {
    const receiptId = getReceiptId(expense);
    if (!receiptId) return;
    try {
      const response = await apiClient.get(`/files/${receiptId}/download?inline=true`, {
        responseType: 'blob',
      });
      const fallbackMimeType =
        typeof expense.receiptFileId === 'object' ? expense.receiptFileId.mimeType : undefined;
      const contentType = String(response.headers['content-type'] || fallbackMimeType || 'application/octet-stream');
      const blob = new Blob([response.data], { type: contentType });
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      // Let browser open it first, then release URL
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10_000);
    } catch (error) {
      notifyError(getErrorMessage(error, t('expenses.receipt_open_failed')));
    }
  };

  const resetForm = () =>{
    setFormData({
      clientId: '',
      supplier: '',
      category: 'Other',
      amount: '',
      amountPaid: '',
      dueDate: new Date().toISOString().split('T')[0],
      referenceNumber: '',
      description: '',
      paymentMethod: 'Bank',
      receiptFile: null,
    });
    setCustomCategory('');
    setFormError('');
  };

  const closeModal = () =>{
    setShowModal(false);
    resetForm();
  };

  const handleDownloadExpensesPDF = async () =>{

    try {
      const response = await apiClient.get('/reports/expenses/pdf', {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const today = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `expenses-report-${today}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setShowPDFConfirm(false);
      notifySuccess(t('expenses.pdf_downloaded'));
    } catch (error: any) {
      notifyError(getErrorMessage(error, t('expenses.pdf_failed')));
      setShowPDFConfirm(false);
    }
  };

  const getStatusVariant = (status: string): any =>{
    const statusMap: any = {
      pending: 'pending',
      paid: 'paid',
      failed: 'failed',
    };
    return statusMap[status] || 'default';
  };

  if (loading) return <LoadingOverlay message={t('expenses.loading')} />;

  const allowedStatuses = urlStatusFilter
    ? urlStatusFilter.split(',').map((s) => s.trim().toLowerCase())
    : null;
  const displayedExpenses = allowedStatuses
    ? expenses.filter((exp) => allowedStatuses.includes(exp.paymentStatus.toLowerCase()))
    : expenses;

  return (
  <div>
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('expenses.title')}</h1>
        
      </div>
      {expenses.length > 0 && (
        <div className="flex flex-nowrap gap-3 w-full md:w-auto">
          <button onClick={() =>setShowPDFConfirm(true)} className="btn btn-secondary w-full text-xs px-3 py-2">
               {t('expenses.export_pdf')}
          </button>
          <button onClick={() =>{ resetForm(); setShowModal(true); }} className="btn btn-primary w-full text-xs px-3 py-2 whitespace-nowrap">
              {t('expenses.add')}
          </button>
        </div>
      )}
    </div>

    {expenses.length === 0 ? (
      <EmptyDocumentState
        title={t('expenses.empty_title')}
        subtitle={t('expenses.empty_subtitle')}
        buttonLabel={t('expenses.add')}
        variant="compact"
        onAction={() => { resetForm(); setShowModal(true); }}
      />
    ) : (
      <>
        {/* Expenses Cards for mobile */}
        <div className="md:hidden space-y-4">
          {[...displayedExpenses].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((expense) => {
            const isClickableCard = isLinkingFlow;
            return (
            <div
              key={expense._id}
              className={`rounded-lg shadow p-4 ${
                isClickableCard
                  ? 'bg-white cursor-pointer hover:bg-blue-50 transition-colors'
                  : 'bg-white'
              }`}
              onClick={isClickableCard ? () => setLinkConfirm({ show: true, expense }) : undefined}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-lg">{expense.supplier}</p>
                  <p className="text-gray-600">{expense.category}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDateDMY(expense.createdAt)}</p>
                </div>
                <Badge variant={getStatusVariant(expense.paymentStatus)}>{expense.paymentStatus}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">{t('expenses.mobile.total')}</p>
                  <p className="font-bold">{formatCompanyMoney(expense.amount, expense.currency)}</p>
                </div>
                <div>
                  <p className="text-gray-500">{t('expenses.mobile.paid')}</p>
                  <p className="font-bold text-green-700">{formatCompanyMoney(expense.amountPaid, expense.currency)}</p>
                </div>
                <div>
                  <p className="text-gray-500">{t('expenses.mobile.remaining')}</p>
                  <p className={`font-bold ${expense.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCompanyMoney(expense.remainingAmount, expense.currency)}
                  </p>
                </div>
                {expense.remainingAmount > 0 && (
                  <div>
                    <p className="text-gray-500">{t('expenses.mobile.due_date')}</p>
                    <p className="font-bold">{formatDateDMY(expense.dueDate)}</p>
                  </div>
                )}
              </div>
              {expense.description && (
                <p className="mt-3 text-xs text-gray-500 border-t pt-2 leading-relaxed">{expense.description}</p>
              )}
              <div className="mt-4 flex justify-end gap-x-4">
                {getReceiptId(expense) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewReceipt(expense);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-600 transition hover:bg-blue-50 hover:text-blue-800"
                    title={t('common.view')}
                    aria-label={t('common.view')}
                  >
                    <FaFileAlt className="text-sm" />
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={(e) =>{
                      e.stopPropagation();
                      setDeleteConfirm({ show: true, expenseId: expense._id });
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-danger-500 transition hover:bg-red-50 hover:text-danger-700"
                    title={t('common.delete')}
                    aria-label={t('common.delete')}
                  >
                    <FaTrash className="text-sm" />
                  </button>
                )}
              </div>
            </div>
            );
          })}
        </div>

        {/* Expenses Table for desktop */}
        <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('expenses.table.supplier')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('expenses.table.category')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('expenses.table.created_at')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('expenses.table.total_amount')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('expenses.table.amount_paid')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('expenses.table.remaining')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('expenses.table.due_date')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('expenses.table.status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('expenses.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...displayedExpenses].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((expense) =>{
                const isHighlighted = expense._id === highlightId;
                const isClickable = isLinkingFlow;
                return (
                <tr
                  key={expense._id}
                  ref={isHighlighted ? highlightRef : undefined}
                  className={`transition-colors ${
                    isClickable ? 'hover:bg-blue-50 cursor-pointer' : 'hover:bg-gray-50'
                  }`}
                  onClick={isClickable ? () => setLinkConfirm({ show: true, expense }) : undefined}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 relative group">
                    {expense.supplier}
                    {expense.description && (
                      <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block bg-white text-gray-800 border border-gray-200 text-xs rounded-lg px-3 py-2 w-64 shadow-lg pointer-events-none whitespace-normal leading-relaxed">
                        {expense.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateDMY(expense.createdAt)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCompanyMoney(expense.amount, expense.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-medium">
                      {formatCompanyMoney(expense.amountPaid, expense.currency)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${expense.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCompanyMoney(expense.remainingAmount, expense.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.remainingAmount > 0 ? formatDateDMY(expense.dueDate) : t('common.na')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <Badge variant={getStatusVariant(expense.paymentStatus)}>{expense.paymentStatus}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right" onClick={(e) => e.stopPropagation()}>
                    {getReceiptId(expense) && (
                      <button
                        onClick={(e) =>{ e.stopPropagation(); handleViewReceipt(expense); }}
                        className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-600 transition hover:bg-blue-50 hover:text-blue-800"
                        title={t('common.view')}
                        aria-label={t('common.view')}
                      >
                        <FaFileAlt className="text-sm" />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={(e) =>{ e.stopPropagation(); setDeleteConfirm({ show: true, expenseId: expense._id }); }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-danger-500 transition hover:bg-red-50 hover:text-danger-700"
                        title={t('common.delete')}
                        aria-label={t('common.delete')}
                      >
                        <FaTrash className="text-sm" />
                      </button>
                    )}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </>
    )}

      {showModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
        <div className="bg-white rounded-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between z-10 rounded-t-xl">
            <h2 className="text-xl font-bold text-gray-900">{t('expenses.modal.create_title')}</h2>
            <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
              <FaTimes />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-4 sm:p-6 space-y-6">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('expenses.modal.linked_client')}</label>
                      <select
                        value={formData.clientId}
                        onChange={(e) =>{
                          const selectedClientId = e.target.value;
                          const selectedClient = clients.find((c) => c._id === selectedClientId);
                          setFormData({
                            ...formData,
                            clientId: selectedClientId,
                            supplier: selectedClient ? selectedClient.name : formData.supplier,
                          });
                        }}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                      >
                        <option value="">{t('expenses.modal.no_linked_client')}</option>
                        {clients.map((client) => (
                          <option key={client._id} value={client._id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {!formData.clientId && (
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('expenses.modal.supplier_name_required')}</label>
                        <input
                          type="text"
                          value={formData.supplier}
                          onChange={(e) =>setFormData({ ...formData, supplier: e.target.value })}
                          required={!formData.clientId}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder={t('expenses.modal.supplier_name')}
                        />
                      </div>
                    )}

                    {formData.clientId && (
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('expenses.modal.supplier_name')}</label>
                        <input
                          type="text"
                          value={formData.supplier}
                          readOnly
                          className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-600"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('expenses.modal.category')}</label>
                      <select
                        value={formData.category}
                        onChange={(e) => {
                          setFormData({ ...formData, category: e.target.value });
                          if (e.target.value !== 'Other') setCustomCategory('');
                        }}
                        required
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                      >
                        <option value="Transport">Transport</option>
                        <option value="Office">Office</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Salaries">Salaries</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Equipment">Equipment</option>
                        <option value="Other">Other</option>
                      </select>
                      {formData.category === 'Other' && (
                        <input
                          type="text"
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          required
                          className="mt-2 w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder={t('expenses.modal.custom_category_placeholder')}
                        />
                      )}
                    </div>

                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('expenses.modal.total_amount')}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) =>setFormData({ ...formData, amount: e.target.value })}
                        required
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('expenses.modal.amount_paid')}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.amountPaid}
                        onChange={(e) =>setFormData({ ...formData, amountPaid: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('expenses.modal.remaining_amount')}</label>
                      <input
                        type="text"
                        readOnly
                        value={`${Math.max(0, (Number(formData.amount) || 0) - (Number(formData.amountPaid) || 0)).toLocaleString()}`}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600 cursor-not-allowed font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('expenses.modal.due_date')}</label>
                      <input
                        type="date"
                        value={formData.dueDate}
                        lang={lang === 'fr' ? 'fr' : 'en-GB'}
                        onChange={(e) =>setFormData({ ...formData, dueDate: e.target.value })}
                        required
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('expenses.modal.payment_method')}</label>
                      <select
                        value={formData.paymentMethod}
                        onChange={(e) =>setFormData({ ...formData, paymentMethod: e.target.value })}
                        required
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                      >
                        <option value="Bank">Bank</option>
                        <option value="Mobile Money">Mobile Money</option>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('expenses.modal.reference_number')}</label>
                      <input
                        type="text"
                        value={formData.referenceNumber}
                        onChange={(e) =>setFormData({ ...formData, referenceNumber: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder={t('expenses.modal.reference_placeholder')}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('expenses.modal.description_notes')}</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                      rows={4}
                      placeholder={t('expenses.modal.description_placeholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('expenses.modal.receipt_optional')}</label>
                    <label className="btn btn-primary cursor-pointer inline-flex items-center">
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setFormData({ ...formData, receiptFile: e.target.files?.[0] || null })}
                      />
                      {formData.receiptFile ? t('expenses.modal.change_receipt') : t('expenses.modal.upload_receipt')}
                    </label>
                    <p className="mt-2 text-xs text-gray-500">
                      {formData.receiptFile ? `${t('expenses.modal.receipt_selected')} ${formData.receiptFile.name}` : t('expenses.modal.receipt_accepted')}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('expenses.modal.summary_title')}</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('expenses.modal.summary_total')}</span>
                      <span className="font-bold text-gray-900">{(Number(formData.amount) || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('expenses.modal.summary_paid')}</span>
                      <span className="font-bold text-green-700">{(Number(formData.amountPaid) || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="text-gray-500">{t('expenses.modal.summary_remaining')}</span>
                      <span className={`font-bold ${Math.max(0, (Number(formData.amount) || 0) - (Number(formData.amountPaid) || 0)) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {Math.max(0, (Number(formData.amount) || 0) - (Number(formData.amountPaid) || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-900 mb-2">{t('expenses.modal.tips_title')}</p>
                    <ul className="text-xs text-blue-800 space-y-1 list-disc pl-4">
                      <li>{t('expenses.modal.tip_supplier')}</li>
                      <li>{t('expenses.modal.tip_reference')}</li>
                      <li>{t('expenses.modal.tip_link_client')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-2 flex flex-col sm:flex-row gap-2 justify-end rounded-b-xl">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors order-2 sm:order-1"
              >
                {t('expenses.modal.cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors order-1 sm:order-2"
              >
                {t('expenses.modal.create_button')}
              </button>
            </div>
          </form>
        </div>
      </div>
      )}

      {/* Delete Confirmation Modal */}
    <ConfirmModal
        isOpen={isAdmin && deleteConfirm.show}
        title={t('expenses.confirm_delete_title')}
        message={t('expenses.confirm_delete_message')}
        confirmText={t('expenses.confirm_delete_confirm')}
        cancelText={t('expenses.confirm_delete_cancel')}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() =>setDeleteConfirm({ show: false, expenseId: null })}
      />

      {/* PDF Export Confirm Modal */}
    <ConfirmModal
        isOpen={showPDFConfirm}
        title={t('expenses.confirm_pdf_title')}
        message={t('expenses.confirm_pdf_message')}
        confirmText={t('expenses.confirm_pdf_confirm')}
        cancelText={t('expenses.confirm_pdf_cancel')}
        variant="primary"
        onConfirm={handleDownloadExpensesPDF}
        onCancel={() =>setShowPDFConfirm(false)}
      />

      {/* Link Confirmation Modal */}
      <ConfirmModal
        isOpen={linkConfirm.show}
        title={t('expenses.confirm_link_title')}
        message={`${t('expenses.confirm_link_message_prefix')} \"${linkConfirm.expense?.supplier || t('common.na')}\" ${t('expenses.confirm_link_message_suffix')}`}
        confirmText={t('expenses.confirm_link_confirm')}
        cancelText={t('expenses.confirm_link_cancel')}
        variant="primary"
        onConfirm={handleLinkConfirm}
        onCancel={() => setLinkConfirm({ show: false, expense: null })}
      />
  </div>
  );
};

export default Expenses;

