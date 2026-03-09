import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import ConfirmModal from '../components/common/ConfirmModal';
import EmptyState from '../components/common/EmptyState';
import Badge from '../components/common/Badge';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { formatDateDMY } from '../utils/formatDate';
import { getErrorMessage, notifyError, notifySuccess } from '../utils/toast';
import { FaPen, FaTrash, FaPaperPlane } from 'react-icons/fa';
import { strongPasswordErrorMessage, validateStrongPassword } from '../utils/password';
import { getUserRole } from '../utils/roleUtils';

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'super_admin' | 'admin' | 'finance_manager' | 'staff';
  status: 'pending' | 'active' | 'suspended';
  invitedAt?: string;
  invitedBy?: string;
  createdAt: string;
}

const TeamMembers: React.FC = () =>{
  const currentRole = getUserRole();
  const isAdmin = currentRole === 'admin' || currentRole === 'super_admin';
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; memberId: string | null }>({
    show: false,
    memberId: null,
  });
  const [error, setError] = useState<string>('');
  const [inviteError, setInviteError] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'staff' as 'super_admin' | 'admin' | 'finance_manager' | 'staff',
  });
  const [inviteFormData, setInviteFormData] = useState({
    name: '',
    email: '',
    role: 'staff' as 'super_admin' | 'admin' | 'finance_manager' | 'staff',
  });
  const passwordValidation = validateStrongPassword(formData.password);

  useEffect(() =>{
    fetchMembers();
  }, []);

  const fetchMembers = async () =>{
    try {
      const response = await apiClient.get('/users');
      if (response.data.success) {
        setMembers(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) =>{
    e.preventDefault();
    setError('');

    try {
      if (editingMember) {
        if (formData.password && !passwordValidation.isValid) {
          setError(strongPasswordErrorMessage);
          return;
        }
        // For update, only send password if it's not empty
        const updateData: any = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await apiClient.put(`/users/${editingMember._id}`, updateData);
        notifySuccess('Team member updated successfully');
      } else {
        if (!passwordValidation.isValid) {
          setError(strongPasswordErrorMessage);
          return;
        }
        await apiClient.post('/users', formData);
        notifySuccess('Team member added successfully');
      }
      fetchMembers();
      closeModal();
    } catch (error: any) {
      console.error('Failed to save team member:', error);
      const message = getErrorMessage(error, 'Failed to save team member. Please try again.');
      setError(message);
      notifyError(message);
    }
  };

  const handleDelete = async () =>{
    if (!deleteConfirm.memberId) return;
    try {
      await apiClient.delete(`/users/${deleteConfirm.memberId}`);
      notifySuccess('Team member removed successfully');
      fetchMembers();
      setDeleteConfirm({ show: false, memberId: null });
    } catch (error) {
      console.error('Failed to delete team member:', error);
      notifyError(getErrorMessage(error, 'Failed to delete team member'));
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) =>{
    e.preventDefault();
    setInviteError('');

    try {
      await apiClient.post('/users/invite', inviteFormData);
      notifySuccess('User invited successfully. Invitation email sent.');
      fetchMembers();
      closeInviteModal();
    } catch (error: any) {
      console.error('Failed to invite user:', error);
      const message = getErrorMessage(error, 'Failed to invite user. Please try again.');
      setInviteError(message);
      notifyError(message);
    }
  };

  const handleResendInvite = async (userId: string) =>{
    try {
      await apiClient.post(`/users/${userId}/resend-invite`);
      notifySuccess('Invitation email resent successfully');
    } catch (error: any) {
      console.error('Failed to resend invite:', error);
      const message = getErrorMessage(error, 'Failed to resend invitation. Please try again.');
      setError(message);
      notifyError(message);
    }
  };

  const openModal = (member?: TeamMember) =>{
    if (member) {
      setEditingMember(member);
      setFormData({
        name: member.name,
        email: member.email,
        password: '', 
        phone: member.phone || '',
        role: member.role,
      });
    } else {
      setEditingMember(null);
      resetForm();
    }
    setShowModal(true);
  };

  const closeModal = () =>{
    setShowModal(false);
    setEditingMember(null);
    setError('');
    resetForm();
  };

  const openInviteModal = () =>{
    setShowInviteModal(true);
  };

  const closeInviteModal = () =>{
    setShowInviteModal(false);
    setInviteError('');
    resetInviteForm();
  };

  const resetForm = () =>{
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'staff',
    });
  };

  const resetInviteForm = () =>{
    setInviteFormData({
      name: '',
      email: '',
      role: 'staff',
    });
  };

  const getRoleLabel = (role: string) =>{
    const labels: any = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      finance_manager: 'Finance Manager',
      staff: 'Staff',
    };
    return labels[role] || role;
  };

  const getStatusLabel = (status: string) =>{
    const labels: any = {
      pending: 'Pending',
      active: 'Active',
      suspended: 'Suspended',
    };
    return labels[status] || status;
  };

  if (loading) return <LoadingOverlay message="Loading team members..." />;

  return (
  <div>
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
        <p className="text-xs text-gray-600 mt-0.5">Manage users who have access to your company workspace</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={() =>openInviteModal()} className="btn btn-primary text-sm px-3 py-2">
            + Invite User
        </button>
        <button onClick={() =>openModal()} className="btn btn-secondary text-sm px-3 py-2">
            + Add Member
        </button>
      </div>
    </div>

    <div className="md:hidden space-y-4">
        {members.map((member) => (
        <div key={member._id} className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold text-lg">{member.name}</p>
              <p className="text-gray-600">{member.email}</p>
            </div>
            <Badge variant={
                member.status === 'active' ? 'paid' :
                member.status === 'pending' ? 'pending' :
                'cancelled'
              }>
                {getStatusLabel(member.status)}
            </Badge>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <div>
              <p className="text-gray-600">Role</p>
              <Badge variant={
                  member.role === 'admin' ? 'overdue' :
                  member.role === 'finance_manager' ? 'sent' :
                  'draft'
                }>
                  {getRoleLabel(member.role)}
              </Badge>
            </div>
            <div>
              <p className="text-gray-600">Joined</p>
              <p className="font-bold">{formatDateDMY(member.createdAt)}</p>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-x-4">
              {member.status === 'pending' ? (
              <>
                <button
                    onClick={() =>handleResendInvite(member._id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary-500 transition hover:bg-primary-50 hover:text-primary-700"
                    title="Resend invite"
                    aria-label="Resend invite"
                  >
                    <FaPaperPlane className="text-sm" />
                </button>
                {isAdmin && (
                  <button
                      onClick={() =>setDeleteConfirm({ show: true, memberId: member._id })}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-danger-500 transition hover:bg-red-50 hover:text-danger-700"
                      title="Cancel invite"
                      aria-label="Cancel invite"
                    >
                      <FaTrash className="text-sm" />
                  </button>
                )}
              </>
              ) : (
              <>
                <button
                    onClick={() =>openModal(member)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary-500 transition hover:bg-primary-50 hover:text-primary-700"
                    title="Edit"
                    aria-label="Edit member"
                  >
                    <FaPen className="text-sm" />
                </button>
                {isAdmin && (
                  <button
                      onClick={() =>setDeleteConfirm({ show: true, memberId: member._id })}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-danger-500 transition hover:bg-red-50 hover:text-danger-700"
                      title="Remove"
                      aria-label="Remove member"
                    >
                      <FaTrash className="text-sm" />
                  </button>
                )}
              </>
              )}
          </div>
        </div>
        ))}
    </div>

    <div className="hidden md:block bg-white rounded-lg shadow">
      <table className="w-full divide-y divide-gray-200 table-fixed">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-[18%]">Name</th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-[22%]">Email</th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-[14%]">Phone</th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-[16%]">Role</th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-[11%]">Status</th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-[12%]">Joined</th>
            <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase w-[7%]">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
            {members.map((member) =>(
            <tr key={member._id} className="hover:bg-gray-50">
              <td className="px-3 py-2.5 text-sm font-medium text-gray-900 truncate">
                  {member.name}
              </td>
              <td className="px-3 py-2.5 text-sm text-gray-900 truncate">
                  {member.email}
              </td>
              <td className="px-3 py-2.5 text-sm text-gray-500 truncate">
                  {member.phone || '—'}
              </td>
              <td className="px-3 py-2.5">
                <Badge variant={
                    member.role === 'admin' ? 'overdue' :
                    member.role === 'finance_manager' ? 'sent' :
                    'draft'
                  }>
                    {getRoleLabel(member.role)}
                </Badge>
              </td>
              <td className="px-3 py-2.5">
                <Badge variant={
                    member.status === 'active' ? 'paid' :
                    member.status === 'pending' ? 'pending' :
                    'cancelled'
                  }>
                    {getStatusLabel(member.status)}
                </Badge>
              </td>
              <td className="px-3 py-2.5 text-sm text-gray-900 whitespace-nowrap">
                  {formatDateDMY(member.createdAt)}
              </td>
              <td className="px-3 py-2.5 text-right">
                <div className="flex items-center justify-end gap-1">
                  {member.status === 'pending' ? (
                  <>
                    <button
                        onClick={() =>handleResendInvite(member._id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-primary-500 transition hover:bg-primary-50 hover:text-primary-700"
                        title="Resend invite"
                        aria-label="Resend invite"
                      >
                        <FaPaperPlane className="text-xs" />
                    </button>
                    {isAdmin && (
                      <button
                          onClick={() =>setDeleteConfirm({ show: true, memberId: member._id })}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-danger-500 transition hover:bg-red-50 hover:text-danger-700"
                          title="Cancel invite"
                          aria-label="Cancel invite"
                        >
                          <FaTrash className="text-xs" />
                      </button>
                    )}
                  </>
                  ) : (
                  <>
                    <button
                        onClick={() =>openModal(member)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-primary-500 transition hover:bg-primary-50 hover:text-primary-700"
                        title="Edit"
                        aria-label="Edit member"
                      >
                        <FaPen className="text-xs" />
                    </button>
                    {isAdmin && (
                      <button
                          onClick={() =>setDeleteConfirm({ show: true, memberId: member._id })}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-danger-500 transition hover:bg-red-50 hover:text-danger-700"
                          title="Remove"
                          aria-label="Remove member"
                        >
                          <FaTrash className="text-xs" />
                      </button>
                    )}
                  </>
                  )}
                </div>
              </td>
            </tr>
            ))}
        </tbody>
      </table>
        {members.length === 0 && (
        <EmptyState
            icon=""
            title="No team members yet"
            subtitle="Invite or add team members to collaborate on your workspace"
            action={{
              label: '+ Add Team Member',
              onClick: () =>openModal(),
            }}
          />
        )}
    </div>

      {showModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4">
              {editingMember ? 'Edit Team Member' : 'Add Team Member'}
          </h2>
            {error && (
            <div className="bg-danger-50 border border-danger-500 text-danger-700 px-4 py-3 rounded mb-4">
                {error}
            </div>
            )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>setFormData({ ...formData, name: e.target.value })}
                  required
                  className="input"
                  placeholder="John Doe"
                />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>setFormData({ ...formData, email: e.target.value })}
                  required
                  className="input"
                  placeholder="john@example.com"
                />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editingMember ? '(leave blank to keep current)' : '*'}
              </label>
              <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>setFormData({ ...formData, password: e.target.value })}
                  required={!editingMember}
                  className="input"
                  placeholder={editingMember ? 'Enter new password' : 'Create a strong password'}
                  minLength={8}
                />
              {formData.password && (
                <div className="mt-2 space-y-1">
                  {passwordValidation.rules.map((rule) => (
                    <p
                      key={rule.label}
                      className={`text-xs ${rule.passed ? 'text-success-500' : 'text-gray-500'}`}
                    >
                      {rule.passed ? '✓' : '•'} {rule.label}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                  placeholder="+250 XXX XXX XXX"
                />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select
                  value={formData.role}
                  onChange={(e) =>setFormData({ ...formData, role: e.target.value as any })}
                  required
                  className="input"
                >
                <option value="staff">Staff - Can create drafts only</option>
                <option value="finance_manager">Finance Manager - Full access to invoices/expenses</option>
                <option value="admin">Admin - Full system access</option>
                {currentRole === 'super_admin' && (
                  <option value="super_admin">Super Admin - Global system access</option>
                )}
              </select>
            </div>
            <div className="flex space-x-3">
              <button type="submit" className="btn btn-primary flex-1">
                  {editingMember ? 'Update' : 'Add Member'}
              </button>
              <button type="button" onClick={closeModal} className="btn btn-secondary flex-1">
                  Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
      )}

      {showInviteModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4">Invite User</h2>
          <p className="text-sm text-gray-600 mb-4">
              Send an invitation email to a new user. They will receive a link to set their password and join your workspace.
          </p>
            {inviteError && (
            <div className="bg-danger-50 border border-danger-500 text-danger-700 px-4 py-3 rounded mb-4">
                {inviteError}
            </div>
            )}
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                  type="text"
                  value={inviteFormData.name}
                  onChange={(e) =>setInviteFormData({ ...inviteFormData, name: e.target.value })}
                  required
                  className="input"
                  placeholder="John Doe"
                />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                  type="email"
                  value={inviteFormData.email}
                  onChange={(e) =>setInviteFormData({ ...inviteFormData, email: e.target.value })}
                  required
                  className="input"
                  placeholder="john@example.com"
                />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select
                  value={inviteFormData.role}
                  onChange={(e) =>setInviteFormData({ ...inviteFormData, role: e.target.value as any })}
                  required
                  className="input"
                >
                <option value="staff">Staff - Can create drafts only</option>
                <option value="finance_manager">Finance Manager - Full access to invoices/expenses</option>
                <option value="admin">Admin - Full system access</option>
                {currentRole === 'super_admin' && (
                  <option value="super_admin">Super Admin - Global system access</option>
                )}
              </select>
            </div>
            <div className="bg-primary-50 border border-primary-200 rounded p-3">
              <p className="text-xs text-primary-800">
                  The user will receive an email with a secure link to set their password. The link will be valid for 7 days.
              </p>
            </div>
            <div className="flex space-x-3">
              <button type="submit" className="btn btn-primary flex-1">
                  Send Invitation
              </button>
              <button type="button" onClick={closeInviteModal} className="btn btn-secondary flex-1">
                  Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
      )}

    <ConfirmModal
        isOpen={isAdmin && deleteConfirm.show}
        title="Remove Team Member"
        message="Are you sure you want to remove this team member? They will lose access to this workspace."
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() =>setDeleteConfirm({ show: false, memberId: null })}
      />
  </div>
  );
};

export default TeamMembers;
