import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import ConfirmModal from '../components/common/ConfirmModal';
import EmptyState from '../components/common/EmptyState';
import Badge from '../components/common/Badge';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { useLanguage } from '../contexts/LanguageContext';
import { formatDateDMY } from '../utils/formatDate';
import { getErrorMessage, notifyError, notifySuccess } from '../utils/toast';
import { FaPen, FaTrash, FaPaperPlane } from 'react-icons/fa';
import { getPasswordRuleKey, validateStrongPassword } from '../utils/password';
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
  const { t } = useLanguage();
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
          setError(t('password.error_strong'));
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
        notifySuccess(t('team.updated_success'));
      } else {
        if (!passwordValidation.isValid) {
          setError(t('password.error_strong'));
          return;
        }
        await apiClient.post('/users', formData);
        notifySuccess(t('team.created_success'));
      }
      fetchMembers();
      closeModal();
    } catch (error: any) {
      console.error('Failed to save team member:', error);
      const message = getErrorMessage(error, t('team.save_error'));
      setError(message);
      notifyError(message);
    }
  };

  const handleDelete = async () =>{
    if (!deleteConfirm.memberId) return;
    try {
      await apiClient.delete(`/users/${deleteConfirm.memberId}`);
      notifySuccess(t('team.removed_success'));
      fetchMembers();
      setDeleteConfirm({ show: false, memberId: null });
    } catch (error) {
      console.error('Failed to delete team member:', error);
      notifyError(getErrorMessage(error, t('team.delete_error')));
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) =>{
    e.preventDefault();
    setInviteError('');

    try {
      await apiClient.post('/users/invite', inviteFormData);
      notifySuccess(t('team.invite_success'));
      fetchMembers();
      closeInviteModal();
    } catch (error: any) {
      console.error('Failed to invite user:', error);
      const message = getErrorMessage(error, t('team.invite_error'));
      setInviteError(message);
      notifyError(message);
    }
  };

  const handleResendInvite = async (userId: string) =>{
    try {
      await apiClient.post(`/users/${userId}/resend-invite`);
      notifySuccess(t('team.resend_success'));
    } catch (error: any) {
      console.error('Failed to resend invite:', error);
      const message = getErrorMessage(error, t('team.resend_error'));
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
      super_admin: t('team.role_super_admin'),
      admin: t('team.role_admin'),
      finance_manager: t('team.role_finance_manager'),
      staff: t('team.role_staff'),
    };
    return labels[role] || role;
  };

  const getStatusLabel = (status: string) =>{
    const labels: any = {
      pending: t('team.status_pending'),
      active: t('team.status_active'),
      suspended: t('team.status_suspended'),
    };
    return labels[status] || status;
  };

  if (loading) return <LoadingOverlay message={t('team.loading')} />;

  return (
  <div>
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('team.title')}</h1>
        <p className="text-xs text-gray-600 mt-0.5">{t('team.subtitle')}</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={() =>openInviteModal()} className="btn btn-primary text-sm px-3 py-2">
            {t('team.invite_user')}
        </button>
        <button onClick={() =>openModal()} className="btn btn-secondary text-sm px-3 py-2">
            {t('team.add_member')}
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
              <p className="text-gray-600">{t('team.role_label')}</p>
              <Badge variant={
                  member.role === 'admin' ? 'overdue' :
                  member.role === 'finance_manager' ? 'sent' :
                  'draft'
                }>
                  {getRoleLabel(member.role)}
              </Badge>
            </div>
            <div>
              <p className="text-gray-600">{t('team.joined_label')}</p>
              <p className="font-bold">{formatDateDMY(member.createdAt)}</p>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-x-4">
              {member.status === 'pending' ? (
              <>
                <button
                    onClick={() =>handleResendInvite(member._id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary-500 transition hover:bg-primary-50 hover:text-primary-700"
                    title={t('team.resend_invite')}
                    aria-label={t('team.resend_invite')}
                  >
                    <FaPaperPlane className="text-sm" />
                </button>
                {isAdmin && (
                  <button
                      onClick={() =>setDeleteConfirm({ show: true, memberId: member._id })}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50 hover:text-red-700"
                      title={t('team.cancel_invite')}
                      aria-label={t('team.cancel_invite')}
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
                    title={t('common.edit')}
                    aria-label={t('team.edit_member')}
                  >
                    <FaPen className="text-sm" />
                </button>
                {isAdmin && (
                  <button
                      onClick={() =>setDeleteConfirm({ show: true, memberId: member._id })}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50 hover:text-red-700"
                      title={t('team.remove_member')}
                      aria-label={t('team.remove_member')}
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

    <div className="hidden md:block bg-white rounded-lg shadow overflow-x-auto">
      <table className="w-full min-w-[860px] divide-y divide-gray-200 table-fixed">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-[18%]">{t('team.table_name')}</th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-[22%]">{t('team.table_email')}</th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-[14%]">{t('team.table_phone')}</th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-[16%]">{t('team.table_role')}</th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-[11%]">{t('team.table_status')}</th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-[12%]">{t('team.table_joined')}</th>
            <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase w-[7%]">{t('common.actions')}</th>
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
                  {member.phone || t('common.na')}
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
                        title={t('team.resend_invite')}
                        aria-label={t('team.resend_invite')}
                      >
                        <FaPaperPlane className="text-xs" />
                    </button>
                    {isAdmin && (
                      <button
                          onClick={() =>setDeleteConfirm({ show: true, memberId: member._id })}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50 hover:text-red-700"
                          title={t('team.cancel_invite')}
                          aria-label={t('team.cancel_invite')}
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
                        title={t('common.edit')}
                        aria-label={t('team.edit_member')}
                      >
                        <FaPen className="text-xs" />
                    </button>
                    {isAdmin && (
                      <button
                          onClick={() =>setDeleteConfirm({ show: true, memberId: member._id })}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50 hover:text-red-700"
                          title={t('team.remove_member')}
                          aria-label={t('team.remove_member')}
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
            title={t('team.empty_title')}
            subtitle={t('team.empty_subtitle')}
            action={{
              label: t('team.add_team_member'),
              onClick: () =>openModal(),
            }}
          />
        )}
    </div>

      {showModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4">
              {editingMember ? t('team.edit_title') : t('team.add_title')}
          </h2>
            {error && (
            <div className="bg-red-50 border border-red-500 text-red-700 px-4 py-3 rounded mb-4">
                {error}
            </div>
            )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('team.name_label')}</label>
              <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>setFormData({ ...formData, name: e.target.value })}
                  required
                  className="input"
                  placeholder={t('team.name_placeholder')}
                />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('team.email_label')}</label>
              <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>setFormData({ ...formData, email: e.target.value })}
                  required
                  className="input"
                  placeholder={t('team.email_placeholder')}
                />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingMember ? t('team.password_edit_label') : t('team.password_new_label')}
              </label>
              <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>setFormData({ ...formData, password: e.target.value })}
                  required={!editingMember}
                  className="input"
                  placeholder={editingMember ? t('team.password_edit_placeholder') : t('team.password_new_placeholder')}
                  minLength={8}
                />
              {formData.password && (
                <div className="mt-2 space-y-1">
                  {passwordValidation.rules.map((rule) => (
                    <p
                      key={rule.label}
                      className={`text-xs ${rule.passed ? 'text-primary-600' : 'text-gray-500'}`}
                    >
                      {rule.passed ? '?' : '•'} {t(getPasswordRuleKey(rule.label))}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('team.phone_label')}</label>
              <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                  placeholder={t('team.phone_placeholder')}
                />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('team.role_label')}</label>
              <select
                  value={formData.role}
                  onChange={(e) =>setFormData({ ...formData, role: e.target.value as any })}
                  required
                  className="input"
                >
                <option value="staff">{t('team.role_staff_desc')}</option>
                <option value="finance_manager">{t('team.role_finance_manager_desc')}</option>
                <option value="admin">{t('team.role_admin_desc')}</option>
                {currentRole === 'super_admin' && (
                  <option value="super_admin">{t('team.role_super_admin_desc')}</option>
                )}
              </select>
            </div>
            <div className="flex space-x-3">
              <button type="submit" className="btn btn-primary flex-1">
                  {editingMember ? t('team.update') : t('team.add_member')}
              </button>
              <button type="button" onClick={closeModal} className="btn btn-secondary flex-1">
                  {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      </div>
      )}

      {showInviteModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4">{t('team.invite_title')}</h2>
          <p className="text-sm text-gray-600 mb-4">
              {t('team.invite_subtitle')}
          </p>
            {inviteError && (
            <div className="bg-red-50 border border-red-500 text-red-700 px-4 py-3 rounded mb-4">
                {inviteError}
            </div>
            )}
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('team.name_label')}</label>
              <input
                  type="text"
                  value={inviteFormData.name}
                  onChange={(e) =>setInviteFormData({ ...inviteFormData, name: e.target.value })}
                  required
                  className="input"
                  placeholder={t('team.name_placeholder')}
                />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('team.email_label')}</label>
              <input
                  type="email"
                  value={inviteFormData.email}
                  onChange={(e) =>setInviteFormData({ ...inviteFormData, email: e.target.value })}
                  required
                  className="input"
                  placeholder={t('team.email_placeholder')}
                />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('team.role_label')}</label>
              <select
                  value={inviteFormData.role}
                  onChange={(e) =>setInviteFormData({ ...inviteFormData, role: e.target.value as any })}
                  required
                  className="input"
                >
                <option value="staff">{t('team.role_staff_desc')}</option>
                <option value="finance_manager">{t('team.role_finance_manager_desc')}</option>
                <option value="admin">{t('team.role_admin_desc')}</option>
                {currentRole === 'super_admin' && (
                  <option value="super_admin">{t('team.role_super_admin_desc')}</option>
                )}
              </select>
            </div>
            <div className="bg-primary-50 border border-primary-200 rounded p-3">
              <p className="text-xs text-primary-800">
                  {t('team.invite_note')}
              </p>
            </div>
            <div className="flex space-x-3">
              <button type="submit" className="btn btn-primary flex-1">
                  {t('team.send_invite')}
              </button>
              <button type="button" onClick={closeInviteModal} className="btn btn-secondary flex-1">
                  {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      </div>
      )}

    <ConfirmModal
        isOpen={isAdmin && deleteConfirm.show}
        title={t('team.remove_title')}
        message={t('team.remove_message')}
        confirmText={t('team.remove_confirm')}
        cancelText={t('common.cancel')}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() =>setDeleteConfirm({ show: false, memberId: null })}
      />
  </div>
  );
};

export default TeamMembers;

