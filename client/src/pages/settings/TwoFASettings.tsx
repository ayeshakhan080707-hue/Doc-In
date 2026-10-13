import React, { useState, useEffect } from 'react';
import { Shield, QrCode, Key, Check, Loader2, AlertTriangle, X } from 'lucide-react';
import { apiClient } from '../../api/client';

export const TwoFASettings: React.FC = () => {
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<'idle' | 'setup' | 'verify' | 'disable' | 'success' | 'backup'>('idle');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await apiClient.get('/2fa/status');
      setIs2FAEnabled(res.data.data?.enabled || false);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleSetup = async () => {
    setIsProcessing(true);
    setError('');
    try {
      const res = await apiClient.post('/2fa/setup');
      setQrCode(res.data.data.qrCode);
      setSecret(res.data.data.secret);
      setStep('setup');
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to setup 2FA.'); }
    finally { setIsProcessing(false); }
  };

  const handleVerifyEnable = async () => {
    if (!token.trim()) return;
    setIsProcessing(true);
    setError('');
    try {
      const res = await apiClient.post('/2fa/verify-enable', { token });
      setBackupCodes(res.data.data?.backupCodes || []);
      setIs2FAEnabled(true);
      setStep('backup');
      setToken('');
    } catch (err: any) { setError(err.response?.data?.message || 'Invalid code. Please try again.'); }
    finally { setIsProcessing(false); }
  };

  const handleDisable = async () => {
    if (!token.trim()) return;
    setIsProcessing(true);
    setError('');
    try {
      await apiClient.post('/2fa/disable', { token });
      setIs2FAEnabled(false);
      setStep('idle');
      setToken('');
    } catch (err: any) { setError(err.response?.data?.message || 'Invalid code.'); }
    finally { setIsProcessing(false); }
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-[#0A66C2]" /></div>;

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <div className={`p-4 rounded-xl border ${is2FAEnabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={20} className={is2FAEnabled ? 'text-green-600' : 'text-gray-400'} />
            <div>
              <p className="font-bold text-sm text-gray-900">Two-Factor Authentication (2FA)</p>
              <p className="text-xs text-gray-500">TOTP — works with Google Authenticator or Authy</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${is2FAEnabled ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
            {is2FAEnabled ? '✓ Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      {/* Idle state */}
      {step === 'idle' && (
        <div>
          {!is2FAEnabled ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-600">
                Protect your account with two-factor authentication. After enabling, you'll need your authenticator app to sign in.
              </p>
              <button onClick={handleSetup} disabled={isProcessing} className="btn-pill-primary text-xs px-5 py-2 flex items-center gap-1.5">
                {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <Shield size={13} />}
                Enable 2FA
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-600">Your account is protected with 2FA. To disable, enter a valid code from your authenticator app.</p>
              <button onClick={() => setStep('disable')} className="text-xs px-4 py-2 border border-red-300 text-red-600 rounded-full hover:bg-red-50 transition-colors">
                Disable 2FA
              </button>
            </div>
          )}
        </div>
      )}

      {/* Setup — QR Code */}
      {step === 'setup' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-3">
            <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5"><QrCode size={14} /> Step 1: Scan QR Code</p>
            <p className="text-xs text-blue-700">Open Google Authenticator or Authy and scan this QR code:</p>
            <div className="flex justify-center">
              <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-lg border border-blue-200 bg-white p-2" />
            </div>
            <div className="p-2 bg-white rounded border border-blue-200">
              <p className="text-[11px] text-gray-500 font-semibold">Manual entry key:</p>
              <p className="font-mono text-xs text-gray-800 break-all mt-0.5">{secret}</p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
            <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5"><Key size={14} /> Step 2: Enter Verification Code</p>
            <p className="text-xs text-gray-600">Enter the 6-digit code from your authenticator app:</p>
            <input
              type="text"
              value={token}
              onChange={e => setToken(e.target.value.replace(/\D/g, '').substring(0, 6))}
              placeholder="000000"
              className="w-full text-center text-2xl font-mono tracking-[0.5em] px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-[#0A66C2]"
              maxLength={6}
            />
            <div className="flex gap-2">
              <button onClick={() => { setStep('idle'); setToken(''); setError(''); }} className="btn-pill-ghost px-4 py-1.5 text-xs">Cancel</button>
              <button onClick={handleVerifyEnable} disabled={token.length !== 6 || isProcessing} className="btn-pill-primary px-5 py-1.5 text-xs flex items-center gap-1.5 flex-1">
                {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Verify & Enable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Codes */}
      {step === 'backup' && (
        <div className="space-y-3">
          <div className="p-4 bg-green-50 rounded-xl border border-green-200">
            <p className="font-bold text-sm text-green-800 flex items-center gap-2"><Check size={16} /> 2FA Enabled Successfully!</p>
            <p className="text-xs text-green-700 mt-1">Save these backup codes in a safe place. Each can be used once if you lose access to your authenticator app.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, i) => (
              <div key={i} className="font-mono text-sm text-center py-2 bg-gray-100 rounded-lg border border-gray-200 text-gray-800 font-bold tracking-widest">
                {code}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => { navigator.clipboard.writeText(backupCodes.join('\n')); }} className="btn-pill-outline text-xs px-4 py-1.5">Copy All</button>
            <button onClick={() => setStep('idle')} className="btn-pill-primary text-xs px-5 py-1.5">Done</button>
          </div>
        </div>
      )}

      {/* Disable */}
      {step === 'disable' && (
        <div className="space-y-3">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <span>Disabling 2FA will make your account less secure. Enter your current authenticator code to confirm.</span>
          </div>
          <input
            type="text"
            value={token}
            onChange={e => setToken(e.target.value.replace(/\D/g, '').substring(0, 6))}
            placeholder="Enter 6-digit code"
            className="w-full text-center text-xl font-mono tracking-[0.5em] px-4 py-3 border border-red-300 rounded-lg outline-none focus:border-red-500"
            maxLength={6}
          />
          <div className="flex gap-2">
            <button onClick={() => { setStep('idle'); setToken(''); setError(''); }} className="btn-pill-ghost px-4 py-1.5 text-xs">Cancel</button>
            <button onClick={handleDisable} disabled={token.length !== 6 || isProcessing} className="flex-1 text-xs py-1.5 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 flex items-center justify-center gap-1.5">
              {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
              Disable 2FA
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
