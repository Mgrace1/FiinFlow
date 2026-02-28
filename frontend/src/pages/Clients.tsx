import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import ConfirmModal from '../components/common/ConfirmModal';
import LoadingOverlay from '../components/common/LoadingOverlay';
import EmptyDocumentState from '../components/common/EmptyDocumentState';
import { getErrorMessage, notifyError, notifySuccess } from '../utils/toast';
import { FaEye, FaPen, FaTrash } from 'react-icons/fa';

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

    try {
      if (editingClient) {
        await apiClient.put(`/clients/${editingClient._id}`, formData);
        notifySuccess('Client updated successfully');
      } else {
        await apiClient.post('/clients', formData);
        notifySuccess('Client created successfully');
      }
      fetchClients();
      closeModal();
    } catch (error: any) {
      console.error('Failed to save client:', error);
      const message = getErrorMessage(error, 'Failed to save client. Please try again.');
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
      notifySuccess('Client deleted successfully');
    } catch (error) {
      console.error('Failed to delete client:', error);
      notifyError(getErrorMessage(error, 'Failed to delete client'));
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
    return <LoadingOverlay message="Loading clients..." />;
  }

  return (
  <div>
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
      {clients.length > 0 && (
        <button onClick={() =>openModal()} className="btn btn-primary w-full md:w-auto">
            + Add Client
        </button>
      )}
    </div>

    {clients.length === 0 ? (
      <EmptyDocumentState
        title="No clients yet"
        subtitle="Add your first client to start creating invoices"
        buttonLabel="+ Add Client"
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
                <p className="text-gray-600">Email: {client.email}</p>
                <p className="text-gray-600">Phone: {client.phone}</p>
              </div>
              <div className="mt-4 flex justify-end gap-x-4">
                <button
                  onClick={() => navigate(`/clients/${client._id}`)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                  title="View"
                  aria-label="View client"
                >
                  <FaEye className="text-sm" />
                </button>
                <button
                  onClick={() =>openModal(client)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary-500 transition hover:bg-primary-50 hover:text-primary-700"
                  title="Edit"
                  aria-label="Edit client"
                >
                  <FaPen className="text-sm" />
                </button>
                <button
                  onClick={() =>setDeleteConfirm({ show: true, clientId: client._id })}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-danger-500 transition hover:bg-red-50 hover:text-danger-700"
                  title="Delete"
                  aria-label="Delete client"
                >
                  <FaTrash className="text-sm" />
                </button>
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
                    Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Person
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
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
                      title="View"
                      aria-label="View client"
                    >
                      <FaEye className="text-sm" />
                    </button>
                    <button
                      onClick={() =>openModal(client)}
                      className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-primary-500 transition hover:bg-primary-50 hover:text-primary-700"
                      title="Edit"
                      aria-label="Edit client"
                    >
                      <FaPen className="text-sm" />
                    </button>
                    <button
                      onClick={() =>setDeleteConfirm({ show: true, clientId: client._id })}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-danger-500 transition hover:bg-red-50 hover:text-danger-700"
                      title="Delete"
                      aria-label="Delete client"
                    >
                      <FaTrash className="text-sm" />
                    </button>
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
              {editingClient ? 'Edit Client' : 'Add New Client'}
          </h2>
            {error && (
            <div className="bg-danger-50 border border-danger-500 text-danger-700 px-4 py-3 rounded mb-4">
                {error}
            </div>
            )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
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
                  Contact Person *
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
                  Email *
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
                  Phone *
              </label>
              <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>setFormData({ ...formData, phone: e.target.value })}
                  required
                  className="input"
                />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
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
                  {editingClient ? 'Update' : 'Create'}
              </button>
              <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
      )}

      {/* Delete Confirmation Modal */}
    <ConfirmModal
        isOpen={deleteConfirm.show}
        title="Delete Client"
        message="Are you sure you want to delete this client? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() =>setDeleteConfirm({ show: false, clientId: null })}
      />
  </div>
  );
};

export default Clients;
