import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getErrorMessage, notifyError, notifySuccess } from '../utils/toast';

const UserSetup: React.FC = () =>{
  const navigate = useNavigate();
  const { companyId } = useAuth();
  const { t } = useLanguage();
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
        notifySuccess(t('user_setup.success_toast'));
        navigate(`/company/${companyId}/dashboard`);
      }
    } catch (err: any) {
      const message = getErrorMessage(err, t('user_setup.error_default'));
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('user_setup.title')}</h1>
        <p className="text-gray-600">{t('user_setup.subtitle')}</p>
      </div>

        {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
        </div>
        )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('user_setup.name_label')}
          </label>
          <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="input"
              placeholder={t('user_setup.name_placeholder')}
            />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('user_setup.email_label')}
          </label>
          <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="input"
              placeholder={t('user_setup.email_placeholder')}
            />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('user_setup.phone_label')}
          </label>
          <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="input"
              placeholder={t('user_setup.phone_placeholder')}
            />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>{t('user_setup.role_label')}</strong>{t('user_setup.role_value')}
          </p>
        </div>

        <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? t('user_setup.creating') : t('user_setup.submit')}
        </button>
      </form>
    </div>
  </div>
  );
};

export default UserSetup;
