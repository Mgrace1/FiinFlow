import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { getErrorMessage, notifyError, notifySuccess } from '../utils/toast';
import { getPasswordRuleKey, validateStrongPassword } from '../utils/password';

const ChangePassword: React.FC = () =>{
  const navigate = useNavigate();
  const { t } = useLanguage();
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
      setError(t('change_password.mismatch'));
      return;
    }

    if (!passwordValidation.isValid) {
      setError(t('password.error_strong'));
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.put('/users/change-password', {
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword,
      });

      if (response.data.success) {
        setSuccess(t('change_password.success'));
        notifySuccess(t('change_password.success_toast'));
        setTimeout(() =>navigate('/dashboard'), 2000);
      }
    } catch (err: any) {
      const message = getErrorMessage(err, t('change_password.error_default'));
      setError(message);
      notifyError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="max-w-md mt-2 p-4">
    <h1 className="text-xl font-bold mb-4">{t('change_password.title')}</h1>
      
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
            {t('change_password.current_label')}
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
            {t('change_password.new_label')}
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
              className={`text-xs ${rule.passed ? 'text-primary-600' : 'text-gray-500'}`}
            >
              {rule.passed ? '?' : '•'} {t(getPasswordRuleKey(rule.label))}
            </p>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
            {t('change_password.confirm_label')}
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
            {loading ? t('change_password.changing') : t('change_password.submit')}
        </button>
        <button
            type="button"
            onClick={() =>navigate(-1)}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            {t('common.cancel')}
        </button>
      </div>
    </form>
  </div>
  );
};

export default ChangePassword;


