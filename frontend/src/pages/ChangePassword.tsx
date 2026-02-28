import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage, notifyError, notifySuccess } from '../utils/toast';
import { strongPasswordErrorMessage, validateStrongPassword } from '../utils/password';

const ChangePassword: React.FC = () =>{
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordValidation = validateStrongPassword(formData.newPassword);

  const handleSubmit = async (e: React.FormEvent) =>{
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (!passwordValidation.isValid) {
      setError(strongPasswordErrorMessage);
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.put('/users/change-password', {
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword,
      });

      if (response.data.success) {
        setSuccess('Password changed successfully!');
        notifySuccess('Password changed successfully');
        setTimeout(() =>navigate('/dashboard'), 2000);
      }
    } catch (err: any) {
      const message = getErrorMessage(err, 'Failed to change password');
      setError(message);
      notifyError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="max-w-md mt-2 p-4">
    <h1 className="text-xl font-bold mb-4">Change Password</h1>
      
    <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded border border-red-200">
            {error}
        </div>
        )}
        
        {success && (
        <div className="bg-green-50 text-green-600 p-3 rounded border border-green-200">
            {success}
        </div>
        )}

      <div>
        <label className="block text-sm font-medium mb-2">
            Current Password
        </label>
        <input
            type="password"
            value={formData.oldPassword}
            onChange={(e) =>setFormData({ ...formData, oldPassword: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
            New Password
        </label>
        <input
            type="password"
            value={formData.newPassword}
            onChange={(e) =>setFormData({ ...formData, newPassword: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            minLength={8}
          />
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
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
            Confirm New Password
        </label>
        <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) =>setFormData({ ...formData, confirmPassword: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
      </div>

      <div className="flex gap-3 pt-4">
        <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Changing...' : 'Change Password'}
        </button>
        <button
            type="button"
            onClick={() =>navigate(-1)}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Cancel
        </button>
      </div>
    </form>
  </div>
  );
};

export default ChangePassword;
