import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { ConfirmModal } from '../components/ConfirmModal';
import PaymentReceipt from '../components/invoice/PaymentReceipt';
import Badge from '../components/common/Badge';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { formatDateDMY } from '../utils/formatDate';
import { getErrorMessage, notifyError, notifySuccess, notifyWarning } from '../utils/toast';

interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceType?: string;
  clientId: any;
  amount: number;
  totalAmount: number;
  amountPaid?: number;
  remainingAmount?: number;
  status: string;
  dueDate: string;
  sentAt?: string;
  paidAt?: string;
  description?: string;
  items?: Array<{
    name?: string;
    description?: string;
    quantity?: number;
    rate?: number;
    amount?: number;
  }>;
  notes?: string;
  currency: string;
  taxApplied: boolean;
  taxRate: number;
  paymentMethod?: string;
  paymentReference?: string;
  receivedBy?: string;
  createdBy?: any;
  createdAt: string;
  updatedAt: string;
  attachments?: Array<{
    _id: string;
    fileId: any;
    type: string;
    uploadedAt: string;
    uploadedBy?: any;
  }>;
}

const parseLineItemsFromDescription = (description?: string) => {
  if (!description) return [];
  return description
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const lineItemMatch = line.match(/^(.*?):\s*(.*?)\s*\(x([\d.]+)\s*@\s*([\d.]+)\)$/i);
      if (lineItemMatch) {
        const quantity = Number(lineItemMatch[3]) || 1;
        const rate = Number(lineItemMatch[4]) || 0;
        return {
          name: lineItemMatch[1]?.trim() || 'Item',
          description: lineItemMatch[2]?.trim() || '',
          quantity,
          rate,
          amount: quantity * rate,
        };
      }

      return {
        name: line,
        description: '',
        quantity: 1,
        rate: 0,
        amount: 0,
      };
    });
};


