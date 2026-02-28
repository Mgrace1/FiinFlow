import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { getErrorMessage, notifyError, notifySuccess } from '../utils/toast';
import { strongPasswordErrorMessage, validateStrongPassword } from '../utils/password';

const SetPassword: React.FC = () =>{
  const navigate = useNavigate();
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

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing invitation link');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) =>{
    e.preventDefault();
    setError('');

    // Validation
    if (!passwordValidation.isValid) {
      setError(strongPasswordErrorMessage);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/auth/set-password', {
        token,
        password: formData.password,
      });

      if (response.data.success) {
        setSuccess(true);
        notifySuccess('Password set successfully');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error: any) {
      console.error('Set password error:', error);
      const message = getErrorMessage(error, 'Failed to set password. Please try again or request a new invitation.');
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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Invalid Link</h2>
        <p className="text-gray-600 mb-6">
            This invitation link is invalid or has expired. Please contact your administrator for a new invitation.
        </p>
        <button
            onClick={() =>navigate('/login')}
            className="btn btn-primary"
          >
            Go to Login
        </button>
      </div>
    </div>
    );
  }

  if (success) {
    return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Password Set Successfully!</h2>
        <p className="text-gray-600 mb-6">
            Your password has been set. You can now log in to your workspace.
        </p>
        <p className="text-sm text-gray-500">Redirecting to login page...</p>
      </div>
    </div>
    );
  }

  return (
  <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-600 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-primary-500 mb-2">Welcome!</h1>
        <p className="text-gray-600">Set your password to join FiinFlow</p>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-6">Set Your Password</h2>

        {error && (
        <div className="bg-danger-50 border border-danger-500 text-danger-700 px-4 py-3 rounded mb-4">
            {error}
        </div>
        )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
          </label>
          <div className="relative">
            <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) =>setFormData({ ...formData, password: e.target.value })}
                required
                className="input pr-20"
                placeholder="Enter your password"
                minLength={8}
              />
            <button
                type="button"
                onClick={() =>setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
              >
                {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <div className="mt-2 space-y-1">
            {passwordValidation.rules.map((rule) => (
              <p
                key={rule.label}
                className={`text-xs ${rule.passed ? 'text-success-500' : 'text-gray-500'}`}
              >
                {rule.passed ? '✓' : '•'} {rule.label}
              </p>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
          </label>
          <div className="relative">
            <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) =>setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                className="input pr-20"
                placeholder="Confirm your password"
                minLength={8}
              />
            <button
                type="button"
                onClick={() =>setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Setting Password...' : 'Set Password & Continue'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
            Already have an account?{' '}
          <button
              onClick={() => navigate('/login')}
              className="text-primary-500 hover:text-primary-700 font-medium"
            >
              Sign In
          </button>
        </p>
      </div>
    </div>
  </div>
  );
};

export default SetPassword;
