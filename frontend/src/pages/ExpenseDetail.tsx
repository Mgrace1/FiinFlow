import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { ConfirmModal } from '../components/ConfirmModal';
import { getUserRole } from '../utils/roleUtils';
import Badge from '../components/common/Badge';
import Tooltip from '../components/common/Tooltip';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { formatDateDMY, formatDateTime } from '../utils/formatDate';
import { getErrorMessage, notifyError, notifySuccess } from '../utils/toast';
import { formatCompanyMoney, getCurrencyConfig } from '../utils/currency';

interface Expense {
  _id: string;
  supplier: string;
  category: string;
  amount: number;
  currency: string;
  date: string;
  description?: string;
  receiptFileId?: any;
  createdBy?: any;
  createdAt: string;
  updatedAt: string;
}

const ExpenseDetail: React.FC = () =>{
  const { expenseId } = useParams<{ expenseId: string }>();
  const navigate = useNavigate();
  const userRole = getUserRole();

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    supplier: '',
    category: 'Other',
    amount: '',
    currency: 'RWF',
    date: '',
    description: '',
  });

  // Confirm modals
  const [deleteReceiptConfirm, setDeleteReceiptConfirm] = useState(false);
  const [deleteExpenseConfirm, setDeleteExpenseConfirm] = useState(false);

  useEffect(() =>{
    fetchExpense();
    const cfg = getCurrencyConfig();
    setFormData((prev) => ({ ...prev, currency: cfg.defaultCurrency }));
  }, [expenseId]);

  const fetchExpense = async () =>{
    try {
      const response = await apiClient.get(`/expenses/${expenseId}`);
      if (response.data.success) {
        const exp = response.data.data;
        setExpense(exp);
        setFormData({
          supplier: exp.supplier,
          category: exp.category,
          amount: exp.amount.toString(),
          currency: exp.currency || 'RWF',
          date: new Date(exp.date).toISOString().split('T')[0],
          description: exp.description || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch expense:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) =>{
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      await apiClient.post(`/expenses/${expenseId}/receipt`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      fetchExpense(); // Refresh expense data
    } catch (error: any) {
      notifyError(getErrorMessage(error, 'Failed to upload receipt'));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteReceipt = async () =>{
    try {
      await apiClient.delete(`/expenses/${expenseId}/receipt`);
      fetchExpense();
      setDeleteReceiptConfirm(false);
      notifySuccess('Receipt deleted successfully');
    } catch (error: any) {
      notifyError(getErrorMessage(error, 'Failed to delete receipt'));
    }
  };

  const handleSaveEdit = async () =>{
    try {
      await apiClient.put(`/expenses/${expenseId}`, formData);
      fetchExpense();
      setEditMode(false);
      notifySuccess('Expense updated successfully');
    } catch (error: any) {
      notifyError(getErrorMessage(error, 'Failed to save changes'));
    }
  };

  const handleDeleteExpense = async () =>{
    try {
      await apiClient.delete(`/expenses/${expenseId}`);
      notifySuccess('Expense deleted successfully');
      navigate(-1);
    } catch (error: any) {
      notifyError(getErrorMessage(error, 'Failed to delete expense'));
    }
  };

  if (loading) {
    return <LoadingOverlay message="Loading expense details..." />;
  }

  if (!expense) {
    return <div className="text-center py-12 text-red-600">Expense not found</div>;
  }

  const canEdit = userRole === 'admin' || userRole === 'super_admin' || userRole === 'finance_manager';
  const canDelete = userRole === 'admin' || userRole === 'super_admin';

  const getCategoryBadgeVariant = (category: string) =>{
    const variantMap: { [key: string]: 'transport' | 'office' | 'marketing' | 'utilities' | 'salaries' | 'other' } = {
      Transport: 'transport',
      Office: 'office',
      Marketing: 'marketing',
      Utilities: 'utilities',
      Salaries: 'salaries',
      Other: 'other',
    };
    return variantMap[category] || 'other';
  };

  return (
  <div className="max-w-6xl mx-auto">
      {/* Header */}
    <div className="flex justify-between items-center mb-6">
      <div>
        <button
            onClick={() =>navigate(-1)}
            className="text-blue-600 hover:text-blue-800 mb-2"
          >
            ← Back to Expenses
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Expense Details</h1>
      </div>
      <div className="flex gap-3">
          {!editMode && canEdit && (
          <button onClick={() =>setEditMode(true)} className="btn btn-secondary">
              Edit Expense
          </button>
          )}
          {editMode && (
          <>
            <button onClick={() =>setEditMode(false)} className="btn btn-secondary">
                Cancel
            </button>
            <button onClick={handleSaveEdit} className="btn btn-primary">
                Save Changes
            </button>
          </>
          )}
          {canDelete && (
          <button
              onClick={() =>setDeleteExpenseConfirm(true)}
              className="btn btn-danger"
            >
              Delete Expense
          </button>
          )}
      </div>
    </div>

      {/* Category Badge */}
    <div className="mb-6">
      <Badge variant={getCategoryBadgeVariant(expense.category)}>
          {expense.category}
      </Badge>
    </div>

      {/* Main Content Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Expense Details */}
      <div className="lg:col-span-2 space-y-6">
          {/* Expense Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Expense Information</h2>

            {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier *
                </label>
                <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) =>setFormData({ ...formData, supplier: e.target.value })}
                    className="input"
                    required
                  />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                </label>
                <select
                    value={formData.category}
                    onChange={(e) =>setFormData({ ...formData, category: e.target.value })}
                    className="input"
                    required
                  >
                  <option value="Transport">Transport</option>
                  <option value="Office">Office</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Salaries">Salaries</option>
                  <option value="Other">Other</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                    Select the category that best describes this expense
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount *
                </label>
                <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>setFormData({ ...formData, amount: e.target.value })}
                    className="input"
                    required
                  />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>setFormData({ ...formData, date: e.target.value })}
                    className="input"
                    required
                  />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                </label>
                <textarea
                    value={formData.description}
                    onChange={(e) =>setFormData({ ...formData, description: e.target.value })}
                    className="input"
                    rows={3}
                    placeholder="Add notes or details about this expense"
                  />
              </div>
            </div>
            ) : (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Supplier:</span>
                <span className="font-semibold">{expense.supplier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Category:</span>
                <span className="font-semibold">{expense.category}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-900 font-semibold">Amount:</span>
                <span className="text-lg font-bold">
                    {formatCompanyMoney(expense.amount, expense.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-semibold">{formatDateDMY(expense.date)}</span>
              </div>
                {expense.description && (
                <div>
                  <span className="text-gray-600">Description:</span>
                  <Tooltip content={expense.description}>
                    <p className="mt-1 text-gray-900 cursor-help">
                        {expense.description.length >100
                          ? `${expense.description.substring(0, 100)}...`
                          : expense.description}
                    </p>
                  </Tooltip>
                </div>
                )}
            </div>
            )}
        </div>

          {/* Receipt Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Expense Receipt</h2>

            {expense.receiptFileId ? (
            <div className="border border-green-100 bg-green-50 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl"></span>
                    <span className="font-semibold text-green-400">Receipt Uploaded</span>
                  </div>

                    {typeof expense.receiptFileId === 'object' && (
                    <div className="text-sm text-gray-600 space-y-1">
                        {expense.receiptFileId.filename && (
                        <p>
                          <span className="font-medium">File:</span>{' '}
                            {expense.receiptFileId.filename}
                        </p>
                        )}
                        {expense.receiptFileId.uploadedAt && (
                        <p>
                          <span className="font-medium">Uploaded:</span>{' '}
                            {formatDateTime(expense.receiptFileId.uploadedAt)}
                        </p>
                        )}
                    </div>
                    )}
                </div>

                  {canDelete && (
                  <button
                      onClick={() =>setDeleteReceiptConfirm(true)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium ml-4"
                    >
                      Delete
                  </button>
                  )}
              </div>
            </div>
            ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <p className="text-gray-600 mb-3">No receipt uploaded</p>
              <label className="btn btn-primary cursor-pointer inline-block">
                <input
                    type="file"
                    className="hidden"
                    onChange={handleReceiptUpload}
                    disabled={uploading}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  {uploading ? 'Uploading...' : '+ Upload Receipt'}
              </label>
              <p className="text-xs text-gray-500 mt-2">
                  Upload a receipt to keep proper financial records
              </p>
            </div>
            )}
        </div>
      </div>

        {/* Right Column - Metadata */}
      <div className="space-y-6">
          {/* Metadata */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Metadata</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Created:</span>
              <p className="font-medium">{formatDateTime(expense.createdAt)}</p>
            </div>
              {expense.createdBy?.name && (
              <div>
                <span className="text-gray-600">Created By:</span>
                <p className="font-medium">{expense.createdBy.name}</p>
              </div>
              )}
            <div>
              <span className="text-gray-600">Last Updated:</span>
              <p className="font-medium">{formatDateDMY(expense.updatedAt)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Delete Receipt Confirm Modal */}
    <ConfirmModal
        isOpen={deleteReceiptConfirm}
        title="Delete Receipt"
        message="Are you sure you want to delete this receipt? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteReceipt}
        onCancel={() =>setDeleteReceiptConfirm(false)}
      />

      {/* Delete Expense Confirm Modal */}
    <ConfirmModal
        isOpen={deleteExpenseConfirm}
        title="Delete Expense"
        message="Are you sure you want to delete this entire expense? This action cannot be undone and will permanently remove all expense data."
        confirmText="Delete Expense"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteExpense}
        onCancel={() =>setDeleteExpenseConfirm(false)}
      />
  </div>
  );
};

export default ExpenseDetail;


