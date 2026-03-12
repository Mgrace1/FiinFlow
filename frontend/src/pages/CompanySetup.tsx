import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { getErrorMessage, notifyError, notifySuccess } from '../utils/toast';
import { getPasswordRuleKey, validateStrongPassword } from '../utils/password';

const CompanySetup: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    industry: '',
    password: '',
    confirmPassword: '',
  });
  const passwordValidation = validateStrongPassword(formData.password);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!consentChecked) {
      setError(t('company_setup.consent_required'));
      return;
    }

    if (!passwordValidation.isValid) {
      const message = t('password.error_strong');
      setError(message);
      notifyError(message);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      const message = t('company_setup.password_mismatch');
      setError(message);
      notifyError(message);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/companies', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        industry: formData.industry,
        password: formData.password,
      });

      if (response.data.success) {
        notifySuccess(t('company_setup.success_toast'));
        navigate('/login');
      }
    } catch (err: any) {
      const message = getErrorMessage(err, t('company_setup.error_default'));
      setError(message);
      notifyError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
          >
            <ArrowLeft size={14} />
            {t('company_setup.back_home')}
          </Link>
        </div>

        <div className="text-center">
          <div className="mb-3 inline-flex items-center gap-2">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">FiinFlow</span>
          </div>
          <h1 className="mt-3 text-4xl font-bold text-slate-900">{t('company_setup.title')}</h1>
          <p className="mt-2 text-sm text-slate-500">{t('company_setup.subtitle')}</p>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('company_setup.name_label')}</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  placeholder={t('company_setup.name_placeholder')}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('company_setup.email_label')}</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  placeholder={t('company_setup.email_placeholder')}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('company_setup.phone_label')}</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  placeholder={t('company_setup.phone_placeholder')}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('company_setup.industry_label')}</label>
                <input
                  type="text"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  placeholder={t('company_setup.industry_placeholder')}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('company_setup.address_label')}</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  rows={2}
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  placeholder={t('company_setup.address_placeholder')}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('company_setup.password_label')}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 pr-16"
                    placeholder={t('company_setup.password_placeholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? t('reset_password.hide') : t('reset_password.show')}
                  </button>
                </div>
                <div className="mt-2 space-y-1">
                  {passwordValidation.rules.map((rule) => (
                    <p
                      key={rule.label}
                      className={`text-xs ${rule.passed ? 'text-emerald-600' : 'text-slate-500'}`}
                    >
                      {rule.passed ? '✓' : '•'} {t(getPasswordRuleKey(rule.label))}
                    </p>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('company_setup.confirm_label')}</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 pr-16"
                    placeholder={t('company_setup.confirm_placeholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                  >
                    {showConfirmPassword ? t('reset_password.hide') : t('reset_password.show')}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-primary-200 bg-primary-50 p-3">
              <p className="mb-2 text-xs text-slate-700">
                {t('company_setup.consent_blurb')}
              </p>
              <label className="flex items-start gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                {t('company_setup.consent_label')}
              </label>
              <button
                type="button"
                onClick={() => navigate('/consent')}
                className="mt-2 text-xs font-semibold text-primary-600 hover:text-primary-500"
              >
                {t('company_setup.consent_link')}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !consentChecked}
              className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold ${
                consentChecked ? 'bg-primary-600 text-white hover:bg-primary-500' : 'cursor-not-allowed bg-slate-300 text-slate-500'
              }`}
            >
              {loading ? t('company_setup.creating') : t('company_setup.submit')}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          {t('company_setup.already_prompt')}{' '}
          <button onClick={() => navigate('/login')} className="font-semibold text-primary-600 hover:text-primary-500">
            {t('company_setup.sign_in')}
          </button>
        </p>
      </div>

    </div>
  );
};

export default CompanySetup;