const InvoiceDetail: React.FC = () =>{
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    clientId: '',
    invoiceType: 'standard',
    amount: '',
    description: '',
    notes: '',
    dueDate: '',
    taxApplied: true,
  });

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    amountToPayNow: '',
    paymentMethod: 'Cash',
    paymentReference: '',
    receivedBy: '',
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentReceiptUploadedForCurrentPayment, setPaymentReceiptUploadedForCurrentPayment] = useState(false);

  // Confirm modals
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; fileId: string | null }>({
    show: false,
    fileId: null,
  });
  const [statusConfirm, setStatusConfirm] = useState<{ show: boolean; status: string | null }>({
    show: false,
    status: null,
  });
  const [showPDFConfirm, setShowPDFConfirm] = useState(false);

  useEffect(() =>{
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () =>{
    try {
      const response = await apiClient.get(`/invoices/${invoiceId}`);
      if (response.data.success) {
        const inv = response.data.data;
        setInvoice(inv);
        setFormData({
          clientId: inv.clientId?._id || '',
          invoiceType: inv.invoiceType || 'standard',
          amount: inv.amount.toString(),
          description: inv.description || '',
          notes: inv.notes || '',
          dueDate: new Date(inv.dueDate).toISOString().split('T')[0],
          taxApplied: inv.taxApplied,
        });
      }
    } catch (error) {
      console.error('Failed to fetch invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) =>{
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      await apiClient.post(`/invoices/${invoiceId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await fetchInvoice(); // Refresh invoice data
      if (type === 'payment_receipt' && showPaymentModal) {
        setPaymentReceiptUploadedForCurrentPayment(true);
      }
    } catch (error: any) {
      notifyError(getErrorMessage(error, 'Failed to upload file'));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async () =>{
    if (!deleteConfirm.fileId) return;

    try {
      await apiClient.delete(`/invoices/${invoiceId}/attachments/${deleteConfirm.fileId}`);
      fetchInvoice();
      setDeleteConfirm({ show: false, fileId: null });
    } catch (error: any) {
      notifyError(getErrorMessage(error, 'Failed to delete attachment'));
    }
  };

  const handleMarkAsPaid = async () =>{
    if (!paymentReceiptUploadedForCurrentPayment) {
      notifyWarning('Please upload a new payment receipt for this payment');
      return;
    }

    const invoiceTotal = Number(invoice?.totalAmount || invoice?.amount || 0);
    const alreadyPaid = Math.max(0, Number(invoice?.amountPaid || 0));
    const remaining = Math.max(invoiceTotal - alreadyPaid, 0);
    const amountToPayNow = Math.max(0, Number(paymentForm.amountToPayNow || 0));

    if (amountToPayNow <= 0) {
      notifyWarning('Please enter an amount to pay now');
      return;
    }
    if (amountToPayNow > remaining) {
      notifyWarning('Amount to pay now cannot be greater than remaining balance');
      return;
    }

    try {
      const newAmountPaid = Math.min(invoiceTotal, alreadyPaid + amountToPayNow);
      await apiClient.put(`/invoices/${invoiceId}/mark-paid`, {
        paymentDate: paymentForm.paymentDate,
        amountPaid: newAmountPaid,
        paymentMethod: paymentForm.paymentMethod,
        paymentReference: paymentForm.paymentReference,
        receivedBy: paymentForm.receivedBy,
      });
      window.dispatchEvent(new Event('finflow:notifications:refresh'));
      fetchInvoice();
      setShowPaymentModal(false);
      setPaymentReceiptUploadedForCurrentPayment(false);
      setPaymentForm((prev) => ({ ...prev, amountToPayNow: '' }));
      notifySuccess('Payment recorded successfully');
    } catch (error: any) {
      notifyError(getErrorMessage(error, 'Failed to mark as paid'));
    }
  };

  const handleStatusChange = async (newStatus: string) =>{
    try {
      await apiClient.patch(`/invoices/${invoiceId}/status`, { status: newStatus });
      window.dispatchEvent(new Event('finflow:notifications:refresh'));
      fetchInvoice();
      setStatusConfirm({ show: false, status: null });
      notifySuccess(`Invoice marked as ${newStatus}`);
    } catch (error: any) {
      notifyError(getErrorMessage(error, 'Failed to update status'));
    }
  };

const handleSaveEdit = async () =>{
    try {
      await apiClient.put(`/invoices/${invoiceId}`, formData);
      fetchInvoice();
      setEditMode(false);
      notifySuccess('Invoice updated successfully');
    } catch (error: any) {
      notifyError(getErrorMessage(error, 'Failed to save changes'));
    }
  };

  const handleDownloadPDF = async () =>{
    try {
      const response = await apiClient.get(`/reports/invoices/${invoiceId}/pdf`, {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoice?.invoiceNumber || invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setShowPDFConfirm(false);
      notifySuccess('Invoice PDF downloaded');
    } catch (error: any) {
      notifyError(getErrorMessage(error, 'Failed to download PDF'));
      setShowPDFConfirm(false);
    }
  };

  if (loading) {
    return <LoadingOverlay message="Loading invoice details..." />;
  }

  if (!invoice) {
    return <div className="text-center py-12 text-red-600">Invoice not found</div>;
  }

  const getStatusBadgeVariant = (status: string) => {
    const variantMap: { [key: string]: 'paid' | 'sent' | 'overdue' | 'draft' | 'cancelled' } = {
      paid: 'paid', sent: 'sent', overdue: 'overdue', draft: 'draft', cancelled: 'cancelled',
    };
    return variantMap[status] || 'draft';
  };

  const formatInvoiceType = (invoiceType?: string) => {
    const labels: Record<string, string> = {
      standard: 'Invoice', proforma: 'Proforma Invoice', tax: 'Tax Invoice',
      commercial: 'Commercial Invoice', credit_note: 'Credit Note', debit_note: 'Debit Note',
    };
    const key = String(invoiceType || 'standard').trim().toLowerCase();
    return labels[key] || String(invoiceType || 'Invoice');
  };

  const getInvoiceTypePillClasses = (invoiceType?: string) => {
    const key = String(invoiceType || 'standard').trim().toLowerCase();
    if (key === 'proforma') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (key === 'tax') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (key === 'commercial') return 'bg-sky-100 text-sky-800 border-sky-200';
    if (key === 'credit_note') return 'bg-violet-100 text-violet-800 border-violet-200';
    if (key === 'debit_note') return 'bg-rose-100 text-rose-800 border-rose-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const hasReceipt = invoice.attachments?.some(att => att.type === 'payment_receipt');
  const invoiceItems = Array.isArray(invoice.items) && invoice.items.length > 0
    ? invoice.items
    : parseLineItemsFromDescription(invoice.description);

  // Computed values for the new design
  const companyData = (() => { try { return JSON.parse(localStorage.getItem('finflow_company') || '{}'); } catch { return {}; } })();
  const companyName = companyData.displayName || companyData.name || 'Your Company';
  const companyAddress = String(companyData.address || '');
  const companyPhone = String(companyData.phone || '');
  const paymentInstructions = String(companyData.defaultPaymentInstructions || '');
  const payLines = paymentInstructions ? paymentInstructions.split('\n').map((l: string) => l.trim()).filter(Boolean) : [];
  const accentColor = String(companyData.brandColor || '#2563EB');
  const numFmt = (n: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  const invoiceTaxAmt = invoice.taxApplied ? (invoice.totalAmount - invoice.amount) : 0;
  const dueDateValue = new Date(invoice.dueDate);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const isSentAndPastDue = invoice.status === 'sent' && !Number.isNaN(dueDateValue.getTime()) && dueDateValue.getTime() < startOfToday.getTime();
  const effectiveStatus = isSentAndPastDue ? 'overdue' : invoice.status;
  const invoiceTotal = Number(invoice.totalAmount || invoice.amount || 0);
  const alreadyPaid = Math.max(0, Number(invoice.amountPaid || 0));
  const remainingBalance = Math.max(invoiceTotal - alreadyPaid, 0);
  const availableStatuses: string[] = invoice.status === 'draft'
    ? ['sent']
    : (invoice.status === 'sent' || invoice.status === 'overdue')
      ? ['paid', 'cancelled']
      : [];
  const invoiceTypeLabels: Record<string, string> = {
    standard: 'INVOICE', proforma: 'PROFORMA INVOICE', tax: 'TAX INVOICE',
    commercial: 'COMMERCIAL INVOICE', credit_note: 'CREDIT NOTE', debit_note: 'DEBIT NOTE',
  };
  const typeKey = String(invoice.invoiceType || 'standard').toLowerCase();
  const invoiceTitleLabel = invoiceTypeLabels[typeKey] || String(invoice.invoiceType || 'INVOICE').toUpperCase();

  return (
    <div className="w-full max-w-none space-y-4">
      {/* Compact header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 shrink-0">← Back</button>
          <div className="h-4 w-px bg-gray-300 shrink-0" />
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{invoice.invoiceNumber}</h1>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shrink-0 ${getInvoiceTypePillClasses(invoice.invoiceType)}`}>
              {formatInvoiceType(invoice.invoiceType)}
            </span>
            <Badge variant={getStatusBadgeVariant(effectiveStatus)}>{effectiveStatus.toUpperCase()}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 p-1.5 shadow-sm shrink-0">
          {!editMode && (
            <button onClick={() => setShowPDFConfirm(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Download PDF</button>
          )}
          {!editMode && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <button onClick={() => setEditMode(true)} className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">Edit</button>
          )}
          {editMode && (
            <>
              <button onClick={() => setEditMode(false)} className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancel</button>
              <button onClick={handleSaveEdit} className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">Save</button>
            </>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-6">
        {/* Left: Invoice document */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {editMode ? (
            <div className="bg-white rounded-lg shadow p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider border-b pb-2">Edit Invoice</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Invoice Type</label>
                  <select value={formData.invoiceType} onChange={(e) => setFormData({ ...formData, invoiceType: e.target.value })} className="input text-sm">
                    <option value="standard">Invoice</option>
                    <option value="proforma">Proforma Invoice</option>
                    <option value="tax">Tax Invoice</option>
                    <option value="commercial">Commercial Invoice</option>
                    <option value="credit_note">Credit Note</option>
                    <option value="debit_note">Debit Note</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Due Date</label>
                  <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className="input text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input text-sm" rows={2} placeholder="Internal notes..." />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                {/* Company + invoice type */}
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <p className="text-base font-bold text-gray-900">{companyName}</p>
                    {companyAddress && <p className="text-xs text-gray-500 mt-0.5">{companyAddress}</p>}
                    {companyPhone && <p className="text-xs text-gray-500">{companyPhone}</p>}
                  </div>
                  <p className="text-xl font-extrabold tracking-wide" style={{ color: accentColor }}>{invoiceTitleLabel}</p>
                </div>

                {/* Bill To + Invoice meta */}
                <div className="flex flex-col sm:flex-row justify-between gap-4 mb-5 pb-4 border-b border-gray-100">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: accentColor }}>Bill To</p>
                    <p className="font-bold text-gray-900 text-sm">{invoice.clientId?.name || 'N/A'}</p>
                    {invoice.clientId?.address && <p className="text-xs text-gray-500">{invoice.clientId.address}</p>}
                    {invoice.clientId?.email && <p className="text-xs text-gray-500">{invoice.clientId.email}</p>}
                    {invoice.clientId?.phone && <p className="text-xs text-gray-500">{invoice.clientId.phone}</p>}
                  </div>
                  <div className="space-y-1 sm:text-right">
                    <div className="flex sm:justify-end gap-6">
                      <span className="text-xs font-semibold" style={{ color: accentColor }}>Invoice #</span>
                      <span className="text-xs text-gray-900">{invoice.invoiceNumber}</span>
                    </div>
                    <div className="flex sm:justify-end gap-6">
                      <span className="text-xs font-semibold" style={{ color: accentColor }}>Invoice date</span>
                      <span className="text-xs text-gray-900">{formatDateDMY(invoice.createdAt)}</span>
                    </div>
                    <div className="flex sm:justify-end gap-6">
                      <span className="text-xs font-semibold" style={{ color: accentColor }}>Due date</span>
                      <span className={`text-xs font-medium ${effectiveStatus === 'overdue' ? 'text-red-600' : 'text-gray-900'}`}>{formatDateDMY(invoice.dueDate)}</span>
                    </div>
                  </div>
                </div>

                {/* Line items table */}
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ backgroundColor: accentColor }} className="text-white">
                        <th className="text-left px-3 py-2 font-semibold">QTY</th>
                        <th className="text-left px-3 py-2 font-semibold">Description</th>
                        <th className="text-right px-3 py-2 font-semibold">Unit Price</th>
                        <th className="text-right px-3 py-2 font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(invoiceItems.length > 0 ? invoiceItems : [{
                        name: 'Invoice item',
                        description: invoice.description || '',
                        quantity: 1,
                        rate: invoice.amount,
                        amount: invoice.amount,
                      }]).map((item, idx) => (
                        <tr key={idx} className="text-gray-800">
                          <td className="px-3 py-2">{Number(item.quantity || 1).toFixed(2)}</td>
                          <td className="px-3 py-2">{item.name || 'Item'}{item.description ? ` – ${item.description}` : ''}</td>
                          <td className="px-3 py-2 text-right">{numFmt(Number(item.rate || 0))}</td>
                          <td className="px-3 py-2 text-right font-medium">{numFmt(Number(item.amount ?? (Number(item.quantity || 1) * Number(item.rate || 0))))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-4">
                  <div className="w-56 space-y-1 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span className="font-medium text-gray-900">{numFmt(invoice.amount)} {invoice.currency}</span>
                    </div>
                    {invoice.taxApplied && invoiceTaxAmt > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Tax ({invoice.taxRate}%)</span>
                        <span className="font-medium text-gray-900">{numFmt(invoiceTaxAmt)} {invoice.currency}</span>
                      </div>
                    )}
                    <div className="border-t pt-1 flex justify-between font-bold" style={{ color: accentColor }}>
                      <span>Total ({invoice.currency})</span>
                      <span>{numFmt(invoice.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Amount Paid</span>
                      <span className="font-medium text-gray-900">{numFmt(alreadyPaid)} {invoice.currency}</span>
                    </div>
                    <div className="flex justify-between text-amber-700">
                      <span>Remaining Due</span>
                      <span className="font-semibold">{numFmt(remainingBalance)} {invoice.currency}</span>
                    </div>
                  </div>
                </div>

                {/* How to Pay */}
                {payLines.length > 0 && (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold mb-1.5" style={{ color: accentColor }}>How to Pay</p>
                    {payLines.map((line: string, i: number) => (
                      <p key={i} className="text-xs text-gray-600">{line}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Receipt */}
          <PaymentReceipt
            receipts={invoice.attachments || []}
            onDelete={(fileId) => setDeleteConfirm({ show: true, fileId })}
            uploading={uploading}
            showUpload={false}
          />
        </div>

        {/* Right: Actions + Timeline */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          {/* Status & Actions */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Invoice Status</h3>
            <div className="mb-3">
              <Badge variant={getStatusBadgeVariant(effectiveStatus)}>{effectiveStatus.toUpperCase()}</Badge>
              {effectiveStatus === 'overdue' && (
                <p className="text-xs text-red-600 mt-1.5">Overdue since {formatDateDMY(invoice.dueDate)}</p>
              )}
            </div>
            {availableStatuses.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-1">Actions</p>
                {availableStatuses.includes('sent') && (
                  <button
                    onClick={() => setStatusConfirm({ show: true, status: 'sent' })}
                    className="btn btn-primary w-full text-sm py-1.5"
                  >
                    Mark as Sent
                  </button>
                )}
                {availableStatuses.includes('paid') && (
                  <button
                    onClick={() => {
                      setPaymentReceiptUploadedForCurrentPayment(false);
                      setShowPaymentModal(true);
                    }}
                    className="btn btn-primary w-full text-sm py-1.5"
                  >
                    Mark as Paid
                  </button>
                )}
                {availableStatuses.includes('cancelled') && (
                  <button
                    onClick={() => setStatusConfirm({ show: true, status: 'cancelled' })}
                    className="w-full text-sm py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel Invoice
                  </button>
                )}
              </div>
            )}
            {!hasReceipt && availableStatuses.includes('paid') && (
              <p className="text-xs text-amber-700 mt-2 bg-amber-50 rounded-md p-2">
                Upload receipt in the "Confirm Payment Details" modal when recording payment.
              </p>
            )}
          </div>

          {/* Payment details (if paid) */}
          {invoice.status === 'paid' && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Payment Details</h3>
              <div className="space-y-2 text-sm">
                {[
                  ['Method', invoice.paymentMethod],
                  ['Reference', invoice.paymentReference],
                  ['Received by', invoice.receivedBy],
                  ['Paid at', invoice.paidAt ? formatDateDMY(invoice.paidAt) : undefined],
                ].map(([label, value]) => value ? (
                  <div key={label as string} className="flex justify-between gap-2">
                    <span className="text-gray-500 shrink-0">{label}</span>
                    <span className="font-medium text-gray-900 text-right truncate">{value}</span>
                  </div>
                ) : null)}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Timeline</h3>
            <ol className="space-y-3">
              <li className="flex items-start gap-2.5">
                <span className="mt-1 h-2 w-2 rounded-full bg-gray-400 shrink-0"></span>
                <div>
                  <p className="text-xs font-medium text-gray-900">Created</p>
                  <p className="text-xs text-gray-500">{formatDateDMY(invoice.createdAt)}</p>
                </div>
              </li>
              {invoice.sentAt && (
                <li className="flex items-start gap-2.5">
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-400 shrink-0"></span>
                  <div>
                    <p className="text-xs font-medium text-gray-900">Sent</p>
                    <p className="text-xs text-gray-500">{formatDateDMY(invoice.sentAt)}</p>
                  </div>
                </li>
              )}
              {invoice.paidAt && (
                <li className="flex items-start gap-2.5">
                  <span className="mt-1 h-2 w-2 rounded-full bg-green-400 shrink-0"></span>
                  <div>
                    <p className="text-xs font-medium text-gray-900">Paid</p>
                    <p className="text-xs text-gray-500">{formatDateDMY(invoice.paidAt)}</p>
                  </div>
                </li>
              )}
            </ol>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 sm:p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Confirm Payment Details</h3>
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Total Invoice</span>
                  <span className="font-medium text-slate-900">{numFmt(invoiceTotal)} {invoice.currency}</span>
                </div>
                <div className="mt-1 flex justify-between text-slate-600">
                  <span>Already Paid</span>
                  <span className="font-medium text-slate-900">{numFmt(alreadyPaid)} {invoice.currency}</span>
                </div>
                <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 text-amber-700">
                  <span>Remaining</span>
                  <span className="font-semibold">{numFmt(remainingBalance)} {invoice.currency}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Amount to Pay Now</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentForm.amountToPayNow}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amountToPayNow: e.target.value })}
                    className="input text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Payment Method</label>
                  <select value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })} className="input text-sm">
                    <option value="Cash">Cash</option>
                    <option value="MobileMoney">Mobile Money</option>
                    <option value="BankTransfer">Bank Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Payment Reference</label>
                  <input type="text" value={paymentForm.paymentReference} onChange={(e) => setPaymentForm({ ...paymentForm, paymentReference: e.target.value })} className="input text-sm" placeholder="Transaction ID or reference" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Received By</label>
                  <input type="text" value={paymentForm.receivedBy} onChange={(e) => setPaymentForm({ ...paymentForm, receivedBy: e.target.value })} className="input text-sm" placeholder="Name of person who received payment" />
                </div>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Payment Receipt</label>
                <label className={`cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    disabled={uploading}
                    onChange={(e) => handleFileUpload(e, 'payment_receipt')}
                  />
                  {uploading ? 'Uploading…' : '+ Upload Receipt'}
                </label>
                <p className="mt-1 text-xs text-gray-400">A new receipt is required for every payment record.</p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 mt-5">
              <button onClick={() => { setShowPaymentModal(false); setPaymentReceiptUploadedForCurrentPayment(false); }} className="btn btn-secondary flex-1 text-sm">Cancel</button>
              <button onClick={handleMarkAsPaid} className="btn btn-primary flex-1 text-sm">Record Payment</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm.show}
        title="Delete Attachment"
        message="Are you sure you want to delete this attachment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteAttachment}
        onCancel={() => setDeleteConfirm({ show: false, fileId: null })}
      />
      <ConfirmModal
        isOpen={statusConfirm.show}
        title="Change Invoice Status"
        message={`Are you sure you want to mark this invoice as ${statusConfirm.status}?`}
        confirmText="Confirm"
        cancelText="Cancel"
        variant="warning"
        onConfirm={() => statusConfirm.status && handleStatusChange(statusConfirm.status)}
        onCancel={() => setStatusConfirm({ show: false, status: null })}
      />
      <ConfirmModal
        isOpen={showPDFConfirm}
        title="Generate Invoice PDF"
        message="This will generate and download a PDF version of this invoice."
        confirmText="Download PDF"
        cancelText="Cancel"
        variant="info"
        onConfirm={handleDownloadPDF}
        onCancel={() => setShowPDFConfirm(false)}
      />
    </div>
  );
};

export default InvoiceDetail;

