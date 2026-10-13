import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, Mail, Lock, Eye, EyeOff, Shield, Key } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient, setAuthToken } from '../../api/client';

export const LoginPage: React.FC = () => {
  const { login, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 2FA step
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFaToken, setTwoFaToken] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [is2FALoading, setIs2FALoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/feed');
    } catch (err: any) {
      if (err.requiresTwoFactor) {
        // Show 2FA step
        setTwoFaToken(err.twoFactorToken);
        setRequires2FA(true);
        setIsLoading(false);
        return;
      }
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIs2FALoading(true);
    try {
      const res = await apiClient.post('/auth/login/2fa', {
        twoFactorToken: twoFaToken,
        code: twoFaCode.replace(/\s/g, ''),
      });

      const { accessToken } = res.data.data;
      setAuthToken(accessToken);
      await refreshUser();
      navigate('/feed');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid 2FA code. Please try again.');
    } finally {
      setIs2FALoading(false);
    }
  };

  // 2FA verification step
  if (requires2FA) {
    return (
      <div className="min-h-screen bg-[#F3F2EF] flex flex-col justify-center py-10 px-4">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#EBF5FF] flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-[#0A66C2]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Two-Factor Authentication</h1>
          <p className="text-sm text-gray-500 mt-1">
            Open your authenticator app and enter the 6-digit code
          </p>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-[rgba(0,0,0,0.08)] space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handle2FASubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Authenticator Code
                </label>
                <div className="relative">
                  <Key size={15} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                    placeholder="000000"
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-lg font-mono tracking-[0.4em] text-center text-gray-900 focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2] outline-none"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5 text-center">
                  Can't access your app? Use a backup code instead.
                </p>
              </div>

              <button
                type="submit"
                disabled={is2FALoading || twoFaCode.length < 6}
                className="w-full btn-pill-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {is2FALoading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={15} />}
                Verify & Sign In
              </button>
            </form>

            <button
              onClick={() => { setRequires2FA(false); setTwoFaCode(''); setError(null); }}
              className="w-full text-xs text-gray-500 hover:text-gray-700 text-center"
            >
              ← Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Normal login step
  return (
    <div className="min-h-screen bg-[#F3F2EF] flex flex-col justify-center py-10 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <Link to="/feed" className="inline-flex items-center gap-2 mb-4">
          <img src="/logo.png" alt="DocIn Digital Health Platform" className="h-14 w-auto object-contain" />
        </Link>
        <h1 className="text-2xl font-bold text-[rgba(0,0,0,0.9)]">
          Sign in to your medical network
        </h1>
        <p className="text-sm text-[rgba(0,0,0,0.6)] mt-1">
          Healthcare professionals trust DocIn for verified clinical networking
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)] rounded-xl border border-[rgba(0,0,0,0.08)] space-y-5">

          {/* Google Sign In */}
          <a
            href={`https://accounts.google.com/o/oauth2/v2/auth?client_id=${import.meta.env.VITE_GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/google/callback')}&response_type=code&scope=email%20profile`}
            className="w-full py-2.5 px-4 border border-gray-300 rounded-full text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 flex items-center justify-center gap-2.5 transition-all shadow-xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Continue with Google
          </a>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-gray-200" />
            <span className="flex-shrink mx-4 text-xs text-gray-400 font-medium">or</span>
            <div className="flex-grow border-t border-gray-200" />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@hospital.org"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2] outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700">Password</label>
                <Link to="/forgot-password" className="text-xs text-[#0A66C2] hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-md text-sm text-gray-900 focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2] outline-none"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full btn-pill-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <p className="text-xs text-center text-gray-500 pt-2 border-t border-gray-100">
            By signing in, you agree to DocIn's{' '}
            <a href="#" className="text-[#0A66C2] hover:underline">User Agreement</a>,{' '}
            <a href="#" className="text-[#0A66C2] hover:underline">Privacy Policy</a> & HIPAA compliance.
          </p>
        </div>

        <p className="mt-5 text-center text-sm text-[rgba(0,0,0,0.6)]">
          New to DocIn?{' '}
          <Link to="/register" className="font-semibold text-[#0A66C2] hover:underline">
            Join the verified medical network
          </Link>
        </p>
      </div>
    </div>
  );
};
