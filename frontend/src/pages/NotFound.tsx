import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = Boolean(localStorage.getItem('finflow_token'));

  return (
    <div className="min-h-screen landing-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <div className="mb-3 inline-flex items-center gap-2">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">FiinFlow</span>
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Error 404</p>
        <h1 className="mt-3 text-4xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-3 text-sm text-slate-600">
          The page you requested does not exist or was moved.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
          >
            Go back
          </button>
          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-500"
          >
            {isAuthenticated ? 'Go to dashboard' : 'Go to home'}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
