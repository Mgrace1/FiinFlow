import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { notifyInfo } from '../utils/toast';

const ForgotPassword: React.FC = () =>{
  const navigate = useNavigate();

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
      notifyInfo('If the account exists, a reset email has been sent.');
    } catch (error: any) {
      console.error('Forgot password error:', error);
      setSuccess(true);
      notifyInfo('If the account exists, a reset email has been sent.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Check Your Email</h2>
          <p className="text-gray-600 mb-6">
              If an account exists with this email address, you will receive password reset instructions.
          </p>
          <p className="text-sm text-gray-500 mb-6">
              Please check your inbox and spam folder.
          </p>
        </div>

        <button
            onClick={() => navigate('/login')}
            className="btn btn-primary w-full"
          >
            Back to Login
        </button>
      </div>
    </div>
    );
  }

  return (
  <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-600 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password?</h1>
        <p className="text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
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
              Email Address
          </label>
          <input
              type="email"
              value={email}
              onChange={(e) =>setEmail(e.target.value)}
              required
              className="input"
              placeholder="your@email.com"
            />
        </div>

        <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
            Remember your password?{' '}
          <button
              onClick={() => navigate('/login')}
              className="text-primary-500 hover:text-primary-700 font-medium"
            >
              Sign In
          </button>
        </p>
      </div>

      <div className="mt-4 text-center">
        <button
            onClick={() =>navigate('/login')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Go to General Login
        </button>
      </div>
    </div>
  </div>
  );
};

export default ForgotPassword;
