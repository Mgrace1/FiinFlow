import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import ConfirmModal from '../components/common/ConfirmModal';
import ChangePassword from './ChangePassword';
import CompanySettings from './CompanySettings';
import { useAuth } from '../contexts/AuthContext';
import { getErrorMessage, notifyError, notifySuccess } from '../utils/toast';


interface Company {
  name: string;
  email: string;
  phone: string;
  address: string;
  industry?: string;
  defaultCurrency: string;
  taxRate: number;
  exchangeRateUSD: number;
}

interface Workspace {
  userId: string;
  userName: string;
  role: string;
  companyId: string;
  companyName: string;
  companyEmail?: string;
  logoUrl?: string;
}

interface WorkspaceFormData {
  name: string;
  email: string;
  address: string;
  phone: string;
  industry: string;
  defaultCurrency: 'RWF' | 'USD';
  taxRate: number;
  exchangeRateUSD: number;
}


const Settings: React.FC = () =>{
  const { setAuth, companyId: activeCompanyId } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'company' | 'security' | 'branding' | 'workspaces'>('company');
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = useState<string | null>(null);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [workspaceForm, setWorkspaceForm] = useState<WorkspaceFormData>({
    name: '',
    email: '',
    address: '',
    phone: '',
    industry: '',
    defaultCurrency: 'RWF',
    taxRate: 18,
    exchangeRateUSD: 1300,
  });

  useEffect(() =>{
    fetchCompany();
    fetchWorkspaces();

    try {
      const rawUser = localStorage.getItem('finflow_user');
      const parsedUser = rawUser ? JSON.parse(rawUser) : null;
      const email = String(parsedUser?.email || '').trim().toLowerCase();
      if (email) {
        setCurrentUserEmail(email);
        setWorkspaceForm((prev) => ({ ...prev, email }));
      }
    } catch {
      // ignore malformed local user payload
    }
  }, []);

  const fetchCompany = async () =>{
    try {
      const response = await apiClient.get('/companies');
      if (response.data.success) {
        setCompany(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch company:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspaces = async () =>{
    try {
      const response = await apiClient.get('/auth/workspaces');
      if (response.data.success) {
        setWorkspaces(response.data.data || []);
      }
    } catch (error) {
      notifyError(getErrorMessage(error, 'Failed to load workspaces'));
    }
  };


  const handleUpdateCompany = async (e: React.FormEvent) =>{
    e.preventDefault();
    setSaveConfirm(true);
  };

  const confirmSave = async () =>{
    try {
      const response = await apiClient.put('/companies', company);
      if (response.data?.success && response.data?.data) {
        localStorage.setItem('finflow_company', JSON.stringify(response.data.data));
        setCompany(response.data.data);
      }
      notifySuccess('Company updated successfully');
      setSaveConfirm(false);
    } catch (error) {
      console.error('Failed to update company:', error);
      setSaveConfirm(false);
      notifyError(getErrorMessage(error, 'Failed to update company'));
    }
  };

  const handleSwitchWorkspace = async (workspaceCompanyId: string) =>{
    if (workspaceCompanyId === activeCompanyId) return;
    setSwitchingWorkspaceId(workspaceCompanyId);
    try {
      const response = await apiClient.post('/auth/switch-workspace', { companyId: workspaceCompanyId });
      if (response.data?.success) {
        const { token, user, company: selectedCompany } = response.data.data;

        localStorage.setItem('finflow_token', token);
        localStorage.setItem('finflow_companyId', String(user.companyId));
        localStorage.setItem('finflow_user', JSON.stringify(user));
        localStorage.setItem('finflow_company', JSON.stringify(selectedCompany));
        setAuth(token, String(user.companyId));
        notifySuccess(`Switched to ${selectedCompany.name}`);
        window.location.href = '/dashboard';
      }
    } catch (error) {
      notifyError(getErrorMessage(error, 'Failed to switch company'));
    } finally {
      setSwitchingWorkspaceId(null);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) =>{
    e.preventDefault();
    setCreatingWorkspace(true);
    try {
      const payload = {
        ...workspaceForm,
        name: workspaceForm.name.trim(),
        email: (currentUserEmail || workspaceForm.email).trim(),
        address: workspaceForm.address.trim(),
        phone: workspaceForm.phone.trim(),
        industry: workspaceForm.industry.trim(),
      };
      await apiClient.post('/auth/workspaces', payload);
      notifySuccess('New workspace created successfully');
      setWorkspaceForm({
        name: '',
        email: currentUserEmail || '',
        address: '',
        phone: '',
        industry: '',
        defaultCurrency: 'RWF',
        taxRate: 18,
        exchangeRateUSD: 1300,
      });
      fetchWorkspaces();
    } catch (error) {
      notifyError(getErrorMessage(error, 'Failed to create workspace'));
    } finally {
      setCreatingWorkspace(false);
    }
  };


  if (loading) return <div>Loading...</div>;

  return (
  <div>
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
      <p className="text-gray-600">Manage your account preferences and settings</p>
    </div>

    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
              onClick={() =>setActiveTab('company')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'company'
                  ? 'border-b-2 border-primary-500 text-primary-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Company Profile
          </button>
          <button
              onClick={() =>setActiveTab('security')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'security'
                  ? 'border-b-2 border-primary-500 text-primary-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Security
          </button>
          <button
              onClick={() =>setActiveTab('branding')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'branding'
                  ? 'border-b-2 border-primary-500 text-primary-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Branding
          </button>
          <button
              onClick={() =>setActiveTab('workspaces')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'workspaces'
                  ? 'border-b-2 border-primary-500 text-primary-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Workspaces
          </button>
        </nav>
      </div>

      <div className="p-6">
          {activeTab === 'company' && company && (
          <form onSubmit={handleUpdateCompany} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                    type="text"
                    value={company.name}
                    onChange={(e) =>setCompany({ ...company, name: e.target.value })}
                    className="input focus:ring-2 focus:ring-primary-500"
                  />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                    type="email"
                    value={company.email}
                    onChange={(e) =>setCompany({ ...company, email: e.target.value })}
                    className="input focus:ring-2 focus:ring-primary-500"
                  />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                    type="tel"
                    value={company.phone}
                    onChange={(e) =>setCompany({ ...company, phone: e.target.value })}
                    className="input"
                  />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <input
                    type="text"
                    value={company.industry || ''}
                    onChange={(e) =>setCompany({ ...company, industry: e.target.value })}
                    className="input"
                  />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                  value={company.address}
                  onChange={(e) =>setCompany({ ...company, address: e.target.value })}
                  className="input"
                  rows={3}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Currency</label>
                <select
                    value={company.defaultCurrency}
                    onChange={(e) =>setCompany({ ...company, defaultCurrency: e.target.value })}
                    className="input"
                  >
                  <option value="RWF">RWF</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                <input
                    type="number"
                    value={company.taxRate}
                    onChange={(e) =>setCompany({ ...company, taxRate: parseFloat(e.target.value) })}
                    className="input"
                  />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">USD Exchange Rate</label>
                <input
                    type="number"
                    value={company.exchangeRateUSD}
                    onChange={(e) =>setCompany({ ...company, exchangeRateUSD: parseFloat(e.target.value) })}
                    className="input"
                  />
              </div>
            </div>
            <button type="submit" className="btn btn-primary hover:bg-primary-600 transition-colors">
                Save Changes
            </button>
          </form>
          )}

          {activeTab === 'security' && (
            <ChangePassword />
          )}
          {activeTab === 'branding' && (
            <CompanySettings embedded />
          )}
          {activeTab === 'workspaces' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Switch Company Workspace</h3>
                  <p className="text-sm text-gray-600">
                    Use one email across multiple companies and choose which workspace to manage in this session.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateWorkspaceModal(true)}
                  className="btn btn-primary whitespace-nowrap"
                >
                  + Create New Workspace
                </button>
              </div>
              {workspaces.length === 0 ? (
                <p className="text-sm text-gray-500">No workspaces found for this email.</p>
              ) : (
                <div className="space-y-3">
                  {workspaces.map((workspace) => {
                    const isActive = String(activeCompanyId) === String(workspace.companyId);
                    const isSwitching = switchingWorkspaceId === workspace.companyId;
                    return (
                      <div
                        key={`${workspace.companyId}-${workspace.userId}`}
                        className={`flex items-center justify-between rounded-lg border p-4 ${
                          isActive ? 'border-primary-400 bg-primary-50' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {workspace.logoUrl ? (
                            <img
                              src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${workspace.logoUrl}`}
                              alt={workspace.companyName}
                              className="h-10 w-10 rounded-md border border-gray-200 object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-md border border-dashed border-gray-300 bg-gray-50" />
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">{workspace.companyName}</p>
                            <p className="text-xs text-gray-600">
                              Role: {workspace.role} {workspace.companyEmail ? `| ${workspace.companyEmail}` : ''}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSwitchWorkspace(workspace.companyId)}
                          disabled={isActive || isSwitching}
                          className={isActive ? 'btn btn-secondary' : 'btn btn-primary'}
                        >
                          {isActive ? 'Current' : isSwitching ? 'Switching...' : 'Switch'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
      </div>
    </div>

    {showCreateWorkspaceModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Create New Workspace</h3>
            <button
              onClick={() => setShowCreateWorkspaceModal(false)}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              &times;
            </button>
          </div>
          <form onSubmit={async (e) => { await handleCreateWorkspace(e); setShowCreateWorkspaceModal(false); }} className="p-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                type="text"
                className="input"
                placeholder="Company name"
                value={workspaceForm.name}
                onChange={(e) => setWorkspaceForm({ ...workspaceForm, name: e.target.value })}
                required
              />
              <input
                type="email"
                className="input cursor-not-allowed bg-gray-100 text-gray-600"
                placeholder="Workspace owner email"
                value={workspaceForm.email || currentUserEmail}
                readOnly
                disabled
                title="Uses your current logged-in email"
              />
              <input
                type="text"
                className="input"
                placeholder="Phone"
                value={workspaceForm.phone}
                onChange={(e) => setWorkspaceForm({ ...workspaceForm, phone: e.target.value })}
                required
              />
              <input
                type="text"
                className="input"
                placeholder="Industry"
                value={workspaceForm.industry}
                onChange={(e) => setWorkspaceForm({ ...workspaceForm, industry: e.target.value })}
              />
              <input
                type="text"
                className="input md:col-span-2"
                placeholder="Address"
                value={workspaceForm.address}
                onChange={(e) => setWorkspaceForm({ ...workspaceForm, address: e.target.value })}
                required
              />
              <select
                className="input"
                value={workspaceForm.defaultCurrency}
                onChange={(e) => setWorkspaceForm({ ...workspaceForm, defaultCurrency: e.target.value as 'RWF' | 'USD' })}
              >
                <option value="RWF">RWF</option>
                <option value="USD">USD</option>
              </select>
              <input
                type="number"
                className="input"
                placeholder="Tax rate (%)"
                value={workspaceForm.taxRate}
                onChange={(e) => setWorkspaceForm({ ...workspaceForm, taxRate: Number(e.target.value || 0) })}
              />
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateWorkspaceModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={creatingWorkspace}>
                {creatingWorkspace ? 'Creating...' : 'Create Workspace'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    <ConfirmModal
        isOpen={saveConfirm}
        title="Save Changes"
        message="Are you sure you want to save these changes to your company profile?"
        confirmText="Save"
        cancelText="Cancel"
        variant="primary"
        onConfirm={confirmSave}
        onCancel={() =>setSaveConfirm(false)}
      />
  </div>
  );
};

export default Settings;
