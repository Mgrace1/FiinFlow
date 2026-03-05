import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

interface IngestionFormData {
  source: 'manual' | 'gmail' | 'sms';
  directionHint: 'unknown' | 'incoming' | 'outgoing';
  channelIdentifier: string;
  subject: string;
  messageText: string;
  dryRun: boolean;
}


const Settings: React.FC = () =>{
  const navigate = useNavigate();
  const { setAuth, companyId: activeCompanyId } = useAuth();
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
  const [submittingAlert, setSubmittingAlert] = useState(false);
  const [connectionForm, setConnectionForm] = useState({
    channel: 'gmail' as 'gmail' | 'sms_forward',
    identifier: '',
    displayName: '',
  });
  const [ingestionForm, setIngestionForm] = useState<IngestionFormData>({
    source: 'manual',
    directionHint: 'unknown',
    channelIdentifier: '',
    subject: '',
    messageText: '',
    dryRun: true,
  });

  useEffect(() =>{
    fetchCompany();
    fetchWorkspaces();

    try {
      const rawUser = localStorage.getItem('finflow_user');
      const parsedUser = rawUser ? JSON.parse(rawUser) : null;
      const email = String(parsedUser?.email || '').trim().toLowerCase();
      setIsAdmin(String(parsedUser?.role || '').toLowerCase() === 'admin');
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
        navigate('/dashboard', { replace: true });
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

  const fetchIngestionConnections = async () => {
    setConnectionsLoading(true);
    try {
      const response = await apiClient.get('/payment-ingestion/connections');
      if (response.data?.success) {
        setConnections(response.data.data || []);
      }
    } catch (error) {
      notifyError(getErrorMessage(error, 'Failed to load payment ingestion connections'));
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
      notifyError(getErrorMessage(error, 'Failed to load ingestion events'));
    } finally {
      setEventsLoading(false);
    }
  };

  const askDeleteWorkspace = (workspace: Workspace) => {
    if (String(workspace.companyId) === String(activeCompanyId)) {
      notifyError('You cannot delete the current active workspace.');
      return;
    }
    setDeleteWorkspaceConfirm({ show: true, workspace });
  };

  const confirmDeleteWorkspace = async () => {
    const workspace = deleteWorkspaceConfirm.workspace;
    if (!workspace) return;
    if (String(workspace.companyId) === String(activeCompanyId)) {
      notifyError('You cannot delete the current active workspace.');
      setDeleteWorkspaceConfirm({ show: false, workspace: null });
      return;
    }

    setDeletingWorkspaceId(workspace.companyId);
    try {
      await apiClient.delete(`/companies/${workspace.companyId}`);
      notifySuccess(`Workspace "${workspace.companyName}" deleted successfully`);
      setDeleteWorkspaceConfirm({ show: false, workspace: null });
      fetchWorkspaces();
    } catch (error) {
      notifyError(getErrorMessage(error, 'Failed to delete workspace'));
    } finally {
      setDeletingWorkspaceId(null);
    }
  };

  const handleCreateConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectionForm.identifier.trim()) {
      notifyError('Identifier is required');
      return;
    }

    setCreatingConnection(true);
    try {
      await apiClient.post('/payment-ingestion/connections', {
        channel: connectionForm.channel,
        identifier: connectionForm.identifier.trim(),
        displayName: connectionForm.displayName.trim() || undefined,
      });
      notifySuccess('Payment ingestion connection added');
      setConnectionForm({ channel: 'gmail', identifier: '', displayName: '' });
      fetchIngestionConnections();
    } catch (error) {
      notifyError(getErrorMessage(error, 'Failed to create payment ingestion connection'));
    } finally {
      setCreatingConnection(false);
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    setDeletingConnectionId(connectionId);
    try {
      await apiClient.delete(`/payment-ingestion/connections/${connectionId}`);
      notifySuccess('Connection deleted');
      fetchIngestionConnections();
    } catch (error) {
      notifyError(getErrorMessage(error, 'Failed to delete connection'));
    } finally {
      setDeletingConnectionId(null);
    }
  };

  const handleSubmitIngestionAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestionForm.messageText.trim()) {
      notifyError('Message text is required');
      return;
    }

    setSubmittingAlert(true);
    try {
      const response = await apiClient.post('/payment-ingestion/alerts', {
        source: ingestionForm.source,
        directionHint: ingestionForm.directionHint,
        channelIdentifier: ingestionForm.channelIdentifier.trim() || undefined,
        subject: ingestionForm.subject.trim() || undefined,
        messageText: ingestionForm.messageText.trim(),
        dryRun: ingestionForm.dryRun,
      });

      const status = String(response.data?.data?.status || '').toLowerCase();
      if (status === 'processed') {
        notifySuccess('Alert processed and payment applied');
      } else if (status === 'ignored') {
        notifyError('Alert parsed but no matching invoice/expense found');
      } else if (status === 'duplicate') {
        notifyError('Duplicate alert ignored');
      } else {
        notifySuccess('Alert ingested');
      }

      fetchIngestionEvents();
    } catch (error) {
      notifyError(getErrorMessage(error, 'Failed to ingest payment alert'));
    } finally {
      setSubmittingAlert(false);
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
          {isAdmin && (
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
          )}
          {isAdmin && (
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
          )}
          {isAdmin && (
            <button
                onClick={() =>setActiveTab('payments')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'payments'
                    ? 'border-b-2 border-primary-500 text-primary-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Payment Alerts
            </button>
          )}
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
          {isAdmin && activeTab === 'branding' && (
            <CompanySettings embedded />
          )}
          {isAdmin && activeTab === 'workspaces' && (
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSwitchWorkspace(workspace.companyId)}
                            disabled={isActive || isSwitching || deletingWorkspaceId === workspace.companyId}
                            className={isActive ? 'btn btn-secondary' : 'btn btn-primary'}
                          >
                            {isActive ? 'Current' : isSwitching ? 'Switching...' : 'Switch'}
                          </button>
                          <button
                            onClick={() => askDeleteWorkspace(workspace)}
                            disabled={isActive || deletingWorkspaceId === workspace.companyId}
                            className={isActive ? 'btn btn-secondary' : 'btn btn-danger'}
                            title={isActive ? 'Cannot delete current workspace' : 'Delete workspace'}
                          >
                            {deletingWorkspaceId === workspace.companyId ? 'Deleting...' : isActive ? 'Cannot Delete' : 'Delete'}
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
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <form onSubmit={handleCreateConnection} className="rounded-lg border border-gray-200 p-4">
                  <h3 className="mb-1 text-lg font-semibold text-gray-900">Connect Mailbox or SMS Forward</h3>
                  <p className="mb-4 text-sm text-gray-600">
                    Add a mailbox address or SMS-forward sender to enable payment alert ingestion.
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
                      placeholder={connectionForm.channel === 'gmail' ? 'alerts@yourcompany.com' : 'Sender phone or identifier'}
                      value={connectionForm.identifier}
                      onChange={(e) => setConnectionForm({ ...connectionForm, identifier: e.target.value })}
                      required
                    />
                    <input
                      type="text"
                      className="input"
                      placeholder="Display name (optional)"
                      value={connectionForm.displayName}
                      onChange={(e) => setConnectionForm({ ...connectionForm, displayName: e.target.value })}
                    />
                    <button type="submit" className="btn btn-primary w-full" disabled={creatingConnection}>
                      {creatingConnection ? 'Saving...' : 'Add Connection'}
                    </button>
                  </div>
                </form>

                <form onSubmit={handleSubmitIngestionAlert} className="rounded-lg border border-gray-200 p-4">
                  <h3 className="mb-1 text-lg font-semibold text-gray-900">Manual Alert Ingestion</h3>
                  <p className="mb-4 text-sm text-gray-600">
                    Paste a payment alert from email/SMS and let the system detect and apply payment.
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <select
                        className="input"
                        value={ingestionForm.source}
                        onChange={(e) => setIngestionForm({ ...ingestionForm, source: e.target.value as 'manual' | 'gmail' | 'sms' })}
                      >
                        <option value="manual">Manual</option>
                        <option value="gmail">Gmail</option>
                        <option value="sms">SMS</option>
                      </select>
                      <select
                        className="input"
                        value={ingestionForm.directionHint}
                        onChange={(e) => setIngestionForm({ ...ingestionForm, directionHint: e.target.value as 'unknown' | 'incoming' | 'outgoing' })}
                      >
                        <option value="unknown">Direction: Unknown</option>
                        <option value="incoming">Incoming</option>
                        <option value="outgoing">Outgoing</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      className="input"
                      placeholder="Channel identifier (optional)"
                      value={ingestionForm.channelIdentifier}
                      onChange={(e) => setIngestionForm({ ...ingestionForm, channelIdentifier: e.target.value })}
                    />
                    <input
                      type="text"
                      className="input"
                      placeholder="Subject (optional)"
                      value={ingestionForm.subject}
                      onChange={(e) => setIngestionForm({ ...ingestionForm, subject: e.target.value })}
                    />
                    <textarea
                      className="input min-h-[120px]"
                      placeholder="Paste full payment alert text"
                      value={ingestionForm.messageText}
                      onChange={(e) => setIngestionForm({ ...ingestionForm, messageText: e.target.value })}
                      required
                    />
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={ingestionForm.dryRun}
                        onChange={(e) => setIngestionForm({ ...ingestionForm, dryRun: e.target.checked })}
                      />
                      Dry run (parse and match only, do not update invoice/expense)
                    </label>
                    <button type="submit" className="btn btn-primary w-full" disabled={submittingAlert}>
                      {submittingAlert ? 'Processing...' : 'Ingest Alert'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="rounded-lg border border-gray-200">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                  <h3 className="text-lg font-semibold text-gray-900">Connected Sources</h3>
                  <button onClick={fetchIngestionConnections} className="btn btn-secondary" disabled={connectionsLoading}>
                    {connectionsLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
                <div className="p-4">
                  {connectionsLoading ? (
                    <p className="text-sm text-gray-500">Loading connections...</p>
                  ) : connections.length === 0 ? (
                    <p className="text-sm text-gray-500">No mailbox or SMS forwarding connections yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {connections.map((connection) => (
                        <div key={connection._id} className="flex items-center justify-between rounded-md border border-gray-200 p-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              {connection.displayName || connection.identifier}
                            </p>
                            <p className="text-xs text-gray-600">
                              {connection.channel === 'gmail' ? 'Gmail' : 'SMS Forward'} | {connection.identifier}
                            </p>
                          </div>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleDeleteConnection(connection._id)}
                            disabled={deletingConnectionId === connection._id}
                          >
                            {deletingConnectionId === connection._id ? 'Removing...' : 'Remove'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Ingestion Events</h3>
                  <button onClick={fetchIngestionEvents} className="btn btn-secondary" disabled={eventsLoading}>
                    {eventsLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
                <div className="max-h-96 overflow-auto p-4">
                  {eventsLoading ? (
                    <p className="text-sm text-gray-500">Loading events...</p>
                  ) : events.length === 0 ? (
                    <p className="text-sm text-gray-500">No ingestion events yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {events.map((event) => (
                        <div key={event._id} className="rounded-md border border-gray-200 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900">
                              {String(event.source || '').toUpperCase()} | {event.status}
                            </p>
                            <p className="text-xs text-gray-500">
                              {event.createdAt ? new Date(event.createdAt).toLocaleString() : ''}
                            </p>
                          </div>
                          {event.subject && (
                            <p className="mt-1 text-sm text-gray-700">Subject: {event.subject}</p>
                          )}
                          <p className="mt-1 line-clamp-2 text-sm text-gray-600">{event.messageText}</p>
                          {event.errorMessage && (
                            <p className="mt-1 text-xs text-red-600">Error: {event.errorMessage}</p>
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
    <ConfirmModal
        isOpen={deleteWorkspaceConfirm.show}
        title="Delete Workspace"
        message={`Are you sure you want to delete "${deleteWorkspaceConfirm.workspace?.companyName || 'this workspace'}"? This will permanently remove all its data and cannot be undone.`}
        confirmText="Delete Workspace"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDeleteWorkspace}
        onCancel={() => setDeleteWorkspaceConfirm({ show: false, workspace: null })}
      />
  </div>
  );
};

export default Settings;
