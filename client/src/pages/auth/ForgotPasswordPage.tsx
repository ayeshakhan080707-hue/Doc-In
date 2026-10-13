import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { apiClient } from '../../api/client';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'REQUEST' | 'RESET' | 'SUCCESS'>('REQUEST');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await apiClient.post('/auth/forgot-password', { email });
      // In development, server returns token directly for testing
      // In production, token is delivered via email (configure SMTP in server)
      if (res.data.devToken) {
        setResetToken(res.data.devToken);
      }
      setStep('RESET');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error processing request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await apiClient.post('/auth/reset-password', {
        token: resetToken,
        newPassword,
      });
      setStep('SUCCESS');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired token.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F2EF] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link to="/" className="inline-flex items-center gap-2 mb-2">
          <img
            src="/logo.png"
            alt="DocIn Digital Health Platform"
            className="h-14 w-auto object-contain"
          />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-[rgba(0,0,0,0.9)]">
          Reset Your Password
        </h1>
        <p className="text-xs text-[rgba(0,0,0,0.6)] mt-1">
          Cryptographically secured 15-minute token verification
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)] rounded-xl border border-[rgba(0,0,0,0.08)] space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'REQUEST' && (
            <form onSubmit={handleRequestToken} className="space-y-4">
              <p className="text-xs text-gray-600">
                Enter your registered email address. We'll generate a secure token to authenticate your identity.
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@docin.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:border-[#0A66C2] outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-pill-primary py-2.5 text-sm flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Send Reset Code'}
              </button>
            </form>
          )}

          {step === 'RESET' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
                <p>
                  A password reset link has been sent to <strong>{email}</strong>.
                </p>
                {resetToken && (
                  <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 font-mono text-[11px] break-all">
                    <strong>Dev mode token:</strong> {resetToken}
                  </p>
                )}
                {!resetToken && (
                  <p className="text-[11px] text-blue-700">
                    In production, check your inbox for the secure link. Paste the token below.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reset Token
                </label>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-mono text-gray-900 focus:border-[#0A66C2] outline-none bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New strong password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:border-[#0A66C2] outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-pill-primary py-2.5 text-sm flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Update Password'}
              </button>
            </form>
          )}

          {step === 'SUCCESS' && (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="font-bold text-gray-900 text-base">Password Reset Successfully!</h3>
              <p className="text-xs text-gray-600">
                Your credentials have been securely updated. You can now log into DocIn.
              </p>
              <Link to="/login" className="btn-pill-primary px-6 py-2 text-xs inline-block mt-2">
                Return to Sign In
              </Link>
            </div>
          )}

          <div className="pt-2 text-center">
            <Link
              to="/login"
              className="text-xs text-[rgba(0,0,0,0.6)] hover:text-[#0A66C2] flex items-center justify-center gap-1"
            >
              <ArrowLeft size={13} /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};