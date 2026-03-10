import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';
import { getErrorMessage, notifyError, notifySuccess } from '../utils/toast';
import { getPasswordRuleKey, validateStrongPassword } from '../utils/password';

const ResetPassword: React.FC = () =>{
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const passwordValidation = validateStrongPassword(formData.password);

  useEffect(() =>{
    if (!token) {
      setError(t('reset_password.invalid_link_error'));
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) =>{
    e.preventDefault();
    setError('');

    // Validation
    if (!passwordValidation.isValid) {
      setError(t('password.error_strong'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('reset_password.mismatch'));
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/auth/reset-password', {
        token,
        password: formData.password,
      });

      if (response.data.success) {
        setSuccess(true);
        notifySuccess(t('reset_password.success_toast'));
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      const message = getErrorMessage(error, t('reset_password.error_default'));
      setError(message);
      notifyError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('reset_password.invalid_title')}</h2>
        <p className="text-gray-600 mb-6">
            {t('reset_password.invalid_body')}
        </p>
        <button
          onClick={() => navigate('/forgot-password')}
          className="btn btn-primary"
        >
          {t('reset_password.request_new_link')}
        </button>
      </div>
    </div>
    );
  }

  if (success) {
    return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('reset_password.success_title')}</h2>
        <p className="text-gray-600 mb-6">
            {t('reset_password.success_body')}
        </p>
        <p className="text-sm text-gray-500">{t('reset_password.redirecting')}</p>
      </div>
    </div>
    );
  }

  return (
  <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-600 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('reset_password.title')}</h1>
        <p className="text-gray-600">{t('reset_password.subtitle')}</p>
      </div>

        {error && (
        <div className="bg-danger-50 border border-danger-500 text-danger-700 px-4 py-3 rounded mb-4">
            {error}
        </div>
        )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('reset_password.new_label')}
          </label>
          <div className="relative">
            <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) =>setFormData({ ...formData, password: e.target.value })}
                required
                className="input pr-20"
                placeholder={t('reset_password.new_placeholder')}
                minLength={8}
              />
            <button
                type="button"
                onClick={() =>setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
              >
                {showPassword ? t('reset_password.hide') : t('reset_password.show')}
            </button>
          </div>
          <div className="mt-2 space-y-1">
            {passwordValidation.rules.map((rule) => (
              <p
                key={rule.label}
                className={`text-xs ${rule.passed ? 'text-success-500' : 'text-gray-500'}`}
              >
                {rule.passed ? '✓' : '•'} {t(getPasswordRuleKey(rule.label))}
              </p>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('reset_password.confirm_label')}
          </label>
          <div className="relative">
            <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) =>setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                className="input pr-20"
                placeholder={t('reset_password.confirm_placeholder')}
                minLength={8}
              />
            <button
                type="button"
                onClick={() =>setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? t('reset_password.hide') : t('reset_password.show')}
            </button>
          </div>
        </div>

        <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? t('reset_password.resetting') : t('reset_password.submit')}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
            {t('reset_password.remember_prompt')}{' '}
          <button
              onClick={() => navigate('/login')}
              className="text-primary-500 hover:text-primary-700 font-medium"
            >
              {t('reset_password.sign_in')}
          </button>
        </p>
      </div>
    </div>
  </div>
  );
};

export default ResetPassword;
