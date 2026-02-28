import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { getErrorMessage, notifyError, notifySuccess } from '../utils/toast';

const UserSetup: React.FC = () =>{
  const navigate = useNavigate();
  const { companyId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'admin',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>{
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) =>{
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/users', formData);

      if (response.data.success) {
        notifySuccess('Admin user created successfully');
        navigate(`/company/${companyId}/dashboard`);
      }
    } catch (err: any) {
      const message = getErrorMessage(err, 'Failed to create admin user');
      setError(message);
      notifyError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2"> Create Admin User</h1>
        <p className="text-gray-600">Set up the main administrator account</p>
      </div>

        {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
        </div>
        )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
          </label>
          <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="input"
              placeholder="John Doe"
            />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
          </label>
          <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="input"
              placeholder="admin@company.com"
            />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone (Optional)
          </label>
          <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="input"
              placeholder="+250 XXX XXX XXX"
            />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Role:</strong>Administrator (Full access)
          </p>
        </div>

        <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Creating...' : 'Create Admin & Continue'}
        </button>
      </form>
    </div>
  </div>
  );
};

export default UserSetup;
