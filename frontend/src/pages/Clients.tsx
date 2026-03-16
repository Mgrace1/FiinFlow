import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import ConfirmModal from '../components/common/ConfirmModal';
import LoadingOverlay from '../components/common/LoadingOverlay';
import EmptyDocumentState from '../components/common/EmptyDocumentState';
import { useLanguage } from '../contexts/LanguageContext';
import { getErrorMessage, notifyError, notifySuccess } from '../utils/toast';
import { FaEye, FaPen, FaTrash } from 'react-icons/fa';
import { getUserRole } from '../utils/roleUtils';

interface Client {
  _id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
}

const Clients: React.FC = () =>{
  const navigate = useNavigate();
  const role = getUserRole();
  const isAdmin = role === 'admin' || role === 'super_admin';
  const { t } = useLanguage();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; clientId: string | null }>({
    show: false,
    clientId: null,
  });
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
  });

  useEffect(() =>{
    fetchClients();
  }, []);

  const fetchClients = async () =>{
    try {
      const response = await apiClient.get('/clients');
      if (response.data.success) {
        setClients(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) =>{
    e.preventDefault();
    setError('');

    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      const message = t('clients.phone_validation');
      setError(message);
      notifyError(message);
      return;
    }

    try {
      if (editingClient) {
        await apiClient.put(`/clients/${editingClient._id}`, formData);
        notifySuccess(t('clients.updated_success'));
      } else {
        await apiClient.post('/clients', formData);
        notifySuccess(t('clients.created_success'));
      }
      fetchClients();
      closeModal();
    } catch (error: any) {
      console.error('Failed to save client:', error);
      const message = getErrorMessage(error, t('clients.save_error'));
      setError(message);
      notifyError(message);
    }
  };

  const handleDelete = async () =>{
    if (!deleteConfirm.clientId) return;

    try {
      await apiClient.delete(`/clients/${deleteConfirm.clientId}`);
      fetchClients();
      setDeleteConfirm({ show: false, clientId: null });
      notifySuccess(t('clients.deleted_success'));
    } catch (error) {
      console.error('Failed to delete client:', error);
      notifyError(getErrorMessage(error, t('clients.delete_error')));
    }
  };

  const openModal = (client?: Client) =>{
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        contactPerson: client.contactPerson,
        phone: client.phone,
        email: client.email,
        address: client.address,
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () =>{
    setShowModal(false);
    setEditingClient(null);
    setError('');
  };

  if (loading) {
    return <LoadingOverlay message={t('clients.loading')} />;
  }

  return (
  <div>
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      <h1 className="text-3xl font-bold text-gray-900">{t('clients.title')}</h1>
      {clients.length > 0 && (
        <button onClick={() =>openModal()} className="btn btn-primary w-full md:w-auto">
            {t('clients.add_client')}
        </button>
      )}
    </div>

    {clients.length === 0 ? (
      <EmptyDocumentState
        title={t('clients.empty_title')}
        subtitle={t('clients.empty_subtitle')}
        buttonLabel={t('clients.add_client')}
        onAction={() => openModal()}
      />
    ) : (
      <>
        {/* Client Cards for mobile */}
        <div className="md:hidden space-y-4">
          {clients.map((client) => (
            <div key={client._id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-lg">{client.name}</p>
                  <p className="text-gray-600">{client.contactPerson}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-gray-600">{t('clients.email_label')}: {client.email}</p>
                <p className="text-gray-600">{t('clients.phone_label')}: {client.phone}</p>
              </div>
              <div className="mt-4 flex justify-end gap-x-4">
                <button
                  onClick={() => navigate(`/clients/${client._id}`)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                  title={t('common.view')}
                  aria-label={t('clients.view_client')}
                >
                  <FaEye className="text-sm" />
                </button>
                <button
                  onClick={() =>openModal(client)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary-500 transition hover:bg-primary-50 hover:text-primary-700"
                  title={t('common.edit')}
                  aria-label={t('clients.edit_client')}
                >
                  <FaPen className="text-sm" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() =>setDeleteConfirm({ show: true, clientId: client._id })}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 transition hover:bg-red-100 hover:text-red-600"
                    title={t('common.delete')}
                    aria-label={t('clients.delete_client')}
                  >
                    <FaTrash className="text-sm" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Client Table for desktop */}
        <div className="hidden md:block bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('clients.table_name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('clients.table_contact')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('clients.table_email')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('clients.table_phone')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map((client) =>(
                <tr key={client._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{client.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{client.contactPerson}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{client.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{client.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => navigate(`/clients/${client._id}`)}
                      className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                      title={t('common.view')}
                      aria-label={t('clients.view_client')}
                    >
                      <FaEye className="text-sm" />
                    </button>
                    <button
                      onClick={() =>openModal(client)}
                      className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-primary-500 transition hover:bg-primary-50 hover:text-primary-700"
                      title={t('common.edit')}
                      aria-label={t('clients.edit_client')}
                    >
                      <FaPen className="text-sm" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() =>setDeleteConfirm({ show: true, clientId: client._id })}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 transition hover:bg-red-100 hover:text-red-600"
                        title={t('common.delete')}
                        aria-label={t('clients.delete_client')}
                      >
                        <FaTrash className="text-sm" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )}

      {/* Modal */}
      {showModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4">
              {editingClient ? t('clients.edit_title') : t('clients.add_title')}
          </h2>
            {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
                {error}
            </div>
            )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('clients.form_company_name')}
              </label>
              <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>setFormData({ ...formData, name: e.target.value })}
                  required
                  className="input"
                />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('clients.form_contact')}
              </label>
              <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) =>setFormData({ ...formData, contactPerson: e.target.value })}
                  required
                  className="input"
                />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('clients.form_email')}
              </label>
              <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>setFormData({ ...formData, email: e.target.value })}
                  required
                  className="input"
                />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('clients.form_phone')}
              </label>
              <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>setFormData({ ...formData, phone: e.target.value })}
                  minLength={10}
                  required
                  className="input"
                  title={t('clients.phone_validation')}
                />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('clients.form_address')}
              </label>
              <textarea
                  value={formData.address}
                  onChange={(e) =>setFormData({ ...formData, address: e.target.value })}
                  required
                  className="input"
                  rows={3}
                />
            </div>
            <div className="flex space-x-3">
              <button type="submit" className="btn btn-primary flex-1">
                  {editingClient ? t('clients.update') : t('clients.create')}
              </button>
              <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-secondary flex-1"
                >
                  {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      </div>
      )}

      {/* Delete Confirmation Modal */}
    <ConfirmModal
        isOpen={isAdmin && deleteConfirm.show}
        title={t('clients.delete_title')}
        message={t('clients.delete_message')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() =>setDeleteConfirm({ show: false, clientId: null })}
      />
  </div>
  );
};

export default Clients;


