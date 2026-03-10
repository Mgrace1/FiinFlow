import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';
import { notifyInfo } from '../utils/toast';

const ForgotPassword: React.FC = () =>{
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiClient.post('/auth/forgot-password', {
        email,
      });
      setSuccess(true);
      notifyInfo(t('forgot_password.toast_sent'));
    } catch (error: any) {
      console.error('Forgot password error:', error);
      setSuccess(true);
      notifyInfo(t('forgot_password.toast_sent'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('forgot_password.success_title')}</h2>
          <p className="text-gray-600 mb-6">
              {t('forgot_password.success_body')}
          </p>
          <p className="text-sm text-gray-500 mb-6">
              {t('forgot_password.success_hint')}
          </p>
        </div>

        <button
            onClick={() => navigate('/login')}
            className="btn btn-primary w-full"
          >
            {t('forgot_password.back_login')}
        </button>
      </div>
    </div>
    );
  }

  return (
  <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-600 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('forgot_password.title')}</h1>
        <p className="text-gray-600">
            {t('forgot_password.subtitle')}
        </p>
      </div>

        {error && (
        <div className="bg-danger-50 border border-danger-500 text-danger-700 px-4 py-3 rounded mb-4">
            {error}
        </div>
        )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('forgot_password.email_label')}
          </label>
          <input
              type="email"
              value={email}
              onChange={(e) =>setEmail(e.target.value)}
              required
              className="input"
              placeholder={t('forgot_password.email_placeholder')}
            />
        </div>

        <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? t('forgot_password.sending') : t('forgot_password.send_link')}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
            {t('forgot_password.remember_prompt')}{' '}
          <button
              onClick={() => navigate('/login')}
              className="text-primary-500 hover:text-primary-700 font-medium"
            >
              {t('forgot_password.sign_in')}
          </button>
        </p>
      </div>

      <div className="mt-4 text-center">
        <button
            onClick={() =>navigate('/login')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {t('forgot_password.general_login')}
        </button>
      </div>
    </div>
  </div>
  );
};

export default ForgotPassword;
