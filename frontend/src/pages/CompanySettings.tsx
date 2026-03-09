import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import RequireRole from '../components/auth/RequireRole';
import ConfirmModal from '../components/common/ConfirmModal';
import LoadingOverlay from '../components/common/LoadingOverlay';
import ErrorState from '../components/common/ErrorState';
import { getErrorMessage, notifyError, notifySuccess } from '../utils/toast';
import { getUserRole } from '../utils/roleUtils';

interface Company {
  _id: string;
  name: string;
  email: string;
  address: string;
  phone: string;
  displayName?: string;
  logoUrl?: string;
  brandColor?: string;
  brandSecondaryColor?: string;
  defaultCurrency: 'RWF' | 'USD' | 'EUR';
  invoiceFooterText?: string;
  taxRate: number;
  exchangeRateUSD: number;
}

interface CompanySettingsProps {
  embedded?: boolean;
}

const CompanySettings: React.FC<CompanySettingsProps> = ({ embedded = false }) =>{
  const role = getUserRole();
  const isAdmin = role === 'admin' || role === 'super_admin';
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showRemoveLogoConfirm, setShowRemoveLogoConfirm] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  const [formData, setFormData] = useState({
    displayName: '',
    brandColor: '#2563EB',
    brandSecondaryColor: '#10B981',
    defaultCurrency: 'RWF' as 'RWF' | 'USD' | 'EUR',
    invoiceFooterText: 'Thank you for your business!',
    invoicePrefix: 'INV',
    defaultPaymentInstructions: '',
  });

  useEffect(() =>{
    fetchCompany();
  }, []);

  const fetchCompany = async () =>{
    try {
      const response = await apiClient.get('/companies');
      if (response.data.success) {
        const companyData = response.data.data;
        setCompany(companyData);
        localStorage.setItem('finflow_company', JSON.stringify(companyData));
        setFormData({
          displayName: companyData.displayName || companyData.name,
          brandColor: companyData.brandColor || '#2563EB',
          brandSecondaryColor: companyData.brandSecondaryColor || '#10B981',
          defaultCurrency: companyData.defaultCurrency || 'RWF',
          invoiceFooterText: companyData.invoiceFooterText || 'Thank you for your business!',
          invoicePrefix: companyData.invoicePrefix || 'INV',
          defaultPaymentInstructions: companyData.defaultPaymentInstructions || '',
        });
        if (companyData.logoUrl) {
          setLogoPreview(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${companyData.logoUrl}`);
        }
      }
    } catch (error) {
      console.error('Failed to fetch company:', error);
      setError('Failed to load company settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) =>{
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setError('Invalid file type. Only JPEG, JPG and PNG images are allowed.');
      return;
    }

    // Validate file size (2MB)
    if (file.size >2 * 1024 * 1024) {
      setError('File too large. Maximum size is 2MB.');
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () =>{
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setError('');
  };

  const handleUploadLogo = async () =>{
    if (!logoFile) return;

    setUploading(true);
    setError('');

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('logo', logoFile);

      const response = await apiClient.post('/companies/logo', formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        notifySuccess('Logo uploaded successfully');
        setLogoFile(null);
        fetchCompany();
      }
    } catch (error: any) {
      console.error('Failed to upload logo:', error);
      const message = getErrorMessage(error, 'Failed to upload logo. Please try again.');
      setError(message);
      notifyError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () =>{
    if (!isAdmin) return;
    try {
      const response = await apiClient.put('/companies', {
        ...company,
        logoUrl: '',
      });

      if (response.data.success) {
        notifySuccess('Logo removed successfully');
        setLogoPreview('');
        setShowRemoveLogoConfirm(false);
        fetchCompany();
      }
    } catch (error: any) {
      console.error('Failed to remove logo:', error);
      const message = getErrorMessage(error, 'Failed to remove logo. Please try again.');
      setError(message);
      notifyError(message);
    }
  };

  const handleSave = async () =>{
    setSaving(true);
    setError('');

    try {
      const response = await apiClient.put('/companies', formData);

      if (response.data.success) {
        if (response.data.data) {
          localStorage.setItem('finflow_company', JSON.stringify(response.data.data));
        }
        notifySuccess('Settings saved successfully');
        fetchCompany();
      }
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      const message = getErrorMessage(error, 'Failed to save settings. Please try again.');
      setError(message);
      notifyError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingOverlay message="Loading company settings..." />;
  }

  const content = (
    <>
      {saving && <LoadingOverlay message="Saving settings..." />}
      {uploading && <LoadingOverlay message="Uploading logo..." />}

    <div className={embedded ? '' : 'max-w-6xl mx-auto'}>
      {!embedded && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Company Branding</h1>
          <p className="text-sm text-gray-600 mt-1">
              Customize your company's branding and appearance
          </p>
        </div>
      )}

        {error && (
        <ErrorState
            title="Error"
            message={error}
            onRetry={() =>setError('')}
            icon=""
          />
        )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Settings Form */}
        <div className="space-y-6">
            {/* Logo Upload Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Company Logo</h2>

            <div className="flex items-center space-x-4 mb-4">
                {logoPreview ? (
                <div className="relative">
                  <img
                      src={logoPreview}
                      alt="Company logo"
                      className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200"
                    />
                </div>
                ) : (
                <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                  <span className="text-gray-400 text-xs text-center">No logo</span>
                </div>
                )}

              <div className="flex-1">
                <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleLogoChange}
                    className="hidden"
                    id="logo-upload"
                  />
                <label
                    htmlFor="logo-upload"
                    className="btn btn-secondary cursor-pointer inline-block"
                  >
                    Choose Logo
                </label>
                <p className="text-xs text-gray-500 mt-2">
                    PNG, JPG or JPEG. Max 2MB.
                </p>
              </div>
            </div>

              {logoFile && (
              <button
                  onClick={handleUploadLogo}
                  disabled={uploading}
                  className="btn btn-primary w-full mb-2"
                >
                  {uploading ? 'Uploading...' : 'Upload Logo'}
              </button>
              )}

              {isAdmin && logoPreview && !logoFile && (
                <button
                    onClick={() =>setShowRemoveLogoConfirm(true)}
                    className="btn btn-danger w-full"
                  >
                    Remove Logo
                </button>
              )}
          </div>

            {/* Branding Fields */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Branding Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                </label>
                <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) =>
                      setFormData({ ...formData, displayName: e.target.value })
                    }
                    className="input"
                    placeholder="Enter company display name"
                  />
                <p className="text-xs text-gray-500 mt-1">
                    This name will appear on invoices and throughout the application
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Brand Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                      type="color"
                      value={formData.brandColor}
                      onChange={(e) =>
                        setFormData({ ...formData, brandColor: e.target.value })
                      }
                      className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                  <input
                      type="text"
                      value={formData.brandColor}
                      onChange={(e) =>
                        setFormData({ ...formData, brandColor: e.target.value })
                      }
                      className="input flex-1"
                      placeholder="#2563EB"
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secondary Brand Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                      type="color"
                      value={formData.brandSecondaryColor}
                      onChange={(e) =>
                        setFormData({ ...formData, brandSecondaryColor: e.target.value })
                      }
                      className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                  <input
                      type="text"
                      value={formData.brandSecondaryColor}
                      onChange={(e) =>
                        setFormData({ ...formData, brandSecondaryColor: e.target.value })
                      }
                      className="input flex-1"
                      placeholder="#10B981"
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Currency
                </label>
                <select
                    value={formData.defaultCurrency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        defaultCurrency: e.target.value as 'RWF' | 'USD' | 'EUR',
                      })
                    }
                    className="input"
                  >
                  <option value="RWF">RWF - Rwandan Franc</option>
                  <option value="USD">USD - US Dollar</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Number Prefix
                </label>
                <input
                    type="text"
                    value={formData.invoicePrefix}
                    onChange={(e) =>
                      setFormData({ ...formData, invoicePrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })
                    }
                    className="input"
                    placeholder="INV"
                    maxLength={10}
                  />
                <p className="text-xs text-gray-500 mt-1">
                    Invoices will be numbered as {formData.invoicePrefix || 'INV'}-001, {formData.invoicePrefix || 'INV'}-002, ...
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Footer Text
                </label>
                <textarea
                    value={formData.invoiceFooterText}
                    onChange={(e) =>
                      setFormData({ ...formData, invoiceFooterText: e.target.value })
                    }
                    className="input"
                    rows={3}
                    placeholder="Thank you for your business!"
                  />
                <p className="text-xs text-gray-500 mt-1">
                    This message will appear at the bottom of all invoices
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Payment Instructions
                </label>
                <textarea
                    value={formData.defaultPaymentInstructions}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultPaymentInstructions: e.target.value })
                    }
                    className="input"
                    rows={4}
                    placeholder={`Mobile Money (MoMo): 07XXXXXXXX\nBank Transfer: Bank Name / Account Number\nReference: Invoice number`}
                  />
                <p className="text-xs text-gray-500 mt-1">
                    These instructions appear in the "How to Pay" section on all invoice PDFs
                </p>
              </div>

              <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn btn-primary w-full"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>

          {/* Preview Section */}
        <div className="lg:sticky lg:top-6 h-fit">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Preview</h2>

            <div className="border-2 border-gray-200 rounded-lg p-6 space-y-6">
                {/* Logo and Company Name Preview */}
              <div className="flex items-center space-x-4 pb-4 border-b border-gray-200">
                  {logoPreview ? (
                  <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400 text-xs">Logo</span>
                  </div>
                  )}
                <div>
                  <h3
                      className="text-xl font-bold"
                      style={{ color: formData.brandColor }}
                    >
                      {formData.displayName || company?.name}
                  </h3>
                  <p className="text-sm text-gray-600">{company?.email}</p>
                </div>
              </div>

                {/* Color Swatches */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Brand Colors</p>
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <div
                        className="h-16 rounded-lg border border-gray-200"
                        style={{ backgroundColor: formData.brandColor }}
                      />
                    <p className="text-xs text-gray-600 mt-1 text-center">Primary</p>
                  </div>
                  <div className="flex-1">
                    <div
                        className="h-16 rounded-lg border border-gray-200"
                        style={{ backgroundColor: formData.brandSecondaryColor }}
                      />
                    <p className="text-xs text-gray-600 mt-1 text-center">Secondary</p>
                  </div>
                </div>
              </div>

                {/* Invoice Footer Preview */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Invoice Footer</p>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-700 italic text-center">
                      {formData.invoiceFooterText}
                  </p>
                </div>
              </div>

                {/* Currency Preview */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Default Currency</p>
                <div className="flex items-center justify-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-lg font-semibold" style={{ color: formData.brandColor }}>
                      {formData.defaultCurrency}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
          isOpen={isAdmin && showRemoveLogoConfirm}
          title="Remove Company Logo"
          message="Are you sure you want to remove your company logo? This action cannot be undone."
          confirmText="Remove"
          cancelText="Cancel"
          variant="danger"
          onConfirm={handleRemoveLogo}
          onCancel={() =>setShowRemoveLogoConfirm(false)}
        />
    </div>
    </>
  );

  if (embedded) return content;

  return (
    <RequireRole allowedRoles={['admin', 'finance_manager']}>
      {content}
    </RequireRole>
  );
};

export default CompanySettings;
