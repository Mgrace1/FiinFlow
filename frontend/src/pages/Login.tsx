import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { apiClient } from '../api/client';
import { ArrowLeft } from 'lucide-react';
import { getErrorMessage, notifyError, notifySuccess } from '../utils/toast';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post('/auth/login', formData);

      if (response.data.success) {
        const { token, user, company } = response.data.data;

        localStorage.setItem('finflow_token', token);
        localStorage.setItem('finflow_companyId', user.companyId);
        localStorage.setItem('finflow_user', JSON.stringify(user));
        localStorage.setItem('finflow_company', JSON.stringify(company));

        setAuth(token, user.companyId);
        if (rememberMe) {
          localStorage.setItem('finflow_remember', '1');
        } else {
          localStorage.removeItem('finflow_remember');
        }
        notifySuccess(t('login.success'));
        navigate('/dashboard', { replace: true });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const message = getErrorMessage(error, t('login.error_default'));
      setError(message);
      notifyError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
          >
            <ArrowLeft size={14} />
            {t('login.back_home')}
          </Link>
        </div>

        <div className="text-center">
          <div className="mb-3 inline-flex items-center gap-2">
            
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">FiinFlow</span>
          </div>
          <h1 className="mt-3 text-4xl font-bold text-slate-900">{t('login.title')}</h1>
          <p className="mt-2 text-sm text-slate-500">{t('login.subtitle')}</p>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('login.email_label')}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                placeholder={t('login.email_placeholder')}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('login.password_label')}</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                placeholder={t('login.password_placeholder')}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                {t('login.remember')}
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm font-semibold text-primary-600 hover:text-primary-500"
              >
                {t('login.forgot')}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? t('login.signing_in') : t('login.sign_in')}
            </button>
          </form>

        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          {t('login.no_account')}{' '}
          <button onClick={() => navigate('/setup/company')} className="font-semibold text-primary-600 hover:text-primary-500">
            {t('login.start_setup')}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
