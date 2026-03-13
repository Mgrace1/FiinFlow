import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import ConfirmModal from '../components/common/ConfirmModal';
import Badge from '../components/common/Badge';
import LoadingOverlay from '../components/common/LoadingOverlay';
import EmptyDocumentState from '../components/common/EmptyDocumentState';
import { formatDateDMY } from '../utils/formatDate';
import { FaTimes, FaPlus, FaTrash, FaEye, FaPen } from 'react-icons/fa';
import { getErrorMessage, notifyError, notifySuccess, notifyWarning } from '../utils/toast';
import { type AppCurrency, convertCurrencyAmount, formatCompanyMoney, getCurrencyConfig } from '../utils/currency';
import { getUserRole } from '../utils/roleUtils';
import { useLanguage } from '../contexts/LanguageContext';

interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceType?: 'standard' | 'proforma' | 'tax' | 'commercial' | 'credit_note' | 'debit_note';
  clientId: any;
  amount: number;
  totalAmount: number;
  amountPaid?: number;
  remainingAmount?: number;
  currency?: string;
  status: string;
  dueDate: string;
  description?: string;
  items?: Array<{
    name?: string;
    description?: string;
    quantity?: number;
    rate?: number;
    amount?: number;
  }>;
  createdAt: string;
}

interface LineItem {
  product: string;
  description: string;
  qty: number;
  rate: number;
}

interface InvoiceSubmitPayload {
  clientId: string;
  invoiceNumber: string;
  invoiceType: string;
  amount: string;
  amountPaid?: string;
  currency: string;
  taxApplied: boolean;
  taxRate: number;
  dueDate: string;
  description: string;
  notes: string;
  items: Array<{
    name: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  status: 'draft' | 'sent';
}

const parseLineItemsFromDescription = (description?: string): LineItem[] => {
  if (!description) return [];
  return description
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const itemMatch = line.match(/^(.*?):\s*(.*?)\s*\(x([\d.]+)\s*@\s*([\d.]+)\)$/i);
      if (itemMatch) {
        return {
          product: itemMatch[1]?.trim() || '',
          description: itemMatch[2]?.trim() || '',
          qty: Number(itemMatch[3]) || 1,
          rate: Number(itemMatch[4]) || 0,
        };
      }
      return { product: line, description: '', qty: 1, rate: 0 };
    });
};

const getLinkedIds = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem('finflow_linked_ids') || '[]')); }
  catch { return new Set(); }
};

