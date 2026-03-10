import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import ConfirmModal from '../components/common/ConfirmModal';
import ChangePassword from './ChangePassword';
import CompanySettings from './CompanySettings';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getUserRole } from '../utils/roleUtils';
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

interface PaymentIngestionConnection {
  _id: string;
  channel: 'gmail' | 'sms_forward';
  identifier: string;
  displayName?: string;
  isActive: boolean;
  createdAt?: string;
}

interface PaymentIngestionEvent {
  _id: string;
  source: 'gmail' | 'sms' | 'manual';
  channelIdentifier?: string;
  status: 'received' | 'processed' | 'ignored' | 'duplicate' | 'failed';
  subject?: string;
  messageText: string;
  createdAt?: string;
  parsed?: any;
  match?: any;
  errorMessage?: string;
}

interface UserProfile {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
}

const Settings: React.FC = () =>{
  const navigate = useNavigate();
  const { setAuth, companyId: activeCompanyId } = useAuth();
  const { t } = useLanguage();
  const [company, setCompany] = useState<Company | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'company' | 'security' | 'branding' | 'workspaces' | 'payments'>('company');
  const [isAdmin, setIsAdmin] = useState(false);
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [deleteWorkspaceConfirm, setDeleteWorkspaceConfirm] = useState<{ show: boolean; workspace: Workspace | null }>({
    show: false,
    workspace: null,
  });
  const [deletingWorkspaceId, setDeletingWorkspaceId] = useState<string | null>(null);
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = useState<string | null>(null);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
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
  const [connections, setConnections] = useState<PaymentIngestionConnection[]>([]);
  const [events, setEvents] = useState<PaymentIngestionEvent[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [creatingConnection, setCreatingConnection] = useState(false);
  const [deletingConnectionId, setDeletingConnectionId] = useState<string | null>(null);
  const [connectionForm, setConnectionForm] = useState({
    channel: 'gmail' as 'gmail' | 'sms_forward',
    identifier: '',
    displayName: '',
  });

  useEffect(() =>{
    fetchCompany();
    fetchWorkspaces();
    fetchCurrentUser();

    try {
      const rawUser = localStorage.getItem('finflow_user');
      const parsedUser = rawUser ? JSON.parse(rawUser) : null;
      const email = String(parsedUser?.email || '').trim().toLowerCase();
      setIsAdmin(getUserRole() === 'admin' || getUserRole() === 'super_admin');
      if (email) {
        setCurrentUserEmail(email);
        setWorkspaceForm((prev) => ({ ...prev, email }));
      }
    } catch {
      // ignore malformed local user payload
    }
  }, []);

  useEffect(() => {
    if (!isAdmin && (activeTab === 'branding' || activeTab === 'workspaces' || activeTab === 'payments')) {
      setActiveTab('company');
    }
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (isAdmin && activeTab === 'payments') {
      fetchIngestionConnections();
      fetchIngestionEvents();
    }
  }, [isAdmin, activeTab]);

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

  const fetchCurrentUser = async () => {
    try {
      const response = await apiClient.get('/users/me');
      if (response.data?.success) {
        setCurrentUser(response.data.data);
      }
    } catch {
      try {
        const rawUser = localStorage.getItem('finflow_user');
        const parsedUser = rawUser ? JSON.parse(rawUser) : null;
        if (parsedUser) setCurrentUser(parsedUser);
      } catch {
        setCurrentUser(null);
      }
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
      notifySuccess(t('settings.company_updated'));
      setSaveConfirm(false);
    } catch (error) {
      console.error('Failed to update company:', error);
      setSaveConfirm(false);
      notifyError(getErrorMessage(error, t('settings.company_update_error')));
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
        notifySuccess(`${t('settings.switched_to')} ${selectedCompany.name}`);
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      notifyError(getErrorMessage(error, t('settings.switch_error')));
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
      notifySuccess(t('settings.workspace_created'));
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
      notifyError(getErrorMessage(error, t('settings.workspace_create_error')));
    } finally {
      setCreatingWorkspace(false);
    }
  };

  const fetchIngestionConnections = async () => {
    setConnectionsLoading(true);
    try {
      const response = await apiClient.get('/payment-ingestion/connections');
      if (response.data?.success) {
        setConnections(response.data.data || []);
      }
    } catch (error) {
      notifyError(getErrorMessage(error, t('settings.payments_load_connections_error')));
    } finally {
      setConnectionsLoading(false);
    }
  };

  const fetchIngestionEvents = async () => {
    setEventsLoading(true);
    try {
      const response = await apiClient.get('/payment-ingestion/events?limit=20');
      if (response.data?.success) {
        setEvents(response.data.data || []);
      }
    } catch (error) {
      notifyError(getErrorMessage(error, t('settings.payments_load_events_error')));
    } finally {
      setEventsLoading(false);
    }
  };

  const askDeleteWorkspace = (workspace: Workspace) => {
    if (String(workspace.companyId) === String(activeCompanyId)) {
      notifyError(t('settings.workspace_delete_active_error'));
      return;
    }
    setDeleteWorkspaceConfirm({ show: true, workspace });
  };

  const confirmDeleteWorkspace = async () => {
    const workspace = deleteWorkspaceConfirm.workspace;
    if (!workspace) return;
    if (String(workspace.companyId) === String(activeCompanyId)) {
      notifyError(t('settings.workspace_delete_active_error'));
      setDeleteWorkspaceConfirm({ show: false, workspace: null });
      return;
    }

    setDeletingWorkspaceId(workspace.companyId);
    try {
      await apiClient.delete(`/companies/${workspace.companyId}`);
      notifySuccess(`${t('settings.workspace_deleted')} "${workspace.companyName}"`);
      setDeleteWorkspaceConfirm({ show: false, workspace: null });
      fetchWorkspaces();
    } catch (error) {
      notifyError(getErrorMessage(error, t('settings.workspace_delete_error')));
    } finally {
      setDeletingWorkspaceId(null);
    }
  };

  const handleCreateConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectionForm.identifier.trim()) {
      notifyError(t('settings.identifier_required'));
      return;
    }

    setCreatingConnection(true);
    try {
      await apiClient.post('/payment-ingestion/connections', {
        channel: connectionForm.channel,
        identifier: connectionForm.identifier.trim(),
        displayName: connectionForm.displayName.trim() || undefined,
      });
      notifySuccess(t('settings.connection_added'));
      setConnectionForm({ channel: 'gmail', identifier: '', displayName: '' });
      fetchIngestionConnections();
    } catch (error) {
      notifyError(getErrorMessage(error, t('settings.connection_create_error')));
    } finally {
      setCreatingConnection(false);
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    setDeletingConnectionId(connectionId);
    try {
      await apiClient.delete(`/payment-ingestion/connections/${connectionId}`);
      notifySuccess(t('settings.connection_deleted'));
      fetchIngestionConnections();
    } catch (error) {
      notifyError(getErrorMessage(error, t('settings.connection_delete_error')));
    } finally {
      setDeletingConnectionId(null);
    }
  };


  if (loading) return <div>{t('settings.loading')}</div>;

  return (
  <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6">
    <div className="mb-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('settings.title')}</h1>
      <p className="text-gray-600 dark:text-gray-400">{t('settings.subtitle')}</p>
    </div>

    <div className="bg-white dark:bg-gray-900 rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex -mb-px overflow-x-auto whitespace-nowrap">
          <button
              onClick={() =>setActiveTab('company')}
              className={`px-4 sm:px-6 py-4 text-sm font-medium ${
                activeTab === 'company'
                  ? 'border-b-2 border-primary-500 text-primary-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {isAdmin ? t('settings.tab_company') : t('settings.tab_profile')}
          </button>
          <button
              onClick={() =>setActiveTab('security')}
              className={`px-4 sm:px-6 py-4 text-sm font-medium ${
                activeTab === 'security'
                  ? 'border-b-2 border-primary-500 text-primary-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t('settings.tab_security')}
          </button>
          {isAdmin && (
            <button
                onClick={() =>setActiveTab('branding')}
              className={`px-4 sm:px-6 py-4 text-sm font-medium ${
                  activeTab === 'branding'
                    ? 'border-b-2 border-primary-500 text-primary-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t('settings.tab_branding')}
            </button>
          )}
          {isAdmin && (
            <button
                onClick={() =>setActiveTab('workspaces')}
                className={`px-4 sm:px-6 py-4 text-sm font-medium ${
                  activeTab === 'workspaces'
                    ? 'border-b-2 border-primary-500 text-primary-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t('settings.tab_workspaces')}
            </button>
          )}
          {isAdmin && (
            <button
                onClick={() =>setActiveTab('payments')}
                className={`px-4 sm:px-6 py-4 text-sm font-medium ${
                  activeTab === 'payments'
                    ? 'border-b-2 border-primary-500 text-primary-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t('settings.tab_payments')}
            </button>
          )}
        </nav>
      </div>

      <div className="p-4 sm:p-6">
          {activeTab === 'company' && isAdmin && company && (
          <form onSubmit={handleUpdateCompany} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.company_name')}</label>
                <input
                    type="text"
                    value={company.name}
                    onChange={(e) =>setCompany({ ...company, name: e.target.value })}
                    className="input focus:ring-2 focus:ring-primary-500"
                  />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('common.email')}</label>
                <input
                    type="email"
                    value={company.email}
                    onChange={(e) =>setCompany({ ...company, email: e.target.value })}
                    className="input focus:ring-2 focus:ring-primary-500"
                  />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('common.phone')}</label>
                <input
                    type="tel"
                    value={company.phone}
                    onChange={(e) =>setCompany({ ...company, phone: e.target.value })}
                    className="input"
                  />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.industry')}</label>
                <input
                    type="text"
                    value={company.industry || ''}
                    onChange={(e) =>setCompany({ ...company, industry: e.target.value })}
                    className="input"
                  />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('common.address')}</label>
              <textarea
                  value={company.address}
                  onChange={(e) =>setCompany({ ...company, address: e.target.value })}
                  className="input"
                  rows={3}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.default_currency')}</label>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.tax_rate')}</label>
                <input
                    type="number"
                    value={company.taxRate}
                    onChange={(e) =>setCompany({ ...company, taxRate: parseFloat(e.target.value) })}
                    className="input"
                  />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.usd_exchange_rate')}</label>
                <input
                    type="number"
                    value={company.exchangeRateUSD}
                    onChange={(e) =>setCompany({ ...company, exchangeRateUSD: parseFloat(e.target.value) })}
                    className="input"
                  />
              </div>
            </div>
            <button type="submit" className="btn btn-primary hover:bg-primary-600 transition-colors">
                {t('settings.save_changes')}
            </button>
          </form>
          )}
          {activeTab === 'company' && !isAdmin && (
            <div className="max-w-2xl space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('settings.profile_title')}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.profile_subtitle')}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('common.name')}</label>
                  <input
                    type="text"
                    value={currentUser?.name || ''}
                    readOnly
                    disabled
                    className="input bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('common.email')}</label>
                  <input
                    type="email"
                    value={currentUser?.email || currentUserEmail}
                    readOnly
                    disabled
                    className="input bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('common.phone')}</label>
                  <input
                    type="text"
                    value={currentUser?.phone || ''}
                    readOnly
                    disabled
                    className="input bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('common.role')}</label>
                  <input
                    type="text"
                    value={currentUser?.role || ''}
                    readOnly
                    disabled
                    className="input bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('common.status')}</label>
                  <input
                    type="text"
                    value={currentUser?.status || ''}
                    readOnly
                    disabled
                    className="input bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <ChangePassword />
          )}
          {isAdmin && activeTab === 'branding' && (
            <CompanySettings embedded />
          )}
          {isAdmin && activeTab === 'workspaces' && (
            <div>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('settings.workspaces_title')}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('settings.workspaces_subtitle')}
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateWorkspaceModal(true)}
                  className="btn btn-primary whitespace-nowrap"
                >
                  {t('settings.create_workspace')}
                </button>
              </div>
              {workspaces.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.no_workspaces')}</p>
              ) : (
                <div className="space-y-3">
                  {workspaces.map((workspace) => {
                    const isActive = String(activeCompanyId) === String(workspace.companyId);
                    const isSwitching = switchingWorkspaceId === workspace.companyId;
                    return (
                      <div
                        key={`${workspace.companyId}-${workspace.userId}`}
                        className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border p-4 ${
                          isActive ? 'border-primary-400 bg-primary-50 dark:border-gray-600 dark:bg-gray-800' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {workspace.logoUrl ? (
                            <img
                              src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${workspace.logoUrl}`}
                              alt={workspace.companyName}
                              className="h-10 w-10 rounded-md border border-gray-200 dark:border-gray-700 object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-md border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800" />
                          )}
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{workspace.companyName}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {t('settings.workspace_role')}: {workspace.role} {workspace.companyEmail ? `| ${workspace.companyEmail}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                          <button
                            onClick={() => handleSwitchWorkspace(workspace.companyId)}
                            disabled={isActive || isSwitching || deletingWorkspaceId === workspace.companyId}
                            className={isActive ? 'btn btn-secondary' : 'btn btn-primary'}
                          >
                            {isActive ? t('settings.workspace_current') : isSwitching ? t('settings.workspace_switching') : t('settings.workspace_switch')}
                          </button>
                          <button
                            onClick={() => askDeleteWorkspace(workspace)}
                            disabled={isActive || deletingWorkspaceId === workspace.companyId}
                            className={isActive ? 'btn btn-secondary' : 'btn btn-danger'}
                            title={isActive ? t('settings.workspace_delete_disabled') : t('settings.workspace_delete')}
                          >
                            {deletingWorkspaceId === workspace.companyId ? t('settings.workspace_deleting') : isActive ? t('settings.workspace_cannot_delete') : t('common.delete')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {isAdmin && activeTab === 'payments' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-6">
                <form onSubmit={handleCreateConnection} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{t('settings.payments_connect_title')}</h3>
                  <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    {t('settings.payments_connect_subtitle')}
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    <select
                      className="input"
                      value={connectionForm.channel}
                      onChange={(e) => setConnectionForm({ ...connectionForm, channel: e.target.value as 'gmail' | 'sms_forward' })}
                    >
                      <option value="gmail">Gmail</option>
                      <option value="sms_forward">SMS Forward</option>
                    </select>
                    <input
                      type="text"
                      className="input"
                      placeholder={connectionForm.channel === 'gmail' ? t('settings.payments_placeholder_gmail') : t('settings.payments_placeholder_sms')}
                      value={connectionForm.identifier}
                      onChange={(e) => setConnectionForm({ ...connectionForm, identifier: e.target.value })}
                      required
                    />
                    <input
                      type="text"
                      className="input"
                      placeholder={t('settings.payments_display_name')}
                      value={connectionForm.displayName}
                      onChange={(e) => setConnectionForm({ ...connectionForm, displayName: e.target.value })}
                    />
                    <button type="submit" className="btn btn-primary w-full" disabled={creatingConnection}>
                      {creatingConnection ? t('settings.payments_saving') : t('settings.payments_add_connection')}
                    </button>
                  </div>
                </form>
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('settings.payments_connected')}</h3>
                  <button onClick={fetchIngestionConnections} className="btn btn-secondary" disabled={connectionsLoading}>
                    {connectionsLoading ? t('settings.payments_refreshing') : t('settings.payments_refresh')}
                  </button>
                </div>
                <div className="p-4">
                  {connectionsLoading ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.payments_loading_connections')}</p>
                  ) : connections.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.payments_none')}</p>
                  ) : (
                    <div className="space-y-2">
                      {connections.map((connection) => (
                        <div key={connection._id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-md border border-gray-200 dark:border-gray-700 p-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {connection.displayName || connection.identifier}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {connection.channel === 'gmail' ? 'Gmail' : 'SMS Forward'} | {connection.identifier}
                            </p>
                          </div>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleDeleteConnection(connection._id)}
                            disabled={deletingConnectionId === connection._id}
                          >
                            {deletingConnectionId === connection._id ? t('settings.payments_removing') : t('settings.payments_remove')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('settings.payments_events_title')}</h3>
                  <button onClick={fetchIngestionEvents} className="btn btn-secondary" disabled={eventsLoading}>
                    {eventsLoading ? t('settings.payments_refreshing') : t('settings.payments_refresh')}
                  </button>
                </div>
                <div className="max-h-96 overflow-auto p-4">
                  {eventsLoading ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.payments_loading_events')}</p>
                  ) : events.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.payments_no_events')}</p>
                  ) : (
                    <div className="space-y-2">
                      {events.map((event) => (
                        <div key={event._id} className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {String(event.source || '').toUpperCase()} | {event.status}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {event.createdAt ? new Date(event.createdAt).toLocaleString() : ''}
                            </p>
                          </div>
                          {event.subject && (
                            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{t('settings.payments_subject')}: {event.subject}</p>
                          )}
                          <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{event.messageText}</p>
                          {event.errorMessage && (
                            <p className="mt-1 text-xs text-red-600">{t('settings.payments_error')}: {event.errorMessage}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
      </div>
    </div>

    {showCreateWorkspaceModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-lg shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('settings.create_workspace_title')}</h3>
            <button
              onClick={() => setShowCreateWorkspaceModal(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
            >
              &times;
            </button>
          </div>
          <form onSubmit={async (e) => { await handleCreateWorkspace(e); setShowCreateWorkspaceModal(false); }} className="p-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                type="text"
                className="input"
                placeholder={t('settings.workspace_company_name')}
                value={workspaceForm.name}
                onChange={(e) => setWorkspaceForm({ ...workspaceForm, name: e.target.value })}
                required
              />
              <input
                type="email"
                className="input cursor-not-allowed bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                placeholder={t('settings.workspace_owner_email')}
                value={workspaceForm.email || currentUserEmail}
                readOnly
                disabled
                title={t('settings.workspace_owner_hint')}
              />
              <input
                type="text"
                className="input"
                placeholder={t('common.phone')}
                value={workspaceForm.phone}
                onChange={(e) => setWorkspaceForm({ ...workspaceForm, phone: e.target.value })}
                required
              />
              <input
                type="text"
                className="input"
                placeholder={t('settings.industry')}
                value={workspaceForm.industry}
                onChange={(e) => setWorkspaceForm({ ...workspaceForm, industry: e.target.value })}
              />
              <input
                type="text"
                className="input md:col-span-2"
                placeholder={t('common.address')}
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
                placeholder={t('settings.tax_rate')}
                value={workspaceForm.taxRate}
                onChange={(e) => setWorkspaceForm({ ...workspaceForm, taxRate: Number(e.target.value || 0) })}
              />
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateWorkspaceModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium"
              >
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary" disabled={creatingWorkspace}>
                {creatingWorkspace ? t('settings.workspace_creating') : t('settings.create_workspace')}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    <ConfirmModal
        isOpen={saveConfirm}
        title={t('settings.save_title')}
        message={t('settings.save_message')}
        confirmText={t('common.save')}
        cancelText={t('common.cancel')}
        variant="primary"
        onConfirm={confirmSave}
        onCancel={() =>setSaveConfirm(false)}
      />
    <ConfirmModal
        isOpen={deleteWorkspaceConfirm.show}
        title={t('settings.delete_workspace_title')}
        message={`${t('settings.delete_workspace_message')} "${deleteWorkspaceConfirm.workspace?.companyName || t('settings.this_workspace')}". ${t('settings.delete_workspace_warning')}`}
        confirmText={t('settings.delete_workspace_confirm')}
        cancelText={t('common.cancel')}
        variant="danger"
        onConfirm={confirmDeleteWorkspace}
        onCancel={() => setDeleteWorkspaceConfirm({ show: false, workspace: null })}
      />
  </div>
  );
};

export default Settings;
