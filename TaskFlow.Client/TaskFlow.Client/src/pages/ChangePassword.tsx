import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Lock, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { profileService } from '../services/profileService';
import Layout from '../components/Layout';
import type { ChangePasswordRequest } from '../services/profileService';

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ChangePasswordPage() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>();

  const newPassword = watch('newPassword');

  const onSubmit = async (data: PasswordFormData) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const changePasswordData: ChangePasswordRequest = {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      };

      await profileService.changePassword(changePasswordData);
      setSuccess('Password changed successfully!');
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (value: string) => {
    const requirements = [
      { test: value.length >= 8, message: 'At least 8 characters' },
      { test: /[A-Z]/.test(value), message: 'One uppercase letter' },
      { test: /[a-z]/.test(value), message: 'One lowercase letter' },
      { test: /\d/.test(value), message: 'One number' },
      { test: /[!@#$%^&*(),.?":{}|<>]/.test(value), message: 'One special character' },
    ];

    const failed = requirements.find(req => !req.test);
    return failed ? failed.message : true;
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-6">
            <Link
              to="/profile"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Profile
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Change Password</h1>
            <p className="mt-2 text-gray-600">
              Update your password to keep your account secure.
            </p>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {/* Password Change Form */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-8">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-6">
                  {/* Current Password */}
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        {...register('currentPassword', {
                          required: 'Current password is required',
                        })}
                        type={showCurrentPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        className={`w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                          errors.currentPassword ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter your current password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {errors.currentPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>
                    )}
                  </div>

                  {/* New Password */}
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        {...register('newPassword', {
                          required: 'New password is required',
                          validate: validatePassword,
                        })}
                        type={showNewPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        className={`w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                          errors.newPassword ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter your new password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {errors.newPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
                    )}
                  </div>

                  {/* Password Requirements */}
                  {newPassword && (
                    <div className="p-4 bg-gray-50 rounded-md">
                      <p className="text-sm font-medium text-gray-700 mb-2">Password requirements:</p>
                      <div className="space-y-1">
                        {[
                          { test: newPassword.length >= 8, message: 'At least 8 characters' },
                          { test: /[A-Z]/.test(newPassword), message: 'One uppercase letter' },
                          { test: /[a-z]/.test(newPassword), message: 'One lowercase letter' },
                          { test: /\d/.test(newPassword), message: 'One number' },
                          { test: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword), message: 'One special character' },
                        ].map((req, index) => (
                          <div key={index} className="flex items-center text-xs">
                            {req.test ? (
                              <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                            ) : (
                              <div className="h-3 w-3 border border-gray-300 rounded-full mr-2" />
                            )}
                            <span className={req.test ? 'text-green-600' : 'text-gray-500'}>
                              {req.message}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        {...register('confirmPassword', {
                          required: 'Please confirm your new password',
                          validate: (value) => value === newPassword || 'Passwords do not match',
                        })}
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        className={`w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                          errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Confirm your new password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="mt-8 flex justify-end space-x-3">
                  <Link
                    to="/profile"
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Changing Password...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Security Tips */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Security Tips</h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Use a unique password that you don't use for other accounts</li>
              <li>• Consider using a password manager to generate and store strong passwords</li>
              <li>• Change your password regularly, especially if you suspect it may be compromised</li>
              <li>• Never share your password with anyone</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}