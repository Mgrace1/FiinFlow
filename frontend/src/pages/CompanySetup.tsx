import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { ArrowLeft, Clipboard } from 'lucide-react';
import { getErrorMessage, notifyError, notifySuccess } from '../utils/toast';

const CompanySetup: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [credentials, setCredentials] = useState<{
    companyId: string;
    companyName: string;
    loginUrl: string;
    adminEmail: string;
    adminTemporaryPassword: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    industry: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!consentChecked) {
      setError('Please agree to the research participation consent before proceeding.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/companies', formData);

      if (response.data.success) {
        const { companyId, companyName, loginUrl, adminEmail, adminTemporaryPassword } = response.data.data;
        setCredentials({
          companyId,
          companyName,
          loginUrl,
          adminEmail,
          adminTemporaryPassword,
        });
        notifySuccess('Company created successfully');
      }
    } catch (err: any) {
      const message = getErrorMessage(err, 'Failed to create company');
      setError(message);
      notifyError(message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notifySuccess('Copied to clipboard');
    } catch (clipboardError) {
      console.error('Clipboard copy failed:', clipboardError);
      notifyError('Failed to copy to clipboard');
    }
  };

  const goToLogin = () => {
    if (!credentials) {
      navigate('/login');
      return;
    }

    try {
      const targetPath = new URL(credentials.loginUrl).pathname || '/login';
      navigate(targetPath);
    } catch {
      navigate('/login');
    }
  };

  if (credentials) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900">Company Created</h1>
          <p className="mt-1 text-sm text-gray-500">Save these credentials before continuing.</p>

          <div className="mt-5 space-y-3 text-sm">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Company Name</p>
              <p className="font-semibold text-gray-900">{credentials.companyName}</p>
            </div>

            <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div>
                <p className="text-xs font-medium text-gray-500">Login URL</p>
                <p className="break-all text-gray-800">{credentials.loginUrl}</p>
              </div>
              <button onClick={() => copyToClipboard(credentials.loginUrl)} className="rounded border border-gray-300 bg-white p-2">
                <Clipboard size={16} />
              </button>
            </div>

            <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div>
                <p className="text-xs font-medium text-gray-500">Admin Email</p>
                <p className="text-gray-800">{credentials.adminEmail}</p>
              </div>
              <button onClick={() => copyToClipboard(credentials.adminEmail)} className="rounded border border-gray-300 bg-white p-2">
                <Clipboard size={16} />
              </button>
            </div>

            <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
              <div>
                <p className="text-xs font-medium text-amber-700">Temporary Password</p>
                <p className="font-mono font-semibold text-amber-900">{credentials.adminTemporaryPassword}</p>
              </div>
              <button
                onClick={() => copyToClipboard(credentials.adminTemporaryPassword)}
                className="rounded border border-amber-300 bg-white p-2"
              >
                <Clipboard size={16} />
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button onClick={goToLogin} className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
              Go to Login
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Create Another Company
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-lg">
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
          <h1 className="mt-3 text-4xl font-bold text-slate-900">Create your workspace</h1>
          <p className="mt-2 text-sm text-slate-500">Set up your company account and get started.</p>
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
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Company name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  placeholder="Company name"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Company email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  placeholder="company@email.com"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  placeholder="+250 XXX XXX XXX"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Industry (optional)</label>
                <input
                  type="text"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  placeholder="Industry"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Company address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  rows={2}
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  placeholder="Company address"
                />
              </div>
            </div>

            <div className="rounded-lg border border-primary-200 bg-primary-50 p-3">
              <p className="mb-2 text-xs text-slate-700">
                FinFlow is part of a capstone research project at African Leadership University. Data is used for academic
                evaluation and deleted after the pilot study.
              </p>
              <label className="flex items-start gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                I consent to participate in the FinFlow research pilot.
              </label>
              <button
                type="button"
                onClick={() => navigate('/consent')}
                className="mt-2 text-xs font-semibold text-primary-600 hover:text-primary-500"
              >
                Read full consent information
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !consentChecked}
              className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold ${
                consentChecked ? 'bg-primary-600 text-white hover:bg-primary-500' : 'cursor-not-allowed bg-slate-300 text-slate-500'
              }`}
            >
              {loading ? 'Creating...' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="font-semibold text-primary-600 hover:text-primary-500">
            Log in
          </button>
        </p>
      </div>

    </div>
  );
};

export default CompanySetup;
