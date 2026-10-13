import React, { useState, useEffect } from 'react';
import {
  Settings, Shield, Bell, Lock, Loader2, Check,
  Key, LogOut, Smartphone, Eye, EyeOff, AlertTriangle,
  CreditCard, FileText, Download, ExternalLink, Calendar, CheckCircle2, Award, Printer,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { useNavigate, Link } from 'react-router-dom';
import { TwoFASettings } from './TwoFASettings';
import { InvoiceModal } from '../../components/billing/InvoiceModal';
import { Invoice, BillingDetails } from '../../types';

type SettingsTab = 'account' | 'security' | '2fa' | 'notifications' | 'billing';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');

  // Password change
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  // Billing & Invoices
  const [billingData, setBillingData] = useState<BillingDetails | null>(null);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  useEffect(() => {
    if (activeTab === 'security') fetchSessions();
    if (activeTab === 'billing') fetchBilling();
  }, [activeTab]);

  const fetchBilling = async () => {
    setLoadingBilling(true);
    try {
      const res = await apiClient.get('/payment/invoices');
      setBillingData(res.data.data);
    } catch (err) {
      console.warn('Failed to fetch billing info:', err);
    } finally {
      setLoadingBilling(false);
    }
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await apiClient.get('/auth/sessions');
      setSessions(res.data.data || []);
    } catch { /* silent */ }
    finally { setLoadingSessions(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }
    if (pwdForm.newPassword.length < 8) {
      setPwdError('Password must be at least 8 characters.');
      return;
    }
    setSavingPwd(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      setPwdSuccess(true);
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPwdSuccess(false), 3000);
    } catch (err: any) {
      setPwdError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSavingPwd(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('This will sign you out from all devices. Continue?')) return;
    setLoggingOutAll(true);
    try {
      await apiClient.post('/auth/logout-all');
      await logout();
      navigate('/login');
    } catch { /* silent */ }
    finally { setLoggingOutAll(false); }
  };

  const tabs = [
    { key: 'account' as SettingsTab, label: 'Account', icon: <Settings size={15} /> },
    { key: 'security' as SettingsTab, label: 'Security', icon: <Shield size={15} /> },
    { key: '2fa' as SettingsTab, label: '2FA', icon: <Lock size={15} /> },
    { key: 'billing' as SettingsTab, label: 'Billing & Invoices', icon: <CreditCard size={15} /> },
    { key: 'notifications' as SettingsTab, label: 'Notifications', icon: <Bell size={15} /> },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
      <div className="card-linkedin p-4">
        <h1 className="font-bold text-lg text-gray-900 flex items-center gap-2">
          <Settings size={20} className="text-[#0A66C2]" /> Settings
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">Manage your account, security, and notifications</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-[#0A66C2] text-[#0A66C2]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="card-linkedin p-5 space-y-4">
          <h2 className="font-bold text-sm text-gray-900">Account Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-semibold text-gray-500 mb-1">Full Name</p>
              <p className="text-gray-900">{user?.fullName}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-500 mb-1">Email Address</p>
              <p className="text-gray-900">{user?.email}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-500 mb-1">Account Role</p>
              <p className="text-gray-900">{user?.role?.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-500 mb-1">Membership</p>
              <p className={`font-semibold ${user?.subscriptionTier === 'PREMIUM_GOLD' ? 'text-amber-600' : 'text-gray-600'}`}>
                {user?.subscriptionTier === 'PREMIUM_GOLD' ? '⭐ Premium Gold' : 'Free Tier'}
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-500 mb-1">Clinical Verification</p>
              <p className={`font-semibold ${user?.isClinicalVerified ? 'text-green-700' : 'text-gray-500'}`}>
                {user?.isClinicalVerified ? '✓ Verified Practitioner' : 'Not Verified'}
              </p>
            </div>
          </div>
          {user?.role === 'DOCTOR' && (
            <div className="pt-3 border-t border-gray-100">
              <button
                onClick={() => navigate('/profile')}
                className="btn-pill-outline text-xs px-4 py-2"
              >
                Edit Professional Profile
              </button>
            </div>
          )}
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          {/* Change Password */}
          <div className="card-linkedin p-5 space-y-4">
            <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <Key size={15} className="text-[#0A66C2]" /> Change Password
            </h2>
            {pwdSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 flex items-center gap-2">
                <Check size={14} /> Password changed successfully.
              </div>
            )}
            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPwd ? 'text' : 'password'}
                    value={pwdForm.currentPassword}
                    onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-[#0A66C2] pr-9"
                    required
                  />
                  <button type="button" onClick={() => setShowCurrentPwd(!showCurrentPwd)} className="absolute right-2.5 top-2 text-gray-400">
                    {showCurrentPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={pwdForm.newPassword}
                    onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-[#0A66C2] pr-9"
                    required minLength={8}
                  />
                  <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-2.5 top-2 text-gray-400">
                    {showNewPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={pwdForm.confirmPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-[#0A66C2]"
                  required minLength={8}
                />
              </div>
              {pwdError && <p className="text-red-600">{pwdError}</p>}
              <button type="submit" disabled={savingPwd} className="btn-pill-primary text-xs px-5 py-2 flex items-center gap-1.5">
                {savingPwd ? <Loader2 size={13} className="animate-spin" /> : <Key size={13} />}
                Update Password
              </button>
            </form>
          </div>

          {/* Active Sessions */}
          <div className="card-linkedin p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <Smartphone size={15} className="text-[#0A66C2]" /> Active Sessions
              </h2>
              <button
                onClick={handleLogoutAll}
                disabled={loggingOutAll}
                className="text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded-full hover:bg-red-50 flex items-center gap-1.5 transition-colors"
              >
                {loggingOutAll ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
                Logout All Devices
              </button>
            </div>
            {loadingSessions ? (
              <div className="py-4 flex justify-center"><Loader2 size={18} className="animate-spin text-[#0A66C2]" /></div>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-gray-500">No active sessions found.</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((s: any, i: number) => (
                  <div key={s._id || i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg text-xs">
                    <div>
                      <p className="font-semibold text-gray-800">Session {i === 0 ? '(Current)' : ''}</p>
                      <p className="text-gray-500">
                        Created: {new Date(s.createdAt).toLocaleDateString()} • Expires: {new Date(s.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    {i === 0 && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">Active</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Security Notice */}
          <div className="card-linkedin p-4 bg-amber-50/50 border-amber-200">
            <div className="flex items-start gap-3 text-xs text-amber-800">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Security Recommendation</p>
                <p className="mt-0.5 text-amber-700">
                  For a healthcare platform, we recommend changing your password every 90 days and enabling strong passwords. Two-factor authentication (2FA) coming soon.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Tab */}
      {activeTab === '2fa' && (
        <div className="card-linkedin p-5">
          <h2 className="font-bold text-sm text-gray-900 mb-4 flex items-center gap-2">
            <Lock size={15} className="text-[#0A66C2]" /> Two-Factor Authentication
          </h2>
          <TwoFASettings />
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="card-linkedin p-5 space-y-4">
          <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2">
            <Bell size={15} className="text-[#0A66C2]" /> Notification Preferences
          </h2>
          <p className="text-xs text-gray-500">
            Email notification settings will be available once the email service is configured.
          </p>
          {[
            { label: 'Connection requests', desc: 'When someone sends you a connection request' },
            { label: 'Post reactions', desc: 'When someone likes or comments on your post' },
            { label: 'Credential status updates', desc: 'When your credential is approved or rejected' },
            { label: 'Job application updates', desc: 'When your application status changes' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{item.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0A66C2]"></div>
              </label>
            </div>
          ))}
        </div>
      )}

      {/* Billing & Invoices Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-4">
          {/* 1. Subscription Plan Summary */}
          <div className="card-linkedin p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  <CreditCard size={16} className="text-[#0A66C2]" /> Current Membership & Billing
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Manage your active subscription plan and payment methods</p>
              </div>
              <Link to="/subscription" className="btn-pill-primary text-xs px-3.5 py-1.5 self-start sm:self-auto">
                Change Plan / Upgrade
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200">
                <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider block mb-1">Active Plan</span>
                <div className="flex items-center gap-1.5">
                  {user?.subscriptionTier === 'PREMIUM_GOLD' ? (
                    <span className="font-bold text-sm text-amber-700 flex items-center gap-1">
                      <Award size={15} className="text-amber-500" /> Premium Gold
                    </span>
                  ) : (
                    <span className="font-bold text-sm text-gray-800">Free Standard</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  {user?.subscriptionTier === 'PREMIUM_GOLD' ? '$29.00 / month' : '$0.00 / month'}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200">
                <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider block mb-1">Billing Status</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-bold text-sm text-emerald-700">Active</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Next renewal: {billingData?.currentPlan?.nextBillingDate ? new Date(billingData.currentPlan.nextBillingDate).toLocaleDateString() : 'Auto-renews monthly'}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200">
                <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider block mb-1">Payment Method</span>
                <div className="flex items-center gap-1.5 font-bold text-sm text-gray-800">
                  <span className="px-1.5 py-0.2 bg-white rounded border border-gray-300 text-[10px] font-mono text-gray-600">VISA</span>
                  <span>•••• 4242</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">Expires 12/28</p>
              </div>
            </div>
          </div>

          {/* 2. Invoices & Receipts Table */}
          <div className="card-linkedin p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  <FileText size={16} className="text-[#0A66C2]" /> Billing History & Tax Invoices
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Download official tax receipts for accounting and expense reporting</p>
              </div>
            </div>

            {loadingBilling ? (
              <div className="py-8 text-center text-gray-400">
                <Loader2 size={24} className="animate-spin text-[#0A66C2] mx-auto mb-2" />
                <p className="text-xs">Loading invoice records…</p>
              </div>
            ) : !billingData?.invoices || billingData.invoices.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <FileText size={32} className="text-gray-300 mx-auto" />
                <p className="font-semibold text-xs text-gray-700">No invoices generated yet</p>
                <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
                  When you activate or renew a DocIn membership, all official invoices and payment receipts will appear here.
                </p>
                <Link to="/subscription" className="btn-pill-primary text-xs px-4 py-1.5 inline-block mt-2">
                  Upgrade to Premium Gold
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-[11px] text-gray-400 uppercase tracking-wider">
                      <th className="pb-2.5 font-bold">Invoice #</th>
                      <th className="pb-2.5 font-bold">Date</th>
                      <th className="pb-2.5 font-bold">Plan / Description</th>
                      <th className="pb-2.5 font-bold">Amount</th>
                      <th className="pb-2.5 font-bold">Status</th>
                      <th className="pb-2.5 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {billingData.invoices.map((inv) => (
                      <tr key={inv._id || inv.invoiceNumber} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 font-mono font-bold text-[#0A66C2]">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 text-gray-600">
                          {new Date(inv.billingDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 font-medium text-gray-900">
                          {inv.planName}
                        </td>
                        <td className="py-3 font-bold text-gray-900">
                          ${inv.total.toFixed(2)} USD
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setIsInvoiceOpen(true);
                              }}
                              className="px-2.5 py-1 rounded bg-[#EBF5FF] text-[#0A66C2] hover:bg-[#D0E8FF] font-semibold text-[11px] flex items-center gap-1 transition-colors"
                              title="View official invoice"
                            >
                              <Eye size={12} /> View
                            </button>
                            <button
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setIsInvoiceOpen(true);
                                setTimeout(() => window.print(), 350);
                              }}
                              className="px-2.5 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                              title="Download PDF / Print"
                            >
                              <Printer size={12} /> Download
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoice Modal for Viewing and Downloading Invoices */}
      <InvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        invoice={selectedInvoice}
      />
    </div>
  );
};

