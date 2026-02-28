import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../api/client';
import { ArrowLeft } from 'lucide-react';
import { getErrorMessage, notifyError, notifySuccess } from '../utils/toast';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
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
        notifySuccess('Logged in successfully');
        navigate('/dashboard', { replace: true });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const message = getErrorMessage(error, 'Login failed. Please check your credentials.');
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
            Back to home
          </Link>
        </div>

        <div className="text-center">
          <div className="mb-3 inline-flex items-center gap-2">
            
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">FiinFlow</span>
          </div>
          <h1 className="mt-3 text-4xl font-bold text-slate-900">Sign in to your account</h1>
          <p className="mt-2 text-sm text-slate-500">Use your workspace credentials to continue.</p>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                placeholder="Enter your password"
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
                Remember me
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm font-semibold text-primary-600 hover:text-primary-500"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          Don&apos;t have an account?{' '}
          <button onClick={() => navigate('/setup/company')} className="font-semibold text-primary-600 hover:text-primary-500">
            Start a free setup
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
