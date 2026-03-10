import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import ConfirmModal from '../components/common/ConfirmModal';
import { FaPen, FaTrash } from 'react-icons/fa';
import { getErrorMessage, notifyError, notifySuccess } from '../utils/toast';
import { strongPasswordErrorMessage, validateStrongPassword } from '../utils/password';
interface PlatformCompany {
  _id: string;
  name: string;
  email: string;
  address: string;
  phone: string;
  industry?: string;
  defaultCurrency: 'RWF' | 'USD' | 'EUR';
  exchangeRateUSD: number;
  taxRate: number;
  createdAt: string;
}

interface CompanyFormData {
  name: string;
  email: string;
  address: string;
  phone: string;
  industry: string;
  defaultCurrency: 'RWF' | 'USD';
  exchangeRateUSD: number;
  taxRate: number;
  companyPassword: string;
  companyPasswordConfirm: string;
}

interface PlatformUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'super_admin' | 'admin' | 'finance_manager' | 'staff';
  status: 'pending' | 'active' | 'suspended';
  isActive: boolean;
  createdAt: string;
  companyId?: {
    _id: string;
    name?: string;
    email?: string;
  } | string;
}

interface UserFormData {
  companyId: string;
  name: string;
  email: string;
  phone: string;
  role: 'super_admin' | 'admin' | 'finance_manager' | 'staff';
  password: string;
}

const initialCompanyForm: CompanyFormData = {
  name: '',
  email: '',
  address: '',
  phone: '',
  industry: '',
  defaultCurrency: 'RWF',
  exchangeRateUSD: 1300,
  taxRate: 18,
  companyPassword: '',
  companyPasswordConfirm: '',
};

const initialUserForm: UserFormData = {
  companyId: '',
  name: '',
  email: '',
  phone: '',
  role: 'staff',
  password: '',
};

const tabClass = (active: boolean) =>
  `rounded-lg px-4 py-2 text-sm font-semibold transition ${
    active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
  }`;

const PlatformAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'companies' | 'users'>('companies');

  const [companies, setCompanies] = useState<PlatformCompany[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companySaving, setCompanySaving] = useState(false);
  const [companyDeletingId, setCompanyDeletingId] = useState<string | null>(null);
  const [editingCompany, setEditingCompany] = useState<PlatformCompany | null>(null);
  const [companyForm, setCompanyForm] = useState<CompanyFormData>(initialCompanyForm);
  const [deleteCompanyConfirm, setDeleteCompanyConfirm] = useState<{ show: boolean; company: PlatformCompany | null }>({
    show: false,
    company: null,
  });

  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSaving, setUserSaving] = useState(false);
  const [userDeletingId, setUserDeletingId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  const [userForm, setUserForm] = useState<UserFormData>(initialUserForm);
  const [deleteUserConfirm, setDeleteUserConfirm] = useState<{ show: boolean; user: PlatformUser | null }>({
    show: false,
    user: null,
  });

  const passwordValidation = useMemo(() => validateStrongPassword(userForm.password), [userForm.password]);
  const companyAdminPasswordValidation = useMemo(
    () => validateStrongPassword(companyForm.companyPassword),
    [companyForm.companyPassword]
  );

  const fetchCompanies = async () => {
    setCompaniesLoading(true);
    try {
      const response = await apiClient.get('/platform/companies');
      if (response.data?.success) {
        setCompanies(response.data.data || []);
      }
    } catch (error) {
      notifyError(getErrorMessage(error, 'Failed to load companies'));
    } finally {
      setCompaniesLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await apiClient.get('/platform/users');
      if (response.data?.success) {
        setUsers(response.data.data || []);
      }
    } catch (error) {
      notifyError(getErrorMessage(error, 'Failed to load users'));
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchUsers();
  }, []);

  const resetCompanyForm = () => {
    setCompanyForm(initialCompanyForm);
    setEditingCompany(null);
  };

  const submitCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanySaving(true);
    try {
      if (editingCompany) {
        await apiClient.put(`/platform/companies/${editingCompany._id}`, {
          name: companyForm.name,
          email: companyForm.email,
          address: companyForm.address,
          phone: companyForm.phone,
          industry: companyForm.industry,
          defaultCurrency: companyForm.defaultCurrency,
          exchangeRateUSD: companyForm.exchangeRateUSD,
          taxRate: companyForm.taxRate,
        });
        notifySuccess('Company updated successfully');
      } else {
        if (!companyForm.companyPassword) {
          notifyError('Company login password is required');
          setCompanySaving(false);
          return;
        }
        if (!companyAdminPasswordValidation.isValid) {
          notifyError(strongPasswordErrorMessage);
          setCompanySaving(false);
          return;
        }
        if (companyForm.companyPassword !== companyForm.companyPasswordConfirm) {
          notifyError('Password and confirm password do not match');
          setCompanySaving(false);
          return;
        }

        await apiClient.post('/platform/companies', {
          name: companyForm.name,
          email: companyForm.email,
          address: companyForm.address,
          phone: companyForm.phone,
          industry: companyForm.industry,
          defaultCurrency: companyForm.defaultCurrency,
          exchangeRateUSD: companyForm.exchangeRateUSD,
          taxRate: companyForm.taxRate,
          adminName: companyForm.name || 'Company Admin',
          adminEmail: companyForm.email.trim(),
          adminPassword: companyForm.companyPassword,
        });
        notifySuccess('Company created successfully');
      }
      resetCompanyForm();
      fetchCompanies();
    } catch (error) {
      notifyError(getErrorMessage(error, 'Failed to save company'));
    } finally {
      setCompanySaving(false);
    }
  };

  const startEditCompany = (company: PlatformCompany) => {
    setEditingCompany(company);
    setCompanyForm({
      name: company.name,
      email: company.email,
      address: company.address,
      phone: company.phone,
      industry: company.industry || '',
      defaultCurrency: company.defaultCurrency === 'USD' ? 'USD' : 'RWF',
      exchangeRateUSD: Number(company.exchangeRateUSD || 1300),
      taxRate: Number(company.taxRate || 18),
      companyPassword: '',
      companyPasswordConfirm: '',
    });
  };

  const deleteCompany = async () => {
    if (!deleteCompanyConfirm.company) return;
    const companyId = deleteCompanyConfirm.company._id;
    setCompanyDeletingId(companyId);
    try {
      await apiClient.delete(`/platform/companies/${companyId}`);
      notifySuccess('Company deleted successfully');
      setDeleteCompanyConfirm({ show: false, company: null });
      fetchCompanies();
      fetchUsers();
    } catch (error) {
      notifyError(getErrorMessage(error, 'Failed to delete company'));
    } finally {
      setCompanyDeletingId(null);
    }
  };

  const resetUserForm = () => {
    setUserForm(initialUserForm);
    setEditingUser(null);
  };

  const startEditUser = (user: PlatformUser) => {
    setEditingUser(user);
    const companyId = typeof user.companyId === 'string' ? user.companyId : String(user.companyId?._id || '');
    setUserForm({
      companyId,
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role,
      password: '',
    });
  };

  const submitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserSaving(true);
    try {
      if (editingUser) {
        const payload: any = {
          name: userForm.name,
          email: userForm.email,
          phone: userForm.phone || undefined,
          role: userForm.role,
        };
        if (userForm.password) {
          if (!passwordValidation.isValid) {
            notifyError(strongPasswordErrorMessage);
            setUserSaving(false);
            return;
          }
          payload.password = userForm.password;
        }
        await apiClient.put(`/platform/users/${editingUser._id}`, payload);
        notifySuccess('User updated successfully');
      } else {
        if (!userForm.companyId) {
          notifyError('Please select a company');
          setUserSaving(false);
          return;
        }
        if (!passwordValidation.isValid) {
          notifyError(strongPasswordErrorMessage);
          setUserSaving(false);
          return;
        }

        await apiClient.post('/platform/users', {
          companyId: userForm.companyId,
          name: userForm.name,
          email: userForm.email,
          phone: userForm.phone || undefined,
          role: userForm.role,
          password: userForm.password,
        });
        notifySuccess('User created successfully');
      }
      resetUserForm();
      fetchUsers();
    } catch (error) {
      notifyError(getErrorMessage(error, 'Failed to save user'));
    } finally {
      setUserSaving(false);
    }
  };

  const deleteUser = async () => {
    if (!deleteUserConfirm.user) return;
    const userId = deleteUserConfirm.user._id;
    setUserDeletingId(userId);
    try {
      await apiClient.delete(`/platform/users/${userId}`);
      notifySuccess('User deleted successfully');
      setDeleteUserConfirm({ show: false, user: null });
      fetchUsers();
    } catch (error) {
      notifyError(getErrorMessage(error, 'Failed to delete user'));
    } finally {
      setUserDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-bold text-slate-900">Platform Admin</h1>
        <p className="mt-1 text-sm text-slate-600">Global system management for companies and users.</p>
        <div className="mt-4 flex gap-2">
          <button className={tabClass(activeTab === 'companies')} onClick={() => setActiveTab('companies')}>
            Companies
          </button>
          <button className={tabClass(activeTab === 'users')} onClick={() => setActiveTab('users')}>
            Users
          </button>
        </div>
      </section>

      {activeTab === 'companies' && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">{editingCompany ? 'Edit Company' : 'Create Company'}</h2>
            <form onSubmit={submitCompany} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <input className="input" placeholder="Company name" value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} required />
              <input className="input" placeholder="Company email" type="email" value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} required />
              <input className="input" placeholder="Phone" value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} required />
              <input className="input" placeholder="Industry" value={companyForm.industry} onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })} />
              <input className="input md:col-span-2" placeholder="Address" value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} required />
              <select className="input" value={companyForm.defaultCurrency} onChange={(e) => setCompanyForm({ ...companyForm, defaultCurrency: e.target.value as 'RWF' | 'USD' })}>
                <option value="RWF">RWF</option>
                <option value="USD">USD</option>
              </select>
              <input className="input" type="number" placeholder="Tax rate" value={companyForm.taxRate} onChange={(e) => setCompanyForm({ ...companyForm, taxRate: Number(e.target.value || 0) })} />
              <input className="input" type="number" placeholder="USD exchange rate" value={companyForm.exchangeRateUSD} onChange={(e) => setCompanyForm({ ...companyForm, exchangeRateUSD: Number(e.target.value || 0) })} />
              {!editingCompany && (
                <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Company Login Credentials</p>
                  <p className="mt-1 text-xs text-slate-500">
                    The created company will log in with the company email and this password.
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input
                      className="input"
                      type="password"
                      placeholder="Company login password"
                      value={companyForm.companyPassword}
                      onChange={(e) => setCompanyForm({ ...companyForm, companyPassword: e.target.value })}
                      required
                    />
                    <input
                      className="input"
                      type="password"
                      placeholder="Confirm password"
                      value={companyForm.companyPasswordConfirm}
                      onChange={(e) => setCompanyForm({ ...companyForm, companyPasswordConfirm: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}
              {!editingCompany && companyForm.companyPassword && (
                <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  {companyAdminPasswordValidation.rules.map((rule) => (
                    <p key={rule.label} className={rule.passed ? 'text-green-700' : 'text-slate-500'}>
                      {rule.passed ? 'OK' : '...'} {rule.label}
                    </p>
                  ))}
                </div>
              )}
              <div className="md:col-span-2 flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={companySaving}>
                  {companySaving ? 'Saving...' : editingCompany ? 'Update Company' : 'Create Company'}
                </button>
                {editingCompany && (
                  <button type="button" className="btn btn-secondary" onClick={resetCompanyForm}>
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">All Companies</h2>
            {companiesLoading ? (
              <p className="mt-3 text-sm text-slate-500">Loading companies...</p>
            ) : companies.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No companies found.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Currency</th>
                      <th className="px-3 py-2 text-left">Tax</th>
                      <th className="px-3 py-2 text-left">Created</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {companies.map((company) => (
                      <tr key={company._id}>
                        <td className="px-3 py-2 text-sm text-slate-900">{company.name}</td>
                        <td className="px-3 py-2 text-sm text-slate-700">{company.email}</td>
                        <td className="px-3 py-2 text-sm text-slate-700">{company.defaultCurrency}</td>
                        <td className="px-3 py-2 text-sm text-slate-700">{company.taxRate}%</td>
                        <td className="px-3 py-2 text-sm text-slate-700">{new Date(company.createdAt).toLocaleDateString()}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex gap-2">
                            <button
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary-500 transition hover:bg-primary-50 hover:text-primary-700"
                              onClick={() => startEditCompany(company)}
                              title="Edit company"
                              aria-label="Edit company"
                            >
                              <FaPen className="text-sm" />
                            </button>
                            <button
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-danger-500 transition hover:bg-red-50 hover:text-danger-700"
                              onClick={() => setDeleteCompanyConfirm({ show: true, company })}
                              disabled={companyDeletingId === company._id}
                              title="Delete company"
                              aria-label="Delete company"
                            >
                              <FaTrash className="text-sm" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === 'users' && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">{editingUser ? 'Edit User' : 'Create User'}</h2>
            <form onSubmit={submitUser} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <select
                className="input"
                value={userForm.companyId}
                onChange={(e) => setUserForm({ ...userForm, companyId: e.target.value })}
                disabled={!!editingUser}
                required={!editingUser}
              >
                <option value="">{editingUser ? 'Company is fixed for existing user' : 'Select company'}</option>
                {companies.map((company) => (
                  <option key={company._id} value={company._id}>{company.name}</option>
                ))}
              </select>
              <select
                className="input"
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserFormData['role'] })}
              >
                <option value="staff">Staff</option>
                <option value="finance_manager">Finance Manager</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <input className="input" placeholder="Full name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required />
              <input className="input" type="email" placeholder="Email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
              <input className="input" placeholder="Phone (optional)" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
              <input
                className="input"
                type="password"
                placeholder={editingUser ? 'New password (optional)' : 'Password (required)'}
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                required={!editingUser}
              />
              {userForm.password && (
                <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  {passwordValidation.rules.map((rule) => (
                    <p key={rule.label} className={rule.passed ? 'text-green-700' : 'text-slate-500'}>
                      {rule.passed ? 'OK' : '...'} {rule.label}
                    </p>
                  ))}
                </div>
              )}
              <div className="md:col-span-2 flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={userSaving}>
                  {userSaving ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
                {editingUser && (
                  <button type="button" className="btn btn-secondary" onClick={resetUserForm}>
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">All Users</h2>
            {usersLoading ? (
              <p className="mt-3 text-sm text-slate-500">Loading users...</p>
            ) : users.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No users found.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[960px]">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Role</th>
                      <th className="px-3 py-2 text-left">Company</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Created</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {users.map((user) => {
                      const companyName = typeof user.companyId === 'string' ? user.companyId : user.companyId?.name || 'Unknown';
                      return (
                        <tr key={user._id}>
                          <td className="px-3 py-2 text-sm text-slate-900">{user.name}</td>
                          <td className="px-3 py-2 text-sm text-slate-700">{user.email}</td>
                          <td className="px-3 py-2 text-sm text-slate-700">{user.role}</td>
                          <td className="px-3 py-2 text-sm text-slate-700">{companyName}</td>
                          <td className="px-3 py-2 text-sm text-slate-700">{user.status}</td>
                          <td className="px-3 py-2 text-sm text-slate-700">{new Date(user.createdAt).toLocaleDateString()}</td>
                          <td className="px-3 py-2 text-right">
                            <div className="inline-flex gap-2">
                              <button
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary-500 transition hover:bg-primary-50 hover:text-primary-700"
                                onClick={() => startEditUser(user)}
                                title="Edit user"
                                aria-label="Edit user"
                              >
                                <FaPen className="text-sm" />
                              </button>
                              <button
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-danger-500 transition hover:bg-red-50 hover:text-danger-700"
                                onClick={() => setDeleteUserConfirm({ show: true, user })}
                                disabled={userDeletingId === user._id}
                                title="Delete user"
                                aria-label="Delete user"
                              >
                                <FaTrash className="text-sm" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <ConfirmModal
        isOpen={deleteCompanyConfirm.show}
        title="Delete Company"
        message={`Delete ${deleteCompanyConfirm.company?.name || 'this company'} and all its data? This cannot be undone.`}
        confirmText={companyDeletingId ? 'Deleting...' : 'Delete Company'}
        cancelText="Cancel"
        onConfirm={deleteCompany}
        onCancel={() => setDeleteCompanyConfirm({ show: false, company: null })}
        variant="danger"
        confirmClassName={companyDeletingId ? 'opacity-60 cursor-not-allowed' : ''}
      />

      <ConfirmModal
        isOpen={deleteUserConfirm.show}
        title="Delete User"
        message={`Delete ${deleteUserConfirm.user?.name || deleteUserConfirm.user?.email || 'this user'}? This cannot be undone.`}
        confirmText={userDeletingId ? 'Deleting...' : 'Delete User'}
        cancelText="Cancel"
        onConfirm={deleteUser}
        onCancel={() => setDeleteUserConfirm({ show: false, user: null })}
        variant="danger"
        confirmClassName={userDeletingId ? 'opacity-60 cursor-not-allowed' : ''}
      />
    </div>
  );
};

export default PlatformAdmin;