const Invoices: React.FC = () => {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlStatusFilter = searchParams.get('status'); // e.g. "sent,overdue"
  const highlightId = searchParams.get('highlight');
  const sourceId = searchParams.get('sourceId');
  const linkAmountParam = Number(searchParams.get('linkAmount') || 0);
  const linkAmount = Number.isFinite(linkAmountParam) ? Math.max(0, linkAmountParam) : 0;
  const linkCurrency = String(searchParams.get('linkCurrency') || 'RWF').toUpperCase();
  const isLinkingFlow = Boolean(sourceId);
  const companyConfig = getCurrencyConfig();
  const role = getUserRole();
  const isAdmin = role === 'admin' || role === 'super_admin';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [linkConfirm, setLinkConfirm] = useState<{ show: boolean; invoice: Invoice | null }>({ show: false, invoice: null });
  const highlightRef = useRef<HTMLTableRowElement>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; invoiceId: string | null }>({
    show: false,
    invoiceId: null,
  });
  const [error, setError] = useState<string>('');
  const [submitAction, setSubmitAction] = useState<'draft' | 'send'>('draft');
  const [showSendPreview, setShowSendPreview] = useState(false);
  const [previewData, setPreviewData] = useState<InvoiceSubmitPayload | null>(null);
  const [sendingFromPreview, setSendingFromPreview] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    invoiceNumber: '',
    invoiceType: 'standard',
    amount: '',
    currency: companyConfig.defaultCurrency,
    taxApplied: true,
    taxRate: companyConfig.taxRate,
    dueDate: '',
    description: '',
    notes: '',
  });

  // Line items for the professional invoice view
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { product: '', description: '', qty: 1, rate: 0 },
  ]);
  const [customInvoiceType, setCustomInvoiceType] = useState('');

  useEffect(() => {
    fetchInvoices();
    fetchClients();
    const cfg = getCurrencyConfig();
    setFormData((prev) => ({ ...prev, currency: cfg.defaultCurrency, taxRate: cfg.taxRate }));
  }, []);

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }
  }, [highlightId, invoices]);

  const handleLinkConfirm = async () => {
    if (!linkConfirm.invoice) return;
    const invoice = linkConfirm.invoice;
    const ids = getLinkedIds();
    const markerId = sourceId || invoice._id;
    if (ids.has(markerId)) {
      setLinkConfirm({ show: false, invoice: null });
      notifyWarning(t('transactions.already_linked'));
      return;
    }
    ids.add(markerId);
    localStorage.setItem('finflow_linked_ids', JSON.stringify([...ids]));
    setLinkConfirm({ show: false, invoice: null });

    if (linkAmount <= 0) {
      notifySuccess(t('invoices.linked_success'));
      return;
    }

    const currencyCfg = getCurrencyConfig();
    const targetCurrency = String(invoice.currency || currencyCfg.defaultCurrency).toUpperCase() === 'USD' ? 'USD' : 'RWF';
    const amountToApply = Math.max(
      0,
      convertCurrencyAmount(linkAmount, linkCurrency, targetCurrency, currencyCfg.exchangeRateUSD)
    );
    const invoiceTotal = Math.max(0, Number(invoice.totalAmount || invoice.amount || 0));
    const currentPaid = Math.max(0, Number(invoice.amountPaid || 0));
    const nextPaid = Math.min(invoiceTotal, currentPaid + amountToApply);

    if (nextPaid <= currentPaid) {
      notifySuccess(t('invoices.linked_success'));
      return;
    }

    try {
      await apiClient.put(`/invoices/${invoice._id}`, { amountPaid: nextPaid });
      await fetchInvoices();
      const remaining = Math.max(0, invoiceTotal - nextPaid);
      notifySuccess(`${t('invoices.linked_updated')} ${formatCompanyMoney(remaining, targetCurrency)}`);
    } catch (error) {
      notifyError(getErrorMessage(error, t('invoices.linked_failed_apply')));
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await apiClient.get('/invoices');
      if (response.data.success) {
        setInvoices(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await apiClient.get('/clients');
      if (response.data.success) {
        setClients(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  // Calculate totals from line items
  const subtotal = lineItems.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const taxAmount = formData.taxApplied ? subtotal * (formData.taxRate / 100) : 0;
  const total = subtotal + taxAmount;

  // Sync total back to formData amount when line items change
  useEffect(() => {
    if (showModal) {
      setFormData((prev) => ({ ...prev, amount: subtotal.toString() }));
    }
  }, [subtotal, showModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const resolvedType = formData.invoiceType === 'other'
      ? (customInvoiceType.trim().slice(0, 10) || 'standard')
      : formData.invoiceType;

    const buildSubmitData = (): InvoiceSubmitPayload => {
      const itemDescriptions = lineItems
        .filter((item) => item.product.trim())
        .map((item) => `${item.product}: ${item.description} (x${item.qty} @ ${item.rate})`)
        .join('\n');

      return {
        ...formData,
        invoiceType: resolvedType,
        amount: subtotal.toString(),
        description: itemDescriptions || formData.description,
        items: lineItems
          .filter((item) => item.product.trim())
          .map((item) => ({
            name: item.product.trim(),
            description: item.description?.trim() || '',
            quantity: Number(item.qty || 1),
            rate: Number(item.rate || 0),
            amount: Number((item.qty || 0) * (item.rate || 0)),
          })),
        amountPaid: '0',
        status: submitAction === 'send' ? 'sent' : 'draft',
      };
    };

    const submitInvoice = async (submitData: InvoiceSubmitPayload) => {
      let response;
      if (editingInvoice) {
        response = await apiClient.put(`/invoices/${editingInvoice._id}`, submitData);
      } else {
        response = await apiClient.post('/invoices', submitData);
      }

      if (editingInvoice) {
        const emailNotification = response?.data?.emailNotification;
        if (emailNotification?.attempted && emailNotification?.sent) {
          notifySuccess(t('invoices.updated_email_sent'));
        } else if (emailNotification?.attempted && !emailNotification?.sent) {
          notifyWarning(`${t('invoices.updated_email_failed')} ${emailNotification.reason || t('common.unknown_error')}`);
        } else {
          notifyWarning(`${t('invoices.updated_email_not_attempted')} ${emailNotification?.reason || t('invoices.no_recipient_email')}`);
        }
      } else if (submitData.status === 'sent') {
        const invoiceStatus = response?.data?.data?.status;
        const emailNotification = response?.data?.emailNotification;
        if (invoiceStatus === 'sent') {
          if (emailNotification?.attempted && emailNotification?.sent) {
        notifySuccess(t('invoices.sent_email_sent'));
          } else if (emailNotification?.attempted && !emailNotification?.sent) {
        notifyWarning(`${t('invoices.sent_email_failed')} ${emailNotification.reason || t('common.unknown_error')}`);
          } else {
        notifyWarning(`${t('invoices.sent_email_not_attempted')} ${emailNotification?.reason || t('invoices.no_recipient_email')}`);
          }
        } else {
      notifyWarning(t('invoices.saved_not_sent'));
        }
      } else {
        notifySuccess(t('invoices.saved_draft'));
      }

      window.dispatchEvent(new Event('finflow:notifications:refresh'));
      fetchInvoices();
      closeModal();
    };

    const submitData = buildSubmitData();
    if (!editingInvoice && submitData.status === 'sent') {
      setPreviewData(submitData);
      setShowSendPreview(true);
      return;
    }

    try {
      await submitInvoice(submitData);
    } catch (error: any) {
      console.error('Failed to save invoice:', error);
    const message = getErrorMessage(error, t('invoices.save_failed'));
      setError(message);
      notifyError(message);
    }
  };

  const handleConfirmSendFromPreview = async () => {
    if (!previewData) return;
    setSendingFromPreview(true);
    setError('');
    try {
      let response;
      if (editingInvoice) {
        response = await apiClient.put(`/invoices/${editingInvoice._id}`, previewData);
      } else {
        response = await apiClient.post('/invoices', previewData);
      }

      const invoiceStatus = response?.data?.data?.status;
      const emailNotification = response?.data?.emailNotification;
      if (invoiceStatus === 'sent') {
        if (emailNotification?.attempted && emailNotification?.sent) {
          notifySuccess(t('invoices.sent_email_sent'));
        } else if (emailNotification?.attempted && !emailNotification?.sent) {
          notifyWarning(`${t('invoices.sent_email_failed')} ${emailNotification.reason || t('common.unknown_error')}`);
        } else {
          notifyWarning(`${t('invoices.sent_email_not_attempted')} ${emailNotification?.reason || t('invoices.no_recipient_email')}`);
        }
      } else {
        notifyWarning(t('invoices.saved_not_sent'));
      }

      window.dispatchEvent(new Event('finflow:notifications:refresh'));
      fetchInvoices();
      setShowSendPreview(false);
      setPreviewData(null);
      closeModal();
    } catch (error: any) {
      console.error('Failed to send invoice from preview:', error);
      const message = getErrorMessage(error, t('invoices.save_send_failed'));
      setError(message);
      notifyError(message);
    } finally {
      setSendingFromPreview(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.invoiceId) return;
    try {
      await apiClient.delete(`/invoices/${deleteConfirm.invoiceId}`);
      fetchInvoices();
      setDeleteConfirm({ show: false, invoiceId: null });
    } catch (error) {
      console.error('Failed to delete invoice:', error);
    }
  };

  const openModal = async (invoice?: Invoice) => {
    if (invoice) {
      setEditingInvoice(invoice);
      const knownTypes = ['standard', 'proforma', 'tax', 'commercial', 'credit_note', 'debit_note'];
      const rawType = invoice.invoiceType || 'standard';
      const isKnown = knownTypes.includes(rawType);
      setFormData({
        clientId: invoice.clientId._id || invoice.clientId,
        invoiceNumber: invoice.invoiceNumber,
        invoiceType: isKnown ? rawType : 'other',
        amount: invoice.amount.toString(),
        currency: (String(invoice.currency || getCurrencyConfig().defaultCurrency).toUpperCase() === 'USD' ? 'USD' : 'RWF') as AppCurrency,
        taxApplied: (invoice as any).taxApplied ?? true,
        taxRate: (invoice as any).taxRate ?? getCurrencyConfig().taxRate,
        dueDate: invoice.dueDate.split('T')[0],
        description: invoice.description || '',
        notes: (invoice as any).notes || '',
      });
      if (!isKnown) setCustomInvoiceType(rawType);
      const parsedFromItems = (invoice.items || [])
        .map((item) => ({
          product: String(item.name || '').trim(),
          description: String(item.description || '').trim(),
          qty: Number(item.quantity || 1),
          rate: Number(item.rate || 0),
        }))
        .filter((item) => item.product);
      const parsedFromDescription = parseLineItemsFromDescription(invoice.description);
      const nextItems = parsedFromItems.length > 0 ? parsedFromItems : parsedFromDescription;
      setLineItems(nextItems.length > 0 ? nextItems : [{ product: '', description: '', qty: 1, rate: 0 }]);
    } else {
      setEditingInvoice(null);
      resetForm();
      try {
        const response = await apiClient.get('/invoices/next-number');
        if (response.data.success) {
          setFormData((prev) => ({ ...prev, invoiceNumber: response.data.data.nextNumber }));
        }
      } catch {
        // silently fail — user can type the number manually
      }
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingInvoice(null);
    setError('');
    resetForm();
  };

  const resetForm = () => {
    const cfg = getCurrencyConfig();
    setFormData({
      clientId: '',
      invoiceNumber: '',
      invoiceType: 'standard',
      amount: '',
      currency: cfg.defaultCurrency,
      taxApplied: true,
      taxRate: cfg.taxRate,
      dueDate: '',
      description: '',
      notes: '',
    });
    setLineItems([{ product: '', description: '', qty: 1, rate: 0 }]);
    setCustomInvoiceType('');
    setSubmitAction('draft');
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { product: '', description: '', qty: 1, rate: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const formatCurrency = (amount: number, sourceCurrency?: string) => {
    return formatCompanyMoney(amount, sourceCurrency || 'RWF');
  };

  const formatInvoiceType = (invoiceType?: string) => {
      const labels: Record<string, string> = {
        standard: t('invoices.type.standard'),
        proforma: t('invoices.type.proforma'),
        tax: t('invoices.type.tax'),
        commercial: t('invoices.type.commercial'),
        credit_note: t('invoices.type.credit_note'),
        debit_note: t('invoices.type.debit_note'),
      };
    const key = String(invoiceType || 'standard').trim().toLowerCase();
    return labels[key] || t('invoices.type.standard');
  };

  const getStatusVariant = (status: string): any => {
    const statusMap: any = {
      draft: 'draft',
      sent: 'sent',
      paid: 'paid',
      overdue: 'overdue',
      cancelled: 'cancelled',
      pending: 'pending',
    };
    return statusMap[status] || 'default';
  };

  const getStatusLabel = (status: string): string => {
    const key = String(status || '').toLowerCase();
    if (key === 'draft') return t('status.draft');
    if (key === 'sent') return t('status.sent');
    if (key === 'paid') return t('status.paid');
    if (key === 'overdue') return t('status.overdue');
    if (key === 'cancelled') return t('status.cancelled');
    if (key === 'pending') return t('status.pending');
    return status;
  };

  const getEffectiveStatus = (invoice: Invoice): string => {
    if (invoice.status !== 'sent') return invoice.status;
    const due = new Date(invoice.dueDate);
    if (Number.isNaN(due.getTime())) return invoice.status;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return due.getTime() < startOfToday.getTime() ? 'overdue' : invoice.status;
  };

  const selectedClient = clients.find((c) => c._id === formData.clientId);

  if (loading) return <LoadingOverlay message={t('invoices.loading')} />;

  // Filter by URL ?status= param (e.g. from Transactions page deep link)
  const allowedStatuses = urlStatusFilter
    ? urlStatusFilter.split(',').map((s) => s.trim().toLowerCase())
    : null;
  const displayedInvoices = (
    allowedStatuses
      ? invoices.filter((inv) => allowedStatuses.includes(getEffectiveStatus(inv).toLowerCase()))
      : invoices
  ).slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('invoices.title')}</h1>
          
        </div>
        {invoices.length > 0 && (
          <button onClick={() => openModal()} className="btn btn-primary w-full md:w-auto">
            {t('invoices.create')}
          </button>
        )}
      </div>
      {/* Responsive invoice table / empty state */}
      {invoices.length === 0 ? (
        <EmptyDocumentState
          title={t('invoices.empty_title')}
          subtitle={t('invoices.empty_subtitle')}
          buttonLabel={t('invoices.create')}
          variant="compact"
          onAction={() => openModal()}
        />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-gray-50">
                <tr className="text-xs font-medium text-gray-500 uppercase">
                  <th className="px-4 py-3 text-left">{t('invoices.table.number')}</th>
                  <th className="px-4 py-3 text-left">{t('invoices.table.client')}</th>
                  <th className="px-4 py-3 text-left">{t('invoices.table.amount')}</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left">{t('invoices.table.paid')}</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left">{t('invoices.table.remaining')}</th>
                  <th className="px-4 py-3 text-left">{t('invoices.table.status')}</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left">{t('invoices.table.created')}</th>
                  <th className="px-4 py-3 text-left">{t('invoices.table.due_date')}</th>
                  <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {displayedInvoices.map((invoice) => {
                  const effectiveStatus = getEffectiveStatus(invoice);
                  const isHighlighted = invoice._id === highlightId;
                  const isClickable = isLinkingFlow;
                  const totalAmount = Number(invoice.totalAmount ?? invoice.amount ?? 0);
                  const paidAmount = Math.max(0, Number(invoice.amountPaid ?? 0));
                  const remainingAmount = Math.max(0, Number(invoice.remainingAmount ?? (totalAmount - paidAmount)));
                  return (
                  <tr
                    key={invoice._id}
                    ref={isHighlighted ? highlightRef : undefined}
                    className={`align-middle transition-colors ${
                      isClickable ? 'hover:bg-blue-50 cursor-pointer' : 'hover:bg-gray-50'
                    }`}
                    onClick={isClickable ? () => setLinkConfirm({ show: true, invoice }) : undefined}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div>{invoice.invoiceNumber}</div>
                      <div className="text-xs text-gray-500">{formatInvoiceType(invoice.invoiceType)}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{invoice.clientId?.name || t('common.na')}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(totalAmount, (invoice as any).currency)}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-900">{formatCurrency(paidAmount, (invoice as any).currency)}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-900">{formatCurrency(remainingAmount, (invoice as any).currency)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={getStatusVariant(effectiveStatus)}>{getStatusLabel(effectiveStatus)}</Badge>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-500">{formatDateDMY(invoice.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDateDMY(invoice.dueDate)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <button
                          onClick={() => navigate(`/invoices/${invoice._id}`)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-600 transition hover:bg-blue-50 hover:text-blue-800"
                          title={t('common.view')}
                          aria-label={t('common.view')}
                        >
                          <FaEye className="text-sm" />
                        </button>
                        <button
                          onClick={() => openModal(invoice)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary-500 transition hover:bg-primary-50 hover:text-primary-700"
                          title={t('common.edit')}
                          aria-label={t('common.edit')}
                        >
                          <FaPen className="text-sm" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setDeleteConfirm({ show: true, invoiceId: invoice._id })}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-danger-500 transition hover:bg-red-50 hover:text-danger-700"
                            title={t('common.delete')}
                            aria-label={t('common.delete')}
                          >
                            <FaTrash className="text-sm" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======== Professional Invoice Creation/Edit Modal ======== */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between z-10 rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-900">
                {editingInvoice ? t('invoices.modal.title_edit') : t('invoices.modal.title_create')}
              </h2>
              <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-4 sm:p-6 space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Top Section: Invoice number + Balance due */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="w-full sm:w-auto">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t('invoices.modal.invoice_number')}</label>
                    <input
                      type="text"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                      required
                      className="text-2xl font-bold text-gray-900 border-0 border-b-2 border-gray-200 focus:border-blue-500 focus:ring-0 px-0 py-1 w-full sm:w-64 bg-transparent"
                      placeholder="INV-001"
                    />
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t('invoices.modal.invoice_type')}</label>
                      <select
                        value={formData.invoiceType}
                        onChange={(e) => setFormData({ ...formData, invoiceType: e.target.value as any })}
                        className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                      >
                        <option value="standard">{t('invoices.type.standard')}</option>
                        <option value="proforma">{t('invoices.type.proforma')}</option>
                        <option value="tax">{t('invoices.type.tax')}</option>
                        <option value="commercial">{t('invoices.type.commercial')}</option>
                        <option value="credit_note">{t('invoices.type.credit_note')}</option>
                        <option value="debit_note">{t('invoices.type.debit_note')}</option>
                        <option value="other">{t('invoices.modal.other_type')}</option>
                      </select>
                      {formData.invoiceType === 'other' && (
                        <input
                          type="text"
                          value={customInvoiceType}
                          onChange={(e) => setCustomInvoiceType(e.target.value.slice(0, 10))}
                          placeholder={t('invoices.modal.custom_type_placeholder')}
                          maxLength={10}
                          className="mt-2 w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      )}
                    </div>
                  </div>
                  <div className="text-left sm:text-right bg-gray-50 rounded-lg p-4 w-full sm:w-auto">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('invoices.modal.invoice_total')}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {new Intl.NumberFormat('en-RW', { minimumFractionDigits: 0 }).format(total)} <span className="text-lg font-normal text-gray-500">{formData.currency}</span>
                    </p>
                  </div>
                </div>

                {/* Client & Payment Terms */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Client Selection */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('invoices.modal.bill_to')} *</label>
                      <select
                        value={formData.clientId}
                        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                        required
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                      >
                        <option value="">{t('invoices.modal.select_client')}</option>
                        {clients.map((client) => (
                          <option key={client._id} value={client._id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Show selected client info */}
                    {selectedClient && (
                      <div className="bg-gray-50 rounded-lg p-3 text-sm">
                        <p className="font-medium text-gray-900">{selectedClient.name}</p>
                        {selectedClient.email && <p className="text-gray-500">{selectedClient.email}</p>}
                        {selectedClient.phone && <p className="text-gray-500">{selectedClient.phone}</p>}
                        {selectedClient.address && <p className="text-gray-500">{selectedClient.address}</p>}
                      </div>
                    )}
                  </div>

                  {/* Payment Terms */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('invoices.modal.due_date')} *</label>
                      <input
                        type="date"
                        value={formData.dueDate}
                        lang={lang === 'fr' ? 'fr' : 'en-GB'}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        required
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('invoices.modal.currency')}</label>
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: (e.target.value === 'USD' ? 'USD' : 'RWF') as AppCurrency })}
                        disabled
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                      >
                        <option value="RWF">{t('invoices.modal.rwf_label')}</option>
                        <option value="USD">{t('invoices.modal.usd_label')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">{t('invoices.modal.line_items')}</label>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Table Header */}
                    <div className="hidden sm:grid sm:grid-cols-12 gap-2 bg-gray-50 px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="col-span-3">{t('invoices.modal.product_service_label')}</div>
                    <div className="col-span-4">{t('invoices.modal.description')}</div>
                      <div className="col-span-1 text-center">Qty</div>
                      <div className="col-span-2 text-right">Rate</div>
                      <div className="col-span-1 text-right">Amount</div>
                      <div className="col-span-1" />
                    </div>

                    {/* Table Rows */}
                    <div className="divide-y divide-gray-100">
                      {lineItems.map((item, index) => (
                        <div key={index} className="px-4 py-3">
                          {/* Desktop row */}
                          <div className="hidden sm:grid sm:grid-cols-12 gap-2 items-center">
                            <div className="col-span-3">
                              <input
                                type="text"
                                value={item.product}
                                onChange={(e) => updateLineItem(index, 'product', e.target.value)}
                                placeholder="e.g. Consulting"
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div className="col-span-4">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                                placeholder={t('invoices.modal.description')}
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div className="col-span-1">
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => updateLineItem(index, 'qty', parseInt(e.target.value) || 1)}
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.rate || ''}
                                onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div className="col-span-1 text-right text-sm font-medium text-gray-900">
                              {new Intl.NumberFormat('en-RW').format(item.qty * item.rate)}
                            </div>
                            <div className="col-span-1 text-right">
                              <button
                                type="button"
                                onClick={() => removeLineItem(index)}
                                className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30"
                                disabled={lineItems.length === 1}
                              >
                                <FaTrash className="text-xs" />
                              </button>
                            </div>
                          </div>

                          {/* Mobile stacked layout */}
                          <div className="sm:hidden space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={item.product}
                                onChange={(e) => updateLineItem(index, 'product', e.target.value)}
                              placeholder={t('invoices.modal.product_service')}
                                className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => removeLineItem(index)}
                                className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30"
                                disabled={lineItems.length === 1}
                              >
                                <FaTrash className="text-xs" />
                              </button>
                            </div>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                              placeholder={t('invoices.modal.description')}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                            />
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="text-xs text-gray-500">{t('invoices.modal.qty')}</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.qty}
                                  onChange={(e) => updateLineItem(index, 'qty', parseInt(e.target.value) || 1)}
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-xs text-gray-500">{t('invoices.modal.rate')}</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.rate || ''}
                                  onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-xs text-gray-500">{t('invoices.modal.amount')}</label>
                                <p className="py-1.5 text-sm font-medium text-gray-900">{new Intl.NumberFormat('en-RW').format(item.qty * item.rate)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add line item */}
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={addLineItem}
                        className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <FaPlus className="text-xs" /> {t('invoices.modal.add_line_item')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-full sm:w-72 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('invoices.modal.subtotal')}</span>
                      <span className="text-gray-900 font-medium">{new Intl.NumberFormat('en-RW').format(subtotal)} {formData.currency}</span>
                    </div>
                    <div className="flex justify-between text-sm items-center">
                      <label className="flex items-center gap-2 text-gray-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.taxApplied}
                          onChange={(e) => setFormData({ ...formData, taxApplied: e.target.checked })}
                          className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        {t('invoices.modal.tax')} ({formData.taxRate}%)
                      </label>
                      <span className="text-gray-900 font-medium">{new Intl.NumberFormat('en-RW').format(taxAmount)} {formData.currency}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between">
                      <span className="text-gray-900 font-bold">{t('invoices.modal.total')}</span>
                      <span className="text-gray-900 font-bold text-lg">{new Intl.NumberFormat('en-RW').format(total)} {formData.currency}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer Actions */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-3 justify-end rounded-b-xl">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors order-3 sm:order-1"
                >
                  {t('invoices.modal.cancel')}
                </button>
                <button
                  type="submit"
                  onClick={() => setSubmitAction('draft')}
                  className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium text-sm transition-colors order-1 sm:order-2"
                >
                  {editingInvoice ? t('invoices.modal.update_invoice') : t('invoices.modal.save_draft')}
                </button>
                {!editingInvoice && (
                  <button
                    type="submit"
                    onClick={() => setSubmitAction('send')}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors order-2 sm:order-3"
                  >
                    {t('invoices.modal.save_send')}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {showSendPreview && previewData && (() => {
        const companyRaw = (() => { try { return JSON.parse(localStorage.getItem('finflow_company') || '{}'); } catch { return {}; } })();
        const accentColor = String(companyRaw.brandColor || '#2563EB');
        const companyName = companyRaw.displayName || companyRaw.name || t('common.your_company');
        const companyAddress = companyRaw.address || '';
        const companyPhone = companyRaw.phone || '';
        const companyPayInstructions: string = companyRaw.defaultPaymentInstructions || '';
        const payLines = companyPayInstructions
          ? companyPayInstructions.split('\n').map((l: string) => l.trim()).filter(Boolean)
          : companyPhone ? [`${t('invoices.pay_mobile_money')} ${companyPhone}`, `${t('invoices.pay_bank_transfer')} ${t('invoices.pay_use_reference')} ${previewData.invoiceNumber}`] : [];
        const invoiceTypeLabels: Record<string, string> = {
          standard: t('invoices.label.standard'),
          proforma: t('invoices.label.proforma'),
          tax: t('invoices.label.tax'),
          commercial: t('invoices.label.commercial'),
          credit_note: t('invoices.label.credit_note'),
          debit_note: t('invoices.label.debit_note'),
        };
        const typeKey = String(previewData.invoiceType || 'standard').toLowerCase();
        const invoiceLabel = invoiceTypeLabels[typeKey] || String(previewData.invoiceType || t('invoices.label.standard')).toUpperCase();
        const invoiceDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
        const dueDateFmt = previewData.dueDate ? new Date(previewData.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-') : '-';
        const previewClient = clients.find((c) => c._id === previewData.clientId);
        const previewSubtotal = previewData.items.reduce((s, i) => s + i.amount, 0) || Number(previewData.amount) || 0;
        const previewTax = previewData.taxApplied ? previewSubtotal * ((previewData.taxRate || 0) / 100) : 0;
        const previewTotal = previewSubtotal + previewTax;
        const numFmt = (n: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
        const displayItems = previewData.items.length > 0 ? previewData.items : [{
          name: t('invoices.modal.invoice_item'), description: previewData.description || '', quantity: 1,
          rate: Number(previewData.amount || 0), amount: Number(previewData.amount || 0),
        }];
        return (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60] overflow-y-auto">
            <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl my-4">
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{t('invoices.preview_title')}</h3>
                  <p className="text-xs text-gray-500">{t('invoices.preview_subtitle')}</p>
                </div>
                <button onClick={() => setShowSendPreview(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
              </div>

              {/* PDF-style invoice */}
              <div className="p-6 max-h-[75vh] overflow-y-auto">
                <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm font-sans">
                  {/* Header row */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{companyName}</p>
                      {companyAddress && <p className="text-xs text-gray-500 mt-0.5">{companyAddress}</p>}
                      {companyPhone && <p className="text-xs text-gray-500">{companyPhone}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-2xl" style={{ color: accentColor }}>{invoiceLabel}</p>
                    </div>
                  </div>

                  {/* Bill To + Invoice Meta */}
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: accentColor }}>{t('invoices.bill_to')}</p>
                      <p className="font-bold text-gray-900">{previewClient?.name || t('invoices.modal.client')}</p>
                      {previewClient?.address && <p className="text-xs text-gray-500">{previewClient.address}</p>}
                      {previewClient?.email && <p className="text-xs text-gray-500">{previewClient.email}</p>}
                      {previewClient?.phone && <p className="text-xs text-gray-500">{previewClient.phone}</p>}
                    </div>
                    <div className="text-right space-y-0.5">
                      <div className="flex justify-between gap-6">
                        <span className="text-xs font-semibold" style={{ color: accentColor }}>{t('invoices.table.number')}</span>
                        <span className="text-xs text-gray-900">{previewData.invoiceNumber}</span>
                      </div>
                      <div className="flex justify-between gap-6">
                        <span className="text-xs font-semibold" style={{ color: accentColor }}>{t('invoices.invoice_date')}</span>
                        <span className="text-xs text-gray-900">{invoiceDate}</span>
                      </div>
                      <div className="flex justify-between gap-6">
                        <span className="text-xs font-semibold" style={{ color: accentColor }}>{t('invoices.due_date')}</span>
                        <span className="text-xs text-gray-900">{dueDateFmt}</span>
                      </div>
                    </div>
                  </div>

                  {/* Line items table */}
                  <table className="w-full mb-4 text-xs">
                    <thead>
                      <tr style={{ backgroundColor: accentColor }} className="text-white">
                        <th className="text-left px-2 py-1.5">{t('invoices.qty')}</th>
                        <th className="text-left px-2 py-1.5">{t('invoices.description')}</th>
                        <th className="text-right px-2 py-1.5">{t('invoices.unit_price')}</th>
                        <th className="text-right px-2 py-1.5">{t('invoices.amount')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayItems.map((item, idx) => (
                        <tr key={idx} className="text-gray-800">
                          <td className="px-2 py-1.5">{Number(item.quantity || 1).toFixed(2)}</td>
                          <td className="px-2 py-1.5">{item.name}{item.description ? ` ${item.description}` : ''}</td>
                          <td className="px-2 py-1.5 text-right">{numFmt(Number(item.rate || 0))}</td>
                          <td className="px-2 py-1.5 text-right">{numFmt(Number(item.amount || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="flex justify-end mb-4">
                    <div className="w-48 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('invoices.subtotal')}</span>
                        <span className="text-gray-900 font-medium">{numFmt(previewSubtotal)}</span>
                      </div>
                      {previewData.taxApplied && previewTax > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t('invoices.sales_tax')} ({previewData.taxRate || 0}%)</span>
                          <span className="text-gray-900 font-medium">{numFmt(previewTax)}</span>
                        </div>
                      )}
                      <div className="border-t pt-1 flex justify-between font-bold" style={{ color: accentColor }}>
                        <span>{t('invoices.total')} ({previewData.currency})</span>
                        <span>{numFmt(previewTotal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* How to Pay */}
                  {payLines.length > 0 && (
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs font-semibold mb-1" style={{ color: accentColor }}>{t('invoices.how_to_pay')}</p>
                      {payLines.map((line: string, i: number) => (
                        <p key={i} className="text-xs text-gray-600">{line}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer actions */}
              <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSendPreview(false)}
                  className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                  disabled={sendingFromPreview}
                >
                  {t('common.back')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSendFromPreview}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-60"
                  disabled={sendingFromPreview}
                >
                  {sendingFromPreview ? t('invoices.sending') : t('common.save_and_send')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isAdmin && deleteConfirm.show}
        title={t('invoices.confirm_delete_title')}
        message={t('invoices.confirm_delete_message')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ show: false, invoiceId: null })}
      />

      {/* Link Confirmation Modal */}
      <ConfirmModal
        isOpen={linkConfirm.show}
        title={t('invoices.confirm_link_title')}
        message={`${t('invoices.confirm_link_message')} ${linkConfirm.invoice?.invoiceNumber || ''} ${t('invoices.confirm_link_to')} ${linkConfirm.invoice?.clientId?.name || t('invoices.modal.client')}?`}
        confirmText={t('invoices.confirm_link_confirm')}
        cancelText={t('common.cancel')}
        variant="primary"
        onConfirm={handleLinkConfirm}
        onCancel={() => setLinkConfirm({ show: false, invoice: null })}
      />
    </div>
  );
};

export default Invoices;

